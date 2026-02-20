import { ERCData, categoryColors } from "@/data/ercData";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CompareDrawerProps {
  selected: ERCData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (number: string) => void;
}

const CompareDrawer = ({ selected, open, onOpenChange, onRemove }: CompareDrawerProps) => {
  if (selected.length === 0) return null;

  const rows: { label: string; getValue: (erc: ERCData) => React.ReactNode }[] = [
    {
      label: "Category",
      getValue: (erc) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[erc.category]}`}>
          {erc.category}
        </span>
      ),
    },
    { label: "Status", getValue: (erc) => <Badge variant="outline" className="text-xs">{erc.status}</Badge> },
    { label: "Summary", getValue: (erc) => <span className="text-xs leading-relaxed">{erc.summary}</span> },
    {
      label: "Key Features",
      getValue: (erc) => (
        <div className="flex flex-wrap gap-1">
          {erc.keyFeatures.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
          ))}
        </div>
      ),
    },
    {
      label: "Use Cases",
      getValue: (erc) => (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {erc.useCases.slice(0, 4).map((uc) => (
            <li key={uc} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
              {uc}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Build Examples",
      getValue: (erc) => (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {erc.buildExamples.slice(0, 3).map((ex) => (
            <li key={ex} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/60" />
              {ex}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: "Related ERCs",
      getValue: (erc) =>
        erc.relatedERCs ? (
          <div className="flex flex-wrap gap-1">
            {erc.relatedERCs.map((r) => (
              <Badge key={r} variant="outline" className="font-mono text-[10px] text-primary">
                ERC-{r}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto border-border bg-card">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            Comparing {selected.length} ERCs
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="min-w-[120px] text-muted-foreground">Property</TableHead>
                {selected.map((erc) => (
                  <TableHead key={erc.number} className="min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">ERC-{erc.number}</span>
                      <button
                        onClick={() => onRemove(erc.number)}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-0.5 text-xs font-normal text-muted-foreground">{erc.title}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label} className="border-border">
                  <TableCell className="align-top text-xs font-medium text-muted-foreground">
                    {row.label}
                  </TableCell>
                  {selected.map((erc) => (
                    <TableCell key={erc.number} className="align-top">
                      {row.getValue(erc)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Floating compare bar
export const CompareBar = ({
  count,
  onCompare,
  onClear,
}: {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}) => {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 shadow-lg shadow-background/50">
            <span className="text-sm text-muted-foreground">
              <span className="font-mono font-bold text-primary">{count}</span> selected
            </span>
            <button
              onClick={onCompare}
              disabled={count < 2}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              Compare
            </button>
            <button
              onClick={onClear}
              className="rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompareDrawer;
