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
import { useToast } from "@/components/hooks/use-toast";
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
  isPaySleepFly: boolean;
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
  const { toast } = useToast();
  const { socket, isConnected, markUserInteraction } = useWebSocket();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null
  );
  const [newBookingIds, setNewBookingIds] = useState<Set<string>>(new Set());

  // Function to fetch bookings
  const fetchBookings = async () => {
    try {
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [toast]);

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
            const response = await api.get(`/frontdesk/bookings/${data.booking.id}`);
            completeBooking = response.booking;
            console.log("Complete booking data fetched:", completeBooking);
          } catch (error) {
            console.error("Error fetching complete booking data:", error);
            // Continue with the incomplete data if API call fails
          }
        }
        
        setBookings(prevBookings => {
          // Check if booking already exists to avoid duplicates
          const exists = prevBookings.find(b => b.id === completeBooking.id);
          if (exists) {
            return prevBookings;
          }
          return [completeBooking, ...prevBookings];
        });
        
        // Add to new booking IDs for highlighting
        setNewBookingIds(prev => new Set([...prev, completeBooking.id]));
        
        // Show a toast notification for the new booking
        const guestName = completeBooking.guest?.firstName 
          ? `${completeBooking.guest.firstName} ${completeBooking.guest.lastName}`
          : completeBooking.guest?.email || completeBooking.confirmationNum 
            ? `Confirmation: ${completeBooking.confirmationNum}`
            : 'Guest';
        
        toast({
          title: "New Booking Received",
          description: `${guestName} has made a new booking`,
          duration: 4000,
        });
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
          setNewBookingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(completeBooking.id);
            return newSet;
          });
        }, 5000);
      }
    };

    // Listen for booking updates (cancelled, verified, etc.)
    const handleBookingUpdate = (data: any) => {
      console.log("Booking update received via WebSocket:", data);
      
      if (data.booking) {
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === data.booking.id 
              ? { ...booking, ...data.booking }
              : booking
          )
        );
      }
    };

    // Listen for booking cancellations
    const handleBookingCancelled = (data: any) => {
      console.log("Booking cancelled via WebSocket:", data);
      
      if (data.booking) {
        setBookings(prevBookings => 
          prevBookings.map(booking => 
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
        setBookings(prevBookings => 
          prevBookings.map(booking => 
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
    if (booking.needsFrontdeskVerification) {
      return <Badge variant="secondary">Pending Verification</Badge>;
    }
    if (!booking.needsFrontdeskVerification && !booking.isVerified) {
      return <Badge variant="default">Frontdesk Verified</Badge>;
    }
    if (booking.isVerified) {
      return <Badge variant="default">Driver Checked In</Badge>;
    }
    if (booking.isPaid) {
      return <Badge variant="default">Paid</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      // Use POST and provide a default reason
      await api.post(`/frontdesk/bookings/${bookingId}/cancel`, {
        reason: "Cancelled by Frontdesk from bookings list",
      });

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });

      // Refresh the bookings list
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const handleVerifyBooking = async (bookingId: string) => {
    try {
      await api.post(`/frontdesk/bookings/${bookingId}/verify`, {
        reason: "Verified by frontdesk from bookings list",
      });

      toast({
        title: "Success",
        description: "Booking verified and assigned to shuttle successfully",
      });

      // Refresh the bookings list
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error: any) {
      console.error("Error verifying booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify booking",
        variant: "destructive",
      });
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      await api.post(`/frontdesk/bookings/${bookingId}/reject`, {
        reason: "Rejected by frontdesk",
      });

      toast({
        title: "Success",
        description: "Booking rejected successfully",
      });

      // Refresh the bookings list
      const data = await api.get("/frontdesk/bookings");
      setBookings(data.bookings);
    } catch (error: any) {
      console.error("Error rejecting booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject booking",
        variant: "destructive",
      });
    }
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
        type: 'name' as const,
        icon: User
      };
    } else if (hasConfirmation) {
      return {
        display: `Confirmation: ${booking.confirmationNum}`,
        type: 'confirmation' as const,
        icon: Hash
      };
    } else if (hasEmail && guest) {
      return {
        display: guest.email,
        type: 'email' as const,
        icon: User
      };
    } else {
      return {
        display: 'Unknown Guest',
        type: 'unknown' as const,
        icon: User
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
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live updates active' : 'Live updates disconnected'}
          </span>
        </div>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow 
                  key={booking.id}
                  className={`${
                    newBookingIds.has(booking.id) 
                      ? 'animate-pulse bg-green-50 border-l-4 border-l-green-500' 
                      : booking.isPaySleepFly
                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                      : ''
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
                                {booking.isPaySleepFly && (
                                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Pay, Sleep & Fly
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                {booking.guest?.email || (booking.confirmationNum 
                                  ? `Confirmation: ${booking.confirmationNum}`
                                  : 'No email provided')}
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
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.preferredTime), "PPp")}
                  </TableCell>
                  <TableCell>{getStatusBadge(booking)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>{booking.paymentMethod}</span>
                    </div>
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
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Booking
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleRejectBooking(booking.id)}
                                className="cursor-pointer text-red-600"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject Booking
                              </DropdownMenuItem>
                            </>
                          )}
                          {canModifyBooking(booking) && !booking.needsFrontdeskVerification && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRescheduleBooking(booking)}
                                className="cursor-pointer"
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCancelBooking(booking.id)}
                                className="cursor-pointer text-red-600"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel Booking
                              </DropdownMenuItem>
                            </>
                          )}
                          {!canModifyBooking(booking) && !booking.needsFrontdeskVerification && (
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
    </div>
  );
}
