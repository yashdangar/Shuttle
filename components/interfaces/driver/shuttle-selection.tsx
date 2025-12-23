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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <UserRound className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-semibold">Sign in required</p>
            <p className="text-sm text-muted-foreground">
              Please sign in to access the driver dashboard
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
          <p className="text-sm text-muted-foreground">Loading shuttles...</p>
        </div>
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
    <div className="space-y-8">
      {/* Header - Modern Minimalist */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
          <Bus className="h-4 w-4" />
          <span className="text-xs font-medium">Driver Dashboard</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
          {assignedShuttle ? "Your Shuttle" : "Select Shuttle"}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
          {assignedShuttle
            ? "Manage your trips and view today's schedule"
            : "Choose an available shuttle to begin your shift"}
        </p>
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
          <CalendarClock className="h-3 w-3" />
          {new Date(todayDate).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Currently Assigned Shuttle & Trips */}
      {assignedShuttle && (
        <div className="space-y-6">
          {/* Assigned Shuttle Card - Clean Minimal Design */}
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">
                      {assignedShuttle.vehicleNumber}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnassign}
                  disabled={isAssigning}
                  className="text-xs"
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Switch"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">
                    {assignedShuttle.tripCountToday}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Trips</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">
                    {assignedShuttle.totalBookingsToday}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Bookings</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">
                    {assignedShuttle.totalSeats}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Seats</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Trips - Clean Cards */}
          {sortedTripInstances.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarClock className="h-4 w-4 text-primary" />
                  </div>
                  Today's Trips
                  <Badge variant="secondary" className="ml-1 font-normal">
                    {sortedTripInstances.length}
                  </Badge>
                </h2>
                <Link href="/driver/trips">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-primary">
                    View All
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {sortedTripInstances.map((trip) => (
                  <Link key={trip._id} href={`/driver/trips/${trip._id}`} className="block">
                    <Card className="border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] overflow-hidden group">
                      <CardContent className="p-4">
                        {/* Trip Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                              {trip.tripName}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {trip.sourceLocation} → {trip.destinationLocation}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant={getStatusBadgeVariant(trip.status) as "default" | "secondary" | "destructive" | "outline"}
                            className="text-[10px] shrink-0 font-medium"
                          >
                            {trip.status}
                          </Badge>
                        </div>

                        {/* Trip Stats */}
                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-dashed">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">
                              {formatISOTime(trip.scheduledStartTime)}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-muted-foreground">
                              {formatISOTime(trip.scheduledEndTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              <span className="font-medium text-foreground">{trip.seatsOccupied}</span>
                              <span>/{trip.totalSeats}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Ticket className="h-3.5 w-3.5" />
                              <span>{trip.bookingCount}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {sortedTripInstances.length === 0 && (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-12 text-center">
                <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <CalendarClock className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="mt-4 font-semibold text-lg">No trips today</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your schedule is clear for now
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!assignedShuttle && (
        <div className="space-y-8">
          {/* Available Shuttles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bus className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Available</h2>
              <Badge variant="secondary" className="font-normal">
                {availableShuttles.length}
              </Badge>
            </div>

            {availableShuttles.length === 0 ? (
              <Card className="border-dashed border-2 bg-muted/20">
                <CardContent className="py-12 text-center">
                  <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <Bus className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="mt-4 font-semibold text-lg">No shuttles available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact your admin to add shuttles
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {availableShuttles.map((shuttle) => (
                  <Card
                    key={shuttle._id}
                    className="border-0 shadow-sm hover:shadow-lg transition-all duration-200 group overflow-hidden"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line suggestCanonicalClasses */}
                        <div className="h-11 w-11 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary group-hover:to-primary/80 transition-all duration-200">
                          <Bus className="h-5 w-5 text-primary group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {shuttle.vehicleNumber}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {shuttle.totalSeats} seats capacity
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shuttle.tripCountToday}</span>
                          <span className="text-muted-foreground">trips</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shuttle.totalBookingsToday}</span>
                          <span className="text-muted-foreground">bookings</span>
                        </div>
                      </div>

                      <Button
                        className="w-full h-10 font-medium"
                        onClick={() => handleSelectShuttle(shuttle._id)}
                        disabled={isAssigning}
                      >
                        Select This Shuttle
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Taken Shuttles */}
          {takenShuttles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold">In Use</h2>
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {takenShuttles.length}
                </Badge>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {takenShuttles.map((shuttle) => (
                  <Card
                    key={shuttle._id}
                    className="border-0 shadow-sm bg-muted/30 overflow-hidden"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
                          <Bus className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate text-muted-foreground">
                            {shuttle.vehicleNumber}
                          </CardTitle>
                          <CardDescription className="text-xs flex items-center gap-1">
                            <UserRound className="h-3 w-3" />
                            {shuttle.currentDriverName || "Unknown driver"}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">
                          In Use
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="flex items-center justify-between text-sm bg-background/50 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shuttle.tripCountToday}</span>
                          <span className="text-muted-foreground">trips</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shuttle.totalBookingsToday}</span>
                          <span className="text-muted-foreground">bookings</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full h-10 font-medium border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
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
        </div>
      )}

      {/* Confirm Dialog - Modern Style */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Bus className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">Confirm Selection</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {(() => {
                const selectedShuttle = shuttles?.find(
                  (s) => s._id === selectedShuttleId
                );
                if (!selectedShuttle) return "";

                if (selectedShuttle.currentlyAssignedTo) {
                  return `This shuttle is currently assigned to ${selectedShuttle.currentDriverName}. Selecting it will reassign it to you.`;
                }
                return `You'll be assigned to ${selectedShuttle.vehicleNumber} with ${selectedShuttle.tripCountToday} trip(s) scheduled for today.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-2">
            <AlertDialogCancel
              disabled={isAssigning}
              className="w-full sm:w-auto rounded-xl"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAssignment}
              disabled={isAssigning}
              className="w-full sm:w-auto rounded-xl"
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
