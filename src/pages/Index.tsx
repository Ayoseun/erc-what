import { useState, useMemo } from "react";
import { ercDatabase, ERCData, ERCCategory } from "@/data/ercData";
import SearchBar from "@/components/SearchBar";
import ERCCard from "@/components/ERCCard";
import ERCDetail from "@/components/ERCDetail";
import CategoryFilter from "@/components/CategoryFilter";
import { Blocks } from "lucide-react";

const Index = () => {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ERCCategory | null>(null);
  const [selectedERC, setSelectedERC] = useState<ERCData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border pb-12 pt-16 sm:pt-24">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Blocks className="h-4 w-4 text-primary" />
            Ethereum Standards Explorer
          </div>

          <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-6xl">
            <span className="text-foreground">erc</span>
            <span className="gradient-text">What</span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-base text-muted-foreground sm:text-lg">
            Tell us what you want to build. We'll show you which ERCs to use.
          </p>

          <SearchBar value={query} onChange={setQuery} />

          <div className="mt-8">
            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              availableCategories={availableCategories}
            />
          </div>
        </div>
      </header>

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
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((erc, i) => (
              <ERCCard
                key={erc.number}
                erc={erc}
                onClick={() => handleCardClick(erc)}
                index={i}
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

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        ercWhat — Find the right Ethereum standard for your project
      </footer>
    </div>
  );
};

export default Index;
