// Dynamic API service for market research and SQL generation using DeepSeek, Yahoo Finance, and Supabase
import { createClient } from "@supabase/supabase-js";

export interface ApiKeys {
  deepseek: string;
  marketData: string;
  financialModelingPrep: string;
}

export interface QueryResult {
  data: any[];
  sqlQuery: string;
  explanation?: string;
  error?: string;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface QueryIntent {
  queryType: "company_specific" | "broad_market";
  companies: {
    name: string;
    symbolHint?: string;
    marketHint?: "IN" | "US" | "GLOBAL";
  }[];
  sector?: string;
  market?: string;
  rankingCriterion?: string;
  timeRange?: "1mo" | "3mo" | "6mo" | "1y" | "5y";
}

export interface MarketDataRow {
  symbol: string;
  yahooSymbol: string;
  name: string;
  date: string;
  price: number;
  close: number;
  volume: number;
  currentPrice: number;
  previousClose: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  currency: string;
  exchange: string;
  source: string;
}

export interface CompanySummaryRow {
  symbol: string;
  yahooSymbol: string;
  name: string;
  currentPrice: number;
  previousClose: number | null;
  changePercent: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number;
  currency: string;
  exchange: string;
  source: string;
}

// 1. DeepSeek Intent Analysis
async function analyzeQueryIntent(
  prompt: string,
  apiKey: string,
): Promise<QueryIntent> {
  const systemPrompt = `You are a financial query analyzer. Analyze the user's natural language market research query and determine whether it is a specific company query or a broad market query.

Respond with ONLY a valid JSON object adhering to this schema:
{
  "queryType": "company_specific" | "broad_market",
  "companies": [
    {
      "name": "Company Name",
      "symbolHint": "Likely Yahoo Finance ticker (e.g. TSLA, AAPL, TCS.NS, HDFCBANK.NS)",
      "marketHint": "US" | "IN" | "GLOBAL"
    }
  ],
  "sector": "Sector name if broad query (e.g. Technology, Healthcare, Banking)",
  "market": "Market/Country (e.g. US, India, Global)",
  "rankingCriterion": "Ranking basis (e.g. market_cap, performance, revenue, dividend)",
  "timeRange": "1mo" | "3mo" | "6mo" | "1y" | "5y"
}

Rules:
1. "company_specific": Use when the question mentions one or more specific company names or stock symbols (e.g., "Analyze Tesla", "Can I invest in TCS?", "Show Apple's price history", "Compare Microsoft and Google").
   - Include ONLY the requested company/companies in the "companies" array.
   - NEVER add random or fallback companies.
   - For Indian companies (e.g. TCS, Infosys, Reliance, HDFC Bank, Tata Motors), use marketHint "IN" and suffix .NS on the symbolHint when known (e.g. TCS.NS, INFY.NS, RELIANCE.NS).

2. "broad_market": Use when the question is about a sector, industry, category, or country (e.g., "What are the best technology companies?", "Which healthcare companies performed well?", "Show the top Indian banking stocks").
   - Dynamically identify 5 to 8 of the most prominent, representative, and relevant companies that best answer the question.
   - If the query mentions India or Indian stocks (e.g., "top Indian banking stocks"), choose top Indian stocks (e.g. HDFCBANK.NS, ICICIBANK.NS, SBIN.NS, KOTAKBANK.NS, AXISBANK.NS) with marketHint "IN".
   - If the query mentions US or global technology, choose top technology leaders (e.g. MSFT, AAPL, NVDA, GOOGL, AMZN) with marketHint "US".
   - Do NOT use fixed or static hardcoded lists; select dynamically based on the exact question context.

3. "timeRange": Extract requested time range (1mo, 3mo, 6mo, 1y, 5y). Default to "1y" if unspecified.

Output raw JSON only. No markdown formatting, no code fences.`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `DeepSeek API error (${response.status})`);
    }

    const json = await response.json();
    const rawContent = json.choices?.[0]?.message?.content?.trim() || "{}";
    const cleaned = rawContent.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      queryType: parsed.queryType === "broad_market" ? "broad_market" : "company_specific",
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      sector: parsed.sector || "",
      market: parsed.market || "",
      rankingCriterion: parsed.rankingCriterion || "market_cap",
      timeRange: parsed.timeRange || "1y",
    };
  } catch (error) {
    console.error("DeepSeek intent analysis error:", error);
    throw new Error(
      error instanceof Error
        ? `Failed to interpret query with DeepSeek: ${error.message}`
        : "Failed to interpret query with DeepSeek",
    );
  }
}

// 2. Dynamic Yahoo Finance Ticker Resolution
async function resolveYahooTicker(
  company: { name: string; symbolHint?: string; marketHint?: string },
  isIndianMarket: boolean,
): Promise<string | null> {
  const isIndian = isIndianMarket || company.marketHint === "IN";

  // If a specific symbolHint is provided, test it first
  if (company.symbolHint) {
    const candidates: string[] = [];
    const hint = company.symbolHint.trim().toUpperCase();

    if (hint.includes(".")) {
      candidates.push(hint);
    } else if (isIndian) {
      candidates.push(`${hint}.NS`, `${hint}.BO`);
    } else {
      candidates.push(hint);
    }

    for (const cand of candidates) {
      try {
        const probeRes = await fetch(`/api/yahoo/chart/${encodeURIComponent(cand)}?range=5d&interval=1d`);
        if (probeRes.ok) {
          const payload = await probeRes.json();
          if (payload.chart?.result?.[0]?.timestamp?.length) {
            return cand;
          }
        }
      } catch (err) {
        // Continue to search
      }
    }
  }

  // Use Yahoo Search API to find equity ticker
  const searchTerm = company.name || company.symbolHint || "";
  if (!searchTerm) return null;

  try {
    const searchRes = await fetch(`/api/yahoo/search?q=${encodeURIComponent(searchTerm)}`);
    if (searchRes.ok) {
      const payload = await searchRes.json();
      const quotes: any[] = (payload.quotes || []).filter(
        (q: any) => (q.quoteType === "EQUITY" || q.quoteType === "ETF") && q.symbol,
      );

      if (quotes.length > 0) {
        if (isIndian) {
          const indianQuote = quotes.find(
            (q: any) =>
              q.exchange === "NSI" ||
              q.exchange === "BSE" ||
              q.symbol.endsWith(".NS") ||
              q.symbol.endsWith(".BO"),
          );
          if (indianQuote) return indianQuote.symbol;
        }

        return quotes[0].symbol;
      }
    }
  } catch (err) {
    console.warn(`Search resolution failed for ${searchTerm}:`, err);
  }

  // Fallback candidate formatting if search fails
  if (company.symbolHint) {
    const hint = company.symbolHint.trim().toUpperCase();
    return isIndian && !hint.includes(".") ? `${hint}.NS` : hint;
  }

  return null;
}

// 3. Fetch Live Market Data & Historical Bars from Yahoo Finance
interface FetchedMarketResult {
  ticker: string;
  cleanSymbol: string;
  name: string;
  history: MarketDataRow[];
  summary: CompanySummaryRow;
}

async function fetchMarketDataForTicker(
  ticker: string,
  fallbackName: string,
  timeRange: string = "1y",
): Promise<FetchedMarketResult | null> {
  try {
    const res = await fetch(`/api/yahoo/chart/${encodeURIComponent(ticker)}?range=${timeRange}&interval=1d`);
    if (!res.ok) {
      console.warn(`Yahoo Finance chart endpoint returned status ${res.status} for ${ticker}`);
      return null;
    }

    const payload = await res.json();
    const result = payload.chart?.result?.[0];
    if (!result || !result.timestamp || result.timestamp.length === 0) {
      return null;
    }

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const closes: Array<number | null> = quote.close || [];
    const volumes: Array<number | null> = quote.volume || [];

    const companyName = meta.longName || meta.shortName || fallbackName || ticker;
    const cleanSymbol = ticker.includes(".") ? ticker.split(".")[0] : ticker;
    const currency = meta.currency || "USD";
    const exchange = meta.exchangeName || "";

    const history: MarketDataRow[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (typeof close !== "number" || isNaN(close)) continue;

      const dateStr = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
      history.push({
        symbol: cleanSymbol,
        yahooSymbol: ticker,
        name: companyName,
        date: dateStr,
        price: Number(close.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: volumes[i] || 0,
        currentPrice: meta.regularMarketPrice ?? close,
        previousClose: meta.previousClose ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
        currency,
        exchange,
        source: "Yahoo Finance",
      });
    }

    if (history.length === 0) return null;

    const latestClose = history[history.length - 1].close;
    const currentPrice = meta.regularMarketPrice ?? latestClose;
    const previousClose = meta.previousClose ?? (history.length > 1 ? history[history.length - 2].close : null);
    const changePercent =
      previousClose && previousClose > 0
        ? Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2))
        : 0;

    const summary: CompanySummaryRow = {
      symbol: cleanSymbol,
      yahooSymbol: ticker,
      name: companyName,
      currentPrice: Number(currentPrice.toFixed(2)),
      previousClose: previousClose ? Number(previousClose.toFixed(2)) : null,
      changePercent,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null,
      volume: history[history.length - 1].volume,
      currency,
      exchange,
      source: "Yahoo Finance",
    };

    return {
      ticker,
      cleanSymbol,
      name: companyName,
      history,
      summary,
    };
  } catch (err) {
    console.warn(`Error fetching market data for ${ticker}:`, err);
    return null;
  }
}

// 4. Upsert Data to Supabase — Both historical cache and flat summary table
async function upsertToDatabase(
  results: FetchedMarketResult[],
): Promise<void> {
  const timestamp = new Date().toISOString();

  for (const item of results) {
    // 4a. Upsert historical daily bars to company_data_cache (JSONB array per symbol)
    try {
      const { error: cacheError } = await supabase.from("company_data_cache").upsert(
        {
          symbol: item.ticker,
          data: item.history.slice(-90), // Latest 90 daily bars
          cached_at: timestamp,
          updated_at: timestamp,
        },
        { onConflict: "symbol" },
      );

      if (cacheError) {
        console.warn(`[Supabase] company_data_cache upsert failed for ${item.ticker}:`, cacheError);
      } else {
        console.log(`[Supabase] Stored daily history for ${item.ticker} in company_data_cache`);
      }
    } catch (err) {
      console.warn(`[Supabase] company_data_cache exception for ${item.ticker}:`, err);
    }

    // 4b. Upsert flat summary row to market_summary (structured columns for SQL queries)
    try {
      const s = item.summary;
      const { error: summaryError } = await supabase.from("market_summary").upsert(
        {
          symbol: item.ticker,
          yahoo_symbol: s.yahooSymbol,
          name: s.name,
          current_price: s.currentPrice,
          previous_close: s.previousClose,
          change_percent: s.changePercent,
          fifty_two_week_high: s.fiftyTwoWeekHigh,
          fifty_two_week_low: s.fiftyTwoWeekLow,
          volume: s.volume,
          currency: s.currency,
          exchange: s.exchange,
          source: "Yahoo Finance",
          fetched_at: timestamp,
          updated_at: timestamp,
        },
        { onConflict: "symbol" },
      );

      if (summaryError) {
        // market_summary table might not exist yet — log without throwing
        console.warn(`[Supabase] market_summary upsert failed for ${item.ticker} (table may need migration):`, summaryError.message);
      } else {
        console.log(`[Supabase] Stored live summary for ${item.ticker} in market_summary`);
      }
    } catch (err) {
      console.warn(`[Supabase] market_summary exception for ${item.ticker}:`, err);
    }
  }
}


// 5. Generate SQL Query Using DeepSeek After Data is Persisted
async function generateSQLFromNaturalLanguage(
  prompt: string,
  apiKey: string,
  queryType: "company_specific" | "broad_market",
  tickers: string[],
  dataContext: any[],
): Promise<string> {
  const isSpecific = queryType === "company_specific";
  const tickerList = tickers.map((t) => `'${t}'`).join(", ");

  const systemPrompt = isSpecific
    ? `You are an expert SQL engineer. Convert the user's query into an accurate PostgreSQL query querying the "company_data_cache" table.
Table schema:
company_data_cache (
  id UUID PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  data JSONB NOT NULL, -- Array of daily price records: [{ date, symbol, name, price, close, volume, currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow, currency, exchange }]
  cached_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

Query requirements:
- Return the relevant records for symbol(s): ${tickerList}.
- You can query directly against company_data_cache or expand the JSONB array using jsonb_to_recordset.
- Output ONLY the clean SQL query. No markdown, no commentary, no code fences.`
    : `You are an expert SQL engineer. Convert the user's broad market query into an accurate PostgreSQL query ranking or filtering market performance data.
Table schema:
market_summary (
  symbol TEXT PRIMARY KEY,
  yahoo_symbol TEXT,
  name TEXT,
  current_price NUMERIC(12, 4),
  previous_close NUMERIC(12, 4),
  change_percent NUMERIC(8, 4),
  fifty_two_week_high NUMERIC(12, 4),
  fifty_two_week_low NUMERIC(12, 4),
  volume BIGINT,
  currency TEXT,
  exchange TEXT,
  source TEXT,
  fetched_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

Query requirements:
- Filter by the exact symbols stored: ${tickerList}.
- Apply appropriate ORDER BY (e.g. ORDER BY current_price DESC or change_percent DESC) and a LIMIT matching the user's request.
- Output ONLY the clean SQL query. No markdown, no commentary, no code fences.`;

  const fallbackSpecific = `SELECT symbol, data FROM company_data_cache WHERE symbol IN (${tickerList});`;
  const fallbackBroad = `SELECT symbol, name, current_price, change_percent, volume FROM market_summary WHERE symbol IN (${tickerList}) ORDER BY current_price DESC;`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `User query: ${prompt}\n\nStored data preview:\n${JSON.stringify(dataContext.slice(0, 5))}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      return isSpecific ? fallbackSpecific : fallbackBroad;
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content?.trim() || "";
    return content.replace(/```sql\s*|\s*```/gi, "").trim();
  } catch (err) {
    console.warn("SQL generation error:", err);
    return isSpecific ? fallbackSpecific : fallbackBroad;
  }
}


// 6. DeepSeek Query Explanation

async function generateQueryExplanation(
  prompt: string,
  queryType: "company_specific" | "broad_market",
  data: any[],
  apiKey: string,
): Promise<string> {
  const isSpecific = queryType === "company_specific";

  const systemPrompt = isSpecific
    ? `You analyze financial market data for a specific company query.
Provide a concise, factual, and educational overview based strictly on the supplied price data:
- Mention the company name, ticker, and exchange.
- Summarize recent price action, 52-week position (near high or low), and trading volume.
- State clearly that this is educational market analysis, not personalized financial advice.
- Keep it under 150 words. Plain text only, no markdown headers.`
    : `You analyze broad market financial comparison data.
Provide a concise, factual, and educational summary of the ranked companies:
- Highlight the leading stocks and notable performance or valuation differences.
- Summarize the sector or regional context reflected in the data.
- Keep it under 150 words. Plain text only, no markdown headers.`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `User query: ${prompt}\n\nMarket Data:\n${JSON.stringify(data.slice(0, 10))}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return "";
    const json = await response.json();
    return json.choices?.[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.warn("Explanation generation error:", err);
    return "";
  }
}

// 7. Main Process Function
export async function processNaturalLanguageQuery(
  prompt: string,
  apiKeys: ApiKeys,
): Promise<QueryResult> {
  try {
    if (!apiKeys.deepseek) {
      throw new Error("DeepSeek API key is required. Please set it in Settings.");
    }

    console.log("[Query Flow] Analyzing natural language query intent:", prompt);

    // Step 1: DeepSeek identifies company or broad market scope
    const intent = await analyzeQueryIntent(prompt, apiKeys.deepseek);
    console.log("[Query Flow] Interpreted intent:", intent);

    const isIndianQuery =
      intent.market?.toLowerCase().includes("india") ||
      prompt.toLowerCase().includes("india") ||
      prompt.toLowerCase().includes("nifty") ||
      prompt.toLowerCase().includes("bse") ||
      prompt.toLowerCase().includes("nse");

    if (intent.companies.length === 0) {
      throw new Error(
        "Could not identify any target companies or market sector for your question. Please try rephrasing with specific companies or sectors.",
      );
    }

    // Step 2: Resolve Yahoo Finance tickers dynamically
    console.log("[Query Flow] Resolving Yahoo Finance tickers for companies...");
    const resolvedTickers: { companyName: string; ticker: string }[] = [];

    for (const company of intent.companies) {
      const ticker = await resolveYahooTicker(company, isIndianQuery);
      if (ticker) {
        resolvedTickers.push({
          companyName: company.name,
          ticker,
        });
      }
    }

    if (resolvedTickers.length === 0) {
      throw new Error(
        `Unable to resolve Yahoo Finance tickers for: ${intent.companies.map((c) => c.name).join(", ")}. Please verify the company names.`,
      );
    }

    console.log(
      "[Query Flow] Resolved tickers:",
      resolvedTickers.map((r) => `${r.companyName} -> ${r.ticker}`).join(", "),
    );

    // Step 3: Fetch live and historical data from Yahoo Finance
    const fetchPromises = resolvedTickers.map((r) =>
      fetchMarketDataForTicker(r.ticker, r.companyName, intent.timeRange || "1y"),
    );
    const fetchedResults = (await Promise.all(fetchPromises)).filter(
      (item): item is FetchedMarketResult => item !== null,
    );

    if (fetchedResults.length === 0) {
      throw new Error(
        `Could not fetch live market data from Yahoo Finance for tickers: ${resolvedTickers.map((r) => r.ticker).join(", ")}. Please check your network connection or try again later.`,
      );
    }

    // Step 4: Insert or update all fetched records in Supabase
    console.log("[Query Flow] Upserting latest market data into Supabase cache...");
    await upsertToDatabase(fetchedResults);

    // Step 5: Format presentation data according to query flow
    let displayData: any[] = [];
    if (intent.queryType === "company_specific") {
      // For single or specific companies: return daily price history for charting & inspection
      if (fetchedResults.length === 1) {
        displayData = fetchedResults[0].history.slice(-90);
      } else {
        // Multiple specific companies: combine historical rows
        displayData = fetchedResults.flatMap((r) => r.history.slice(-60));
      }
    } else {
      // For broad market query: return ranked comparison table (one row per company)
      displayData = fetchedResults.map((r) => r.summary);
      // Sort by currentPrice or changePercent
      displayData.sort((a, b) => b.currentPrice - a.currentPrice);
    }

    // Step 6: Generate SQL query using updated database data
    console.log("[Query Flow] Generating SQL query with DeepSeek...");
    const tickerList = fetchedResults.map((r) => r.ticker);
    const sqlQuery = await generateSQLFromNaturalLanguage(
      prompt,
      apiKeys.deepseek,
      intent.queryType,
      tickerList,
      displayData,
    );

    // Step 7: Generate DeepSeek explanation of the results
    console.log("[Query Flow] Generating results explanation...");
    const explanation = await generateQueryExplanation(
      prompt,
      intent.queryType,
      displayData,
      apiKeys.deepseek,
    );

    // Store query results history in Supabase if user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        await supabase.from("query_results").insert({
          user_id: user.id,
          query_text: prompt,
          sql_query: sqlQuery,
          result_data: displayData,
        });
      } catch (err) {
        console.warn("Could not record query history in Supabase:", err);
      }
    }

    return {
      data: displayData,
      sqlQuery,
      explanation,
    };
  } catch (error) {
    console.error("[Query Flow] Error processing natural language query:", error);
    return {
      data: [],
      sqlQuery: "",
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// 8. API Key Persistence
export async function saveApiKeys(keys: ApiKeys): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always save to localStorage
  localStorage.setItem("api_keys", JSON.stringify(keys));

  if (!user) return;

  try {
    const { data: existingKeys } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingKeys) {
      await supabase
        .from("api_keys")
        .update({
          openai_key: keys.deepseek,
          financial_modeling_prep_key: keys.financialModelingPrep,
          market_data_key: keys.marketData,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      await supabase.from("api_keys").insert({
        user_id: user.id,
        openai_key: keys.deepseek,
        financial_modeling_prep_key: keys.financialModelingPrep,
        market_data_key: keys.marketData,
      });
    }
  } catch (err) {
    console.warn("Error saving API keys to Supabase:", err);
  }
}

export async function loadApiKeys(): Promise<ApiKeys> {
  const defaultKeys: ApiKeys = {
    deepseek: "",
    marketData: "",
    financialModelingPrep: "",
  };

  try {
    const savedKeys = localStorage.getItem("api_keys");
    let local: Partial<ApiKeys> = {};
    if (savedKeys) {
      const parsed = JSON.parse(savedKeys);
      local = {
        deepseek: parsed.deepseek || parsed.openai || "",
        marketData: parsed.marketData || "",
        financialModelingPrep: parsed.financialModelingPrep || "",
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: keys } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (keys) {
        return {
          deepseek: keys.openai_key || local.deepseek || "",
          financialModelingPrep:
            keys.financial_modeling_prep_key || local.financialModelingPrep || "",
          marketData: keys.market_data_key || local.marketData || "",
        };
      }
    }

    return {
      deepseek: local.deepseek || "",
      marketData: local.marketData || "",
      financialModelingPrep: local.financialModelingPrep || "",
    };
  } catch (err) {
    console.error("Error loading API keys:", err);
    return defaultKeys;
  }
}
