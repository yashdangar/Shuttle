"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
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
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

function getUTCDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function DriverShuttleSelection() {
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

  // Get trip instances for the currently assigned shuttle
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

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(":");
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-violet-600 mb-2">
          <Bus className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em]">
            Driver Dashboard
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {assignedShuttle ? "Your Assigned Shuttle" : "Select Your Shuttle"}
        </h1>
        <p className="text-muted-foreground mt-2">
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
        <div className="space-y-6">
          <Card className="border-2 border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {assignedShuttle.tripCountToday}
                  </p>
                  <p className="text-xs text-muted-foreground">Trips Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {assignedShuttle.totalBookingsToday}
                  </p>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {assignedShuttle.totalSeats}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Seats</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Trips */}
          {tripInstances && tripInstances.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Today's Trips ({tripInstances.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {tripInstances.map((trip) => (
                  <Card key={trip._id} className="relative overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 w-1 h-full ${
                        trip.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : trip.status === "IN_PROGRESS"
                            ? "bg-amber-500"
                            : trip.status === "CANCELLED"
                              ? "bg-rose-500"
                              : "bg-blue-500"
                      }`}
                    />
                    <CardContent className="p-4 pl-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{trip.tripName}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {trip.sourceLocation} → {trip.destinationLocation}
                          </div>
                        </div>
                        <Badge
                          variant={
                            trip.status === "COMPLETED"
                              ? "default"
                              : trip.status === "IN_PROGRESS"
                                ? "secondary"
                                : trip.status === "CANCELLED"
                                  ? "destructive"
                                  : "outline"
                          }
                          className="text-xs"
                        >
                          {trip.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <CalendarClock className="h-4 w-4" />
                            {formatTime(trip.scheduledStartTime)} -{" "}
                            {formatTime(trip.scheduledEndTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {trip.seatsOccupied}/{trip.totalSeats}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({trip.bookingCount} bookings)
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tripInstances && tripInstances.length === 0 && (
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

      {/* Available Shuttles */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {assignedShuttle ? "Switch Shuttle" : "Available Shuttles"}
        </h2>

        {shuttles && shuttles.length === 0 ? (
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shuttles?.map((shuttle) => (
              <Card
                key={shuttle._id}
                className={`transition-all hover:shadow-md ${
                  shuttle.isAssignedToMe
                    ? "border-2 border-emerald-300 bg-emerald-50/30"
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bus className="h-4 w-4" />
                      {shuttle.vehicleNumber}
                    </CardTitle>
                    {shuttle.isAssignedToMe && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Assigned
                      </Badge>
                    )}
                  </div>
                  {shuttle.currentDriverName && !shuttle.isAssignedToMe && (
                    <CardDescription className="flex items-center gap-1">
                      <UserRound className="h-3 w-3" />
                      {shuttle.currentDriverName}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xl font-bold">
                        {shuttle.tripCountToday}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Trips Today
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xl font-bold">{shuttle.totalSeats}</p>
                      <p className="text-xs text-muted-foreground">Seats</p>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>
                      {shuttle.totalBookingsToday} booking
                      {shuttle.totalBookingsToday !== 1 ? "s" : ""} •{" "}
                      {shuttle.totalSeatsBookedToday} seat
                      {shuttle.totalSeatsBookedToday !== 1 ? "s" : ""} booked
                    </p>
                  </div>

                  {!shuttle.isAssignedToMe && (
                    <Button
                      className="w-full"
                      onClick={() => handleSelectShuttle(shuttle._id)}
                      disabled={isAssigning}
                    >
                      {shuttle.currentlyAssignedTo
                        ? "Take Over"
                        : "Select Shuttle"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAssigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAssignment}
              disabled={isAssigning}
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
