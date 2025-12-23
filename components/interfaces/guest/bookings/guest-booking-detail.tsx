"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CalendarDays,
  ClipboardCheck,
  MapPin,
  User,
  Bus,
  Loader2,
  Briefcase,
  Clock,
  Check,
  ArrowRight,
  Receipt,
  Users,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useBookingETA } from "@/hooks/use-trip-eta";
import QRCode from "qrcode";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED";

const statusConfig: Record<
  BookingStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  REJECTED: {
    label: "Cancelled",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
};

interface GuestBookingDetailProps {
  bookingId: string;
}

export function GuestBookingDetail({ bookingId }: GuestBookingDetailProps) {
  const router = useRouter();
  const booking = useQuery(api.bookings.index.getBookingById, {
    bookingId: bookingId as Id<"bookings">,
  });
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const {
    eta,
    pickupLocationName,
    isCompleted: pickupCompleted,
  } = useBookingETA(booking ? (bookingId as Id<"bookings">) : null);

  useEffect(() => {
    const generate = async () => {
      if (!booking || !booking.qrCodePath) {
        setQrDataUrl("");
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(booking.qrCodePath, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: "H",
        });
        setQrDataUrl(dataUrl);
      } catch {
        setQrDataUrl("");
      }
    };
    generate();
  }, [booking]);

  if (booking === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return <BookingNotFound />;
  }

  const status = statusConfig[booking.bookingStatus as BookingStatus];
  const trip = booking.tripDetails;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  const showETA = trip?.status === "IN_PROGRESS" && eta && !pickupCompleted;
  const showArrived = trip?.status === "IN_PROGRESS" && pickupCompleted;

  const goToChat = () => {
    if (!booking.chatId) return;
    router.push(`/chat?chatId=${booking.chatId}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-muted/30 to-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <Badge
            className={`mb-3 ${status.bgColor} ${status.color} ${status.borderColor} border px-3 py-1`}
          >
            {status.label}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">
            {trip?.tripName || "Shuttle Transfer"}
          </h1>
          {booking.confirmationNum && (
            <p className="mt-1 text-sm text-muted-foreground">
              #{booking.confirmationNum}
            </p>
          )}
          {booking.chatId && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2 rounded-full"
              onClick={goToChat}
            >
              <MessageSquare className="h-4 w-4" />
              Chat with Support
            </Button>
          )}
        </div>

        {/* Live Status Alert */}
        {showETA && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-amber-800">
                {eta === "At pickup" ? "Shuttle arriving now" : `Arriving in ${eta}`}
              </p>
              {pickupLocationName && (
                <p className="truncate text-sm text-amber-700">{pickupLocationName}</p>
              )}
            </div>
          </div>
        )}

        {showArrived && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-teal-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Shuttle has arrived!</p>
              <p className="text-sm text-emerald-700">Head to your pickup point</p>
            </div>
          </div>
        )}

        {/* Main Content Card */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Route Section */}
          <div className="border-b bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-1 items-center gap-2 text-sm font-medium">
                <span className="truncate">{trip?.fromLocation || "Origin"}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{trip?.toLocation || "Destination"}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 divide-x divide-y">
            <DetailCell
              icon={<CalendarDays className="h-4 w-4" />}
              label="Date"
              value={trip ? formatDate(trip.scheduledDate) : "—"}
            />
            <DetailCell
              icon={<Clock className="h-4 w-4" />}
              label="Time"
              value={trip ? formatTime(trip.scheduledStartTime) : "—"}
            />
            <DetailCell
              icon={<Users className="h-4 w-4" />}
              label="Passengers"
              value={`${booking.seats}`}
            />
            <DetailCell
              icon={<Briefcase className="h-4 w-4" />}
              label="Bags"
              value={`${booking.bags}`}
            />
          </div>

          {/* Guest & Payment Info */}
          <div className="space-y-3 border-t px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{booking.name || booking.guestName}</span>
              </div>
              {booking.guestEmail && (
                <span className="text-xs text-muted-foreground">{booking.guestEmail}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span>{booking.paymentMethod}</span>
              </div>
              <span className="text-lg font-semibold">${booking.totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Shuttle & Driver */}
          {(trip?.shuttle || trip?.driver) && (
            <div className="flex items-center gap-4 border-t bg-muted/10 px-5 py-3">
              <Bus className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-1 items-center justify-between text-sm">
                {trip?.shuttle && (
                  <span className="font-medium">{trip.shuttle.vehicleNumber}</span>
                )}
                {trip?.driver && (
                  <span className="text-muted-foreground">Driver: {trip.driver.name}</span>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="border-t px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 text-sm">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Cancellation Notice */}
        {booking.cancellationReason && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-medium text-rose-800">Booking Cancelled</p>
                <p className="mt-1 text-sm text-rose-700">{booking.cancellationReason}</p>
                {booking.cancelledBy && (
                  <p className="mt-1 text-xs text-rose-600">By: {booking.cancelledBy}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR Code Section */}
        {booking.qrCodePath && booking.bookingStatus === "CONFIRMED" && (
          <div className="mt-6 rounded-2xl border bg-card p-6 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Boarding Pass
            </p>
            <div className="mt-4 inline-block rounded-xl border-2 border-dashed border-muted-foreground/20 bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="h-40 w-40" />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Show this to your driver
            </p>
            <Badge variant="outline" className="mt-2">
              {booking.qrCodeStatus || "Ready"}
            </Badge>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span>Booked {new Date(booking.createdAt).toLocaleDateString()}</span>
          {booking.verifiedAt && (
            <>
              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
              <span>Confirmed {new Date(booking.verifiedAt).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

export function BookingNotFound() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">Booking not found</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        We couldn't locate that booking. It may have been removed.
      </p>
      <Button className="mt-6" onClick={() => router.push("/bookings")}>
        View all bookings
      </Button>
    </div>
  );
}
