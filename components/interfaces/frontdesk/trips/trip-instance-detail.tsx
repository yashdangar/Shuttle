"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import PageLayout from "@/components/layout/page-layout";
import {
  Calendar,
  Clock,
  Loader2,
  Ticket,
  Users,
  MapPin,
  Check,
  Navigation,
  Bus,
  Phone,
  User,
  Luggage,
  FileText,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";

type RouteState = "completed" | "in_progress" | "upcoming";

function formatISOTime(isoTimeStr: string): string {
  try {
    if (isoTimeStr.includes("T")) {
      const date = new Date(isoTimeStr);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    } else {
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

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function FrontdeskTripInstanceDetail({
  tripInstanceId,
}: {
  tripInstanceId: string;
}) {
  const tripInstance = useQuery(api.tripInstances.queries.getTripInstanceById, {
    tripInstanceId: tripInstanceId as Id<"tripInstances">,
  });

  const tripDetails = useQuery(
    api.trips.index.getTripById,
    tripInstance?.tripId
      ? { tripId: tripInstance.tripId as Id<"trips"> }
      : "skip"
  );

  const routeInstances = useQuery(
    api.routeInstances.queries.getRouteInstancesWithSkipInfo,
    tripInstance?._id
      ? { tripInstanceId: tripInstance._id as Id<"tripInstances"> }
      : "skip"
  );

  const bookingsData = useQuery(
    api.bookings.index.getBookingsByTripInstance,
    tripInstance?._id
      ? { tripInstanceId: tripInstance._id as Id<"tripInstances"> }
      : "skip"
  );

  const isLoading = tripInstance === undefined;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-50 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-amber-50 border-amber-200";
      case "CANCELLED":
        return "bg-rose-50 border-rose-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const routes = routeInstances || [];
  const bookings = bookingsData || [];

  const currentRouteIndex = useMemo(() => {
    return routes.findIndex((r) => !r.completed);
  }, [routes]);

  const getRouteState = (index: number): RouteState => {
    const route = routes[index];
    if (!route) return "upcoming";
    if (route.completed) return "completed";
    if (index === currentRouteIndex) return "in_progress";
    return "upcoming";
  };

  const getRouteStateStyles = (state: RouteState) => {
    switch (state) {
      case "completed":
        return {
          container: "bg-emerald-50 border-emerald-200",
          circle: "bg-emerald-500 text-white",
          text: "text-emerald-700",
        };
      case "in_progress":
        return {
          container: "bg-amber-50 border-amber-200",
          circle: "bg-amber-500 text-white",
          text: "text-amber-700",
        };
      default:
        return {
          container: "bg-muted/30 border-border",
          circle: "bg-muted text-muted-foreground",
          text: "text-muted-foreground",
        };
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Trip Instance" description="Loading trip details..." size="full">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!tripInstance) {
    return (
      <PageLayout title="Trip not found" description="This trip instance may have been removed." size="full">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Trip not found</h2>
          <p className="text-muted-foreground mt-2">
            This trip instance doesn&apos;t exist or has been removed.
          </p>
          <Link href="/frontdesk/current-trips">
            <Button className="mt-4">Back to Trips</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const status = tripInstance.status;
  const completedRoutesCount = routes.filter((r) => r.completed).length;
  const totalRoutes = routes.length;

  return (
    <PageLayout
      title={tripDetails?.name || "Trip Instance"}
      description="Trip instance details and passenger list."
      size="full"
    >
      <div className="space-y-4 pb-8">
        <Card className={`border-2 ${getStatusBgColor(status)}`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge
                  className={`${getStatusColor(status)} border text-sm px-3 py-1`}
                >
                  {status === "IN_PROGRESS" ? "🚗 In Progress" : status}
                </Badge>
                {status === "IN_PROGRESS" && totalRoutes > 0 && (
                  <span className="text-sm text-amber-700 font-medium">
                    {completedRoutesCount}/{totalRoutes} segments completed
                  </span>
                )}
                {status === "COMPLETED" && (
                  <span className="text-sm text-emerald-700 font-medium">
                    Trip completed ✓
                  </span>
                )}
                {status === "CANCELLED" && (
                  <span className="text-sm text-rose-700 font-medium">
                    Trip was cancelled
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {formatDate(tripInstance.scheduledDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatISOTime(tripInstance.scheduledStartTime)} -{" "}
                    {formatISOTime(tripInstance.scheduledEndTime)}
                  </span>
                </div>
                {tripInstance.actualStartTime && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <span className="text-sm">
                      Started:{" "}
                      {new Date(
                        tripInstance.actualStartTime
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {tripInstance.actualEndTime && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-sm">
                      Ended:{" "}
                      {new Date(tripInstance.actualEndTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold">
                    {tripInstance.seatsOccupied}/{tripInstance.seatHeld || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Occupied/Held
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Ticket className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold">{bookings.length}</p>
                  <p className="text-[10px] text-muted-foreground">Bookings</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Bus className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold truncate">
                    {tripInstance.driverInfo?.name || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Driver</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {routes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Route Segments ({completedRoutesCount}/{totalRoutes} completed)
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {tripInstance.status === "IN_PROGRESS" ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Wifi className="h-3 w-3" />
                      Live
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <WifiOff className="h-3 w-3" />
                      Offline
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {routes.map((route, index) => {
                const routeState = getRouteState(index);
                const styles = getRouteStateStyles(routeState);

                return (
                  <div
                    key={route._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${styles.container}`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${styles.circle}`}
                      >
                        {routeState === "completed" ? (
                          <Check className="h-4 w-4" />
                        ) : routeState === "in_progress" ? (
                          <Navigation className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {route.startLocationName}
                        </span>
                        <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {route.endLocationName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {route.seatsOccupied} occupied / {route.seatHeld} held
                        </span>
                        <span>${route.charges.toFixed(2)}</span>
                        {route.distance && (
                          <span className="text-blue-600">{route.distance}</span>
                        )}
                        {route.eta && (
                          <span className="text-amber-600 font-medium">
                            ETA: {route.eta}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {routeState === "in_progress" &&
                          tripInstance.status === "IN_PROGRESS" && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              🚗 Currently traveling
                            </Badge>
                          )}
                        {route.canBeSkipped &&
                          tripInstance.status === "IN_PROGRESS" && (
                            <Badge
                              variant="outline"
                              className="text-slate-500 border-slate-300"
                            >
                              No bookings - can skip
                            </Badge>
                          )}
                      </div>
                    </div>

                    {routeState === "completed" && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        <Check className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                );
              })}

              {tripInstance.status === "IN_PROGRESS" &&
                currentRouteIndex === routes.length - 1 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="text-sm text-blue-700">
                      This is the final segment.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Passengers ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 font-semibold">No passengers yet</p>
                <p className="text-sm text-muted-foreground">
                  Bookings will appear here when guests reserve seats
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <Card key={booking._id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">
                            {booking.guestName || "Guest"}
                          </span>
                        </div>

                        {booking.guestPhone && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <a
                              href={`tel:${booking.guestPhone}`}
                              className="hover:underline"
                            >
                              {booking.guestPhone}
                            </a>
                          </div>
                        )}

                        {(booking as any).fromLocation &&
                          (booking as any).toLocation && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {(booking as any).fromLocation} →{" "}
                                {(booking as any).toLocation}
                              </span>
                            </div>
                          )}

                        {booking.notes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                            <span className="font-medium">Notes:</span>{" "}
                            {booking.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right text-sm text-muted-foreground space-y-1">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs">
                          Seats: {booking.seats}
                        </div>
                        {booking.bags !== undefined && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                            <Luggage className="h-3 w-3" />
                            {booking.bags} bags
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

