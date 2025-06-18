"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { fetchWithAuth } from "@/lib/api";
import { useToast } from "@/components/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

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
    name: string;
  } | null;
}

export default function BookingDetailsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const response = await fetchWithAuth(`/frontdesk/bookings/${params.id}`);
        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch booking details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [params.id, toast]);

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
      return <Badge variant="success">Completed</Badge>;
    }
    if (booking.isPaid) {
      return <Badge variant="default">Paid</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
          <p className="text-gray-600">View booking information and status</p>
        </div>
        {booking.qrCodePath && (
          <Button onClick={() => setShowQRCode(true)}>
            View QR Code
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Guest Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">
                {booking.guest.firstName} {booking.guest.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{booking.guest.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{booking.guest.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium">
                {booking.guest.isNonResident ? "Non-Resident" : "Hotel Resident"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Trip Type</p>
              <p className="font-medium">
                {booking.bookingType === "HOTEL_TO_AIRPORT"
                  ? "Hotel to Airport"
                  : "Airport to Hotel"}
              </p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Details</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
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
            {booking.shuttle && (
              <div>
                <p className="text-sm text-gray-500">Assigned Shuttle</p>
                <p className="font-medium">{booking.shuttle.name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {booking.qrCodePath && (
        <QRCodeDisplay
          qrCodePath={booking.qrCodeUrl!}
          bookingId={booking.id}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  );
} 