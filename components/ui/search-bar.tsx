import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  showIcon?: boolean;
};

export function SearchBar({
  placeholder,
  value,
  onChange,
  showIcon = false,
}: SearchBarProps) {
  return (
    <div className="w-full max-w-sm">
      {showIcon ? (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder={placeholder}
            className="pl-9"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      ) : (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

