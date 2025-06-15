import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loader({ className, size = "md" }: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[200px]">
      <div
        className={cn(
          "animate-spin rounded-full border-4 border-gray-200 border-t-blue-600",
          sizeClasses[size],
          className
        )}
      />
    </div>
  );
}
