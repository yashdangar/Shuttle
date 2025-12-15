import { Skeleton } from "@/components/ui/skeleton";

export function GuestBookingsSkeleton() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm md:px-10">
          <div className="flex items-center justify-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>
          <div className="mt-3 space-y-2 text-center">
            <Skeleton className="mx-auto h-8 w-64 rounded-md" />
            <Skeleton className="mx-auto h-4 w-80" />
          </div>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-28 rounded-full" />
              ))}
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>
          </div>
          <div className="mt-6">
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
