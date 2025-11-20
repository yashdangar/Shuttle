import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type PaginationControlsProps = {
  currentPage: number;
  hasNextPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  isLoading?: boolean;
};

export function PaginationControls({
  currentPage,
  hasNextPage,
  onNextPage,
  onPrevPage,
  isLoading,
}: PaginationControlsProps) {
  return (
    <Pagination className="border-t pt-4">
      <PaginationContent className="flex w-full items-center justify-between">
        <PaginationItem className="text-muted-foreground text-sm">
          Page {currentPage + 1}
        </PaginationItem>
        <div className="flex items-center gap-2">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (currentPage > 0 && !isLoading) {
                  onPrevPage();
                }
              }}
              className={
                currentPage === 0 || isLoading
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (hasNextPage) {
                  onNextPage();
                }
              }}
              className={
                !hasNextPage
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
            />
          </PaginationItem>
        </div>
      </PaginationContent>
    </Pagination>
  );
}

