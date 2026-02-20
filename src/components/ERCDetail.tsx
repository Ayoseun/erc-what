import { ERCData, categoryColors } from "@/data/ercData";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lightbulb, Wrench, Link2, Sparkles } from "lucide-react";

interface ERCDetailProps {
  erc: ERCData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ERCDetail = ({ erc, open, onOpenChange }: ERCDetailProps) => {
  if (!erc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-primary">
              ERC-{erc.number}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[erc.category]}`}
            >
              {erc.category}
            </span>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {erc.status}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {erc.title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {erc.summary}
        </p>

        <div className="space-y-5 pt-2">
          {/* Key Features */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Key Features
            </h4>
            <div className="flex flex-wrap gap-2">
              {erc.keyFeatures.map((f) => (
                <Badge key={f} variant="secondary" className="text-xs">
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          {/* Use Cases */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Use Cases
            </h4>
            <ul className="space-y-1.5">
              {erc.useCases.map((uc) => (
                <li
                  key={uc}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  {uc}
                </li>
              ))}
            </ul>
          </div>

          {/* What You Can Build */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="h-4 w-4 text-accent" />
              What You Can Build
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {erc.buildExamples.map((ex) => (
                <div
                  key={ex}
                  className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-secondary-foreground"
                >
                  {ex}
                </div>
              ))}
            </div>
          </div>

          {/* Related ERCs */}
          {erc.relatedERCs && erc.relatedERCs.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Link2 className="h-4 w-4 text-primary" />
                Related ERCs
              </h4>
              <div className="flex gap-2">
                {erc.relatedERCs.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="font-mono text-xs text-primary"
                  >
                    ERC-{r}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ERCDetail;
