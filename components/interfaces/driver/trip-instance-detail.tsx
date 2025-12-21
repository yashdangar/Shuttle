"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  Bus,
  Calendar,
  Clock,
  Loader2,
  Ticket,
  Users,
  Navigation,
  Phone,
  User,
  Luggage,
  FileText,
  Play,
  QrCode,
  CheckCircle,
  XCircle,
  MapPin,
  ArrowRight,
  Check,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { QRScannerModal } from "./qr-scanner-modal";
import { useETAUpdater } from "@/hooks/maps/use-eta-updater";

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

interface TripInstanceDetailProps {
  tripInstanceId: string;
}

export function TripInstanceDetail({
  tripInstanceId,
}: TripInstanceDetailProps) {
  const router = useRouter();
  const { user } = useAuthSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRouteProcessing, setIsRouteProcessing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "start" | "complete" | "cancel" | null;
  }>({ open: false, action: null });
  const [routeConfirmDialog, setRouteConfirmDialog] = useState<{
    open: boolean;
    action: "start_next" | "revert" | null;
    currentSegment?: string;
    nextSegment?: string;
  }>({ open: false, action: null });

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

  const startTrip = useMutation(api.tripInstances.mutations.startTripInstance);
  const completeTrip = useMutation(
    api.tripInstances.mutations.completeTripInstance
  );
  const cancelTrip = useMutation(
    api.tripInstances.mutations.cancelTripInstance
  );
  const startNextRouteSegment = useMutation(
    api.routeInstances.mutations.startNextRouteSegment
  );
  const revertLastRouteCompletion = useMutation(
    api.routeInstances.mutations.revertLastRouteCompletion
  );

  const {
    isUpdating: isETAUpdating,
    lastUpdate: etaLastUpdate,
    error: etaError,
    triggerUpdate: refreshETA,
  } = useETAUpdater({
    tripInstanceId:
      tripInstance?.status === "IN_PROGRESS"
        ? (tripInstanceId as Id<"tripInstances">)
        : null,
    driverId: user?.id ? (user.id as Id<"users">) : null,
    enabled: tripInstance?.status === "IN_PROGRESS",
  });

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

  const handleAction = async (action: "start" | "complete" | "cancel") => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    setIsProcessing(true);
    try {
      if (action === "start") {
        await startTrip({
          driverId: user.id as Id<"users">,
          tripInstanceId: tripInstanceId as Id<"tripInstances">,
        });
        toast.success("Trip started! Safe travels.");
      } else if (action === "complete") {
        await completeTrip({
          driverId: user.id as Id<"users">,
          tripInstanceId: tripInstanceId as Id<"tripInstances">,
        });
        toast.success("Trip completed successfully!");
      } else if (action === "cancel") {
        await cancelTrip({
          driverId: user.id as Id<"users">,
          tripInstanceId: tripInstanceId as Id<"tripInstances">,
        });
        toast.success("Trip cancelled");
      }
      setConfirmDialog({ open: false, action: null });
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} trip`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNextSegment = async () => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    setIsRouteProcessing(true);
    try {
      const result = await startNextRouteSegment({
        driverId: user.id as Id<"users">,
        tripInstanceId: tripInstanceId as Id<"tripInstances">,
      });
      toast.success(result.message);
      setRouteConfirmDialog({ open: false, action: null });
    } catch (error: any) {
      toast.error(error.message || "Failed to advance route segment");
    } finally {
      setIsRouteProcessing(false);
    }
  };

  const handleRevertLastSegment = async () => {
    if (!user?.id) {
      toast.error("Please sign in");
      return;
    }

    setIsRouteProcessing(true);
    try {
      const result = await revertLastRouteCompletion({
        driverId: user.id as Id<"users">,
        tripInstanceId: tripInstanceId as Id<"tripInstances">,
      });
      toast.success(result.message);
      setRouteConfirmDialog({ open: false, action: null });
    } catch (error: any) {
      toast.error(error.message || "Failed to revert route segment");
    } finally {
      setIsRouteProcessing(false);
    }
  };

  const openConfirmDialog = (action: "start" | "complete" | "cancel") => {
    setConfirmDialog({ open: true, action });
  };

  const openRouteConfirmDialog = (
    action: "start_next" | "revert",
    currentSegment?: string,
    nextSegment?: string
  ) => {
    setRouteConfirmDialog({ open: true, action, currentSegment, nextSegment });
  };

  const bookings = bookingsData || [];
  const routes = routeInstances || [];

  const currentRouteIndex = useMemo(() => {
    return routes.findIndex((r) => !r.completed);
  }, [routes]);

  const getRouteState = useCallback(
    (index: number): RouteState => {
      const route = routes[index];
      if (!route) return "upcoming";
      if (route.completed) return "completed";
      if (index === currentRouteIndex) return "in_progress";
      return "upcoming";
    },
    [routes, currentRouteIndex]
  );

  const getRouteStateStyles = useCallback((state: RouteState) => {
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
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tripInstance) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Trip not found</h2>
        <p className="text-muted-foreground mt-2">
          This trip instance doesn&apos;t exist or has been removed.
        </p>
        <Link href="/driver/trips">
          <Button className="mt-4">Back to Trips</Button>
        </Link>
      </div>
    );
  }

  const status = tripInstance.status;
  const canStart = status === "SCHEDULED";
  const canComplete = status === "IN_PROGRESS";
  const canCancel = status === "SCHEDULED" || status === "IN_PROGRESS";
  const completedRoutesCount = routes.filter((r) => r.completed).length;
  const totalRoutes = routes.length;

  const canShowStartNext =
    status === "IN_PROGRESS" &&
    currentRouteIndex !== -1 &&
    currentRouteIndex < routes.length - 1;

  const canRevert =
    (status === "IN_PROGRESS" || status === "COMPLETED") &&
    completedRoutesCount > 0;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/driver" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/driver/trips" className="hover:underline">
              Trips
            </Link>
            <span>/</span>
            <span>Details</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">
            {tripDetails?.name || "Trip Instance"}
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => setQrOpen(true)}
          className="gap-2"
        >
          <QrCode className="h-4 w-4" />
          Scan QR
        </Button>
      </div>

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

            <div className="flex flex-wrap gap-2">
              {canStart && (
                <Button
                  onClick={() => openConfirmDialog("start")}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Trip
                </Button>
              )}
              {canComplete && (
                <Button
                  onClick={() => openConfirmDialog("complete")}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete Trip
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={() => openConfirmDialog("cancel")}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Trip
                </Button>
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
                  <Play className="h-4 w-4" />
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
                  <CheckCircle className="h-4 w-4" />
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
                  Route Segments ({completedRoutesCount}/{totalRoutes}{" "}
                  completed)
                </CardTitle>
                {status === "IN_PROGRESS" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isETAUpdating ? (
                      <span className="flex items-center gap-1 text-blue-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Updating...
                      </span>
                    ) : etaError ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <WifiOff className="h-3 w-3" />
                        Offline
                      </span>
                    ) : etaLastUpdate ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Wifi className="h-3 w-3" />
                        Live
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {status === "IN_PROGRESS" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshETA}
                    disabled={isETAUpdating}
                    className="gap-1"
                  >
                    {isETAUpdating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Navigation className="h-3.5 w-3.5" />
                    )}
                    Refresh ETA
                  </Button>
                )}
                {canRevert && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const lastCompleted = routes
                        .filter((r) => r.completed)
                        .pop();
                      openRouteConfirmDialog(
                        "revert",
                        lastCompleted
                          ? `${lastCompleted.startLocationName} → ${lastCompleted.endLocationName}`
                          : undefined
                      );
                    }}
                    disabled={isRouteProcessing}
                    className="gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Revert Last
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {routes.map((route, index) => {
              const routeState = getRouteState(index);
              const styles = getRouteStateStyles(routeState);
              const isNextSegment =
                status === "IN_PROGRESS" && index === currentRouteIndex + 1;

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
                        <Play className="h-4 w-4" />
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
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
                        <span className="text-amber-600 font-medium">ETA: {route.eta}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {routeState === "in_progress" &&
                        status === "IN_PROGRESS" && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            🚗 Currently traveling
                          </Badge>
                        )}
                      {route.canBeSkipped && status === "IN_PROGRESS" && (
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

                  {isNextSegment && canShowStartNext && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const currentRoute = routes[currentRouteIndex];
                        openRouteConfirmDialog(
                          "start_next",
                          currentRoute
                            ? `${currentRoute.startLocationName} → ${currentRoute.endLocationName}`
                            : undefined,
                          `${route.startLocationName} → ${route.endLocationName}`
                        );
                      }}
                      disabled={isRouteProcessing}
                      className="bg-amber-600 hover:bg-amber-700 gap-1"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Next
                    </Button>
                  )}
                </div>
              );
            })}

            {status === "IN_PROGRESS" &&
              currentRouteIndex === routes.length - 1 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-sm text-blue-700">
                    This is the final segment. Use &quot;Complete Trip&quot;
                    when you arrive at the destination.
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
            {bookings.map((booking) => {
              const verified = (booking as any).qrCodeStatus === "VERIFIED";
              return (
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

                      <div className="flex flex-col items-end gap-1 text-sm">
                        <Badge
                          variant={
                            booking.bookingStatus === "CONFIRMED"
                              ? "default"
                              : booking.bookingStatus === "PENDING"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {booking.bookingStatus}
                        </Badge>
                        <Badge
                          variant={verified ? "default" : "secondary"}
                          className={`text-[11px] ${
                            verified
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {verified ? "Verified" : "Unverified"}
                        </Badge>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {booking.seats}
                          </span>
                          <span className="flex items-center gap-1">
                            <Luggage className="h-3.5 w-3.5" />
                            {booking.bags}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ${booking.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, action: null })}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "start" && "Start this trip?"}
              {confirmDialog.action === "complete" && "Complete this trip?"}
              {confirmDialog.action === "cancel" && "Cancel this trip?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "start" &&
                "This will mark the trip as in progress. You can then complete individual route segments as you reach each destination."}
              {confirmDialog.action === "complete" &&
                "This will mark the trip and all route segments as completed. Make sure all passengers have reached their destination."}
              {confirmDialog.action === "cancel" &&
                "This will cancel the trip. All passengers will need to be rebooked or notified."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog.action && handleAction(confirmDialog.action)
              }
              disabled={isProcessing}
              className={`w-full sm:w-auto ${
                confirmDialog.action === "start"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : confirmDialog.action === "complete"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {confirmDialog.action === "start" && "Start Trip"}
              {confirmDialog.action === "complete" && "Complete Trip"}
              {confirmDialog.action === "cancel" && "Cancel Trip"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={routeConfirmDialog.open}
        onOpenChange={(open) => setRouteConfirmDialog({ open, action: null })}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {routeConfirmDialog.action === "start_next" &&
                "Start next segment?"}
              {routeConfirmDialog.action === "revert" &&
                "Revert last completion?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {routeConfirmDialog.action === "start_next" && (
                <>
                  Starting <strong>{routeConfirmDialog.nextSegment}</strong>{" "}
                  will mark <strong>{routeConfirmDialog.currentSegment}</strong>{" "}
                  as completed. Passengers ending at that stop will be released.
                </>
              )}
              {routeConfirmDialog.action === "revert" && (
                <>
                  This will undo the completion of{" "}
                  <strong>{routeConfirmDialog.currentSegment}</strong> and
                  restore any seats that were released.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isRouteProcessing}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (routeConfirmDialog.action === "start_next") {
                  handleStartNextSegment();
                } else if (routeConfirmDialog.action === "revert") {
                  handleRevertLastSegment();
                }
              }}
              disabled={isRouteProcessing}
              className={`w-full sm:w-auto ${
                routeConfirmDialog.action === "start_next"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {isRouteProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {routeConfirmDialog.action === "start_next" && "Start Next"}
              {routeConfirmDialog.action === "revert" && "Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QRScannerModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onSuccess={() => {
          toast.success("Passenger checked in");
          setQrOpen(false);
        }}
        passengerList={bookings}
      />
    </div>
  );
}
