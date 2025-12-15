"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SelectHotelSkeleton() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm md:px-10">
          <div className="flex items-center justify-center">
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <div className="mt-3 text-center">
            <Skeleton className="mx-auto h-8 w-64 rounded-md" />
            <Skeleton className="mx-auto mt-2 h-4 w-80" />
          </div>
          <div className="mx-auto mt-6 max-w-3xl">
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="mt-3 flex items-center justify-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="overflow-hidden rounded-[14px] border border-border bg-card"
            >
              <div className="aspect-video w-full">
                <Skeleton className="h-full w-full" />
              </div>
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-5 w-40" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
