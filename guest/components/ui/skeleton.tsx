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

export { Skeleton, ProfileSkeleton }
