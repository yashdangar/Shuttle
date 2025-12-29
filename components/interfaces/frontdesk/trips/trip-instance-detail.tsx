"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useHotelTime } from "@/hooks/use-hotel-time";
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
  CreditCard,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Id } from "@/convex/_generated/dataModel";

type RouteState = "completed" | "in_progress" | "upcoming";
type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "WAIVED";
type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED";

const paymentStatusStyles: Record<PaymentStatus, { label: string; className: string }> = {
  UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-800" },
  PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
  REFUNDED: { label: "Refunded", className: "bg-blue-100 text-blue-800" },
  WAIVED: { label: "Waived", className: "bg-purple-100 text-purple-800" },
};

const bookingStatusStyles: Record<BookingStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", className: "bg-rose-100 text-rose-800" },
};

export function FrontdeskTripInstanceDetail({
  tripInstanceId,
}: {
  tripInstanceId: string;
}) {
  const { user } = useAuthSession();
  const { formatScheduledDateTime, formatTime, getOffset } = useHotelTime();
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  
  const updatePaymentStatus = useMutation(api.bookings.index.updatePaymentStatus);
  
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

  // Filter bookings based on selected filters
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesPayment = paymentFilter === "ALL" || booking.paymentStatus === paymentFilter;
      const matchesBookingStatus = bookingStatusFilter === "ALL" || booking.bookingStatus === bookingStatusFilter;
      return matchesPayment && matchesBookingStatus;
    });
  }, [bookings, paymentFilter, bookingStatusFilter]);

  const handlePaymentStatusChange = async (
    bookingId: string,
    newStatus: "UNPAID" | "PAID" | "REFUNDED" | "WAIVED"
  ) => {
    if (!user?.id) return;
    setUpdatingPaymentId(bookingId);

    try {
      await updatePaymentStatus({
        frontdeskUserId: user.id as Id<"users">,
        bookingId: bookingId as Id<"bookings">,
        paymentStatus: newStatus,
      });
      toast.success("Payment status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment status");
    } finally {
      setUpdatingPaymentId(null);
    }
  };

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
                    {formatScheduledDateTime(tripInstance.scheduledDate, tripInstance.scheduledStartTime).date}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatScheduledDateTime(tripInstance.scheduledDate, tripInstance.scheduledStartTime).time} -{" "}
                    {formatScheduledDateTime(tripInstance.scheduledDate, tripInstance.scheduledEndTime).time}
                    <span className="ml-1 text-xs text-muted-foreground/70">({getOffset()})</span>
                  </span>
                </div>
                {tripInstance.actualStartTime && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <span className="text-sm">
                      Started: {formatTime(tripInstance.actualStartTime)}
                    </span>
                  </div>
                )}
                {tripInstance.actualEndTime && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-sm">
                      Ended: {formatTime(tripInstance.actualEndTime)}
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Passengers ({filteredBookings.length}/{bookings.length})
            </h2>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={bookingStatusFilter}
                onValueChange={(value) => setBookingStatusFilter(value as BookingStatus | "ALL")}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Booking Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Bookings</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={paymentFilter}
                onValueChange={(value) => setPaymentFilter(value as PaymentStatus | "ALL")}
              >
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Payments</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                  <SelectItem value="WAIVED">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 font-semibold">
                  {bookings.length === 0 ? "No passengers yet" : "No bookings match filters"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {bookings.length === 0 
                    ? "Bookings will appear here when guests reserve seats"
                    : "Try adjusting your filters to see more results"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => (
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
                        {/* Booking Status Badge */}
                        <Badge className={`${bookingStatusStyles[booking.bookingStatus as BookingStatus]?.className || "bg-gray-100 text-gray-800"} rounded-full border-0 text-xs`}>
                          {bookingStatusStyles[booking.bookingStatus as BookingStatus]?.label || booking.bookingStatus}
                        </Badge>
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
                    
                    {/* Payment Status Section */}
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge className={`${paymentStatusStyles[booking.paymentStatus as PaymentStatus]?.className || "bg-gray-100 text-gray-800"} rounded-full border-0 text-xs`}>
                          {paymentStatusStyles[booking.paymentStatus as PaymentStatus]?.label || booking.paymentStatus}
                        </Badge>
                      </div>
                      {booking.bookingStatus === "CONFIRMED" && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={booking.paymentStatus}
                            onValueChange={(value) =>
                              handlePaymentStatusChange(
                                booking._id,
                                value as "UNPAID" | "PAID" | "REFUNDED" | "WAIVED"
                              )
                            }
                            disabled={updatingPaymentId === booking._id}
                          >
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNPAID">Unpaid</SelectItem>
                              <SelectItem value="PAID">Paid</SelectItem>
                              <SelectItem value="REFUNDED">Refunded</SelectItem>
                              <SelectItem value="WAIVED">Waived</SelectItem>
                            </SelectContent>
                          </Select>
                          {updatingPaymentId === booking._id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      )}
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

