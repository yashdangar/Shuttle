"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Briefcase,
  AlertCircle,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { formatTimeForDisplay, getUserTimeZone } from "@/lib/utils";

interface Guest {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  isNonResident: boolean;
}

interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface Shuttle {
  id: number;
  vehicleNumber: string;
}

interface PendingBooking {
  id: string;
  guest: Guest;
  numberOfPersons: number;
  numberOfBags: number;
  pickupLocation: Location;
  dropoffLocation: Location;
  preferredTime: string;
  paymentMethod: string;
  bookingType: string;
  isPaid: boolean;
  isVerified: boolean;
  needsFrontdeskVerification: boolean;
  eta: string;
  notes: string;
  isParkSleepFly: boolean;
  createdAt: string;
  timeSinceCreated: number;
}

interface PendingBookingsCardProps {
  bookings: PendingBooking[];
  totalPendingBookings: number;
  timeRange: {
    from: string;
    to: string;
  };
}

export default function PendingBookingsCard({ 
  bookings, 
  totalPendingBookings, 
  timeRange 
}: PendingBookingsCardProps) {
  const [expandedBookings, setExpandedBookings] = useState(false);

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    return formatTimeForDisplay(timeString);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "APP": return "bg-green-100 text-green-800";
      case "FRONTDESK": return "bg-blue-100 text-blue-800";
      case "DEPOSIT": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getBookingTypeColor = (type: string) => {
    switch (type) {
      case "HOTEL_TO_AIRPORT": return "bg-orange-100 text-orange-800";
      case "AIRPORT_TO_HOTEL": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeSinceCreated = (minutes: number) => {
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  const getUrgencyColor = (minutes: number) => {
    if (minutes > 45) return "text-red-600";
    if (minutes > 30) return "text-orange-600";
    return "text-gray-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-orange-600" />
            <div>
              <CardTitle className="text-lg">
                Pending Bookings (Last Hour)
              </CardTitle>
              <p className="text-sm text-gray-600">
                {totalPendingBookings} bookings waiting for assignment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-100 text-orange-800">
              {totalPendingBookings} Pending
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedBookings(!expandedBookings)}
            >
              {expandedBookings ? "Hide Details" : "Show Details"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {totalPendingBookings === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Bookings</h3>
            <p className="text-sm">
              All bookings from the last hour have been assigned to trips.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Time Range Info */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Time Range</span>
              </div>
              <div className="text-sm text-gray-600">
                <div>From: {formatDate(timeRange.from)} {formatTime(timeRange.from)}</div>
                <div>To: {formatDate(timeRange.to)} {formatTime(timeRange.to)}</div>
                <div className="text-xs text-blue-700 mt-1">
                  All times in local timezone: <b>{getUserTimeZone()}</b>
                </div>
              </div>
            </div>

            {/* Bookings List */}
            {expandedBookings && (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className={`border rounded-lg p-4 ${
                      booking.isParkSleepFly 
                        ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500' 
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {booking.guest?.name || 'Unknown Guest'}
                        </span>
                        {booking.guest?.isNonResident && (
                          <Badge variant="outline" className="text-xs">
                            Non-Resident
                          </Badge>
                        )}
                        {booking.isParkSleepFly && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs font-medium">
                            Pay, Sleep & Fly
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getUrgencyColor(booking.timeSinceCreated)}`}>
                          {getTimeSinceCreated(booking.timeSinceCreated)}
                        </span>
                        <div className="flex items-center gap-1">
                          {booking.isVerified ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          {booking.needsFrontdeskVerification && (
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3" />
                          <span>{booking.numberOfPersons} persons</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-3 w-3" />
                          <span>{booking.numberOfBags} bags</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3" />
                          <span>Preferred: {formatTime(booking.preferredTime)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Badge className={getPaymentMethodColor(booking.paymentMethod)}>
                          {booking.paymentMethod}
                        </Badge>
                        <Badge className={getBookingTypeColor(booking.bookingType)}>
                          {booking.bookingType.replace(/_/g, ' ')}
                        </Badge>
                        {booking.isPaid ? (
                          <Badge className="bg-green-100 text-green-800">
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            Unpaid
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Route Information */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-green-600" />
                        <span>
                          <span className="font-medium">From:</span> {booking.pickupLocation?.name || 'Not specified'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-red-600" />
                        <span>
                          <span className="font-medium">To:</span> {booking.dropoffLocation?.name || 'Not specified'}
                        </span>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Contact Information */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <a 
                          href={`tel:${booking.guest?.phoneNumber}`}
                          className="text-blue-600 hover:underline"
                        >
                          {booking.guest?.phoneNumber}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <a 
                          href={`mailto:${booking.guest?.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {booking.guest?.email}
                        </a>
                      </div>
                    </div>

                    {/* Additional Information */}
                    {(booking.eta || booking.notes) && (
                      <div className="mt-3 pt-3 border-t">
                        {booking.eta && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Clock className="h-3 w-3" />
                            <span>ETA: {booking.eta}</span>
                          </div>
                        )}
                        {booking.notes && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {booking.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Summary</span>
                <div className="flex items-center gap-4">
                  <span>Total: {totalPendingBookings}</span>
                  <span>Unverified: {bookings.filter(b => !b.isVerified).length}</span>
                  <span>Unpaid: {bookings.filter(b => !b.isPaid).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 