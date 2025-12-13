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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <UserRound className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">Please sign in</p>
          <p className="text-sm text-muted-foreground">
            Sign in to view your trips
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/driver" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span>All Trips</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Today's Trips</h1>
        </div>
      </div>

      {/* Date Info & Status Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {new Date(todayDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            (UTC)
          </p>
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

      {/* Trips List */}
      {sortedTrips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">No trips scheduled</p>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have any trips assigned for today
            </p>
            <Link href="/driver">
              <Button variant="outline" className="mt-4">
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
