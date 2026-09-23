import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Info,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResultsDisplayProps {
  data: any[] | null;
  sqlQuery: string | null;
  explanation?: string;
  isLoading: boolean;
  error?: string | null;
}

export function ResultsDisplay({
  data = null,
  sqlQuery = null,
  explanation = "",
  isLoading = false,
  error = null,
}: ResultsDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState<any[] | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [dataKeys, setDataKeys] = useState<string[]>([]);

  // Update data keys when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Get all unique keys from all data items
      const allKeys = new Set<string>();
      data.forEach((item) => {
        Object.keys(item).forEach((key) => allKeys.add(key));
      });
      setDataKeys(Array.from(allKeys));
    }
  }, [data]);

  const handleCopy = async () => {
    if (sqlQuery) {
      await navigator.clipboard.writeText(sqlQuery);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCSV = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header] || "")).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "market_data.csv");
    link.click();
  };

  const handleDownloadJSON = () => {
    if (!data || data.length === 0) return;

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "market_data.json");
    link.click();
  };

  // Filter data based on search term
  useEffect(() => {
    if (!data) {
      setFilteredData(null);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredData(data);
      return;
    }

    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = data.filter((item) => {
      return Object.values(item).some((value) => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowercasedTerm);
      });
    });

    setFilteredData(filtered);
  }, [data, searchTerm]);

  // Sort data based on column
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";

    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }

    setSortConfig({ key, direction });
  };

  // Apply sorting to filtered data
  useEffect(() => {
    if (!filteredData || !sortConfig) return;

    const sortedData = [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] === null) return 1;
      if (b[sortConfig.key] === null) return -1;

      if (
        typeof a[sortConfig.key] === "number" &&
        typeof b[sortConfig.key] === "number"
      ) {
        return sortConfig.direction === "ascending"
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      }

      // String comparison
      const aString = String(a[sortConfig.key]).toLowerCase();
      const bString = String(b[sortConfig.key]).toLowerCase();

      if (sortConfig.direction === "ascending") {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });

    setFilteredData(sortedData);
  }, [sortConfig]);

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === "N/A") return "N/A";

    if (typeof value === "number") {
      // Format large numbers with commas
      if (value > 1000000) {
        return new Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 2,
        }).format(value);
      }
      // Format percentages for fields that are likely percentages
      const percentageFields = [
        "profitMargin",
        "grossMargin",
        "operatingMargin",
        "netIncomeMargin",
        "revenueGrowth",
        "earningsGrowth",
        "dividendYield",
        "returnOnEquity",
        "returnOnAssets",
        "payout",
        "yield",
      ];
      const fieldNameLower = String(value).toLowerCase();
      const isLikelyPercentage =
        percentageFields.some((field) =>
          fieldNameLower.includes(field.toLowerCase()),
        ) ||
        (value < 100 && value > -100 && String(value).includes("."));

      if (isLikelyPercentage) {
        return value.toFixed(2) + "%";
      }
      return value.toString();
    }

    if (typeof value === "object") return JSON.stringify(value);
    return value.toString();
  };

  // Get appropriate CSS class for a cell based on value
  const getCellClass = (key: string, value: any): string => {
    let baseClass = "px-4 py-2 text-sm";

    // Add color coding for financial metrics
    if (typeof value === "number") {
      const keyLower = key.toLowerCase();

      // Positive values in green for growth, yield, profit metrics
      if (
        (keyLower.includes("growth") ||
          keyLower.includes("yield") ||
          keyLower.includes("profit") ||
          keyLower.includes("margin") ||
          keyLower.includes("return") ||
          keyLower.includes("change")) &&
        value > 0
      ) {
        return `${baseClass} text-green-600 font-medium`;
      }

      // Negative values in red
      if (
        (keyLower.includes("growth") ||
          keyLower.includes("yield") ||
          keyLower.includes("profit") ||
          keyLower.includes("margin") ||
          keyLower.includes("return") ||
          keyLower.includes("change")) &&
        value < 0
      ) {
        return `${baseClass} text-red-600 font-medium`;
      }

      // Market cap and other large values in blue
      if (
        (keyLower.includes("marketcap") ||
          keyLower.includes("mktcap") ||
          keyLower.includes("revenue") ||
          keyLower.includes("sales") ||
          keyLower.includes("assets")) &&
        value > 1000000000
      ) {
        return `${baseClass} text-blue-600 font-medium`;
      }
    }

    // Highlight N/A values differently
    if (value === "N/A" || value === null || value === undefined) {
      return `${baseClass} text-gray-400 italic`;
    }

    return baseClass;
  };

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-card rounded-lg border shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#26A69A] mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Processing your request...
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Connecting to APIs and generating SQL query. This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-card rounded-lg border shadow-sm p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 text-center">
          <p className="text-muted-foreground mb-4">
            Please check your API keys in settings and try again.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mx-auto"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data || !sqlQuery) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-card rounded-lg border shadow-sm">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-medium mb-2">No results to display</h3>
          <p className="text-muted-foreground">
            Enter a natural language query above and click Generate to see
            market research data and SQL queries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full shadow-sm overflow-hidden">
      <Tabs defaultValue="data" className="w-full">
        <div className="flex items-center justify-between px-6 pt-6 flex-wrap gap-4 sticky top-0 bg-card z-10">
          <TabsList className="bg-muted/80 backdrop-blur-sm">
            <TabsTrigger value="data">Data Results</TabsTrigger>
            <TabsTrigger value="sql">SQL Query</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              disabled={!data || data.length === 0}
              className="rounded-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJSON}
              disabled={!data || data.length === 0}
              className="rounded-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        <TabsContent value="data" className="p-6 pt-4">
          {filteredData && filteredData.length > 0 ? (
            <>
              <div className="flex items-center mb-4 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search data..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {dataKeys.map((key) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => requestSort(key)}
                      >
                        <div className="flex items-center">
                          {sortConfig && sortConfig.key === key ? (
                            sortConfig.direction === "ascending" ? (
                              <SortAsc className="h-4 w-4 mr-2" />
                            ) : (
                              <SortDesc className="h-4 w-4 mr-2" />
                            )
                          ) : null}
                          {key}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredData.length} of {data.length} results
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click column headers to sort</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <ScrollArea className="h-[500px] w-full" scrollHideDelay={0}>
                <div className="w-full overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        {dataKeys.map((header) => (
                          <th
                            key={header}
                            className="border px-4 py-2 text-left cursor-pointer hover:bg-muted/80"
                            onClick={() => requestSort(header)}
                          >
                            <div className="flex items-center">
                              {header}
                              {sortConfig &&
                                sortConfig.key === header &&
                                (sortConfig.direction === "ascending" ? (
                                  <SortAsc className="h-4 w-4 ml-1" />
                                ) : (
                                  <SortDesc className="h-4 w-4 ml-1" />
                                ))}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={
                            rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30"
                          }
                        >
                          {dataKeys.map((header) => (
                            <td
                              key={header}
                              className={getCellClass(header, row[header])}
                            >
                              {formatValue(row[header])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sql" className="p-6 pt-4">
          <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="w-full"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Generated SQL Query</h3>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <div className="mt-4 relative">
                <pre
                  className={cn(
                    "p-4 rounded-md bg-muted overflow-x-auto",
                    "text-sm font-mono",
                  )}
                >
                  <code>{sqlQuery}</code>
                </pre>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                This SQL query was generated from your natural language prompt
                using DeepSeek's API. You can use it as a starting point for your
                own database queries.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {explanation && (
          <TabsContent value="data" className="px-6 pb-6 pt-0">
            <Alert className="border-[#26A69A]/30 bg-[#26A69A]/5">
              <Info className="h-4 w-4" />
              <AlertTitle>What these results mean</AlertTitle>
              <AlertDescription className="mt-2 whitespace-pre-wrap leading-relaxed">
                {explanation}
              </AlertDescription>
            </Alert>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
