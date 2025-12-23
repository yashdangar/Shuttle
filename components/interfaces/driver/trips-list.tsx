"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Bus,
  CalendarClock,
  Loader2,
  UserRound,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { TripInstanceCard } from "./trip-instance-card";

function getUTCDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function DriverTripsList() {
  const { user } = useAuthSession();
  const todayDate = getUTCDateString();

  const tripInstances = useQuery(
    api.tripInstances.queries.getDriverTripInstances,
    user?.id ? { driverId: user.id as Id<"users">, date: todayDate } : "skip"
  );

  const isLoading = tripInstances === undefined;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <UserRound className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-semibold">Sign in required</p>
            <p className="text-sm text-muted-foreground">
              Please sign in to view your trips
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading trips...</p>
        </div>
      </div>
    );
  }

  // Sort: IN_PROGRESS first, then by start time
  const sortedTrips = tripInstances
    ? [...tripInstances].sort((a, b) => {
        // IN_PROGRESS trips come first
        if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
        if (a.status !== "IN_PROGRESS" && b.status === "IN_PROGRESS") return 1;
        // Then SCHEDULED, then COMPLETED, then CANCELLED
        const statusOrder = {
          SCHEDULED: 0,
          IN_PROGRESS: 0,
          COMPLETED: 1,
          CANCELLED: 2,
        };
        const statusDiff =
          (statusOrder[a.status as keyof typeof statusOrder] || 0) -
          (statusOrder[b.status as keyof typeof statusOrder] || 0);
        if (statusDiff !== 0) return statusDiff;
        // Within same status, sort by start time
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

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/driver">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Today's Trips</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date(todayDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{sortedTrips.length}</p>
          <p className="text-xs text-muted-foreground">trips</p>
        </div>
      </div>

      {/* Status Summary Pills */}
      {sortedTrips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {inProgressCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-700 rounded-full text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {inProgressCount} in progress
            </div>
          )}
          {scheduledCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {scheduledCount} scheduled
            </div>
          )}
          {completedCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-full text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {completedCount} completed
            </div>
          )}
        </div>
      )}

      {/* Trips List */}
      {sortedTrips.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-5 text-lg font-semibold">No trips scheduled</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              You don't have any trips assigned for today
            </p>
            <Link href="/driver">
              <Button className="mt-6">
                <Bus className="h-4 w-4 mr-2" />
                Select a Shuttle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedTrips.map((trip) => (
            <TripInstanceCard key={trip._id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
