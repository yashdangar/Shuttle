"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import Link from "next/link";
import PageLayout from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarClock,
  Loader2,
  MapPin,
  Users,
  Clock,
} from "lucide-react";

function getUTCDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function FrontdeskTripsList() {
  const { user } = useAuthSession();
  const todayDate = getUTCDateString();

  const formattedDate = new Date(todayDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const trips = useQuery(
    api.dashboard.queries.getFrontdeskActiveTrips,
    user?.id ? { frontdeskId: user.id as Id<"users"> } : "skip"
  );

  const isLoading = trips === undefined;

  if (!user) {
    return (
      <PageLayout title="Trips" description="Sign in to view trips." size="full">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">Please sign in</p>
            <p className="text-sm text-muted-foreground">Sign in to view trips</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout
        title="Today's Trips"
        description={`${formattedDate} (UTC)`}
        size="full"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  const sortedTrips = trips
    ? [...trips].sort((a, b) => {
        if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
        if (a.status !== "IN_PROGRESS" && b.status === "IN_PROGRESS") return 1;
        const statusOrder = {
          SCHEDULED: 0,
          IN_PROGRESS: 0,
          COMPLETED: 1,
          CANCELLED: 2,
        } as const;
        const diff =
          (statusOrder[a.status as keyof typeof statusOrder] ?? 0) -
          (statusOrder[b.status as keyof typeof statusOrder] ?? 0);
        if (diff !== 0) return diff;
        return a.scheduledStartTime.localeCompare(b.scheduledStartTime);
      })
    : [];

  const inProgressCount = sortedTrips.filter(
    (t) => t.status === "IN_PROGRESS"
  ).length;
  const scheduledCount = sortedTrips.filter(
    (t) => t.status === "SCHEDULED"
  ).length;
  const completedCount = sortedTrips.filter(
    (t) => t.status === "COMPLETED"
  ).length;

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <PageLayout
      title="Today's Trips"
      description={`${formattedDate} (UTC)`}
      size="full"
    >
      <div className="space-y-6 pb-8">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium">
              {sortedTrips.length} trip{sortedTrips.length !== 1 ? "s" : ""}
            </p>
          </div>
          {sortedTrips.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {inProgressCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                  🚗 {inProgressCount} in progress
                </span>
              )}
              {scheduledCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  📅 {scheduledCount} scheduled
                </span>
              )}
              {completedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                  ✓ {completedCount} completed
                </span>
              )}
            </div>
          )}
        </div>

        {sortedTrips.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">No trips scheduled</p>
              <p className="text-sm text-muted-foreground mt-1">
                There are no trips scheduled for today
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedTrips.map((trip) => (
              <Link
                key={trip._id}
                href={`/frontdesk/current-trips/${trip._id}`}
                className="block rounded-lg border p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium truncate">
                        {trip.tripName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(trip.scheduledStartTime)} -{" "}
                        {formatTime(trip.scheduledEndTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{trip.bookingCount} bookings</span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {trip.status.replace("_", " ")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
