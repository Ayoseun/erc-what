import { ERCData, categoryColors } from "@/data/ercData";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface ERCCardProps {
  erc: ERCData;
  onClick: () => void;
  index: number;
}

const ERCCard = ({ erc, onClick, index }: ERCCardProps) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all duration-300 hover:border-primary/30 hover:bg-secondary/50 hover:glow-primary"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex w-full items-center justify-between">
        <span className="font-mono text-sm font-semibold text-primary">
          ERC-{erc.number}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[erc.category]}`}
        >
          {erc.category}
        </span>
      </div>

      <h3 className="text-base font-semibold text-foreground">
        {erc.title}
      </h3>

      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {erc.summary}
      </p>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
        {erc.keyFeatures.slice(0, 3).map((feature) => (
          <Badge
            key={feature}
            variant="secondary"
            className="border-none bg-secondary text-xs text-muted-foreground"
          >
            {feature}
          </Badge>
        ))}
      </div>

      <div className="mt-1 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        View details <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
};

export default ERCCard;
