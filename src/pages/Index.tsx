import { useState, useMemo, useCallback } from "react";
import { ercDatabase, ERCData, ERCCategory } from "@/data/ercData";
import SearchBar from "@/components/SearchBar";
import ERCCard from "@/components/ERCCard";
import ERCDetail from "@/components/ERCDetail";
import CategoryFilter from "@/components/CategoryFilter";
import AISearch from "@/components/AISearch";
import CompareDrawer, { CompareBar } from "@/components/CompareDrawer";
import { Blocks, Github, Sparkles, Search } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ERCCategory | null>(null);
  const [selectedERC, setSelectedERC] = useState<ERCData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [compareList, setCompareList] = useState<ERCData[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"keyword" | "ai">("keyword");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ercDatabase.filter((erc) => {
      if (selectedCategory && erc.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        erc.number.includes(q) ||
        erc.title.toLowerCase().includes(q) ||
        erc.summary.toLowerCase().includes(q) ||
        erc.category.toLowerCase().includes(q) ||
        erc.useCases.some((uc) => uc.toLowerCase().includes(q)) ||
        erc.buildExamples.some((ex) => ex.toLowerCase().includes(q)) ||
        erc.keyFeatures.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [query, selectedCategory]);

  const availableCategories = useMemo(() => {
    const cats = new Set(ercDatabase.map((e) => e.category));
    return Array.from(cats) as ERCCategory[];
  }, []);

  const handleCardClick = (erc: ERCData) => {
    setSelectedERC(erc);
    setDetailOpen(true);
  };

  const handleCompareToggle = useCallback((erc: ERCData) => {
    setCompareList((prev) => {
      const exists = prev.find((e) => e.number === erc.number);
      if (exists) return prev.filter((e) => e.number !== erc.number);
      if (prev.length >= 5) return prev;
      return [...prev, erc];
    });
  }, []);

  const handleCompareRemove = useCallback((number: string) => {
    setCompareList((prev) => prev.filter((e) => e.number !== number));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Blocks className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-foreground">erc</span>
              <span className="gradient-text">What</span>
            </span>
          </div>
          <a
            href="https://github.com/Ayoseun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            Ayoseun
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pb-12 pt-16 sm:pt-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground"
          >
            <Blocks className="h-4 w-4 text-primary" />
            {ercDatabase.length} Ethereum Standards
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-3 text-4xl font-extrabold tracking-tight sm:text-6xl"
          >
            <span className="text-foreground">erc</span>
            <span className="gradient-text">What</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg"
          >
            Tell us what you want to build. We'll show you which ERCs to use.
          </motion.p>

          {/* Search mode toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 flex items-center justify-center gap-2"
          >
            <button
              onClick={() => setSearchMode("keyword")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                searchMode === "keyword"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Keyword Search
            </button>
            <button
              onClick={() => setSearchMode("ai")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                searchMode === "ai"
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Recommend
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            {searchMode === "keyword" ? (
              <SearchBar value={query} onChange={setQuery} />
            ) : (
              <AISearch onSelectERC={handleCardClick} />
            )}
          </motion.div>

          {searchMode === "keyword" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8"
            >
              <CategoryFilter
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                availableCategories={availableCategories}
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* Results */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} standard{filtered.length !== 1 ? "s" : ""} found
            {query && (
              <span>
                {" "}
                for "<span className="text-primary">{query}</span>"
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Click checkboxes to compare ERCs
          </p>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((erc, i) => (
              <ERCCard
                key={erc.number}
                erc={erc}
                onClick={() => handleCardClick(erc)}
                index={i}
                isCompareSelected={compareList.some((e) => e.number === erc.number)}
                onCompareToggle={handleCompareToggle}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-secondary p-4">
              <Blocks className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              No ERCs match your search
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Try different keywords like "token", "rental", "identity", or describe
              what you want to build.
            </p>
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <ERCDetail
        erc={selectedERC}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* Compare */}
      <CompareBar
        count={compareList.length}
        onCompare={() => setCompareOpen(true)}
        onClear={() => setCompareList([])}
      />
      <CompareDrawer
        selected={compareList}
        open={compareOpen}
        onOpenChange={setCompareOpen}
        onRemove={handleCompareRemove}
      />

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Blocks className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                <span className="text-foreground">erc</span>
                <span className="gradient-text">What</span>
              </span>
              <span className="text-xs text-muted-foreground">
                — Find the right Ethereum standard
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/Ayoseun"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                Built by Ayoseun
              </a>
              <span className="text-xs text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground">
                {ercDatabase.length} ERCs indexed
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
