// Web scraping and data enrichment service
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CompanyData {
  symbol: string;
  [key: string]: any;
}

// Check if we have cached data for a company
export async function getCachedCompanyData(
  symbol: string,
): Promise<CompanyData | null> {
  try {
    const { data, error } = await supabase
      .from("company_data_cache")
      .select("*")
      .eq("symbol", symbol)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if the data is fresh (less than 24 hours old)
    const cachedAt = new Date(data.cached_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return null; // Data is stale
    }

    return data.data as CompanyData;
  } catch (error) {
    console.error("Error fetching cached company data:", error);
    return null;
  }
}

// Store company data in cache
export async function cacheCompanyData(
  symbol: string,
  data: CompanyData,
): Promise<void> {
  try {
    const { error } = await supabase.from("company_data_cache").upsert(
      {
        symbol,
        data,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "symbol" },
    );

    if (error) {
      console.error("Error caching company data:", error);
    }
  } catch (error) {
    console.error("Error caching company data:", error);
  }
}

// Fetch missing financial data from alternative sources
export async function fetchMissingFinancialData(
  companies: CompanyData[],
  missingFields: string[],
  deepseekApiKey: string,
): Promise<CompanyData[]> {
  if (!companies.length || !missingFields.length) {
    return companies;
  }

  const enrichedCompanies = [...companies];
  const companiesToEnrich = [];

  // Check which companies need enrichment
  for (const company of companies) {
    const needsEnrichment = missingFields.some(
      (field) =>
        company[field] === undefined ||
        company[field] === null ||
        company[field] === "N/A",
    );

    if (needsEnrichment) {
      // Check if we have cached data
      const cachedData = await getCachedCompanyData(company.symbol);
      if (cachedData) {
        // Use cached data to fill in missing fields
        const companyIndex = enrichedCompanies.findIndex(
          (c) => c.symbol === company.symbol,
        );
        if (companyIndex !== -1) {
          enrichedCompanies[companyIndex] = {
            ...enrichedCompanies[companyIndex],
            ...cachedData,
          };
        }
      } else {
        companiesToEnrich.push(company);
      }
    }
  }

  if (!companiesToEnrich.length) {
    return enrichedCompanies;
  }

  // Use OpenAI to fetch missing data for companies that need enrichment
  try {
    // Prepare a batch of companies to enrich (limit to 5 at a time to avoid token limits)
    const batchSize = 5;
    for (let i = 0; i < companiesToEnrich.length; i += batchSize) {
      const batch = companiesToEnrich.slice(i, i + batchSize);
      const symbols = batch.map((c) => c.symbol).join(", ");
      const fieldsStr = missingFields.join(", ");

      const prompt = `I need the following financial data for these companies: ${symbols}.
      Specifically, I need their ${fieldsStr}.
      Please provide the data in a JSON format with the company symbol as the key and an object of the requested fields as the value.
      Only include factual, up-to-date information. If you don't know a value, use null.
      Format example: { "AAPL": { "profitMargin": 0.25, "otherField": 100 } }`;

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "You are a financial data assistant that provides accurate, up-to-date financial metrics for companies. Respond only with the requested JSON data.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.1,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data from DeepSeek");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Extract JSON from the response
      let enrichedData: Record<string, any> = {};
      try {
        // Try to parse the entire response as JSON
        enrichedData = JSON.parse(content);
      } catch (e) {
        // If that fails, try to extract JSON using regex
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enrichedData = JSON.parse(jsonMatch[0]);
        }
      }

      // Update companies with the enriched data
      for (const symbol in enrichedData) {
        const companyIndex = enrichedCompanies.findIndex(
          (c) => c.symbol === symbol,
        );
        if (companyIndex !== -1) {
          const newData = {
            ...enrichedCompanies[companyIndex],
            ...enrichedData[symbol],
          };
          enrichedCompanies[companyIndex] = newData;

          // Cache the enriched data
          await cacheCompanyData(symbol, newData);
        }
      }

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < companiesToEnrich.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return enrichedCompanies;
  } catch (error) {
    console.error("Error enriching company data:", error);
    return enrichedCompanies;
  }
}

// Detect missing fields in the data
export function detectMissingFields(data: CompanyData[]): string[] {
  if (!data || data.length === 0) return [];

  const missingFields: Set<string> = new Set();
  const importantFields = [
    "profitMargin",
    "grossMargin",
    "operatingMargin",
    "netIncomeMargin",
    "revenueGrowth",
    "earningsGrowth",
    "dividendYield",
    "peRatio",
    "pbRatio",
    "debtToEquity",
    "returnOnEquity",
    "returnOnAssets",
  ];

  for (const company of data) {
    for (const field of importantFields) {
      if (
        company[field] === undefined ||
        company[field] === null ||
        company[field] === "N/A"
      ) {
        missingFields.add(field);
      }
    }
  }

  return Array.from(missingFields);
}
