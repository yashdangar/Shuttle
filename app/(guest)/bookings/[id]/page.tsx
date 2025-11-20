"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FAKE_BOOKINGS, type BookingStatus } from "@/lib/bookings";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  MapPin,
  NotebookPen,
  UserRound,
} from "lucide-react";

const statusStyles: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  scheduled: { label: "Scheduled", className: "bg-blue-50 text-blue-700" },
  "in-progress": {
    label: "In progress",
    className: "bg-amber-50 text-amber-700",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700",
  },
  cancelled: { label: "Cancelled", className: "bg-rose-50 text-rose-700" },
};

export default function BookingDetailPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const booking = useMemo(
    () => FAKE_BOOKINGS.find((item) => item.id === params?.id),
    [params?.id],
  );

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
          <ClipboardCheck className="mx-auto h-10 w-10 text-gray-400" />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            Booking not found
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We couldn’t locate that booking ID. It may have been removed or the
            link is invalid.
          </p>
          <Button className="mt-6" onClick={() => router.push("/bookings")}>
            Back to bookings
          </Button>
        </div>
      </div>
    );
  }

  const statusStyle = statusStyles[booking.status];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-violet-700">
              <Link
                href="/bookings"
                className="inline-flex items-center gap-1 text-violet-700"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </Link>
              <span>Booking detail</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {booking.hotelName}
            </h1>
            <p className="text-sm text-gray-500">{booking.hotelAddress}</p>
          </div>
          <Badge className={`${statusStyle.className} rounded-full border-0`}>
            {statusStyle.label}
          </Badge>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <InfoBlock
              icon={<UserRound className="h-4 w-4 text-violet-600" />}
              label="Guest"
              value={booking.guestName}
              helper={`Confirmation #${booking.confirmationNumber}`}
            />
            <InfoBlock
              icon={<MapPin className="h-4 w-4 text-blue-600" />}
              label="Route"
              value={`${booking.pickupLocation} → ${booking.destination}`}
              helper={
                booking.direction === "hotelToAirport"
                  ? "Hotel → Airport"
                  : booking.direction === "airportToHotel"
                  ? "Airport → Hotel"
                  : "Park, Sleep & Fly"
              }
            />
            <InfoBlock
              icon={<CalendarClock className="h-4 w-4 text-amber-600" />}
              label="Pickup time"
              value={`${booking.pickupDate} at ${booking.pickupTime}`}
              helper={`${booking.passengers} passenger(s)`}
            />
            <InfoBlock
              icon={<NotebookPen className="h-4 w-4 text-rose-600" />}
              label="Payment"
              value={booking.paymentMethod}
              helper={`Last updated ${new Date(
                booking.updatedAt,
              ).toLocaleDateString()}`}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">
            Notes
          </h2>
          <p className="mt-3 text-sm text-gray-700">
            {booking.notes || "No additional notes provided."}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">
            Timeline
          </h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <TimelineRow label="Created" value={booking.createdAt} />
            <TimelineRow label="Updated" value={booking.updatedAt} />
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
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-base font-semibold text-gray-900">{value}</p>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
        {label}
      </p>
      <p className="text-sm text-gray-700">
        {new Date(value).toLocaleString()}
      </p>
    </div>
  );
}

