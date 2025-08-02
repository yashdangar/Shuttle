"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { format } from "date-fns";
import {
  Calendar,
  X,
  CreditCard,
  Loader2,
  MoreHorizontal,
  Clock,
  CheckCircle,
  User,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { RescheduleModal } from "@/components/reschedule-modal";
import { CancelBookingModal } from "@/components/cancel-booking-modal";
import { RejectBookingModal } from "@/components/reject-booking-modal";
import { useWebSocket } from "@/context/WebSocketContext";

interface Booking {
  id: string;
  numberOfPersons: number;
  numberOfBags: number;
  preferredTime: string;
  paymentMethod: string;
  bookingType: string;
  isCompleted: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  isRefunded: boolean;
  needsFrontdeskVerification: boolean;
  isVerified: boolean;
  confirmationNum: string | null;
  notes: string | null;
  isParkSleepFly: boolean;
  // Seat holding fields
  seatsHeld: boolean;
  seatsHeldAt: string | null;
  seatsHeldUntil: string | null;
  seatsConfirmed: boolean;
  seatsConfirmedAt: string | null;
  shuttleId: number | null;
  shuttle?: {
    id: number;
    vehicleNumber: string;
    seats: number;
  };
  guest?: {
    firstName: string;
    lastName: string;
    email: string;
    isNonResident: boolean;
  };
  pickupLocation: {
    name: string;
  } | null;
  dropoffLocation: {
    name: string;
  } | null;
  pricing?: {
    pricePerPerson: number;
    totalPrice: number;
    numberOfPersons: number;
  };
}

function BookingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600">View and manage all shuttle bookings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Trip Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="w-8 h-8 rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="w-8 h-8 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BookingsPage() {
  const { socket, isConnected, markUserInteraction } = useWebSocket();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null
  );
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null);
  const [newBookingIds, setNewBookingIds] = useState<Set<string>>(new Set());
  const [verifyingBookings, setVerifyingBookings] = useState<Set<string>>(
    new Set()
  );

  // Function to fetch bookings
  const fetchBookings = async () => {
    try {
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error) {
      toast.error("Failed to fetch bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, []);

  // Mark user interaction on component mount to enable audio
  useEffect(() => {
    markUserInteraction();
  }, [markUserInteraction]);

  // WebSocket event listeners for live updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new bookings
    const handleNewBooking = async (data: any) => {
      console.log("New booking received via WebSocket:", data);
      console.log("Booking guest data:", data.booking?.guest);

      // Add the new booking to the top of the list
      if (data.booking) {
        let completeBooking = data.booking;

        // If the WebSocket booking doesn't have guest information, fetch it from the API
        if (!data.booking.guest) {
          try {
            console.log("Fetching complete booking data from API...");
            const response = await api.get(
              `/frontdesk/bookings/${data.booking.id}`
            );
            completeBooking = response.booking;
            console.log("Complete booking data fetched:", completeBooking);
          } catch (error) {
            console.error("Error fetching complete booking data:", error);
            // Continue with the incomplete data if API call fails
          }
        }

        // Calculate pricing for the new booking if not already present
        if (!completeBooking.pricing) {
          try {
            const response = await api.get(
              `/frontdesk/bookings/${completeBooking.id}`
            );
            completeBooking = response.booking;
          } catch (error) {
            console.error("Error fetching booking with pricing:", error);
            // Continue without pricing if API call fails
          }
        }

        setBookings((prevBookings) => {
          // Check if booking already exists to avoid duplicates
          const exists = prevBookings.find((b) => b.id === completeBooking.id);
          if (exists) {
            return prevBookings;
          }
          return [completeBooking, ...prevBookings];
        });

        // Add to new booking IDs for highlighting
        setNewBookingIds((prev) => new Set([...prev, completeBooking.id]));

        // Show a toast notification for the new booking with pricing info
        const guestName = completeBooking.guest?.firstName
          ? `${completeBooking.guest.firstName} ${completeBooking.guest.lastName}`
          : completeBooking.guest?.email || completeBooking.confirmationNum
          ? `Confirmation: ${completeBooking.confirmationNum}`
          : "Guest";

        const pricingInfo = completeBooking.pricing 
          ? ` - $${completeBooking.pricing.totalPrice.toFixed(2)}`
          : "";

        toast.success(`${guestName} has made a new booking${pricingInfo}`, {
          duration: 4000,
        });

        // Remove highlight after 5 seconds
        setTimeout(() => {
          setNewBookingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(completeBooking.id);
            return newSet;
          });
        }, 5000);
      }
    };

    // Listen for booking updates (cancelled, verified, etc.)
    const handleBookingUpdate = async (data: any) => {
      console.log("Booking update received via WebSocket:", data);

      if (data.booking) {
        let updatedBooking = data.booking;

        // Fetch complete booking data with pricing if not already present
        if (!updatedBooking.pricing) {
          try {
            const response = await api.get(
              `/frontdesk/bookings/${updatedBooking.id}`
            );
            updatedBooking = response.booking;
          } catch (error) {
            console.error("Error fetching updated booking with pricing:", error);
            // Continue without pricing if API call fails
          }
        }

        setBookings((prevBookings) =>
          prevBookings.map((booking) =>
            booking.id === updatedBooking.id
              ? { ...booking, ...updatedBooking }
              : booking
          )
        );
      }
    };

    // Listen for booking cancellations
    const handleBookingCancelled = (data: any) => {
      console.log("Booking cancelled via WebSocket:", data);

      if (data.booking) {
        setBookings((prevBookings) =>
          prevBookings.map((booking) =>
            booking.id === data.booking.id
              ? { ...booking, isCancelled: true }
              : booking
          )
        );
      }
    };

    // Listen for booking assignments
    const handleBookingAssigned = (data: any) => {
      console.log("Booking assigned via WebSocket:", data);

      if (data.booking) {
        setBookings((prevBookings) =>
          prevBookings.map((booking) =>
            booking.id === data.booking.id
              ? { ...booking, ...data.booking }
              : booking
          )
        );
      }
    };

    // Add event listeners
    socket.on("new_booking", handleNewBooking);
    socket.on("booking_updated", handleBookingUpdate);
    socket.on("booking_cancelled", handleBookingCancelled);
    socket.on("booking_assigned", handleBookingAssigned);

    // Cleanup event listeners
    return () => {
      socket.off("new_booking", handleNewBooking);
      socket.off("booking_updated", handleBookingUpdate);
      socket.off("booking_cancelled", handleBookingCancelled);
      socket.off("booking_assigned", handleBookingAssigned);
    };
  }, [socket, isConnected]);

  const getStatusBadge = (booking: Booking) => {
    if (booking.isCancelled) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (booking.isCompleted) {
      return <Badge variant="default">Completed</Badge>;
    }
    if (booking.isVerified) {
      return <Badge variant="default">Driver Checked In</Badge>;
    }
    if (!booking.needsFrontdeskVerification && !booking.isVerified) {
      return <Badge variant="default">Frontdesk Verified</Badge>;
    }
    if (booking.needsFrontdeskVerification) {
      if (booking.seatsHeld && !booking.seatsConfirmed) {
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="secondary">Seats Held</Badge>
            {booking.shuttle && (
              <Badge variant="outline" className="text-xs">
                🚐 {booking.shuttle.vehicleNumber}
              </Badge>
            )}
          </div>
        );
      }
      return <Badge variant="secondary">Pending Verification</Badge>;
    }
    if (booking.isPaid) {
      return <Badge variant="default">Paid</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    try {
      await api.post(`/frontdesk/bookings/${bookingId}/cancel`, {
        reason: reason,
      });

      toast.success("Booking cancelled successfully");

      // Refresh the bookings list
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast.error(error.message || "Failed to cancel booking");
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handleOpenCancelModal = (bookingId: string) => {
    setCancelBookingId(bookingId);
    setShowCancelModal(true);
  };

  const handleVerifyBooking = async (bookingId: string) => {
    try {
      // Set loading state for this specific booking
      setVerifyingBookings((prev) => new Set(prev).add(bookingId));

      await api.post(`/frontdesk/bookings/${bookingId}/verify`, {
        reason: "Verified by frontdesk from bookings list",
      });

      toast.success("Booking verified and assigned to shuttle successfully");

      // Refresh the bookings list
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error: any) {
      console.error("Error verifying booking:", error);
      toast.error(error.message || "Failed to verify booking");
    } finally {
      // Clear loading state for this booking
      setVerifyingBookings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleRejectBooking = async (bookingId: string, reason: string) => {
    try {
      await api.post(`/frontdesk/bookings/${bookingId}/reject`, {
        reason: reason,
      });

      toast.success("Booking rejected successfully");

      // Refresh the bookings list
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error: any) {
      console.error("Error rejecting booking:", error);
      toast.error(error.message || "Failed to reject booking");
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handleOpenRejectModal = (bookingId: string) => {
    setRejectBookingId(bookingId);
    setShowRejectModal(true);
  };

  const handleRescheduleBooking = (booking: Booking) => {
    setRescheduleBooking(booking);
    setShowReschedule(true);
  };

  const handleRescheduleSuccess = async () => {
    setShowReschedule(false);
    setRescheduleBooking(null);

    // Refresh the bookings list
    try {
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error) {
      console.error("Error refreshing bookings:", error);
    }
  };

  const canModifyBooking = (booking: Booking) => {
    return !booking.isCompleted && !booking.isCancelled;
  };

  // Helper function to get guest display name
  const getGuestDisplayName = (booking: Booking) => {
    // Check if guest object exists and has the required properties
    const guest = booking.guest;
    const hasName = guest?.firstName?.trim() && guest?.lastName?.trim();
    const hasConfirmation = booking.confirmationNum?.trim();
    const hasEmail = guest?.email?.trim();

    if (hasName && guest) {
      return {
        display: `${guest.firstName} ${guest.lastName}`,
        type: "name" as const,
        icon: User,
      };
    } else if (hasConfirmation) {
      return {
        display: `Confirmation: ${booking.confirmationNum}`,
        type: "confirmation" as const,
        icon: Hash,
      };
    } else if (hasEmail && guest) {
      return {
        display: guest.email,
        type: "email" as const,
        icon: User,
      };
    } else {
      return {
        display: "Unknown Guest",
        type: "unknown" as const,
        icon: User,
      };
    }
  };

  if (loading) {
    return <BookingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">View and manage all shuttle bookings</p>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {isConnected ? "Live updates active" : "Live updates disconnected"}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Bookings</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Total:</span>
                <Badge variant="outline">{bookings.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Park, Sleep & Fly:</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {bookings.filter((b) => b.isParkSleepFly).length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Regular:</span>
                <Badge variant="outline">
                  {bookings.filter((b) => !b.isParkSleepFly).length}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Trip Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className={`${
                    newBookingIds.has(booking.id)
                      ? "animate-pulse bg-green-50 border-l-4 border-l-green-500"
                      : booking.isParkSleepFly
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  } ${
                    verifyingBookings.has(booking.id)
                      ? "bg-yellow-50 border-l-4 border-l-yellow-500"
                      : ""
                  } transition-all duration-300`}
                >
                  <TableCell>
                    <div>
                      {(() => {
                        const guestInfo = getGuestDisplayName(booking);
                        const IconComponent = guestInfo.icon;
                        return (
                          <div className="flex items-center space-x-2">
                            <IconComponent className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">
                                {guestInfo.display}
                                {booking.isParkSleepFly && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                    🏨✈️ Park, Sleep & Fly
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                {booking.guest?.email ||
                                  (booking.confirmationNum
                                    ? `Confirmation: ${booking.confirmationNum}`
                                    : "No email provided")}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {booking.bookingType === "HOTEL_TO_AIRPORT"
                          ? "Hotel to Airport"
                          : "Airport to Hotel"}
                      </span>
                      {booking.isParkSleepFly && (
                        <span className="text-blue-600 text-xs">(PSF)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.preferredTime), "PPp")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(booking)}
                      {verifyingBookings.has(booking.id) && (
                        <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>{booking.paymentMethod}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.pricing ? (
                      <span>
                        ${booking.pricing.pricePerPerson.toFixed(2)} per person
                        <br />
                        <span className="font-semibold text-green-700">
                          Total: ${booking.pricing.totalPrice.toFixed(2)}
                        </span>
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {booking.needsFrontdeskVerification && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleVerifyBooking(booking.id)}
                                className="cursor-pointer text-green-600"
                                disabled={verifyingBookings.has(booking.id)}
                              >
                                {verifyingBookings.has(booking.id) ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                {verifyingBookings.has(booking.id)
                                  ? "Verifying..."
                                  : "Verify Booking"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOpenRejectModal(booking.id)
                                }
                                className="cursor-pointer text-red-600"
                                disabled={verifyingBookings.has(booking.id)}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject Booking
                              </DropdownMenuItem>
                            </>
                          )}
                          {canModifyBooking(booking) &&
                            !booking.needsFrontdeskVerification && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRescheduleBooking(booking)
                                  }
                                  className="cursor-pointer"
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  Reschedule
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleOpenCancelModal(booking.id)
                                  }
                                  className="cursor-pointer text-red-600"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel Booking
                                </DropdownMenuItem>
                              </>
                            )}
                          {!canModifyBooking(booking) &&
                            !booking.needsFrontdeskVerification && (
                              <DropdownMenuItem disabled>
                                No actions available
                              </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-gray-500">No bookings found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <RescheduleModal
          isOpen={showReschedule}
          onClose={() => {
            setShowReschedule(false);
            setRescheduleBooking(null);
          }}
          bookingId={rescheduleBooking.id}
          currentTime={rescheduleBooking.preferredTime}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      {/* Cancel Booking Modal */}
      {cancelBookingId && (
        <CancelBookingModal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setCancelBookingId(null);
          }}
          onConfirm={(reason) => handleCancelBooking(cancelBookingId, reason)}
          bookingId={cancelBookingId}
        />
      )}

      {/* Reject Booking Modal */}
      {rejectBookingId && (
        <RejectBookingModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setRejectBookingId(null);
          }}
          onConfirm={(reason) => handleRejectBooking(rejectBookingId, reason)}
          bookingId={rejectBookingId}
        />
      )}
    </div>
  );
}
