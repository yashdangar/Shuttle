import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DataTableProps<T> = {
  data: T[];
  columns: Array<{
    header: string;
    render: (item: T) => React.ReactNode;
    className?: string;
  }>;
  isLoading?: boolean;
  emptyMessage: string;
  getRowKey?: (item: T, index: number) => string | number;
};

export function DataTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage,
  getRowKey,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={index} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, rowIndex) => (
          <TableRow key={getRowKey ? getRowKey(item, rowIndex) : rowIndex}>
            {columns.map((column, colIndex) => (
              <TableCell key={colIndex} className={column.className}>
                {column.render(item)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

