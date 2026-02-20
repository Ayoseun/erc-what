import { categories, ERCCategory, categoryColors } from "@/data/ercData";

interface CategoryFilterProps {
  selected: ERCCategory | null;
  onSelect: (category: ERCCategory | null) => void;
  availableCategories: ERCCategory[];
}

const CategoryFilter = ({ selected, onSelect, availableCategories }: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
          selected === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>
      {categories
        .filter((cat) => availableCategories.includes(cat))
        .map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(selected === cat ? null : cat)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              selected === cat
                ? categoryColors[cat]
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
    </div>
  );
};

export default CategoryFilter;
