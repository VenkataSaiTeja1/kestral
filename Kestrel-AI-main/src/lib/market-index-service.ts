import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface MarketIndexCompany {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  dividend_yield?: number;
  price?: number;
  index_name: string;
}

// Generic function to fetch market index data from any source
export async function getMarketIndexData(
  indexName: string,
  apiKey: string,
): Promise<MarketIndexCompany[]> {
  try {
    // First check if we have recent data in our cache
    const { data: cachedData, error: cacheError } = await supabase
      .from("market_index_companies")
      .select("*")
      .eq("index_name", indexName.toLowerCase())
      .order("dividend_yield", { ascending: false });

    // If we have recent data that's not stale, return it
    if (!cacheError && cachedData && cachedData.length > 0) {
      const lastUpdated = new Date(cachedData[0].last_updated);
      const now = new Date();
      const hoursSinceUpdate =
        (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate < 24) {
        console.log(`Using cached data for ${indexName}`);
        return cachedData;
      }
    }

    // Otherwise, fetch fresh data based on the index name
    console.log(`Fetching fresh data for ${indexName}`);

    // Normalize index name for comparison
    const normalizedIndexName = indexName.toLowerCase().replace(/\s+/g, "");

    let companies: MarketIndexCompany[] = [];

    // Handle different indices with appropriate API calls
    if (
      normalizedIndexName.includes("s&p") ||
      normalizedIndexName.includes("sp500")
    ) {
      companies = await fetchSP500Data(apiKey);
    } else if (
      normalizedIndexName.includes("nifty") ||
      normalizedIndexName.includes("nse")
    ) {
      companies = await fetchNiftyData(apiKey);
    } else if (
      normalizedIndexName.includes("sensex") ||
      normalizedIndexName.includes("bse")
    ) {
      companies = await fetchSensexData(apiKey);
    } else if (normalizedIndexName.includes("nasdaq")) {
      companies = await fetchNasdaqData(apiKey);
    } else if (
      normalizedIndexName.includes("dow") ||
      normalizedIndexName.includes("djia")
    ) {
      companies = await fetchDowJonesData(apiKey);
    } else if (normalizedIndexName.includes("ftse")) {
      companies = await fetchFTSEData(apiKey);
    } else if (normalizedIndexName.includes("dax")) {
      companies = await fetchDAXData(apiKey);
    } else if (normalizedIndexName.includes("nikkei")) {
      companies = await fetchNikkeiData(apiKey);
    } else if (normalizedIndexName.includes("hangseng")) {
      companies = await fetchHangSengData(apiKey);
    } else {
      // For unknown indices, try a general search approach
      companies = await fetchGenericIndexData(indexName, apiKey);
    }

    // Cache the results in our database
    if (companies.length > 0) {
      for (const company of companies) {
        await supabase.from("market_index_companies").upsert(
          {
            symbol: company.symbol,
            name: company.name,
            sector: company.sector || null,
            industry: company.industry || null,
            market_cap: company.market_cap || null,
            dividend_yield: company.dividend_yield || null,
            price: company.price || null,
            index_name: indexName.toLowerCase(),
            last_updated: new Date().toISOString(),
          },
          { onConflict: "symbol, index_name" },
        );
      }
    }

    return companies;
  } catch (error) {
    console.error(`Error fetching ${indexName} data:`, error);
    return [];
  }
}

// Fetch S&P 500 data
async function fetchSP500Data(apiKey: string): Promise<MarketIndexCompany[]> {
  try {
    // Fetch S&P 500 constituents
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch S&P 500 data: ${response.status}`);
    }

    const sp500Data = await response.json();

    // Process and return the data
    return await enrichIndexData(sp500Data, "s&p500", apiKey);
  } catch (error) {
    console.error("Error fetching S&P 500 data:", error);
    return [];
  }
}

// Fetch Nifty 50 data
async function fetchNiftyData(apiKey: string): Promise<MarketIndexCompany[]> {
  try {
    // For Nifty, we might need to use a different API or approach
    // This is a placeholder implementation
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/symbol/available-indexes?apikey=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch index data: ${response.status}`);
    }

    const indexData = await response.json();
    const niftySymbol = indexData.find(
      (idx: any) => idx.symbol.includes("NIFTY") || idx.name.includes("NIFTY"),
    );

    if (niftySymbol) {
      // If we found a Nifty index, try to get its constituents
      return await fetchGenericIndexData("NIFTY", apiKey);
    }

    // Fallback to a generic approach or return empty
    return [];
  } catch (error) {
    console.error("Error fetching Nifty data:", error);
    return [];
  }
}

// Fetch Sensex data
async function fetchSensexData(apiKey: string): Promise<MarketIndexCompany[]> {
  try {
    // Similar approach as Nifty
    return await fetchGenericIndexData("SENSEX", apiKey);
  } catch (error) {
    console.error("Error fetching Sensex data:", error);
    return [];
  }
}

// Fetch NASDAQ data
async function fetchNasdaqData(apiKey: string): Promise<MarketIndexCompany[]> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/nasdaq_constituent?apikey=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch NASDAQ data: ${response.status}`);
    }

    const nasdaqData = await response.json();
    return await enrichIndexData(nasdaqData, "nasdaq", apiKey);
  } catch (error) {
    console.error("Error fetching NASDAQ data:", error);
    return [];
  }
}

// Fetch Dow Jones data
async function fetchDowJonesData(
  apiKey: string,
): Promise<MarketIndexCompany[]> {
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/dowjones_constituent?apikey=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Dow Jones data: ${response.status}`);
    }

    const dowData = await response.json();
    return await enrichIndexData(dowData, "dowjones", apiKey);
  } catch (error) {
    console.error("Error fetching Dow Jones data:", error);
    return [];
  }
}

// Placeholder functions for other indices
async function fetchFTSEData(apiKey: string): Promise<MarketIndexCompany[]> {
  return await fetchGenericIndexData("FTSE", apiKey);
}

async function fetchDAXData(apiKey: string): Promise<MarketIndexCompany[]> {
  return await fetchGenericIndexData("DAX", apiKey);
}

async function fetchNikkeiData(apiKey: string): Promise<MarketIndexCompany[]> {
  return await fetchGenericIndexData("NIKKEI", apiKey);
}

async function fetchHangSengData(
  apiKey: string,
): Promise<MarketIndexCompany[]> {
  return await fetchGenericIndexData("HANGSENG", apiKey);
}

// Generic approach for any index
async function fetchGenericIndexData(
  indexName: string,
  apiKey: string,
): Promise<MarketIndexCompany[]> {
  try {
    // First try to get the index symbol
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/search?query=${indexName}&limit=10&apikey=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to search for index: ${response.status}`);
    }

    const searchResults = await response.json();

    // Look for the index in search results
    const indexResult = searchResults.find(
      (result: any) =>
        result.name.toLowerCase().includes(indexName.toLowerCase()) ||
        result.symbol.toLowerCase().includes(indexName.toLowerCase()),
    );

    if (indexResult) {
      // Try to get ETFs that track this index
      const etfResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/etf-holder/${indexResult.symbol}?apikey=${apiKey}`,
      );

      if (etfResponse.ok) {
        const etfData = await etfResponse.json();
        if (etfData && etfData.length > 0) {
          return etfData.map((holding: any) => ({
            symbol: holding.asset,
            name: holding.name || holding.asset,
            sector: holding.sector || null,
            industry: null,
            market_cap: null,
            dividend_yield: null,
            price: null,
            index_name: indexName.toLowerCase(),
          }));
        }
      }

      // If we couldn't get ETF data, try a different approach
      // For example, get major stocks from the country/region of the index
      const countryMapping: Record<string, string> = {
        nifty: "india",
        sensex: "india",
        ftse: "united kingdom",
        dax: "germany",
        nikkei: "japan",
        hangseng: "hong kong",
      };

      const normalizedIndex = indexName.toLowerCase();
      let country = "";

      for (const [idx, countryName] of Object.entries(countryMapping)) {
        if (normalizedIndex.includes(idx)) {
          country = countryName;
          break;
        }
      }

      if (country) {
        const countryResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/stock-screener?country=${country}&limit=50&apikey=${apiKey}`,
        );

        if (countryResponse.ok) {
          const countryData = await countryResponse.json();
          return countryData.map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.companyName,
            sector: stock.sector,
            industry: stock.industry,
            market_cap: stock.marketCap,
            dividend_yield: stock.dividendYield
              ? stock.dividendYield * 100
              : null,
            price: stock.price,
            index_name: indexName.toLowerCase(),
          }));
        }
      }
    }

    // If all else fails, return an empty array
    return [];
  } catch (error) {
    console.error(`Error fetching generic index data for ${indexName}:`, error);
    return [];
  }
}

// Helper function to enrich index data with additional information
async function enrichIndexData(
  indexData: any[],
  indexName: string,
  apiKey: string,
): Promise<MarketIndexCompany[]> {
  try {
    // Process the raw index data into our standard format
    const companies: MarketIndexCompany[] = [];

    // Limit to 50 companies to avoid rate limits
    const limitedData = indexData.slice(0, 50);

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;

    for (let i = 0; i < limitedData.length; i += batchSize) {
      const batch = limitedData.slice(i, i + batchSize);
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
              sector: company.sector || null,
              industry: company.subSector || company.industry || null,
              market_cap: null,
              dividend_yield: null,
              price: null,
              index_name: indexName.toLowerCase(),
            };
          }

          const profileData = await profileResponse.json();
          const profile = profileData[0] || {};

          return {
            symbol: company.symbol,
            name: company.name,
            sector: company.sector || profile.sector || null,
            industry:
              company.subSector || company.industry || profile.industry || null,
            market_cap: profile.mktCap || null,
            dividend_yield:
              profile.lastDiv && profile.price
                ? (profile.lastDiv / profile.price) * 100
                : null,
            price: profile.price || null,
            index_name: indexName.toLowerCase(),
          };
        } catch (error) {
          console.error(`Error fetching data for ${company.symbol}:`, error);
          return {
            symbol: company.symbol,
            name: company.name,
            sector: company.sector || null,
            industry: company.subSector || company.industry || null,
            market_cap: null,
            dividend_yield: null,
            price: null,
            index_name: indexName.toLowerCase(),
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      companies.push(...batchResults);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < limitedData.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return companies;
  } catch (error) {
    console.error(`Error enriching ${indexName} data:`, error);
    return [];
  }
}

// Get companies with highest dividend yield from any index
export async function getHighDividendCompanies(
  indexName: string,
  apiKey: string,
  limit = 20,
): Promise<MarketIndexCompany[]> {
  try {
    // Get all companies from the index
    const companies = await getMarketIndexData(indexName, apiKey);

    // Filter for companies with dividend yield and sort
    return companies
      .filter((c) => c.dividend_yield !== null && c.dividend_yield > 0)
      .sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0))
      .slice(0, limit);
  } catch (error) {
    console.error(
      `Error getting high dividend companies for ${indexName}:`,
      error,
    );
    return [];
  }
}
