import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QueryInputProps {
  onGenerate?: (prompt: string) => Promise<void>;
  isLoading?: boolean;
  initialPrompt?: string;
}

const EXAMPLE_PROMPTS = [
  "Analyze Tesla",
  "Can I invest in TCS?",
  "Show Apple's price history",
  "What are the best technology companies?",
  "Which healthcare companies performed well?",
  "Show the top Indian banking stocks",
  "Show me the top 10 tech companies by market cap",
  "Compare the stock prices of Apple and Microsoft",
  "List companies with highest dividend yield in the S&P 500",
  "What are the financial metrics for NVIDIA and AMD?",
];

export default function QueryInput({
  onGenerate = async () => {},
  isLoading = false,
  initialPrompt = "",
}: QueryInputProps) {
  const [prompt, setPrompt] = useState(initialPrompt);

  // Update prompt when initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const handleExampleSelect = (value: string) => {
    setPrompt(EXAMPLE_PROMPTS[parseInt(value)]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="w-full space-y-4 bg-card p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">Natural Language Query</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm">
                <p>
                  Enter your market research question in plain English. The
                  system will convert it to SQL and fetch relevant data.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select onValueChange={handleExampleSelect}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Example prompts" />
          </SelectTrigger>
          <SelectContent>
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <SelectItem key={index} value={index.toString()}>
                Example {index + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          placeholder="Enter your market research query in natural language..."
          className="min-h-[120px] text-base"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <p className="text-sm text-muted-foreground">
            Example: "Show me tech companies with market cap over $500B"
          </p>
          <Button
            type="submit"
            className="w-full sm:w-auto sm:ml-auto bg-[#26A69A] hover:bg-[#2bbeaf] text-white"
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
