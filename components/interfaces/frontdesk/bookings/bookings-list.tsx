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
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Filter,
  CreditCard,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import PageLayout from "@/components/layout/page-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LiveBookingsCardsSkeleton } from "./live-bookings-skeleton";

type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED";
type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "WAIVED";
const PAGE_SIZE = 20;

const paymentStatusStyles: Record<PaymentStatus, { label: string; className: string }> = {
  UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-800" },
  PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
  REFUNDED: { label: "Refunded", className: "bg-blue-100 text-blue-800" },
  WAIVED: { label: "Waived", className: "bg-purple-100 text-purple-800" },
};

type BookingTripDetails = {
  tripName: string;
  sourceLocation?: string;
  destinationLocation?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status?: string;
  shuttle?: {
    vehicleNumber?: string;
    totalSeats?: number;
  } | null;
  driver?: {
    name?: string;
    phoneNumber?: string;
  } | null;
};

type HotelBooking = {
  _id: Id<"bookings">;
  guestId: Id<"users">;
  guestName: string;
  guestEmail: string;
  seats: number;
  bookingStatus: BookingStatus;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED" | "WAIVED";
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

const statusStyles: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-secondary text-secondary-foreground",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-primary/10 text-primary",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
  },
};

export function FrontdeskBookingsList() {
  const router = useRouter();
  const { user } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] =
    useState<Id<"bookings"> | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>(
    []
  );

  // Get today's date in YYYY-MM-DD format
  const todayDate = useMemo(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }, []);

  const bookingsResponse = useQuery(
    api.bookings.index.getTodayHotelBookings,
    user?.id
      ? { userId: user.id as Id<"users">, todayDate, limit: PAGE_SIZE, cursor }
      : "skip"
  ) as (BookingsPage & { totalCount?: number }) | undefined;

  const isLoading = bookingsResponse === undefined;
  const bookings: HotelBooking[] = bookingsResponse?.page ?? [];

  const filtered: HotelBooking[] = useMemo(() => {
    if (!bookings) return [];
    
    return bookings.filter((booking) => {
      // Search filter
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term || [
        booking.guestName,
        booking.guestEmail,
        booking.tripDetails?.tripName,
        booking.tripDetails?.scheduledDate,
      ].some((field) => field?.toLowerCase().includes(term));
      
      // Booking status filter
      const matchesBookingStatus = bookingStatusFilter === "ALL" || booking.bookingStatus === bookingStatusFilter;
      
      // Payment status filter
      const matchesPaymentStatus = paymentStatusFilter === "ALL" || booking.paymentStatus === paymentStatusFilter;
      
      return matchesSearch && matchesBookingStatus && matchesPaymentStatus;
    });
  }, [searchQuery, bookings, bookingStatusFilter, paymentStatusFilter]);

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

  const statusIndicators: Record<
    BookingStatus,
    { dotClass: string; heading: string }
  > = {
    PENDING: { dotClass: "bg-amber-400", heading: "New Requests" },
    CONFIRMED: { dotClass: "bg-emerald-500", heading: "Confirmed" },
    REJECTED: { dotClass: "bg-slate-400", heading: "Rejected / Cancelled" },
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
        title="Live Bookings"
        description="Sign in to review and respond to shuttle bookings."
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

  const pendingBookings = filtered.filter((b) => b.bookingStatus === "PENDING");
  const confirmedBookings = filtered.filter(
    (b) => b.bookingStatus === "CONFIRMED"
  );
  const rejectedBookings = filtered.filter(
    (b) => b.bookingStatus === "REJECTED"
  );

  const renderSection = (
    title: string,
    list: HotelBooking[],
    indicatorClass: string
  ) => {
    if (list.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${indicatorClass}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">({list.length})</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((booking) => {
            const statusStyle = statusStyles[booking.bookingStatus];
            const trip = booking.tripDetails;
            const isPending = booking.bookingStatus === "PENDING";
            const indicator = statusIndicators[booking.bookingStatus];

            return (
              <div
                key={booking._id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${indicator.dotClass}`}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {trip?.tripName || "Shuttle Transfer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${booking.totalPrice.toFixed(2)} • Booked{" "}
                        {formatDate(booking.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`${statusStyle.className} rounded-full border border-transparent`}
                  >
                    {statusStyle.label}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" />
                    <span className="font-medium text-foreground">
                      {booking.guestName}
                    </span>
                    <span className="text-xs">{booking.guestEmail}</span>
                  </div>

                  {trip && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-foreground">
                          {trip.sourceLocation && trip.destinationLocation
                            ? `${trip.sourceLocation} → ${trip.destinationLocation}`
                            : trip.tripName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          {formatDate(trip.scheduledDate)} at{" "}
                          {formatTime(trip.scheduledStartTime)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {booking.seats} seat{booking.seats !== 1 ? "s" : ""}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge className={`${paymentStatusStyles[booking.paymentStatus]?.className || "bg-gray-100 text-gray-800"} rounded-full border-0 text-xs`}>
                        {paymentStatusStyles[booking.paymentStatus]?.label || booking.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {isPending ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => handleConfirm(booking._id)}
                        disabled={isProcessing}
                      >
                        <Check className="h-4 w-4" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => handleRejectClick(booking._id)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {booking.bookingStatus === "CONFIRMED" ? "Ready for service" : "Booking cancelled"}
                    </div>
                  )}
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
                      variant="outline"
                      className="rounded-full px-3"
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
      </div>
    );
  };

  return (
    <PageLayout
      title="Live Bookings"
      description={`Today's shuttle bookings (${todayDate}). Review and manage guest reservations.`}
      isCompact
      size="full"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            {/* Search and Filters Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by guest, email, or trip"
                  className="h-10 rounded-lg border-border pl-10 focus-visible:ring-primary"
                />
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={bookingStatusFilter}
                  onValueChange={(value) => setBookingStatusFilter(value as BookingStatus | "ALL")}
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
                  onValueChange={(value) => setPaymentStatusFilter(value as PaymentStatus | "ALL")}
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
                Showing {filtered.length} of {bookings.length} bookings
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

        {isLoading ? (
          <LiveBookingsCardsSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center shadow-sm">
            <Search className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-base font-semibold text-foreground">
              No bookings found
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bookings?.length === 0
                ? "No booking requests yet."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {renderSection(
              statusIndicators.PENDING.heading,
              pendingBookings,
              statusIndicators.PENDING.dotClass
            )}
            {renderSection(
              statusIndicators.CONFIRMED.heading,
              confirmedBookings,
              statusIndicators.CONFIRMED.dotClass
            )}
            {renderSection(
              statusIndicators.REJECTED.heading,
              rejectedBookings,
              statusIndicators.REJECTED.dotClass
            )}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
