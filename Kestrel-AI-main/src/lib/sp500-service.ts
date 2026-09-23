import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SP500Company {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap?: number;
  dividend_yield?: number;
  price?: number;
}

// Fetch S&P 500 companies from our database
export async function getSP500Companies(): Promise<SP500Company[]> {
  try {
    const { data, error } = await supabase
      .from("sp500_companies")
      .select("*")
      .order("dividend_yield", { ascending: false });

    if (error) {
      console.error("Error fetching S&P 500 companies:", error);
      return [];
    }

    // Check if we need to update the data (if it's older than 24 hours or empty)
    const needsUpdate =
      !data || data.length === 0 || isDataStale(data[0].last_updated);

    if (needsUpdate) {
      console.log("S&P 500 data needs update, fetching from API...");
      return await updateSP500Data();
    }

    return data;
  } catch (error) {
    console.error("Error in getSP500Companies:", error);
    return [];
  }
}

// Check if data is stale (older than 24 hours)
function isDataStale(lastUpdated: string): boolean {
  const lastUpdateTime = new Date(lastUpdated).getTime();
  const currentTime = new Date().getTime();
  const hoursDiff = (currentTime - lastUpdateTime) / (1000 * 60 * 60);
  return hoursDiff > 24;
}

// Update S&P 500 data from Financial Modeling Prep API
async function updateSP500Data(): Promise<SP500Company[]> {
  try {
    // Load API key
    const { data: apiKeyData } = await supabase
      .from("api_keys")
      .select("financial_modeling_prep_key")
      .limit(1);

    const apiKey =
      apiKeyData && apiKeyData.length > 0
        ? apiKeyData[0].financial_modeling_prep_key
        : "JgouQZYifBbjvGjr2F10AOc1i2sYlPBf"; // Fallback key

    // Fetch S&P 500 constituents
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch S&P 500 data: ${response.status}`);
    }

    const sp500Data = await response.json();

    // Fetch additional data for each company (in batches to avoid rate limits)
    const batchSize = 5;
    const companies: SP500Company[] = [];

    for (let i = 0; i < Math.min(sp500Data.length, 100); i += batchSize) {
      const batch = sp500Data.slice(i, i + batchSize);
      const batchPromises = batch.map(async (company: any) => {
        try {
          // Get profile data for dividend yield and price
          const profileResponse = await fetch(
            `https://financialmodelingprep.com/api/v3/profile/${company.symbol}?apikey=${apiKey}`,
          );

          if (!profileResponse.ok) {
            return {
              symbol: company.symbol,
              name: company.name,
              sector: company.sector,
              industry: company.subSector || "Unknown",
            };
          }

          const profileData = await profileResponse.json();
          const profile = profileData[0] || {};

          return {
            symbol: company.symbol,
            name: company.name,
            sector: company.sector,
            industry: company.subSector || "Unknown",
            market_cap: profile.mktCap || null,
            dividend_yield: profile.lastDiv
              ? (profile.lastDiv / profile.price) * 100
              : null,
            price: profile.price || null,
          };
        } catch (error) {
          console.error(`Error fetching data for ${company.symbol}:`, error);
          return {
            symbol: company.symbol,
            name: company.name,
            sector: company.sector,
            industry: company.subSector || "Unknown",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      companies.push(...batchResults);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < sp500Data.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Save to database
    for (const company of companies) {
      await supabase.from("sp500_companies").upsert(
        {
          symbol: company.symbol,
          name: company.name,
          sector: company.sector,
          industry: company.industry,
          market_cap: company.market_cap,
          dividend_yield: company.dividend_yield,
          price: company.price,
          last_updated: new Date().toISOString(),
        },
        { onConflict: "symbol" },
      );
    }

    return companies;
  } catch (error) {
    console.error("Error updating S&P 500 data:", error);
    return [];
  }
}

// Get S&P 500 companies with highest dividend yield
export async function getHighDividendSP500Companies(
  limit = 20,
): Promise<SP500Company[]> {
  try {
    // First try to get from our database
    const { data, error } = await supabase
      .from("sp500_companies")
      .select("*")
      .not("dividend_yield", "is", null)
      .order("dividend_yield", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      // If no data or error, try to update
      const companies = await updateSP500Data();
      return companies
        .filter((c) => c.dividend_yield !== null && c.dividend_yield > 0)
        .sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0))
        .slice(0, limit);
    }

    return data;
  } catch (error) {
    console.error("Error getting high dividend S&P 500 companies:", error);
    return [];
  }
}
