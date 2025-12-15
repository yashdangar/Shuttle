import PageLayout from "@/components/layout/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export function FrontdeskBookingsSkeleton() {
  return (
    <PageLayout
      title={<Skeleton className="h-7 w-48" />}
      description={<Skeleton className="h-4 w-80" />}
      icon={<Skeleton className="h-5 w-5 rounded-full" />}
      isCompact
      size="full"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-7 w-24 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-lg md:w-80" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
