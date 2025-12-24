"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import type { ReactNode } from "react";
import { useState } from "react";
import { useBookingETA } from "@/hooks/use-trip-eta";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  MapPin,
  UserRound,
  Bus,
  Phone,
  Loader2,
  Luggage,
  CreditCard,
  Check,
  X,
  Users,
  Mail,
  Clock,
} from "lucide-react";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED";

const statusStyles: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending Confirmation",
    className: "bg-amber-100 text-amber-800",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-800",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-100 text-rose-800",
  },
};

type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "WAIVED";

const paymentStatusStyles: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  UNPAID: {
    label: "Unpaid",
    className: "bg-red-100 text-red-800",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-800",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-blue-100 text-blue-800",
  },
  WAIVED: {
    label: "Waived",
    className: "bg-purple-100 text-purple-800",
  },
};

export default function FrontdeskBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthSession();
  const bookingId = params.id as string;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const updatePaymentStatus = useMutation(api.bookings.index.updatePaymentStatus);

  const booking = useQuery(api.bookings.index.getBookingById, {
    bookingId: bookingId as Id<"bookings">,
  });

  const {
    eta,
    pickupLocationName,
    isCompleted: pickupCompleted,
  } = useBookingETA(booking ? (bookingId as Id<"bookings">) : null);

  const isLoading = booking === undefined;

  const handleConfirm = async () => {
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

  const handleRejectConfirm = async () => {
    if (!user?.id || !rejectReason.trim()) return;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/bookings/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontdeskUserId: user.id,
          bookingId,
          reason: rejectReason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to reject booking");
      }

      toast.success("Booking rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject booking");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentStatusChange = async (
    newStatus: "UNPAID" | "PAID" | "REFUNDED" | "WAIVED"
  ) => {
    if (!user?.id) return;
    setIsUpdatingPayment(true);

    try {
      await updatePaymentStatus({
        frontdeskUserId: user.id as Id<"users">,
        bookingId: bookingId as Id<"bookings">,
        paymentStatus: newStatus,
      });
      toast.success("Payment status updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment status");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-4xl flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center shadow-sm">
          <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">
            Booking not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't locate that booking ID. It may have been removed or the
            link is invalid.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/frontdesk/bookings")}
          >
            Back to bookings
          </Button>
        </div>
      </div>
    );
  }

  const statusStyle = statusStyles[booking.bookingStatus as BookingStatus];
  const trip = booking.tripDetails;
  const isPending = booking.bookingStatus === "PENDING";

  const formatDate = (dateStr: string) => {
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

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              <Link
                href="/frontdesk/bookings"
                className="inline-flex items-center gap-1 hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </Link>
              <span className="text-muted-foreground">/ Booking detail</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {trip?.tripName || "Shuttle Transfer"}
            </h1>
            {trip && (
              <p className="text-sm text-muted-foreground">
                {trip.fromLocation} → {trip.toLocation}
              </p>
            )}
          </div>
          <Badge className={`${statusStyle.className} rounded-full border-0`}>
            {statusStyle.label}
          </Badge>
        </div>

        {/* Payment Status Section */}
        <div className="rounded-2xl border border-border bg-card px-6 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Payment Status
              </h3>
              <div className="flex items-center gap-2">
                <Badge className={`${paymentStatusStyles[booking.paymentStatus as PaymentStatus]?.className || "bg-gray-100 text-gray-800"} rounded-full border-0`}>
                  {paymentStatusStyles[booking.paymentStatus as PaymentStatus]?.label || booking.paymentStatus}
                </Badge>
                <span className="text-sm text-muted-foreground">• Method: {booking.paymentMethod}</span>
              </div>
            </div>
            {booking.bookingStatus === "CONFIRMED" && (
              <div className="flex items-center gap-2">
                <Select
                  value={booking.paymentStatus}
                  onValueChange={(value) =>
                    handlePaymentStatusChange(
                      value as "UNPAID" | "PAID" | "REFUNDED" | "WAIVED"
                    )
                  }
                  disabled={isUpdatingPayment}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                    <SelectItem value="WAIVED">Waived</SelectItem>
                  </SelectContent>
                </Select>
                {isUpdatingPayment && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>

        {isPending && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-amber-800">
                  Action Required
                </h3>
                <p className="text-sm text-amber-700">
                  This booking is awaiting your confirmation.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirm Booking
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-full gap-1"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Guest Information
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <InfoBlock
              icon={<UserRound className="h-4 w-4 text-primary" />}
              label="Guest Name"
              value={booking.name || booking.guestName}
              helper={
                booking.confirmationNum
                  ? `Confirmation Number: ${booking.confirmationNum}`
                  : undefined
              }
            />
            <InfoBlock
              icon={<Mail className="h-4 w-4 text-blue-600" />}
              label="Email"
              value={booking.guestEmail}
            />
            <InfoBlock
              icon={<Phone className="h-4 w-4 text-green-600" />}
              label="Phone"
              value={booking.guestPhone || "Not provided"}
            />
            <InfoBlock
              icon={<Users className="h-4 w-4 text-purple-600" />}
              label="Party Size"
              value={`${booking.seats} seat${booking.seats !== 1 ? "s" : ""}, ${booking.bags} bag${booking.bags !== 1 ? "s" : ""}`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-4">
            Trip Details
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <InfoBlock
              icon={<MapPin className="h-4 w-4 text-blue-600" />}
              label="Route"
              value={trip ? `${trip.fromLocation} → ${trip.toLocation}` : "N/A"}
              helper={booking.isParkSleepFly ? "Park, Sleep & Fly" : "Transfer"}
            />
            <InfoBlock
              icon={<CalendarClock className="h-4 w-4 text-amber-600" />}
              label="Pickup Time"
              value={
                trip
                  ? `${formatDate(trip.scheduledDate)}`
                  : "Date not available"
              }
              helper={
                trip
                  ? `${formatTime(trip.scheduledStartTime)} - ${formatTime(trip.scheduledEndTime)}`
                  : undefined
              }
            />
            <InfoBlock
              icon={<CreditCard className="h-4 w-4 text-emerald-600" />}
              label="Payment"
              value={`$${booking.totalPrice.toFixed(2)}`}
              helper={`${booking.paymentMethod} • ${booking.paymentStatus}`}
            />
            {trip?.shuttle && (
              <InfoBlock
                icon={<Bus className="h-4 w-4 text-indigo-600" />}
                label="Shuttle"
                value={trip.shuttle.vehicleNumber}
                helper={
                  trip.driver
                    ? `Driver: ${trip.driver.name}`
                    : "No driver assigned"
                }
              />
            )}
            {trip?.status === "IN_PROGRESS" && eta && !pickupCompleted && (
              <InfoBlock
                icon={<Clock className="h-4 w-4 text-orange-600" />}
                label="ETA to Pickup"
                value={eta}
                helper={
                  pickupLocationName ? `At ${pickupLocationName}` : undefined
                }
              />
            )}
            {trip?.status === "IN_PROGRESS" && pickupCompleted && (
              <InfoBlock
                icon={<Check className="h-4 w-4 text-emerald-600" />}
                label="Pickup Status"
                value="Shuttle arrived"
                helper="The shuttle has reached your pickup location"
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Guest Notes
          </h2>
          <p className="mt-3 text-sm text-foreground">
            {booking.notes || "No additional notes provided."}
          </p>
        </div>

        {booking.cancellationReason && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700">
              Rejection Reason
            </h2>
            <p className="mt-3 text-sm text-rose-800">
              {booking.cancellationReason}
            </p>
            {booking.cancelledBy && (
              <p className="mt-2 text-xs text-rose-600">
                Rejected by: {booking.cancelledBy}
              </p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Timeline
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <TimelineRow label="Booked" value={booking.createdAt} />
            {booking.verifiedAt && (
              <TimelineRow label="Confirmed" value={booking.verifiedAt} />
            )}
          </div>
        </div>
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

function InfoBlock({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">
        {new Date(value).toLocaleString()}
      </p>
    </div>
  );
}
