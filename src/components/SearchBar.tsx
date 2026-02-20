import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = 'Try "real estate app" or "loyalty program"...' }: SearchBarProps) => {
  return (
    <div className="search-glow relative mx-auto w-full max-w-2xl rounded-xl border border-border bg-card transition-all duration-300">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-4 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  );
};

export default SearchBar;
