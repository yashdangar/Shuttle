import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface TableLoaderProps {
  label?: string;
  className?: string;
}

export function TableLoader({
  label = "Loading data...",
  className,
}: TableLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] items-center justify-center rounded-md border bg-card/60 p-6",
        className
      )}
    >
      <div className="flex flex-col items-center gap-6 text-sm text-muted-foreground">
        <div className="loader"></div>
        {label && <span className="text-lg font-medium">{label}</span>}
      </div>
    </div>
  );
}
