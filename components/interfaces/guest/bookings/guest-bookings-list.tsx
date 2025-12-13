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
  Search,
  CalendarClock,
  MapPin,
  UserRound,
  Loader2,
  Plus,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

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
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700",
  },
};

export function GuestBookingsList() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");

  const bookings = useQuery(
    api.bookings.index.getGuestBookings,
    user?.id ? { guestId: user.id as Id<"users"> } : "skip"
  );

  const isLoading = bookings === undefined;

  const filtered = useMemo(() => {
    if (!bookings) return [];
    if (!searchQuery.trim()) return bookings;
    const term = searchQuery.toLowerCase();
    return bookings.filter((booking) =>
      [
        booking.tripDetails?.tripName,
        booking.tripDetails?.sourceLocation,
        booking.tripDetails?.destinationLocation,
        booking.tripDetails?.scheduledDate,
      ].some((field) => field?.toLowerCase().includes(term))
    );
  }, [searchQuery, bookings]);

  const goToBooking = (bookingId: Id<"bookings">) => {
    router.push(`/bookings/${bookingId}`);
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
              Sign in to view your bookings
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Please sign in to see your shuttle reservations.
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
              My bookings
            </span>
          </div>
          <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Shuttle Reservations
          </h1>
          <p className="mt-2 text-center text-gray-600">
            View and track your shuttle bookings.
          </p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["PENDING", "CONFIRMED", "REJECTED"] as BookingStatus[]).map(
                (status) => {
                  const style = statusStyles[status];
                  return (
                    <Badge
                      key={status}
                      className={`${style.className} rounded-full border border-transparent`}
                    >
                      {style.label}: {statusCounts[status]}
                    </Badge>
                  );
                }
              )}
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">
                Total:{" "}
                <span className="font-semibold text-gray-900">
                  {bookings?.length ?? 0}
                </span>
              </p>
              <Link href="/hotels">
                <Button size="sm" className="rounded-full gap-2">
                  <Plus className="h-4 w-4" />
                  New Booking
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by trip, location, or date"
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
                ? "You haven't made any reservations yet."
                : "Try adjusting your search."}
            </p>
            {bookings?.length === 0 && (
              <Link href="/hotels">
                <Button className="mt-4 rounded-full gap-2">
                  <Plus className="h-4 w-4" />
                  Book a Shuttle
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filtered.map((booking) => {
              const statusStyle = statusStyles[booking.bookingStatus];
              const trip = booking.tripDetails;
              return (
                <div
                  key={booking._id}
                  className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {trip?.tripName || "Shuttle Transfer"}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${booking.totalPrice.toFixed(2)} • {booking.seats} seat
                        {booking.seats !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge
                      className={`${statusStyle.className} rounded-full border border-transparent`}
                    >
                      {statusStyle.label}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    {trip && (
                      <>
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {trip.sourceLocation} → {trip.destinationLocation}
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <CalendarClock className="h-4 w-4 text-gray-400" />
                          {formatDate(trip.scheduledDate)} at{" "}
                          {formatTime(trip.scheduledStartTime)}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                      {booking.paymentStatus}
                    </p>
                    <Button
                      size="sm"
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
    </div>
  );
}
