import React, { useState, useEffect, useCallback, useRef } from "react";
import QueryInput from "@/components/sql-generator/QueryInput";
import { ResultsDisplay } from "@/components/sql-generator/ResultsDisplay";
import VisualizationSection from "@/components/sql-generator/VisualizationSection";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import {
  processNaturalLanguageQuery,
  loadApiKeys,
  saveApiKeys,
  ApiKeys,
} from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/layout/Layout";
import { Loader2, Settings, List } from "lucide-react";
import { BackToTop } from "@/components/ui/back-to-top";
import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define types for better code organization
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

export default function SQLGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[] | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    deepseek: "",
    marketData: "",
    financialModelingPrep: "",
  });
  const [showVisualization, setShowVisualization] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [lastQuery, setLastQuery] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const { toast } = useToast();
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Check if API keys are set on component mount
  useEffect(() => {
    const loadKeys = async () => {
      const keys = await loadApiKeys();
      setApiKeys(keys);
      if (!keys.deepseek) {
        setShowSettings(true);
        toast({
          title: "API Keys Required",
          description: "Please set your API keys to use the application.",
          variant: "destructive",
        });
      }
    };

    loadKeys();
  }, []);

  // Generate chart data based on the query results - now with dynamic field detection
  const generateChartData = useCallback(
    (resultData: any[], queryText: string) => {
      if (!resultData || resultData.length === 0) return null;

      const queryLower = queryText.toLowerCase();
      const firstRow = resultData[0];
      const allKeys = Object.keys(firstRow);

      // ── Step 1: determine chart type based on data shape ──────────────
      const hasDate = "date" in firstRow || "Date" in firstRow;
      let bestChartType: "bar" | "line" | "pie" = hasDate && resultData.length > 1 ? "line" : "bar";

      // ── Step 2: determine label field ──────────────────────────────────
      let labelField = "";
      if (hasDate) {
        labelField = allKeys.find((k) => k.toLowerCase() === "date") || "date";
      } else {
        const labelCandidates = ["name", "symbol", "company", "sector", "industry"];
        for (const candidate of labelCandidates) {
          const match = allKeys.find((k) => k.toLowerCase().includes(candidate));
          if (match) { labelField = match; break; }
        }
        if (!labelField) labelField = allKeys[0];
      }

      // ── Step 3: determine value field ─────────────────────────────────
      let valueField = "";

      if (hasDate) {
        // Time-series: prefer close, then price, then first numeric
        valueField =
          allKeys.find((k) => k.toLowerCase() === "close") ||
          allKeys.find((k) => k.toLowerCase() === "price") ||
          allKeys.find((k) => typeof firstRow[k] === "number" && k !== "id") ||
          "";
        bestChartType = "line";
      } else {
        // Broad comparative: map query keywords to field hints
        const queryContexts = [
          { keywords: ["capital", "market cap", "marketcap", "valuation", "size"], fieldHints: ["cap", "market", "marketcap"] },
          { keywords: ["price", "stock price", "share price", "current"], fieldHints: ["currentprice", "price", "current"] },
          { keywords: ["change", "gain", "return", "performance", "grew", "growth"], fieldHints: ["changepercent", "change", "percent", "return"] },
          { keywords: ["revenue", "sales"], fieldHints: ["revenue", "sales"] },
          { keywords: ["dividend", "yield"], fieldHints: ["dividend", "yield"] },
          { keywords: ["volume", "traded"], fieldHints: ["volume"] },
          { keywords: ["earnings", "eps", "income", "profit"], fieldHints: ["eps", "earnings", "income", "profit"] },
          { keywords: ["52week", "52 week", "high", "range"], fieldHints: ["fiftytwoweekhigh", "high"] },
        ];

        let bestScore = -1;
        for (const ctx of queryContexts) {
          const score = ctx.keywords.reduce((s, kw) => s + (queryLower.includes(kw) ? 1 : 0), 0);
          if (score > bestScore) {
            for (const hint of ctx.fieldHints) {
              const match = allKeys.find((k) => k.toLowerCase().includes(hint));
              if (match && typeof firstRow[match] === "number") {
                bestScore = score;
                valueField = match;
                break;
              }
            }
          }
        }

        // Fallback: best numeric field that is not id, not a zero-heavy field
        if (!valueField) {
          // Prefer currentPrice > price > close > first numeric
          const preferredOrder = ["currentprice", "price", "close", "changepercent", "volume"];
          for (const pref of preferredOrder) {
            const match = allKeys.find((k) => k.toLowerCase().includes(pref));
            if (match && typeof firstRow[match] === "number") {
              valueField = match;
              break;
            }
          }
          // Ultimate fallback: first numeric key
          if (!valueField) {
            valueField = allKeys.find((k) => typeof firstRow[k] === "number" && k.toLowerCase() !== "id") || allKeys[1] || "";
          }
        }
      }

      // ── Step 4: set chart type state & build chart data ───────────────
      setChartType(bestChartType);

      const COLORS = [
        "#26A69A", "#4CAF50", "#2196F3", "#9C27B0", "#FF9800",
        "#F44336", "#673AB7", "#3F51B5", "#009688", "#795548",
        "#607D8B", "#E91E63", "#CDDC39", "#00BCD4", "#FFC107",
        "#8BC34A", "#03A9F4", "#FF5722", "#9E9E9E", "#3F51B5",
      ];

      return {
        labels: resultData.map((item, idx) => String(item[labelField] ?? `Item ${idx + 1}`)),
        datasets: [
          {
            label: valueField
              ? valueField.charAt(0).toUpperCase() + valueField.slice(1).replace(/([A-Z])/g, " $1").trim()
              : "Value",
            data: resultData.map((item) => {
              if (!valueField) {
                const numKey = Object.keys(item).find((k) => typeof item[k] === "number" && k !== "id");
                return numKey ? Number(item[numKey]) || 0 : 0;
              }
              return Number(item[valueField]) || 0;
            }),
            backgroundColor: resultData.map((_, i) => COLORS[i % COLORS.length]),
            borderWidth: 1,
          },
        ],
      };
    },
    [],
  );




  const handleGenerate = async (prompt: string) => {

    try {
      setIsLoading(true);
      setError(null);
      setLastQuery(prompt);
      setPrompt(prompt); // Save the prompt for future reference

      // Load the latest API keys
      const latestKeys = await loadApiKeys();
      setApiKeys(latestKeys);

      // Check if API keys are set
      if (!latestKeys.deepseek) {
        setShowSettings(true);
        throw new Error(
          "API keys are required. Please set them in the settings.",
        );
      }

      // Process the natural language query using real APIs
      const result = await processNaturalLanguageQuery(prompt, latestKeys);

      if (result.error) {
        throw new Error(result.error);
      }

      // Set the data and SQL query
      setData(result.data);
      setSqlQuery(result.sqlQuery);
      setExplanation(result.explanation || "");

      // Generate chart data if we have results
      if (result.data && result.data.length > 0) {
        const newChartData = generateChartData(result.data, prompt);
        setChartData(newChartData);
        setShowVisualization(true);
      } else {
        setShowVisualization(false);
        throw new Error(
          "No data available for this query. Our system is designed to fetch real-time data for any market index or financial query. If you're seeing this error, it might be due to API rate limits or the specific data not being available through our current data providers. Please try a different query or check your API keys.",
        );
      }
    } catch (err) {
      console.error("Error generating results:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to process query",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKeys = async (keys: ApiKeys) => {
    setApiKeys(keys);
    await saveApiKeys(keys);
    setShowSettings(false);
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved successfully.",
    });
  };

  // Handle chart type change from visualization section
  const handleChartTypeChange = (type: "bar" | "line" | "pie") => {
    setChartType(type);
  };

  return (
    <Layout>
      <div className="flex w-full h-full">
        <div className="hidden md:block w-48 lg:w-64 h-screen overflow-auto border-r p-4 sticky top-0">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <List className="h-4 w-4" /> Navigation
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                href="#query-input"
                className="text-sm hover:text-[#26A69A] block py-1"
              >
                Query Input
              </a>
            </li>
            <li>
              <a
                href="#results"
                className="text-sm hover:text-[#26A69A] block py-1"
              >
                Results
              </a>
            </li>
            <li>
              <a
                href="#visualization"
                className="text-sm hover:text-[#26A69A] block py-1"
              >
                Visualization
              </a>
            </li>
          </ul>
        </div>
        <div className="flex-1 space-y-6 pb-80 overflow-auto">
          {/* Added more padding at the bottom for scrolling */}
          <div className="flex justify-between items-center sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-4 border-b">
            <h1 className="text-3xl font-bold">
              Natural Language <span className="text-[#26A69A]">SQL</span>{" "}
              Generator
            </h1>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="rounded-full h-10 w-10"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div id="query-input" className="grid grid-cols-1 gap-6">
            <div>
              <div className="bg-card rounded-lg border shadow-sm p-6">
                <QueryInput
                  onGenerate={handleGenerate}
                  isLoading={isLoading}
                  initialPrompt={prompt}
                />
              </div>
            </div>
          </div>

          <div id="results" ref={resultsRef}>
            <ResultsDisplay
              data={data}
              sqlQuery={sqlQuery}
              explanation={explanation}
              isLoading={isLoading}
              error={error}
            />
          </div>

          {isLoading && !data && (
            <div className="w-full flex justify-center py-8">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#26A69A]" />
                <p className="mt-4 text-muted-foreground">
                  Generating visualization...
                </p>
              </div>
            </div>
          )}

          {showVisualization && data && data.length > 0 && chartData && (
            <section id="visualization" className="mt-4">
              <VisualizationSection
                data={data}
                isVisible={showVisualization}
                chartData={chartData}
                chartType={chartType}
              />
            </section>
          )}
        </div>
      </div>

      <SettingsDialog
        apiKeys={apiKeys}
        onSaveApiKeys={handleSaveApiKeys}
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      <BackToTop />
    </Layout>
  );
}
