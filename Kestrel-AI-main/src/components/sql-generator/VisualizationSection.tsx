import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  BarChart,
  LineChart,
  PieChart,
  Settings,
  Download,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import Highcharts
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

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

interface VisualizationSectionProps {
  data?: any[];
  isVisible?: boolean;
  chartData?: ChartData;
  chartType?: "bar" | "line" | "pie";
}

const VisualizationSection = ({
  data = [],
  isVisible = true,
  chartData,
  chartType = "bar",
}: VisualizationSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentChartType, setCurrentChartType] = useState<
    "bar" | "line" | "pie"
  >(chartType);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDataField, setSelectedDataField] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [chartTitle, setChartTitle] = useState<string>("");
  const [chartOptions, setChartOptions] = useState<Highcharts.Options>({});
  const [colorScheme, setColorScheme] = useState<string>("multi");
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Color schemes — rich, vibrant, financial-grade palettes
  const colorSchemes = {
    // Default: vivid rainbow spectrum for multi-company comparison
    teal: [
      "#00C6B6", "#0891B2", "#7C3AED", "#DB2777", "#EA580C",
      "#16A34A", "#CA8A04", "#DC2626", "#2563EB", "#059669",
      "#D97706", "#7C3AED",
    ],
    // Electric blue gradient family
    blue: [
      "#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD",
      "#0EA5E9", "#38BDF8", "#7DD3FC", "#0284C7", "#0369A1",
    ],
    // Rich purple gradient
    purple: [
      "#6D28D9", "#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD",
      "#9333EA", "#A855F7", "#C084FC", "#D8B4FE", "#4C1D95",
    ],
    // Emerald finance green
    green: [
      "#065F46", "#047857", "#059669", "#10B981", "#34D399",
      "#6EE7B7", "#A7F3D0", "#16A34A", "#22C55E", "#4ADE80",
    ],
    // Amber-orange fire
    orange: [
      "#92400E", "#B45309", "#D97706", "#F59E0B", "#FBBF24",
      "#FCD34D", "#FDE68A", "#EA580C", "#F97316", "#FB923C",
    ],
    // Rose-red spectrum
    red: [
      "#7F1D1D", "#991B1B", "#B91C1C", "#DC2626", "#EF4444",
      "#F87171", "#FCA5A5", "#BE185D", "#EC4899", "#F9A8D4",
    ],
    // Vivid multi-color (default for broad market): curated for max contrast
    multi: [
      "#6366F1", // indigo
      "#0EA5E9", // sky blue
      "#10B981", // emerald
      "#F59E0B", // amber
      "#EF4444", // red
      "#8B5CF6", // violet
      "#06B6D4", // cyan
      "#84CC16", // lime
      "#F97316", // orange
      "#EC4899", // pink
      "#14B8A6", // teal
      "#A855F7", // purple
    ],
  };

  // Initialize available fields and selected field when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Find numeric fields for charting
      const numericFields = Object.keys(data[0]).filter(
        (key) => typeof data[0][key] === "number" && key !== "id",
      );
      setAvailableFields(numericFields);

      // Always auto-select the best value field for the new dataset
      // Prefer: currentPrice → current_price → price → close → changePercent → first numeric
      const PREFERRED_FIELDS = [
        "currentPrice", "current_price", "currentprice",
        "price", "close",
        "changePercent", "change_percent", "changepercent",
        "volume",
      ];

      let bestField = "";
      for (const pref of PREFERRED_FIELDS) {
        const match = numericFields.find((k) => k.toLowerCase() === pref.toLowerCase());
        if (match) { bestField = match; break; }
      }
      // Fallback to first numeric
      if (!bestField && numericFields.length > 0) {
        bestField = numericFields[0];
      }

      if (bestField) {
        setSelectedDataField(bestField);
        setChartTitle(
          `${bestField.charAt(0).toUpperCase() + bestField.slice(1).replace(/([A-Z_])/g, (m) => (m === "_" ? " " : " " + m)).trim()} Comparison`,
        );
      }
    }
  }, [data]);



  // Sync parent-provided chartType prop into local state whenever it changes
  useEffect(() => {
    setCurrentChartType(chartType);
  }, [chartType]);

  // Update chart when chartData, currentChartType, or selectedDataField changes
  useEffect(() => {
    if (chartData || (data && data.length > 0 && selectedDataField)) {
      // Add a small delay to ensure the container is rendered and has dimensions
      const timer = setTimeout(() => {
        updateChartOptions();
        // Force a reflow of the chart if it exists
        if (chartRef.current && chartRef.current.chart) {
          chartRef.current.chart.reflow();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chartData, currentChartType, selectedDataField, colorScheme, data]);


  // Handle chart type change
  const handleChartTypeChange = (type: "bar" | "line" | "pie") => {
    setCurrentChartType(type);
  };

  // Toggle edit mode
  const handleToggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // Handle data field selection change
  const handleDataFieldChange = (field: string) => {
    setSelectedDataField(field);
    setChartTitle(
      `${field.charAt(0).toUpperCase() + field.slice(1)} Comparison`,
    );
  };

  // Handle color scheme change
  const handleColorSchemeChange = (scheme: string) => {
    setColorScheme(scheme);
  };

  // Generate chart data based on selected field
  const generateChartData = () => {
    if (!data || data.length === 0 || !selectedDataField) {
      return chartData || null;
    }

    // Get label field (usually name, symbol, or company)
    const labelField =
      Object.keys(data[0]).find(
        (key) =>
          key.toLowerCase().includes("name") ||
          key.toLowerCase().includes("symbol") ||
          key.toLowerCase().includes("company"),
      ) || Object.keys(data[0])[0];

    // Determine if we should sort the data
    let processedData = [...data];

    // Get the data values for the selected field
    const dataValues = processedData.map(
      (item) => item[selectedDataField] || 0,
    );

    // Generate appropriate colors based on data values
    const colors =
      colorSchemes[colorScheme as keyof typeof colorSchemes] ||
      colorSchemes.teal;

    // For percentage or ratio fields, use a gradient color scheme
    const isPercentageField =
      selectedDataField.toLowerCase().includes("percent") ||
      selectedDataField.toLowerCase().includes("ratio") ||
      selectedDataField.toLowerCase().includes("yield");

    // Generate background colors based on data values
    const backgroundColors = isPercentageField
      ? dataValues.map((value, index) => {
          // For percentage fields, use a gradient from red (low) to green (high)
          const normalizedValue = Math.min(Math.max(value / 100, 0), 1); // Normalize to 0-1
          return colors[Math.floor(normalizedValue * (colors.length - 1))];
        })
      : colors;

    return {
      labels: processedData.map((item) => item[labelField] || "Unknown"),
      datasets: [
        {
          label:
            selectedDataField.charAt(0).toUpperCase() +
            selectedDataField.slice(1),
          data: processedData.map((item) => item[selectedDataField] || 0),
          backgroundColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Update Highcharts options — beautiful visual upgrade
  const updateChartOptions = () => {
    const generatedData = generateChartData();
    if (!generatedData) return;

    const { labels, datasets } = generatedData;
    const palette =
      colorSchemes[colorScheme as keyof typeof colorSchemes] ??
      colorSchemes.multi;

    // Smart value formatting for large numbers
    const dataMax = Math.max(...datasets[0].data);
    const hasLargeValues = dataMax > 1_000_000;
    const isCurrency =
      selectedDataField?.toLowerCase().includes("price") ||
      selectedDataField?.toLowerCase().includes("current") ||
      selectedDataField?.toLowerCase().includes("close");
    const isPercent =
      selectedDataField?.toLowerCase().includes("percent") ||
      selectedDataField?.toLowerCase().includes("change");

    const formatValue = (v: number): string => {
      if (hasLargeValues) {
        if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
        if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
      }
      if (isPercent) return `${v.toFixed(2)}%`;
      if (isCurrency) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return v.toFixed(2);
    };

    // Per-point colors for bar charts (one vivid color per company)
    const pointColors = labels.map((_, i) => palette[i % palette.length]);

    // Gradient stop helper
    const gradStop = (hex: string, alpha: number): string =>
      Highcharts.color(hex).setOpacity(alpha).get("rgba") as string;

    const isBar  = currentChartType === "bar";
    const isLine = currentChartType === "line";
    const isPie  = currentChartType === "pie";

    const options: Highcharts.Options = {
      chart: {
        type: isPie ? "pie" : isLine ? "areaspline" : "column",
        backgroundColor: "transparent",
        style: { fontFamily: "'Inter', 'Segoe UI', sans-serif" },
        zooming: { type: "xy", mouseWheel: true },
        animation: { duration: 900, easing: "easeOutCubic" } as any,
        spacing: [20, 20, 20, 20],
        events: {
          load: function () {
            setTimeout(() => { if (this.reflow) this.reflow(); }, 150);
          },
        },
      },

      title: {
        text: chartTitle,
        style: {
          color: "#6366F1",
          fontWeight: "700",
          fontSize: "17px",
          letterSpacing: "-0.3px",
        },
        margin: 24,
      },

      subtitle: {
        text: "Scroll or drag to zoom • Click legend to toggle",
        style: { fontSize: "11px", color: "#94A3B8", fontStyle: "italic" },
      },

      credits: { enabled: false },

      colors: palette,

      // ─── Tooltip ────────────────────────────────────────────────────────
      tooltip: {
        useHTML: true,
        shared: true,
        shadow: { color: "rgba(99,102,241,0.25)", offsetX: 0, offsetY: 4, opacity: 0.5, width: 12 } as any,
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderRadius: 12,
        borderWidth: 0,
        style: { color: "#F1F5F9", fontSize: "13px" },
        padding: 12,
        headerFormat:
          `<div style="font-size:12px;color:#94A3B8;margin-bottom:6px;font-weight:600;">{point.key}</div>`,
        pointFormatter: function (this: Highcharts.Point) {
          const v = (this as any).y as number;
          const color = (this as any).color as string;
          const name  = (this.series as Highcharts.Series).name;
          return `<div style="display:flex;align-items:center;gap:8px;margin:2px 0;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
            <span style="color:#CBD5E1;">${name}</span>
            <span style="margin-left:auto;font-weight:700;color:#F1F5F9;">${formatValue(v)}</span>
          </div>`;
        },
        footerFormat: "",
      },

      // ─── Plot Options ────────────────────────────────────────────────────
      plotOptions: {
        series: {
          animation: { duration: 900 },
          states: {
            hover: { brightness: 0.08, halo: { size: 8, opacity: 0.25 } },
            inactive: { opacity: 0.35 },
          },
          dataLabels: {
            enabled: isBar && labels.length <= 12,
            formatter: function (this: any) {
              const v = (this.y as number);
              if (v === 0) return "";
              return `<span style="font-weight:700;font-size:10px;">${formatValue(v)}</span>`;
            },
            useHTML: true,
            style: { textOutline: "none" },
            crop: false,
            overflow: "allow",
          },
        },

        column: {
          pointPadding: 0.08,
          groupPadding: 0.12,
          borderWidth: 0,
          borderRadius: 6 as any,
          colorByPoint: true,
          // Gradient fill per bar
          colors: pointColors.map((hex) => ({
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, hex],
              [1, gradStop(hex, 0.55)],
            ],
          })) as any,
          shadow: { color: "rgba(0,0,0,0.18)", offsetX: 0, offsetY: 4, opacity: 0.4, width: 6 } as any,
          states: {
            hover: {
              brightness: 0.1,
              shadow: { color: "rgba(99,102,241,0.45)", offsetX: 0, offsetY: 6, opacity: 0.7, width: 10 } as any,
            },
          },
        },

        areaspline: {
          lineWidth: 3,
          fillOpacity: 0,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 } as Highcharts.LinearGradientColorObject,
            stops: [
              [0, gradStop(palette[0], 0.35)] as Highcharts.GradientColorStopObject,
              [0.7, gradStop(palette[0], 0.08)] as Highcharts.GradientColorStopObject,
              [1, gradStop(palette[0], 0)] as Highcharts.GradientColorStopObject,
            ],
          } as Highcharts.GradientColorObject,
          marker: {
            enabled: labels.length <= 40,
            radius: 5,
            symbol: "circle",
            fillColor: "#fff",
            lineWidth: 2.5,
            lineColor: palette[0],
            states: {
              hover: { radius: 7, lineWidth: 3 },
            },
          },
          shadow: { color: gradStop(palette[0], 0.3), offsetX: 0, offsetY: 4, opacity: 0.5, width: 10 } as any,
        },

        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          innerSize: "50%",   // sleek donut
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.08)",
          dataLabels: {
            enabled: true,
            useHTML: true,
            distance: 22,
            formatter: function (this: any) {
              const pct = (this.percentage as number);
              if (pct < 3) return "";
              return `<span style="font-weight:700;font-size:11px;color:${this.color};">${this.point.name}</span><br/>
                <span style="color:#94A3B8;font-size:10px;">${pct.toFixed(1)}%</span>`;
            },
            style: { textOutline: "none" },
          },
          showInLegend: true,
          slicedOffset: 12,
          shadow: { color: "rgba(0,0,0,0.3)", offsetX: 0, offsetY: 6, opacity: 0.5, width: 12 } as any,
          states: {
            hover: { brightness: 0.12 },
          },
        },
      },

      // ─── Legend ──────────────────────────────────────────────────────────
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal",
        itemStyle: {
          color: "#64748B",
          fontWeight: "500",
          fontSize: "12px",
        },
        itemHoverStyle: { color: "#6366F1" },
        symbolRadius: 4,
        symbolHeight: 10,
        symbolWidth: 10,
        margin: 20,
      },

      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ["downloadPNG","downloadJPEG","downloadPDF","downloadSVG","separator","downloadCSV","downloadXLS"],
            symbolStroke: "#6366F1",
          },
        },
      },

      responsive: {
        rules: [{
          condition: { maxWidth: 500 },
          chartOptions: {
            legend: { layout: "horizontal", align: "center", verticalAlign: "bottom" },
            yAxis: { labels: { align: "left", x: 0, y: -5 }, title: { text: null } },
            subtitle: { text: null },
          },
        }],
      },
    };

    // ─── Type-specific axis / series ──────────────────────────────────────
    if (isPie) {
      options.series = [{
        type: "pie",
        name: datasets[0].label,
        data: labels.map((label, i) => ({
          name: label,
          y: datasets[0].data[i],
          color: {
            linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 } as Highcharts.LinearGradientColorObject,
            stops: [
              [0, palette[i % palette.length]] as Highcharts.GradientColorStopObject,
              [1, gradStop(palette[i % palette.length], 0.75)] as Highcharts.GradientColorStopObject,
            ],
          } as Highcharts.GradientColorObject,
          sliced: i === 0,
          selected: i === 0,
        })),
      }];
    } else {
      // X axis — clean & modern
      options.xAxis = {
        categories: labels,
        crosshair: {
          color: "rgba(99,102,241,0.12)",
          dashStyle: "Solid",
          width: isBar ? undefined : 1,
        },
        labels: {
          rotation: labels.length > 8 ? -40 : 0,
          style: {
            fontSize: labels.length > 8 ? "10px" : "11px",
            color: "#64748B",
            fontWeight: "500",
          },
          overflow: "justify",
        },
        tickLength: 0,
        lineColor: "rgba(148,163,184,0.2)",
        lineWidth: 1,
        gridLineWidth: 0,
        title: { text: null },
      };

      // Y axis — polished grid
      options.yAxis = {
        title: {
          text: datasets[0].label,
          style: { color: "#94A3B8", fontWeight: "500", fontSize: "11px" },
          margin: 14,
        },
        labels: {
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
            return formatValue(Number(this.value));
          },
          style: { color: "#94A3B8", fontSize: "11px" },
        },
        gridLineColor: "rgba(148,163,184,0.12)",
        gridLineDashStyle: "Dash",
        lineWidth: 0,
        min: 0,
        softMax: dataMax * 1.12, // 12% headroom for data labels
      };

      options.series = [{
        type: isLine ? "areaspline" : "column",
        name: datasets[0].label,
        data: isBar
          ? datasets[0].data.map((y, i) => ({
              y,
              color: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 } as Highcharts.LinearGradientColorObject,
                stops: [
                  [0, palette[i % palette.length]] as Highcharts.GradientColorStopObject,
                  [1, gradStop(palette[i % palette.length], 0.5)] as Highcharts.GradientColorStopObject,
                ],
              } as Highcharts.GradientColorObject,
            }))
          : datasets[0].data,
        color: isLine ? palette[0] : undefined,
      }];
    }

    setChartOptions(options);
  };


  // Export chart as image

  const handleExportChart = () => {
    if (chartRef.current && chartRef.current.chart) {
      // Show export menu with options
      (chartRef.current.chart as Highcharts.Chart & {
        exportChart: () => void;
      }).exportChart();
    } else {
      alert("Chart is not ready for export. Please try again.");
    }
  };

  // Refresh chart with current data
  const handleRefreshChart = () => {
    if (chartRef.current && chartRef.current.chart) {
      // Add animation to refresh
      chartRef.current.chart.update(
        {
          chart: {
            animation: {
              duration: 800,
              easing: "easeOutBounce",
            },
          },
        },
        false,
        false,
        false,
      );
      chartRef.current.chart.reflow();
      updateChartOptions();
    }
  };

  if (!isVisible || ((!data || data.length === 0) && !chartData)) return null;

  const generatedChartData = generateChartData();

  return (
    <div className="w-full bg-card rounded-lg border shadow-sm mt-4 overflow-visible">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-accent/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-[#26A69A]" />
              <h2 className="text-xl font-semibold">Data Visualization</h2>
            </div>
            <Button variant="ghost" size="icon">
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="p-4">
          <div className="flex flex-col gap-4 overflow-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={currentChartType === "bar" ? "default" : "outline"}
                  onClick={() => handleChartTypeChange("bar")}
                  className={
                    currentChartType === "bar"
                      ? "bg-[#26A69A] hover:bg-[#2bbeaf]"
                      : ""
                  }
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Bar Chart
                </Button>
                <Button
                  variant={currentChartType === "line" ? "default" : "outline"}
                  onClick={() => handleChartTypeChange("line")}
                  className={
                    currentChartType === "line"
                      ? "bg-[#26A69A] hover:bg-[#2bbeaf]"
                      : ""
                  }
                >
                  <LineChart className="h-4 w-4 mr-2" />
                  Line Chart
                </Button>
                <Button
                  variant={currentChartType === "pie" ? "default" : "outline"}
                  onClick={() => handleChartTypeChange("pie")}
                  className={
                    currentChartType === "pie"
                      ? "bg-[#26A69A] hover:bg-[#2bbeaf]"
                      : ""
                  }
                >
                  <PieChart className="h-4 w-4 mr-2" />
                  Pie Chart
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRefreshChart}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleExportChart}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" onClick={handleToggleEditMode}>
                  {isEditing ? (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Done
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Card className="w-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#26A69A]">{chartTitle}</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <p>
                          This visualization is based on the data returned from
                          your query. You can change the chart type and
                          customize it using the edit button.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="h-96 w-full rounded-md overflow-hidden"
                  style={{ minHeight: "384px", minWidth: "100%" }}
                >
                  {generatedChartData ? (
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={chartOptions}
                      ref={chartRef}
                      containerProps={{
                        style: { height: "100%", width: "100%" },
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted/20">
                      <p className="text-muted-foreground">
                        No data available for chart
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isEditing && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Chart Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Data Field Selection
                        </h3>
                        <Select
                          value={selectedDataField}
                          onValueChange={handleDataFieldChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select data field" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field.charAt(0).toUpperCase() + field.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Chart Title
                        </h3>
                        <input
                          type="text"
                          value={chartTitle}
                          onChange={(e) => setChartTitle(e.target.value)}
                          className="w-full p-2 border rounded-md bg-background"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Color Scheme
                        </h3>
                        <Select
                          value={colorScheme}
                          onValueChange={handleColorSchemeChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select color scheme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="teal">Teal</SelectItem>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                            <SelectItem value="multi">Multi-color</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Chart Appearance
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showLegend"
                              className="rounded border-gray-300"
                              checked
                              onChange={(e) => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  chartRef.current.chart.update(
                                    {
                                      legend: {
                                        enabled: e.target.checked,
                                      },
                                    },
                                    true,
                                  );
                                }
                              }}
                            />
                            <label htmlFor="showLegend" className="text-sm">
                              Show Legend
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="showDataLabels"
                              className="rounded border-gray-300"
                              checked
                              onChange={(e) => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Update data labels for all series
                                  chartRef.current.chart.update(
                                    {
                                      plotOptions: {
                                        series: {
                                          dataLabels: {
                                            enabled: e.target.checked,
                                          },
                                        },
                                      },
                                    },
                                    true,
                                  );
                                }
                              }}
                            />
                            <label htmlFor="showDataLabels" className="text-sm">
                              Show Data Labels
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="enableAnimation"
                              className="rounded border-gray-300"
                              checked
                              onChange={(e) => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Toggle animation
                                  chartRef.current.chart.update(
                                    {
                                      plotOptions: {
                                        series: {
                                          animation: {
                                            duration: e.target.checked
                                              ? 1000
                                              : 0,
                                          },
                                        },
                                      },
                                    },
                                    true,
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor="enableAnimation"
                              className="text-sm"
                            >
                              Enable Animation
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="transparentBg"
                              className="rounded border-gray-300"
                              checked
                              onChange={(e) => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Toggle background transparency
                                  chartRef.current.chart.update(
                                    {
                                      chart: {
                                        backgroundColor: e.target.checked
                                          ? "transparent"
                                          : "#ffffff",
                                      },
                                    },
                                    true,
                                  );
                                }
                              }}
                            />
                            <label htmlFor="transparentBg" className="text-sm">
                              Transparent Background
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="enable3D"
                              className="rounded border-gray-300"
                              onChange={(e) => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Toggle 3D effect for pie charts
                                  if (currentChartType === "pie") {
                                    chartRef.current.chart.update(
                                      {
                                        chart: {
                                          options3d: {
                                            enabled: e.target.checked,
                                            alpha: 45,
                                            beta: 0,
                                          },
                                        },
                                        plotOptions: {
                                          pie: {
                                            depth: e.target.checked ? 35 : 0,
                                          },
                                        },
                                      },
                                      true,
                                    );
                                  }
                                }
                              }}
                            />
                            <label htmlFor="enable3D" className="text-sm">
                              3D Effect (Pie)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="enableZoom"
                              className="rounded border-gray-300"
                              checked
                              onChange={(e) => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Toggle zooming capability
                                  chartRef.current.chart.update(
                                    {
                                      chart: {
                                        zooming: e.target.checked
                                          ? { type: "xy", mouseWheel: true }
                                          : undefined,
                                      },
                                    },
                                    true,
                                  );
                                }
                              }}
                            />
                            <label htmlFor="enableZoom" className="text-sm">
                              Enable Zoom
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-2">
                          Data Display
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="sortNone"
                              name="sortOrder"
                              className="rounded border-gray-300"
                              checked
                              onChange={() => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Reset to original order
                                  updateChartOptions();
                                }
                              }}
                            />
                            <label htmlFor="sortNone" className="text-sm">
                              No Sorting
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="sortAsc"
                              name="sortOrder"
                              className="rounded border-gray-300"
                              onChange={() => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Sort series data ascending
                                  const chart = chartRef.current.chart;
                                  if (chart.series[0]) {
                                    chart.series[0].setData(
                                      [...chart.series[0].data]
                                        .sort((a, b) => (a.y || 0) - (b.y || 0))
                                        .map((point) => point.y),
                                      true,
                                    );
                                  }
                                }
                              }}
                            />
                            <label htmlFor="sortAsc" className="text-sm">
                              Sort Ascending
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="sortDesc"
                              name="sortOrder"
                              className="rounded border-gray-300"
                              onChange={() => {
                                if (
                                  chartRef.current &&
                                  chartRef.current.chart
                                ) {
                                  // Sort series data descending
                                  const chart = chartRef.current.chart;
                                  if (chart.series[0]) {
                                    chart.series[0].setData(
                                      [...chart.series[0].data]
                                        .sort((a, b) => (b.y || 0) - (a.y || 0))
                                        .map((point) => point.y),
                                      true,
                                    );
                                  }
                                }
                              }}
                            />
                            <label htmlFor="sortDesc" className="text-sm">
                              Sort Descending
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default VisualizationSection;
