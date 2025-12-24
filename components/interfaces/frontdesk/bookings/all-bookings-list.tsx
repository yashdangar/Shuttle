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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CalendarClock,
  UserRound,
  ArrowLeft,
  ArrowRight,
  Filter,
  CreditCard,
  Eye,
  MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AllBookingsTableSkeleton } from "./all-bookings-skeleton";
import type { Id } from "@/convex/_generated/dataModel";
import PageLayout from "@/components/layout/page-layout";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED";
type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "WAIVED";
const PAGE_SIZE = 20;

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

type BookingTripDetails = {
  tripName: string;
  sourceLocation?: string;
  destinationLocation?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
};

type HotelBooking = {
  _id: Id<"bookings">;
  guestId: Id<"users">;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  seats: number;
  bags: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  totalPrice: number;
  createdAt: string;
  chatId: Id<"chats"> | null;
  tripDetails: BookingTripDetails | null;
};

type BookingsPage = {
  page: HotelBooking[];
  isDone: boolean;
  continueCursor: string | null;
};

export function AllBookingsList() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([]);

  const bookingsResponse = useQuery(
    api.bookings.index.getAllHotelBookings,
    user?.id
      ? {
          userId: user.id as Id<"users">,
          bookingStatus: bookingStatusFilter === "ALL" ? undefined : bookingStatusFilter,
          paymentStatus: paymentStatusFilter === "ALL" ? undefined : paymentStatusFilter,
          searchQuery: searchQuery.trim() || undefined,
          limit: PAGE_SIZE,
          cursor,
        }
      : "skip"
  ) as BookingsPage | undefined;

  const isLoading = bookingsResponse === undefined;
  const bookings: HotelBooking[] = bookingsResponse?.page ?? [];

  const goToBooking = (bookingId: Id<"bookings">) => {
    router.push(`/frontdesk/bookings/${bookingId}`);
  };

  const goToChat = (chatId: Id<"chats"> | null | undefined) => {
    if (!chatId) return;
    router.push(`/chat?chatId=${chatId}`);
  };

  const handleNextPage = () => {
    if (!bookingsResponse?.continueCursor || bookingsResponse.isDone) return;
    setCursorHistory((prev) => [...prev, cursor]);
    setCursor(bookingsResponse.continueCursor);
  };

  const handlePrevPage = () => {
    if (!cursorHistory.length) return;
    const newHistory = [...cursorHistory];
    const previousCursor = newHistory.pop() ?? undefined;
    setCursorHistory(newHistory);
    setCursor(previousCursor);
  };

  const handleFilterChange = () => {
    // Reset pagination when filters change
    setCursor(undefined);
    setCursorHistory([]);
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
        title="All Bookings"
        description="Sign in to view all shuttle bookings."
        icon={<CalendarClock className="h-5 w-5 text-primary" />}
      >
        <div className="flex h-full items-center justify-center">
          <div className="max-w-lg rounded-xl border border-dashed border-border bg-card px-8 py-10 text-center shadow-sm">
            <UserRound className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-base font-semibold text-foreground">
              Sign in to manage bookings
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please sign in to view and manage hotel bookings.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="All Bookings"
      description="View and manage all shuttle bookings across all dates."
      isCompact
      size="full"
    >
      <div className="space-y-6">
        {/* Filters Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            {/* Search and Filters Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    handleFilterChange();
                  }}
                  placeholder="Search by guest name or email"
                  className="h-10 rounded-lg border-border pl-10 focus-visible:ring-primary"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={bookingStatusFilter}
                  onValueChange={(value) => {
                    setBookingStatusFilter(value as BookingStatus | "ALL");
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="h-9 w-[130px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Bookings</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={paymentStatusFilter}
                  onValueChange={(value) => {
                    setPaymentStatusFilter(value as PaymentStatus | "ALL");
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="h-9 w-[120px] text-xs">
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

            {/* Pagination Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                Showing {bookings.length} bookings
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={handlePrevPage}
                  disabled={cursorHistory.length === 0 || isLoading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {cursorHistory.length + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={handleNextPage}
                  disabled={
                    isLoading ||
                    bookingsResponse?.isDone ||
                    !bookingsResponse?.continueCursor
                  }
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Booking Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <AllBookingsTableSkeleton rows={8} />
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-base font-semibold text-foreground">
                      No bookings found
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting your filters or search query.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.guestName}</p>
                        <p className="text-xs text-muted-foreground">{booking.guestEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.tripDetails?.tripName || "—"}</p>
                        {booking.tripDetails?.sourceLocation && booking.tripDetails?.destinationLocation && (
                          <p className="text-xs text-muted-foreground">
                            {booking.tripDetails.sourceLocation} → {booking.tripDetails.destinationLocation}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.tripDetails ? (
                        <div>
                          <p className="text-sm">{formatDate(booking.tripDetails.scheduledDate)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(booking.tripDetails.scheduledStartTime)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{booking.seats}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">${booking.totalPrice.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${bookingStatusStyles[booking.bookingStatus]?.className || "bg-gray-100 text-gray-800"} rounded-full border-0 text-xs`}
                      >
                        {bookingStatusStyles[booking.bookingStatus]?.label || booking.bookingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge
                          className={`${paymentStatusStyles[booking.paymentStatus]?.className || "bg-gray-100 text-gray-800"} rounded-full border-0 text-xs`}
                        >
                          {paymentStatusStyles[booking.paymentStatus]?.label || booking.paymentStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => goToChat(booking.chatId)}
                          disabled={!booking.chatId}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => goToBooking(booking._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
}
