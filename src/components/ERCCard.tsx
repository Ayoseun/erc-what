import { ERCData, categoryColors } from "@/data/ercData";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Bookmark, BookmarkCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ERCCardProps {
  erc: ERCData;
  onClick: () => void;
  index: number;
  isCompareSelected?: boolean;
  onCompareToggle?: (erc: ERCData) => void;
  isStackSelected?: boolean;
  onStackToggle?: (erc: ERCData) => void;
}

const ERCCard = ({
  erc,
  onClick,
  index,
  isCompareSelected,
  onCompareToggle,
  isStackSelected,
  onStackToggle,
}: ERCCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
    >
      <button
        onClick={onClick}
        className="group relative flex w-full flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all duration-300 hover:border-primary/30 hover:bg-secondary/50 hover:glow-primary"
      >
        {/* Compare checkbox */}
        {onCompareToggle && (
          <div
            role="checkbox"
            aria-checked={isCompareSelected}
            onClick={(e) => {
              e.stopPropagation();
              onCompareToggle(erc);
            }}
            className={`absolute right-10 top-3 flex h-5 w-5 items-center justify-center rounded border transition-colors ${
              isCompareSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-transparent hover:border-muted-foreground"
            }`}
          >
            <Check className="h-3 w-3" />
          </div>
        )}

        {/* Stack bookmark */}
        {onStackToggle && (
          <button
            aria-label={isStackSelected ? "Remove from stack" : "Add to stack"}
            onClick={(e) => {
              e.stopPropagation();
              onStackToggle(erc);
            }}
            className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded transition-colors ${
              isStackSelected
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            }`}
          >
            {isStackSelected
              ? <BookmarkCheck className="h-4 w-4" />
              : <Bookmark className="h-4 w-4" />}
          </button>
        )}

        <div className="flex w-full items-center justify-between pr-14">
          <span className="font-mono text-sm font-semibold text-primary">ERC-{erc.number}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[erc.category]}`}>
            {erc.category}
          </span>
        </div>

        <h3 className="text-base font-semibold text-foreground">{erc.title}</h3>

        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{erc.summary}</p>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {erc.keyFeatures.slice(0, 3).map((feature) => (
            <Badge key={feature} variant="secondary" className="border-none bg-secondary text-xs text-muted-foreground">
              {feature}
            </Badge>
          ))}
        </div>

        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          View details <ArrowRight className="h-3 w-3" />
        </div>
      </button>
    </motion.div>
  );
};

export default ERCCard;