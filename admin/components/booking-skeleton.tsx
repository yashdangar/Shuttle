import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookingSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header with user info and badges */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div>
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            </div>

            {/* Grid of booking details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <div className="text-sm">
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>

            {/* Notes section skeleton */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <Skeleton className="h-4 w-12 mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-3/4" />
            </div>

            {/* Footer with booking ID and date */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filters skeleton */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-20 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bookings count skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Booking cards skeleton */}
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <BookingSkeleton key={index} />
        ))}
      </div>
    </div>
  );
} 