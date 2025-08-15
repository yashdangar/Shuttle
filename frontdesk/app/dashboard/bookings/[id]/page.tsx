"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { CancelBookingModal } from "@/components/cancel-booking-modal";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  User,
  Hash,
  Calendar,
  Clock,
  CreditCard,
  MapPin,
  Bus,
  Info,
  QrCode,
  XCircle,
  Users,
  Briefcase,
  Copy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface BookingDetails {
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
  qrCodePath: string | null;
  qrCodeUrl: string | null;
  confirmationNum: string | null;
  notes: string | null;
  isParkSleepFly: boolean;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    isNonResident: boolean;
  };
  pickupLocation: {
    name: string;
  } | null;
  dropoffLocation: {
    name: string;
  } | null;
  shuttle: {
    id: number;
    vehicleNumber: string;
  } | null;
  cancelledBy?: string;
  cancellationReason?: string;
  pricing?: {
    pricePerPerson: number;
    totalPrice: number;
    numberOfPersons: number;
  };
}

export default function BookingDetailsPage() {
  const params = useParams();

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const response = await fetchWithAuth(
          `/frontdesk/bookings/${params.id}`
        );
        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        toast.error("Failed to fetch booking details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [params.id]);

  const handleCancelConfirm = async (reason: string) => {
    try {
      await fetchWithAuth(`/frontdesk/bookings/${params.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      toast.success("Booking has been cancelled.");

      setBooking((prev) =>
        prev
          ? {
              ...prev,
              isCancelled: true,
              cancelledBy: "FRONTDESK",
              cancellationReason: reason,
            }
          : prev
      );
      setShowCancelDialog(false);
    } catch (error) {
      toast.error("Failed to cancel the booking. Please try again.");
      throw error as Error;
    }
  };

  const handleVerifyBooking = async () => {
    if (!booking) return;

    try {
      setVerifying(true);
      await fetchWithAuth(`/frontdesk/bookings/${booking.id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      toast.success("Booking verified and assigned to shuttle successfully");

      // Refresh booking data
      const response = await fetchWithAuth(`/frontdesk/bookings/${params.id}`);
      const data = await response.json();
      setBooking(data.booking);
    } catch (error) {
      toast.error("Failed to verify the booking. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Booking not found</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (booking.isCancelled) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (booking.isCompleted) {
      return <Badge variant="default">Completed</Badge>;
    }
    if (booking.needsFrontdeskVerification) {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          Pending Verification
        </Badge>
      );
    }
    if (booking.isVerified) {
      return <Badge variant="default">Verified</Badge>;
    }
    if (booking.isPaid) {
      return <Badge variant="default">Paid</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  // Helper function to get guest display name
  const getGuestDisplayName = (booking: BookingDetails) => {
    const hasName =
      booking.guest.firstName?.trim() && booking.guest.lastName?.trim();
    const hasConfirmation = booking.confirmationNum?.trim();

    if (hasName) {
      return {
        display: `${booking.guest.firstName} ${booking.guest.lastName}`,
        type: "name" as const,
        icon: User,
      };
    } else if (hasConfirmation) {
      return {
        display: `Confirmation: ${booking.confirmationNum}`,
        type: "confirmation" as const,
        icon: Hash,
      };
    } else {
      return {
        display: booking.guest.email || "Unknown Guest",
        type: "email" as const,
        icon: User,
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with status and actions */}
      <div className="rounded-xl border bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Booking Details
              </h1>
              <div>{getStatusBadge()}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(booking.preferredTime), "PPp")}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Users className="h-3.5 w-3.5" />
                {booking.numberOfPersons} guests
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {booking.numberOfBags} bags
              </Badge>
              <Badge variant="outline" className="gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                {booking.paymentMethod}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {booking.bookingType === "HOTEL_TO_AIRPORT"
                  ? "Hotel → Airport"
                  : "Airport → Hotel"}
              </Badge>
              {booking.isParkSleepFly && (
                <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                  🏨✈️ PSF
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Verify Booking Button for unverified bookings */}
            {booking.needsFrontdeskVerification &&
              !booking.isCancelled &&
              !booking.isCompleted && (
                <Button
                  onClick={handleVerifyBooking}
                  disabled={verifying}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {verifying ? "Verifying..." : "Verify Booking"}
                </Button>
              )}

            {(booking.qrCodePath || booking.qrCodeUrl) && (
              <Button onClick={() => setShowQRCode(true)} className="gap-2">
                <QrCode className="h-4 w-4" /> View QR Code
              </Button>
            )}
            {!booking.isCancelled && !booking.isCompleted && (
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" /> Cancel Booking
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notes Section - Prominently displayed */}
      {booking.notes && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" /> Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-900 whitespace-pre-wrap font-medium">
              {booking.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guest Information */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-500" /> Guest Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              {(() => {
                const guestInfo = getGuestDisplayName(booking);
                const IconComponent = guestInfo.icon;
                return (
                  <div className="flex items-center space-x-2">
                    <IconComponent className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{guestInfo.display}</p>
                  </div>
                );
              })()}
            </div>
            {booking.confirmationNum && (
              <div>
                <p className="text-sm text-gray-500">Confirmation Number</p>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <p className="font-medium">{booking.confirmationNum}</p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Copy confirmation number"
                    onClick={() =>
                      copyToClipboard(
                        booking.confirmationNum!,
                        "Confirmation number"
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{booking.guest.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{booking.guest.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Guest Type</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={booking.guest.isNonResident ? "outline" : "default"}
                >
                  {booking.guest.isNonResident ? "Non-Resident" : "Resident"}
                </Badge>
                {booking.isParkSleepFly && (
                  <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
                    🏨✈️ Park, Sleep & Fly
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-500" /> Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Trip Type</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-medium">
                  {booking.bookingType === "HOTEL_TO_AIRPORT"
                    ? "Hotel to Airport"
                    : "Airport to Hotel"}
                </p>
                {booking.isParkSleepFly && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    PSF Package
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Preferred Time</p>
              <p className="font-medium">
                {format(new Date(booking.preferredTime), "PPp")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="font-medium">{booking.paymentMethod}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price</p>
              {booking.pricing ? (
                <p className="font-medium">
                  ${booking.pricing.pricePerPerson.toFixed(2)} per person
                  <br />
                  <span className="font-semibold text-green-700">
                    Total: ${booking.pricing.totalPrice.toFixed(2)}
                  </span>
                </p>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
            {booking.isCancelled && (
              <>
                <div>
                  <p className="text-sm text-gray-500">Cancelled By</p>
                  <p className="font-medium">{booking.cancelledBy || "N/A"}</p>
                </div>
                {booking.cancellationReason && (
                  <div>
                    <p className="text-sm text-gray-500">Cancellation Reason</p>
                    <p className="font-medium">{booking.cancellationReason}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Location Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-500" /> Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Pickup Location</p>
              <p className="font-medium">
                {booking.pickupLocation?.name || "Hotel Lobby"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dropoff Location</p>
              <p className="font-medium">
                {booking.dropoffLocation?.name || "Hotel Lobby"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shuttle & Assignment Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-indigo-500" /> Shuttle & Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Assigned Shuttle</p>
              <p className="font-medium">
                {booking.shuttle?.vehicleNumber || "Not assigned yet"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Passengers</p>
              <p className="font-medium">{booking.numberOfPersons} guests</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Luggage</p>
              <p className="font-medium">{booking.numberOfBags} bags</p>
            </div>
            {booking.isParkSleepFly && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🏨✈️</span>
                  <p className="text-sm font-medium text-blue-800">
                    Park, Sleep & Fly Package
                  </p>
                </div>
                <p className="text-sm text-blue-700">
                  This booking is part of our Park, Sleep & Fly package. The
                  guest has pre-paid for their accommodation and shuttle
                  service.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Modal */}
      {(booking.qrCodePath || booking.qrCodeUrl) && (
        <QRCodeDisplay
          qrCodePath={booking.qrCodeUrl!}
          bookingId={booking.id}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
        />
      )}

      {/* Cancel Booking Modal */}
      {showCancelDialog && booking && (
        <CancelBookingModal
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelConfirm}
          bookingId={booking.id}
        />
      )}
    </div>
  );
}
