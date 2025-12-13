"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search,
  CalendarClock,
  MapPin,
  UserRound,
  Loader2,
  Check,
  X,
  Users,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED";

const statusStyles: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700",
  },
};

export function FrontdeskBookingsList() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">(
    "ALL"
  );
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] =
    useState<Id<"bookings"> | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const bookings = useQuery(
    api.bookings.index.getHotelBookings,
    user?.id ? { userId: user.id as Id<"users"> } : "skip"
  );

  const isLoading = bookings === undefined;

  const filtered = useMemo(() => {
    if (!bookings) return [];
    let result = bookings;

    if (statusFilter !== "ALL") {
      result = result.filter((b) => b.bookingStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      result = result.filter((booking) =>
        [
          booking.guestName,
          booking.guestEmail,
          booking.tripDetails?.tripName,
          booking.tripDetails?.scheduledDate,
        ].some((field) => field?.toLowerCase().includes(term))
      );
    }

    return result;
  }, [searchQuery, bookings, statusFilter]);

  const handleConfirm = async (bookingId: Id<"bookings">) => {
    if (!user?.id) return;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontdeskUserId: user.id,
          bookingId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to confirm booking");
      }

      toast.success("Booking confirmed successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm booking");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = (bookingId: Id<"bookings">) => {
    setSelectedBookingId(bookingId);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!user?.id || !selectedBookingId || !rejectReason.trim()) return;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/bookings/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontdeskUserId: user.id,
          bookingId: selectedBookingId,
          reason: rejectReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reject booking");
      }

      toast.success("Booking rejected");
      setRejectDialogOpen(false);
      setSelectedBookingId(null);
      setRejectReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject booking");
    } finally {
      setIsProcessing(false);
    }
  };

  const goToBooking = (bookingId: Id<"bookings">) => {
    router.push(`/frontdesk/bookings/${bookingId}`);
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-6">
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center shadow-sm">
            <UserRound className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-4 text-lg font-semibold text-gray-900">
              Sign in to manage bookings
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Please sign in to view and manage hotel bookings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const statusCounts = {
    PENDING: bookings?.filter((b) => b.bookingStatus === "PENDING").length ?? 0,
    CONFIRMED:
      bookings?.filter((b) => b.bookingStatus === "CONFIRMED").length ?? 0,
    REJECTED:
      bookings?.filter((b) => b.bookingStatus === "REJECTED").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm md:px-10">
          <div className="flex items-center justify-center gap-3 text-violet-700">
            <CalendarClock className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em]">
              Booking overview
            </span>
          </div>
          <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Bookings Dashboard
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Review, confirm, or reject shuttle booking requests.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "ALL" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setStatusFilter("ALL")}
              >
                All ({bookings?.length ?? 0})
              </Button>
              {(["PENDING", "CONFIRMED", "REJECTED"] as BookingStatus[]).map(
                (status) => {
                  const style = statusStyles[status];
                  return (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      className={`rounded-full ${
                        statusFilter === status ? "" : style.className
                      }`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {style.label} ({statusCounts[status]})
                    </Button>
                  );
                }
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by guest name, email, or trip"
                className="h-11 rounded-xl border-gray-200 pl-10 focus-visible:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-12 text-center shadow-sm">
            <Search className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-4 text-lg font-semibold text-gray-900">
              No bookings found
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {bookings?.length === 0
                ? "No booking requests yet."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filtered.map((booking) => {
              const statusStyle = statusStyles[booking.bookingStatus];
              const trip = booking.tripDetails;
              const isPending = booking.bookingStatus === "PENDING";

              return (
                <div
                  key={booking._id}
                  className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {trip?.tripName || "Shuttle Transfer"}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${booking.totalPrice.toFixed(2)} • Booked{" "}
                        {formatDate(booking.createdAt)}
                      </p>
                    </div>
                    <Badge
                      className={`${statusStyle.className} rounded-full border border-transparent`}
                    >
                      {statusStyle.label}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {booking.guestName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {booking.guestEmail}
                      </span>
                    </div>

                    {trip && (
                      <>
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {trip.tripName}
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <CalendarClock className="h-4 w-4 text-gray-400" />
                          {formatDate(trip.scheduledDate)} at{" "}
                          {formatTime(trip.scheduledStartTime)}
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-2 text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      {booking.seats} seat{booking.seats !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-2">
                    {isPending ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleConfirm(booking._id)}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full gap-1"
                          onClick={() => handleRejectClick(booking._id)}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                        {booking.paymentStatus}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-4"
                      onClick={() => goToBooking(booking._id)}
                    >
                      View details
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this booking. The guest will
              be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
