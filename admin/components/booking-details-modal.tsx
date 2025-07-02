import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User,
  MapPin,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  Car,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye,
  Truck,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
}

interface Booking {
  id: string;
  guest: {
    firstName?: string;
    lastName?: string;
    email: string;
    isNonResident: boolean;
  };
  numberOfPersons: number;
  numberOfBags: number;
  pickupLocation?: {
    name: string;
  };
  dropoffLocation?: {
    name: string;
  };
  preferredTime: string;
  paymentMethod: string;
  bookingType: string;
  isCompleted: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  isWaived: boolean;
  waiverReason?: string;
  waivedBy?: number;
  waivedAt?: string;
  waiverUser?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  notes?: string;
  isPaySleepFly?: boolean;
  shuttle?: {
    id: string;
    vehicleNumber: string;
    seats: number;
    createdAt: string;
    schedules: {
      driver: Driver;
    }[];
  };
  trip?: {
    driver: Driver;
  };
}

interface BookingDetailsModalProps {
  booking: Booking;
}

export function BookingDetailsModal({ booking }: BookingDetailsModalProps) {
  const [open, setOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (booking: Booking) => {
    if (booking.isCancelled) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (booking.isCompleted) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (booking.isWaived) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">Approved</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getPaymentBadge = (booking: Booking) => {
    if (booking.isWaived) {
      return <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">Waived</Badge>;
    }
    if (booking.isPaid) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
    }
    return <Badge variant="destructive">Unpaid</Badge>;
  };

  // Get driver information
  const getDriverInfo = () => {
    // First check if booking is assigned to a trip
    if (booking.trip?.driver) {
      return booking.trip.driver;
    }
    
    // Then check if booking is assigned to a shuttle with schedules
    if (booking.shuttle?.schedules?.[0]?.driver) {
      return booking.shuttle.schedules[0].driver;
    }
    
    return null;
  };

  const driver = getDriverInfo();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking ID and Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Booking #{booking.id}</h3>
              <p className="text-sm text-gray-500">Created on {formatDate(booking.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(booking)}
              {getPaymentBadge(booking)}
            </div>
          </div>

          <Separator />

          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-base">
                    {booking.guest.firstName && booking.guest.lastName
                      ? `${booking.guest.firstName} ${booking.guest.lastName}`
                      : "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-base">{booking.guest.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Guest Type</p>
                  <Badge variant={booking.guest.isNonResident ? "outline" : "default"}>
                    {booking.guest.isNonResident ? "Non-Resident" : "Resident"}
                  </Badge>
                </div>
                {booking.isPaySleepFly && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Package</p>
                    <Badge variant="default" className="bg-blue-100 text-blue-800">
                      Pay, Sleep & Fly
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Route</p>
                  <p className="text-base">
                    {booking.bookingType === "HOTEL_TO_AIRPORT" 
                      ? "Hotel → Airport" 
                      : "Airport → Hotel"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Preferred Time</p>
                  <p className="text-base">{formatDate(booking.preferredTime)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pickup Location</p>
                  <p className="text-base">{booking.pickupLocation?.name || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Dropoff Location</p>
                  <p className="text-base">{booking.dropoffLocation?.name || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Passengers</p>
                  <p className="text-base">
                    {booking.numberOfPersons} person{booking.numberOfPersons !== 1 ? 's' : ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Bags</p>
                  <p className="text-base">
                    {booking.numberOfBags} bag{booking.numberOfBags !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shuttle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shuttle Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.shuttle ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vehicle Number</p>
                    <p className="text-base font-mono">{booking.shuttle.vehicleNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Capacity</p>
                    <p className="text-base">
                      {booking.shuttle.seats} seat{booking.shuttle.seats !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Shuttle ID</p>
                    <p className="text-base text-gray-500">#{booking.shuttle.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Added to Fleet</p>
                    <p className="text-base">{formatDate(booking.shuttle.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500">No shuttle assigned yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {driver ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Driver Name</p>
                    <p className="text-base">{driver.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Phone Number</p>
                    <p className="text-base flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {driver.phoneNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-base flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {driver.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Assignment Status</p>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Assigned
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Car className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500">No driver assigned yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Method</p>
                  <p className="text-base">
                    {booking.isWaived ? "Waived" : booking.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Status</p>
                  {getPaymentBadge(booking)}
                </div>
              </div>

              {/* Waiver Information */}
              {booking.isWaived && (
                <div className="mt-4 p-4 bg-orange-100 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-800 mb-1">
                        Booking Fee Waived
                      </p>
                      <p className="text-sm text-orange-700 mb-2">
                        <strong>Reason:</strong> {booking.waiverReason}
                      </p>
                      <p className="text-xs text-orange-600">
                        Waived by {booking.waiverUser?.name || 'Unknown'} on{' '}
                        {booking.waivedAt ? formatDate(booking.waivedAt) : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Pay Sleep Fly Information */}
          {booking.isPaySleepFly && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Pay, Sleep & Fly Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base text-blue-700">
                  This booking is part of our Pay, Sleep & Fly package. 
                  The guest has pre-paid for their accommodation and shuttle service.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Created</p>
                  <p className="text-base">{formatDate(booking.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-base">{formatDate(booking.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 