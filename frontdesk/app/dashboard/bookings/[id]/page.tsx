"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
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
  Copy
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [cancellationReason, setCancellationReason] = useState("");

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
        const response = await fetchWithAuth(`/frontdesk/bookings/${params.id}`);
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

  const handleCancelBooking = async () => {
    if (!cancellationReason) {
      toast.error("Please provide a reason for the cancellation.");
      return;
    }

    try {
      await fetchWithAuth(`/frontdesk/bookings/${params.id}/cancel`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancellationReason }),
      });

      toast.success("Booking has been cancelled.");
      
      setBooking(prev => prev ? { ...prev, isCancelled: true, cancelledBy: 'FRONTDESK', cancellationReason } : null);
      setShowCancelDialog(false);
      setCancellationReason("");

    } catch (error) {
      toast.error("Failed to cancel the booking. Please try again.");
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
    if (booking.isPaid) {
      return <Badge variant="default">Paid</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  // Helper function to get guest display name
  const getGuestDisplayName = (booking: BookingDetails) => {
    const hasName = booking.guest.firstName?.trim() && booking.guest.lastName?.trim();
    const hasConfirmation = booking.confirmationNum?.trim();
    
    if (hasName) {
      return {
        display: `${booking.guest.firstName} ${booking.guest.lastName}`,
        type: 'name' as const,
        icon: User
      };
    } else if (hasConfirmation) {
      return {
        display: `Confirmation: ${booking.confirmationNum}`,
        type: 'confirmation' as const,
        icon: Hash
      };
    } else {
      return {
        display: booking.guest.email || 'Unknown Guest',
        type: 'email' as const,
        icon: User
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
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
                {booking.bookingType === "HOTEL_TO_AIRPORT" ? "Hotel → Airport" : "Airport → Hotel"}
              </Badge>
              {booking.isParkSleepFly && (
                <Badge className="bg-blue-100 text-blue-800 border border-blue-200">🏨✈️ PSF</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(booking.qrCodePath || booking.qrCodeUrl) && (
              <Button onClick={() => setShowQRCode(true)} className="gap-2">
                <QrCode className="h-4 w-4" /> View QR Code
              </Button>
            )}
            {!booking.isCancelled && !booking.isCompleted && (
              <Button variant="destructive" onClick={() => setShowCancelDialog(true)} className="gap-2">
                <XCircle className="h-4 w-4" /> Cancel Booking
              </Button>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Guests</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-1 text-xl font-semibold">{booking.numberOfPersons}</div>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Bags</span>
              <Briefcase className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-1 text-xl font-semibold">{booking.numberOfBags}</div>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Preferred</span>
              <Clock className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-1 text-sm font-medium">{format(new Date(booking.preferredTime), "PPp")}</div>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Shuttle</span>
              <Bus className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-1 text-sm font-medium">{booking.shuttle?.vehicleNumber || "—"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <p className="font-medium">
                      {guestInfo.display}
                    </p>
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
                    onClick={() => copyToClipboard(booking.confirmationNum!, "Confirmation number")}
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
                <Badge variant={booking.guest.isNonResident ? "outline" : "default"}>
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
                  ${booking.pricing.pricePerPerson.toFixed(2)} per person<br/>
                  <span className="font-semibold text-green-700">Total: ${booking.pricing.totalPrice.toFixed(2)}</span>
                </p>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
            {booking.isCancelled && (
              <div>
                <p className="text-sm text-gray-500">Cancelled By</p>
                <p className="font-medium">{booking.cancelledBy || 'N/A'}</p>
              </div>
            )}
            {booking.isCancelled && booking.cancellationReason && (
              <div>
                <p className="text-sm text-gray-500">Cancellation Reason</p>
                <p className="font-medium">{booking.cancellationReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-500" /> Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Number of Persons</p>
              <p className="font-medium">{booking.numberOfPersons}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Number of Bags</p>
              <p className="font-medium">{booking.numberOfBags}</p>
            </div>
            {booking.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
            {booking.isParkSleepFly && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🏨✈️</span>
                  <p className="text-sm font-medium text-blue-800">Park, Sleep & Fly Package</p>
                </div>
                <p className="text-sm text-blue-700">
                  This booking is part of our Park, Sleep & Fly package. 
                  The guest has pre-paid for their accommodation and shuttle service.
                  This is a premium service that includes both hotel stay and airport shuttle.
                </p>
              </div>
            )}
            {booking.shuttle && (
              <div>
                <p className="text-sm text-gray-500">Assigned Shuttle</p>
                <p className="font-medium">{booking.shuttle.vehicleNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(booking.qrCodePath || booking.qrCodeUrl) && (
        <QRCodeDisplay
          qrCodePath={booking.qrCodeUrl!}
          bookingId={booking.id}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
        />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Please provide a reason for the cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Input
                id="reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Guest requested cancellation"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking}>
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 