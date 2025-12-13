"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  MapPin,
  NotebookPen,
  UserRound,
  Bus,
  Phone,
  Loader2,
  Luggage,
  CreditCard,
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
    label: "Cancelled",
    className: "bg-rose-100 text-rose-800",
  },
};

interface GuestBookingDetailProps {
  bookingId: string;
}

export function GuestBookingDetail({ bookingId }: GuestBookingDetailProps) {
  const booking = useQuery(api.bookings.index.getBookingById, {
    bookingId: bookingId as Id<"bookings">,
  });

  const isLoading = booking === undefined;

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
    return <BookingNotFound />;
  }

  const statusStyle = statusStyles[booking.bookingStatus as BookingStatus];
  const trip = booking.tripDetails;

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
                href="/bookings"
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
                {trip.sourceLocation} → {trip.destinationLocation}
              </p>
            )}
          </div>
          <Badge className={`${statusStyle.className} rounded-full border-0`}>
            {statusStyle.label}
          </Badge>
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <InfoBlock
              icon={<UserRound className="h-4 w-4 text-primary" />}
              label="Guest"
              value={booking.name || booking.guestName}
              helper={
                booking.confirmationNum
                  ? `Confirmation #${booking.confirmationNum}`
                  : booking.guestEmail
              }
            />
            <InfoBlock
              icon={<MapPin className="h-4 w-4 text-blue-600" />}
              label="Route"
              value={
                trip
                  ? `${trip.sourceLocation} → ${trip.destinationLocation}`
                  : "N/A"
              }
              helper={booking.isParkSleepFly ? "Park, Sleep & Fly" : "Transfer"}
            />
            <InfoBlock
              icon={<CalendarClock className="h-4 w-4 text-amber-600" />}
              label="Pickup time"
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
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Passengers & Luggage
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  <span>Seats</span>
                </div>
                <span className="font-semibold text-foreground">
                  {booking.seats}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Luggage className="h-4 w-4" />
                  <span>Bags</span>
                </div>
                <span className="font-semibold text-foreground">
                  {booking.bags}
                </span>
              </div>
            </div>
          </div>

          {trip?.shuttle && (
            <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Shuttle Info
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bus className="h-4 w-4" />
                    <span>Vehicle</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {trip.shuttle.vehicleNumber}
                  </span>
                </div>
                {trip.driver && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>Driver</span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {trip.driver.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Notes
          </h2>
          <p className="mt-3 text-sm text-foreground">
            {booking.notes || "No additional notes provided."}
          </p>
        </div>

        {booking.cancellationReason && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700">
              Cancellation Reason
            </h2>
            <p className="mt-3 text-sm text-rose-800">
              {booking.cancellationReason}
            </p>
            {booking.cancelledBy && (
              <p className="mt-2 text-xs text-rose-600">
                Cancelled by: {booking.cancelledBy}
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

export function BookingNotFound() {
  const router = useRouter();
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
        <Button className="mt-6" onClick={() => router.push("/bookings")}>
          Back to bookings
        </Button>
      </div>
    </div>
  );
}
