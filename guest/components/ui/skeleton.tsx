import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <Skeleton className="h-8 w-48" />

      {/* Profile Information Card Skeleton */}
      <div className="border rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Travel Stats Card Skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center p-4 bg-muted rounded-xl space-y-2">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Settings Card Skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-6 w-16" />
        <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}

function CurrentBookingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Timezone Info Skeleton */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Booking Card Skeleton */}
      <div className="border rounded-lg border-l-4 border-l-blue-500">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Status Alert Skeleton */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>

          {/* Booking Details Grid Skeleton */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-8 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>

          {/* Map Skeleton */}
          <div className="mt-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

export { Skeleton, ProfileSkeleton, CurrentBookingsSkeleton }
