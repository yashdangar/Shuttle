import { Skeleton } from "@/components/ui/skeleton";

interface TableLoaderProps {
  columns: number;
  rows?: number;
}

export function TableLoader({ columns, rows = 5 }: TableLoaderProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="py-4">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
