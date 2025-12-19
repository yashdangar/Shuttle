"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Bus,
  Users,
  CalendarClock,
  CheckCircle2,
  Loader2,
  UserRound,
  MapPin,
  ChevronRight,
  Clock,
  Ticket,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

function getUTCDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// Parse ISO time string like "1970-01-01T09:00:00.000Z" to display time
function formatISOTime(isoTimeStr: string): string {
  try {
    // Handle both ISO format and simple HH:MM format
    if (isoTimeStr.includes("T")) {
      const date = new Date(isoTimeStr);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    } else {
      // Simple HH:MM format
      const [hours, minutes] = isoTimeStr.split(":");
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
  } catch {
    return isoTimeStr;
  }
}

export function DriverShuttleSelection() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [selectedShuttleId, setSelectedShuttleId] =
    useState<Id<"shuttles"> | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const shuttles = useQuery(
    api.shuttles.queries.getAvailableShuttlesForDriver,
    user?.id ? { driverId: user.id as Id<"users"> } : "skip"
  );

  const todayDate = getUTCDateString();

  const assignedShuttle = shuttles?.find((s) => s.isAssignedToMe);
  const tripInstances = useQuery(
    api.tripInstances.queries.getDriverTripInstances,
    user?.id ? { driverId: user.id as Id<"users">, date: todayDate } : "skip"
  );

  const assignShuttle = useMutation(
    api.shuttles.mutations.assignDriverToShuttle
  );
  const unassignShuttle = useMutation(
    api.shuttles.mutations.unassignDriverFromShuttle
  );

  const isLoading = shuttles === undefined;
  const availableShuttles =
    shuttles?.filter((s) => !s.currentlyAssignedTo) ?? [];
  const takenShuttles =
    shuttles?.filter((s) => s.currentlyAssignedTo && !s.isAssignedToMe) ?? [];

  const handleSelectShuttle = (shuttleId: Id<"shuttles">) => {
    setSelectedShuttleId(shuttleId);
    setShowConfirmDialog(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedShuttleId || !user?.id) return;

    setIsAssigning(true);
    try {
      const result = await assignShuttle({
        driverId: user.id as Id<"users">,
        shuttleId: selectedShuttleId,
      });

      toast.success(
        `Assigned to shuttle ${result.vehicleNumber}. You have ${result.tripInstancesCount} trip(s) today.`
      );
      setShowConfirmDialog(false);
      setSelectedShuttleId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to assign shuttle");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!user?.id) return;

    setIsAssigning(true);
    try {
      const result = await unassignShuttle({
        driverId: user.id as Id<"users">,
      });

      if (result.unassignedFrom) {
        toast.success(`Unassigned from shuttle ${result.unassignedFrom}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to unassign");
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500";
      case "IN_PROGRESS":
        return "bg-amber-500";
      case "CANCELLED":
        return "bg-rose-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "IN_PROGRESS":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <UserRound className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">Please sign in</p>
          <p className="text-sm text-muted-foreground">
            Sign in to view available shuttles
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

  // Sort trip instances by start time (earliest first)
  const sortedTripInstances = tripInstances
    ? [...tripInstances].sort((a, b) =>
        a.scheduledStartTime.localeCompare(b.scheduledStartTime)
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center px-4">
        <div className="flex items-center justify-center gap-2 text-violet-600 mb-2">
          <Bus className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em]">
            Driver Dashboard
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {assignedShuttle ? "Your Assigned Shuttle" : "Select Your Shuttle"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          {assignedShuttle
            ? "View your trips for today or switch to a different shuttle"
            : "Choose a shuttle to start your shift"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Today:{" "}
          {new Date(todayDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          (UTC)
        </p>
      </div>

      {/* Currently Assigned Shuttle & Trips */}
      {assignedShuttle && (
        <div className="space-y-4">
          <Card className="border-2 border-emerald-200 bg-emerald-50/50 mx-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    {assignedShuttle.vehicleNumber}
                  </CardTitle>
                  <CardDescription>Currently assigned to you</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnassign}
                  disabled={isAssigning}
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Unassign"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="bg-emerald-100/50 rounded-lg p-2 sm:p-3">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700">
                    {assignedShuttle.tripCountToday}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Trips
                  </p>
                </div>
                <div className="bg-emerald-100/50 rounded-lg p-2 sm:p-3">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700">
                    {assignedShuttle.totalBookingsToday}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Bookings
                  </p>
                </div>
                <div className="bg-emerald-100/50 rounded-lg p-2 sm:p-3">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700">
                    {assignedShuttle.totalSeats}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Seats
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Trips - Mobile Optimized Full Width Cards */}
          {sortedTripInstances.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5" />
                  Today's Trips ({sortedTripInstances.length})
                </h2>
                <Link href="/driver/trips">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {sortedTripInstances.map((trip) => (
                  <Card
                    key={trip._id}
                    className="relative overflow-hidden border-l-4 transition-all active:scale-[0.99]"
                    style={{
                      borderLeftColor:
                        trip.status === "COMPLETED"
                          ? "#10b981"
                          : trip.status === "IN_PROGRESS"
                            ? "#f59e0b"
                            : trip.status === "CANCELLED"
                              ? "#ef4444"
                              : "#3b82f6",
                    }}
                  >
                    <CardContent className="p-4">
                      {/* Top Row: Trip Name & Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">
                            {trip.tripName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {trip.sourceLocation} → {trip.destinationLocation}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            getStatusBadgeVariant(trip.status) as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline"
                          }
                          className="text-xs shrink-0"
                        >
                          {trip.status}
                        </Badge>
                      </div>

                      {/* Middle Row: Time & Stats */}
                      <div className="flex items-center justify-between gap-4 py-2 border-y border-dashed">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-sm">
                            {formatISOTime(trip.scheduledStartTime)} -{" "}
                            {formatISOTime(trip.scheduledEndTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {trip.seatsOccupied}/{trip.totalSeats}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            <span>{trip.bookingCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Row: View Details */}
                      <div className="mt-3 flex justify-end">
                        <Link href={`/driver/trips/${trip._id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                          >
                            View Details
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {sortedTripInstances.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 font-semibold">No trips scheduled today</p>
                <p className="text-sm text-muted-foreground">
                  Check back later or wait for bookings
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!assignedShuttle && (
        <>
          {/* Available Shuttles */}
          <div>
            <h2 className="text-base sm:text-lg font-semibold mb-3 px-1">
              Available Shuttles
            </h2>

            {availableShuttles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Bus className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 font-semibold">No shuttles available</p>
                  <p className="text-sm text-muted-foreground">
                    Contact your hotel admin to add shuttles
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableShuttles.map((shuttle) => (
                  <Card
                    key={shuttle._id}
                    className={`transition-all hover:shadow-md ${
                      shuttle.isAssignedToMe
                        ? "border-2 border-emerald-300 bg-emerald-50/30"
                        : ""
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <Bus className="h-4 w-4" />
                          {shuttle.vehicleNumber}
                        </CardTitle>
                        {shuttle.isAssignedToMe && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                            Assigned
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <UserRound className="h-3 w-3" />
                        {shuttle.currentDriverName || "Assigned to: none"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-lg font-bold">
                            {shuttle.tripCountToday}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Trips Today
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-lg font-bold">
                            {shuttle.totalSeats}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Seats
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        {shuttle.totalBookingsToday} booking
                        {shuttle.totalBookingsToday !== 1 ? "s" : ""} •{" "}
                        {shuttle.totalSeatsBookedToday} seat
                        {shuttle.totalSeatsBookedToday !== 1 ? "s" : ""} booked
                      </p>

                      {!shuttle.isAssignedToMe && (
                        <Button
                          className="w-full h-9"
                          onClick={() => handleSelectShuttle(shuttle._id)}
                          disabled={isAssigning}
                        >
                          Select Shuttle
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Taken Shuttles */}
          {takenShuttles.length > 0 && (
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-3 px-1">
                Taken Shuttles
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {takenShuttles.map((shuttle) => (
                  <Card
                    key={shuttle._id}
                    className="transition-all hover:shadow-md"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <Bus className="h-4 w-4" />
                          {shuttle.vehicleNumber}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/30 text-xs"
                        >
                          Taken
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <UserRound className="h-3 w-3" />
                        {shuttle.currentDriverName || "Assigned to: none"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-lg font-bold">
                            {shuttle.tripCountToday}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Trips Today
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-lg font-bold">
                            {shuttle.totalSeats}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Seats
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        {shuttle.totalBookingsToday} booking
                        {shuttle.totalBookingsToday !== 1 ? "s" : ""} •{" "}
                        {shuttle.totalSeatsBookedToday} seat
                        {shuttle.totalSeatsBookedToday !== 1 ? "s" : ""} booked
                      </p>

                      <Button
                        variant="destructive"
                        className="w-full h-9"
                        onClick={() => handleSelectShuttle(shuttle._id)}
                        disabled={isAssigning}
                      >
                        Take Over
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Shuttle Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const selectedShuttle = shuttles?.find(
                  (s) => s._id === selectedShuttleId
                );
                if (!selectedShuttle) return "";

                if (selectedShuttle.currentlyAssignedTo) {
                  return `This shuttle is currently assigned to ${selectedShuttle.currentDriverName}. Selecting it will reassign it to you.`;
                }
                return `You will be assigned to shuttle ${selectedShuttle.vehicleNumber} with ${selectedShuttle.tripCountToday} trip(s) scheduled for today.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isAssigning}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAssignment}
              disabled={isAssigning}
              className="w-full sm:w-auto"
            >
              {isAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
