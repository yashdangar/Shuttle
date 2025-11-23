"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FAKE_BOOKINGS, type Booking, type BookingStatus } from "@/lib/bookings";
import { Search, CalendarClock, MapPin, UserRound } from "lucide-react";

const statusStyles: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-50 text-blue-700",
  },
  "in-progress": {
    label: "In progress",
    className: "bg-amber-50 text-amber-700",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700",
  },
};

export function BookingsList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return FAKE_BOOKINGS;
    const term = searchQuery.toLowerCase();
    return FAKE_BOOKINGS.filter((booking) =>
      [
        booking.guestName,
        booking.confirmationNumber,
        booking.hotelName,
        booking.hotelAddress,
      ].some((field) => field.toLowerCase().includes(term)),
    );
  }, [searchQuery]);

  const goToBooking = (booking: Booking) => {
    router.push(`/bookings/${booking.id}`);
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
            Bookings dashboard
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Track shuttle requests, review guest notes, and manage statuses.
          </p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["scheduled", "in-progress", "completed", "cancelled"] as BookingStatus[]).map(
                (status) => {
                  const style = statusStyles[status];
                  const count = FAKE_BOOKINGS.filter(
                    (booking) => booking.status === status,
                  ).length;
                  return (
                    <Badge
                      key={status}
                      className={`${style.className} rounded-full border border-transparent`}
                    >
                      {style.label}: {count}
                    </Badge>
                  );
                },
              )}
            </div>
            <p className="text-sm text-gray-500">
              Total bookings:{" "}
              <span className="font-semibold text-gray-900">
                {FAKE_BOOKINGS.length}
              </span>
            </p>
          </div>
          <div className="mt-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by guest, confirmation, or hotel"
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
              Try adjusting your search to find the booking you're looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filtered.map((booking) => {
              const statusStyle = statusStyles[booking.status];
              return (
                <div
                  key={booking.id}
                  className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {booking.hotelName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.hotelAddress}
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
                        #{booking.confirmationNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {booking.pickupLocation} → {booking.destination}
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <CalendarClock className="h-4 w-4 text-gray-400" />
                      {booking.pickupDate} at {booking.pickupTime}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                      {booking.direction === "hotelToAirport"
                        ? "Hotel → Airport"
                        : booking.direction === "airportToHotel"
                        ? "Airport → Hotel"
                        : "Park, Sleep & Fly"}
                    </p>
                    <Button
                      size="sm"
                      className="rounded-full px-4"
                      onClick={() => goToBooking(booking)}
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

