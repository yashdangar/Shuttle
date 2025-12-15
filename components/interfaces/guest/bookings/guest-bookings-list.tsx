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
  Plus,
  MessageSquare,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { GuestBookingsSkeleton } from "./guest-bookings-skeleton";
import PageLayout from "@/components/layout/page-layout";

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

type TripDetails = {
  tripName: string | undefined;
  sourceLocation: string | undefined;
  destinationLocation: string | undefined;
  scheduledDate: string | undefined;
  scheduledStartTime: string | undefined;
  scheduledEndTime: string | undefined;
  status: string | undefined;
};

type GuestBooking = {
  _id: Id<"bookings">;
  seats: number;
  bags: number;
  bookingStatus: BookingStatus;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "WAIVED";
  totalPrice: number;
  createdAt: string;
  chatId: Id<"chats"> | null;
  tripDetails: TripDetails | null;
};

export function GuestBookingsList() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");

  const bookings = useQuery(
    api.bookings.index.getGuestBookings,
    user?.id ? { guestId: user.id as Id<"users"> } : "skip"
  ) as GuestBooking[] | undefined;

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

  const goToChat = (chatId: Id<"chats"> | null | undefined) => {
    if (!chatId) return;
    router.push(`/chat?chatId=${chatId}`);
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
      <PageLayout
        title="My bookings"
        description="Sign in to view and manage your shuttle bookings."
        icon={<CalendarClock className="h-5 w-5 text-primary" />}
      >
        <div className="flex h-full items-center justify-center">
          <div className="max-w-lg rounded-xl border border-dashed border-border bg-card px-8 py-10 text-center shadow-sm">
            <UserRound className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              Sign in to view your bookings
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please sign in to see your shuttle reservations.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (isLoading) {
    return <GuestBookingsSkeleton />;
  }

  const statusCounts = {
    PENDING: bookings?.filter((b) => b.bookingStatus === "PENDING").length ?? 0,
    CONFIRMED:
      bookings?.filter((b) => b.bookingStatus === "CONFIRMED").length ?? 0,
    REJECTED:
      bookings?.filter((b) => b.bookingStatus === "REJECTED").length ?? 0,
  };

  return (
    <PageLayout
      title="My bookings"
      description="View and track your shuttle bookings."
      isCompact
      size="full"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
              <p className="text-sm text-muted-foreground">
                Total:{" "}
                <span className="font-semibold text-foreground">
                  {bookings?.length ?? 0}
                </span>
              </p>
              <Link href="/select-hotels">
                <Button size="sm" className="rounded-full gap-2">
                  <Plus className="h-4 w-4" />
                  New Booking
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by trip, location, or date"
                className="h-10 rounded-lg border-border pl-10 focus-visible:ring-primary"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center shadow-sm">
            <Search className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              No bookings found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((booking) => {
              const statusStyle = statusStyles[booking.bookingStatus];
              const trip = booking.tripDetails;
              return (
                <div
                  key={booking._id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {trip?.tripName || "Shuttle Transfer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
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

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {trip && (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {trip.sourceLocation} → {trip.destinationLocation}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          {formatDate(trip.scheduledDate || "")} at{" "}
                          {formatTime(trip.scheduledStartTime || "")}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {booking.paymentStatus}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3"
                        onClick={() => goToChat(booking.chatId)}
                        disabled={!booking.chatId}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-full px-4"
                        onClick={() => goToBooking(booking._id)}
                      >
                        View details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
