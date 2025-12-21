"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageLayout from "@/components/layout/page-layout";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CalendarClock,
  ClipboardCheck,
  MapPin,
  UserRound,
  Bus,
  Phone,
  Loader2,
  Luggage,
  CreditCard,
  Clock,
  Check,
} from "lucide-react";
import { useBookingETA } from "@/hooks/use-trip-eta";
import QRCode from "qrcode";

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
          width: 240,
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
  const infoItems = [
    {
      key: "guest",
      icon: <UserRound className="h-4 w-4 text-primary" />,
      label: "Guest",
      value: booking.name || booking.guestName,
      helper: booking.confirmationNum
        ? `Confirmation #${booking.confirmationNum}`
        : booking.guestEmail || undefined,
    },
    {
      key: "route",
      icon: <MapPin className="h-4 w-4 text-blue-600" />,
      label: "Route",
      value: trip ? `${trip.fromLocation} → ${trip.toLocation}` : "N/A",
      helper: booking.isParkSleepFly ? "Park, Sleep & Fly" : "Transfer",
    },
    {
      key: "pickup",
      icon: <CalendarClock className="h-4 w-4 text-amber-600" />,
      label: "Pickup",
      value: trip ? `${formatDate(trip.scheduledDate)}` : "Date not available",
      helper: trip
        ? `${formatTime(trip.scheduledStartTime)} - ${formatTime(trip.scheduledEndTime)}`
        : undefined,
    },
    {
      key: "payment",
      icon: <CreditCard className="h-4 w-4 text-emerald-600" />,
      label: "Payment",
      value: `$${booking.totalPrice.toFixed(2)}`,
      helper: `${booking.paymentMethod} • ${booking.paymentStatus}`,
    },
    {
      key: "seats",
      icon: <UserRound className="h-4 w-4 text-muted-foreground" />,
      label: "Seats",
      value: `${booking.seats}`,
      helper: "Passengers",
    },
    {
      key: "bags",
      icon: <Luggage className="h-4 w-4 text-muted-foreground" />,
      label: "Bags",
      value: `${booking.bags}`,
      helper: "Checked luggage",
    },
  ];

  return (
    <PageLayout
      size="full"
      title={trip?.tripName || "Shuttle Transfer"}
      description={
        trip ? `${trip.fromLocation} → ${trip.toLocation}` : undefined
      }
      primaryActions={
        <Badge className={`${statusStyle.className} rounded-full border-0`}>
          {statusStyle.label}
        </Badge>
      }
      isCompact
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-12">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {infoItems.map((item) => (
            <InfoBlock
              key={item.key}
              icon={item.icon}
              label={item.label}
              value={item.value}
              helper={item.helper}
            />
          ))}
        </div>

        {(trip?.shuttle || trip?.driver) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {trip?.shuttle && (
              <InfoLine
                label="Shuttle"
                value={trip.shuttle.vehicleNumber}
                icon={<Bus className="h-4 w-4 text-primary" />}
              />
            )}
            {trip?.driver && (
              <InfoLine
                label="Driver"
                value={trip.driver.name ?? "N/A"}
                icon={<Phone className="h-4 w-4 text-emerald-600" />}
              />
            )}
          </div>
        )}

        {trip?.status === "IN_PROGRESS" && eta && !pickupCompleted && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {eta === "At pickup" ? "Shuttle at pickup location" : `Shuttle arriving in ${eta}`}
                </p>
                {pickupLocationName && (
                  <p className="text-xs text-amber-700">
                    At {pickupLocationName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {trip?.status === "IN_PROGRESS" && pickupCompleted && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Shuttle has arrived!
                </p>
                <p className="text-xs text-emerald-700">
                  Please proceed to your pickup location
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Notes
          </h2>
          <p className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-foreground">
            {booking.notes || "No additional notes provided."}
          </p>
        </div>

        {booking.cancellationReason && (
          <div className="space-y-2 rounded-xl bg-rose-50 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-700">
              Cancellation
            </h2>
            <p className="text-sm text-rose-800">
              {booking.cancellationReason}
            </p>
            {booking.cancelledBy && (
              <p className="text-xs text-rose-600">
                Cancelled by: {booking.cancelledBy}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Timeline
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <TimelineRow label="Booked" value={booking.createdAt} />
            {booking.verifiedAt && (
              <TimelineRow label="Confirmed" value={booking.verifiedAt} />
            )}
          </div>
        </div>

        {booking.qrCodePath && booking.bookingStatus === "CONFIRMED" && (
          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Your QR Code
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Show this QR to the driver for check-in.
            </p>
            <div className="mt-4 flex flex-col items-center gap-3">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Booking QR code"
                  className="h-60 w-60 rounded-lg border border-border bg-white p-2 shadow-sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Unable to render QR code. Please refresh.
                </p>
              )}
              <Badge variant="outline" className="text-xs">
                Status: {booking.qrCodeStatus || "UNVERIFIED"}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
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
    <div className="rounded-xl border border-border/60 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
      {icon}
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
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
