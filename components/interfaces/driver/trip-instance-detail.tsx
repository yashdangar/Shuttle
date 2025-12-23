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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!tripInstance) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Trip not found</h2>
            <p className="text-sm text-muted-foreground">
              This trip doesn&apos;t exist or has been removed.
            </p>
          </div>
          <Link href="/driver/trips">
            <Button className="mt-2">Back to Trips</Button>
          </Link>
        </div>
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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            {tripDetails?.name || "Trip Details"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(tripInstance.scheduledDate)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setQrOpen(true)}
          className="gap-2 rounded-full"
        >
          <QrCode className="h-4 w-4" />
          <span className="hidden sm:inline">Scan</span>
        </Button>
      </div>

      {/* Status & Actions */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge
                className={`${getStatusColor(status)} border-0 text-xs px-2.5 py-1`}
              >
                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                  status === "IN_PROGRESS" ? "bg-amber-500 animate-pulse" :
                  status === "COMPLETED" ? "bg-emerald-500" :
                  status === "CANCELLED" ? "bg-rose-500" : "bg-primary"
                }`} />
                {status === "IN_PROGRESS" ? "In Progress" : status.charAt(0) + status.slice(1).toLowerCase()}
              </Badge>
              {status === "IN_PROGRESS" && totalRoutes > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedRoutesCount}/{totalRoutes} segments
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {canStart && (
                <Button
                  onClick={() => openConfirmDialog("start")}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Play className="h-3.5 w-3.5" />
                  Start Trip
                </Button>
              )}
              {canComplete && (
                <Button
                  onClick={() => openConfirmDialog("complete")}
                  disabled={isProcessing}
                  size="sm"
                  className="gap-2"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Complete
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openConfirmDialog("cancel")}
                  disabled={isProcessing}
                  className="gap-2 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Info */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Time Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {formatISOTime(tripInstance.scheduledStartTime)} - {formatISOTime(tripInstance.scheduledEndTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">Scheduled time</p>
                </div>
              </div>
              {tripInstance.actualStartTime && (
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600">
                    {new Date(tripInstance.actualStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  <p className="text-xs text-muted-foreground">Started</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold">
                  {tripInstance.seatsOccupied}<span className="text-sm text-muted-foreground">/{tripInstance.seatHeld || 0}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Seats</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold">{bookings.length}</p>
                <p className="text-[10px] text-muted-foreground">Bookings</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm font-bold truncate">
                  {tripInstance.driverInfo?.name || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Driver</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Segments */}
      {routes.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Navigation className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Route</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {completedRoutesCount}/{totalRoutes} completed
                    {status === "IN_PROGRESS" && (
                      <span className="ml-2">
                        {isETAUpdating ? (
                          <span className="text-primary">• Updating</span>
                        ) : etaError ? (
                          <span className="text-destructive">• Offline</span>
                        ) : etaLastUpdate ? (
                          <span className="text-emerald-600">• Live</span>
                        ) : null}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status === "IN_PROGRESS" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refreshETA}
                    disabled={isETAUpdating}
                    className="h-8 w-8 p-0"
                  >
                    {isETAUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {canRevert && (
                  <Button
                    size="sm"
                    variant="ghost"
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
                    className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {routes.map((route, index) => {
              const routeState = getRouteState(index);
              const isNextSegment =
                status === "IN_PROGRESS" && index === currentRouteIndex + 1;

              return (
                <div
                  key={route._id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    routeState === "completed" ? "bg-emerald-50/50 border-emerald-200" :
                    routeState === "in_progress" ? "bg-amber-50/50 border-amber-200" :
                    "bg-muted/30 border-transparent"
                  }`}
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                    routeState === "completed" ? "bg-emerald-500 text-white" :
                    routeState === "in_progress" ? "bg-amber-500 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {routeState === "completed" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : routeState === "in_progress" ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium truncate">{route.startLocationName}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{route.endLocationName}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{route.seatsOccupied} pax</span>
                      {route.distance && <span>{route.distance}</span>}
                      {route.eta && (
                        <span className={`font-medium ${
                          routeState === "completed" ? "text-emerald-600" :
                          routeState === "in_progress" ? "text-amber-600" :
                          "text-muted-foreground"
                        }`}>
                          ETA: {route.eta}
                        </span>
                      )}
                    </div>
                  </div>

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
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                    >
                      Next
                    </Button>
                  )}
                </div>
              );
            })}

            {status === "IN_PROGRESS" &&
              currentRouteIndex === routes.length - 1 && (
                <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                  <p className="text-xs text-primary">
                    Final segment. Tap &quot;Complete&quot; when you arrive.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Passengers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Passengers</h2>
          <Badge variant="secondary" className="font-normal">{bookings.length}</Badge>
        </div>

        {bookings.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 font-semibold">No passengers</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bookings will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => {
              const verified = (booking as any).qrCodeStatus === "VERIFIED";
              return (
                <Card key={booking._id} className="border shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        verified ? "bg-emerald-100" : "bg-muted"
                      }`}>
                        {verified ? (
                          <Check className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {booking.guestName || "Guest"}
                          </span>
                          {!verified && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Unverified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {booking.seats}
                          </span>
                          <span className="flex items-center gap-1">
                            <Luggage className="h-3 w-3" />
                            {booking.bags}
                          </span>
                          {(booking as any).fromLocation && (booking as any).toLocation && (
                            <span className="truncate">
                              {(booking as any).fromLocation} → {(booking as any).toLocation}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {booking.guestPhone && (
                          <a
                            href={`tel:${booking.guestPhone}`}
                            className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                          >
                            <Phone className="h-4 w-4 text-primary" />
                          </a>
                        )}
                        <span className="text-xs font-medium">
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

      {/* Dialogs */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, action: null })}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader className="text-center sm:text-left">
            <div className={`mx-auto sm:mx-0 h-12 w-12 rounded-full flex items-center justify-center mb-2 ${
              confirmDialog.action === "start" ? "bg-emerald-100" :
              confirmDialog.action === "complete" ? "bg-primary/10" : "bg-destructive/10"
            }`}>
              {confirmDialog.action === "start" && <Play className="h-6 w-6 text-emerald-600" />}
              {confirmDialog.action === "complete" && <CheckCircle className="h-6 w-6 text-primary" />}
              {confirmDialog.action === "cancel" && <XCircle className="h-6 w-6 text-destructive" />}
            </div>
            <AlertDialogTitle className="text-xl">
              {confirmDialog.action === "start" && "Start Trip?"}
              {confirmDialog.action === "complete" && "Complete Trip?"}
              {confirmDialog.action === "cancel" && "Cancel Trip?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {confirmDialog.action === "start" &&
                "The trip will be marked as in progress. Complete route segments as you reach each stop."}
              {confirmDialog.action === "complete" &&
                "All route segments will be marked complete. Ensure all passengers have arrived."}
              {confirmDialog.action === "cancel" &&
                "This will cancel the trip. Passengers will need to be notified."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-2">
            <AlertDialogCancel
              disabled={isProcessing}
              className="w-full sm:w-auto rounded-xl"
            >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog.action && handleAction(confirmDialog.action)
              }
              disabled={isProcessing}
              className={`w-full sm:w-auto rounded-xl ${
                confirmDialog.action === "start"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : confirmDialog.action === "complete"
                    ? ""
                    : "bg-destructive hover:bg-destructive/90"
              }`}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={routeConfirmDialog.open}
        onOpenChange={(open) => setRouteConfirmDialog({ open, action: null })}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader className="text-center sm:text-left">
            <div className={`mx-auto sm:mx-0 h-12 w-12 rounded-full flex items-center justify-center mb-2 ${
              routeConfirmDialog.action === "start_next" ? "bg-amber-100" : "bg-orange-100"
            }`}>
              {routeConfirmDialog.action === "start_next" && <Play className="h-6 w-6 text-amber-600" />}
              {routeConfirmDialog.action === "revert" && <RotateCcw className="h-6 w-6 text-orange-600" />}
            </div>
            <AlertDialogTitle className="text-xl">
              {routeConfirmDialog.action === "start_next" && "Start Next Segment?"}
              {routeConfirmDialog.action === "revert" && "Revert Completion?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {routeConfirmDialog.action === "start_next" && (
                <>This will complete the current segment and start <strong>{routeConfirmDialog.nextSegment}</strong>.</>
              )}
              {routeConfirmDialog.action === "revert" && (
                <>This will undo <strong>{routeConfirmDialog.currentSegment}</strong> and restore released seats.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-2">
            <AlertDialogCancel
              disabled={isRouteProcessing}
              className="w-full sm:w-auto rounded-xl"
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
              className={`w-full sm:w-auto rounded-xl ${
                routeConfirmDialog.action === "start_next"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {isRouteProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
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
