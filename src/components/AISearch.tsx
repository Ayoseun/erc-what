import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ERCData, ercDatabase, categoryColors } from "@/data/ercData";
//@ts-ignore
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface AISearchProps {
  onSelectERC: (erc: ERCData) => void;
}

interface AIRecommendation {
  ercNumbers: string[];
  reasoning: string;
}

const AISearch = ({ onSelectERC }: AISearchProps) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIRecommendation | null>(null);

  const handleSearch = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-erc-recommend", {
        body: { description: prompt },
      });

      if (error) {
        const status = (error as any)?.status;
        if (status === 429) {
          toast.error("Rate limit reached. Please wait a moment and try again.");
        } else if (status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error("AI search failed. Please try again.");
        }
        return;
      }

      setResult(data as AIRecommendation);
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong with AI search.");
    } finally {
      setLoading(false);
    }
  };

  const recommendedERCs = result
    ? ercDatabase.filter((erc) => result.ercNumbers.includes(erc.number))
    : [];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="search-glow relative rounded-xl border border-border bg-card transition-all duration-300">
        <Sparkles className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder='Describe your project... e.g. "A real estate app with fractional ownership"'
          className="w-full bg-transparent py-4 pl-12 pr-28 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !prompt.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/80 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask AI"}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                AI Recommendation
              </h3>
              <button onClick={() => setResult(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              {result.reasoning}
            </p>

            <div className="flex flex-wrap gap-2">
              {recommendedERCs.map((erc) => (
                <button
                  key={erc.number}
                  onClick={() => onSelectERC(erc)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-secondary/50"
                >
                  <span className="font-mono text-xs font-bold text-primary">ERC-{erc.number}</span>
                  <span className="text-xs text-muted-foreground">{erc.title}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${categoryColors[erc.category]}`}>
                    {erc.category}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AISearch;
