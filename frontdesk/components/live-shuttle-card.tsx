"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Car, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Users, 
  Briefcase,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { formatTimeForDisplay } from "@/lib/utils";

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

interface Booking {
  id: string;
  guest: Guest;
  numberOfPersons: number;
  numberOfBags: number;
  pickupLocation: Location;
  dropoffLocation: Location;
  preferredTime: string;
  isCompleted: boolean;
  isVerified: boolean;
  eta: string;
  createdAt: string;
}

interface Driver {
  id: number;
  name: string;
  phoneNumber: string;
  email: string;
}

interface Shuttle {
  id: number;
  vehicleNumber: string;
  totalSeats: number;
  availableSeats: number;
  utilization: number;
}

interface LiveShuttle {
  tripId: string;
  shuttle: Shuttle;
  driver: Driver;
  direction: string;
  phase: string;
  startTime: string;
  outboundEndTime: string;
  returnStartTime: string;
  endTime: string;
  bookings: Booking[];
  totalBookings: number;
}

interface LiveShuttleCardProps {
  shuttle: LiveShuttle;
}

export default function LiveShuttleCard({ shuttle }: LiveShuttleCardProps) {
  const [expandedBookings, setExpandedBookings] = useState(false);

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A";
    return formatTimeForDisplay(timeString);
  };

  const getStatusColor = (utilization: number) => {
    if (utilization >= 90) return "bg-red-100 text-red-800";
    if (utilization >= 75) return "bg-orange-100 text-orange-800";
    return "bg-green-100 text-green-800";
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "OUTBOUND": return "bg-blue-100 text-blue-800";
      case "RETURN": return "bg-purple-100 text-purple-800";
      case "COMPLETED": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate total passengers from bookings
  const totalPassengers = shuttle.bookings?.reduce((total, booking) => {
    return total + (booking.numberOfPersons || 0);
  }, 0) || 0;

  // Calculate available seats
  const availableSeats = (shuttle.shuttle?.totalSeats || 0) - totalPassengers;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-lg">
                {shuttle.shuttle?.vehicleNumber || 'Unknown Vehicle'}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Trip ID: {shuttle.tripId?.substring(0, 8) || 'Unknown'}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <Badge className={getStatusColor(shuttle.shuttle?.utilization || 0)}>
              {shuttle.shuttle?.utilization ? `${shuttle.shuttle.utilization}% Full` : 'N/A'}
            </Badge> */}
            <Badge className={getPhaseColor(shuttle.phase)}>
              {shuttle.phase}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Driver Information */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-sm">Driver</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{shuttle.driver?.name || 'Unknown Driver'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <a 
                href={`tel:${shuttle.driver?.phoneNumber || ''}`}
                className="text-blue-600 hover:underline"
              >
                {shuttle.driver?.phoneNumber || 'No phone'}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              <a 
                href={`mailto:${shuttle.driver?.email || ''}`}
                className="text-blue-600 hover:underline"
              >
                {shuttle.driver?.email || 'No email'}
              </a>
            </div>
          </div>
        </div>

        {/* Trip Information */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Trip Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Direction:</span> {shuttle.direction}
            </div>
            <div>
              <span className="font-medium">Start Time:</span> {formatTime(shuttle.startTime)}
            </div>
            {shuttle.outboundEndTime && (
              <div>
                <span className="font-medium">Outbound End:</span> {formatTime(shuttle.outboundEndTime)}
              </div>
            )}
            {shuttle.returnStartTime && (
              <div>
                <span className="font-medium">Return Start:</span> {formatTime(shuttle.returnStartTime)}
              </div>
            )}
            {shuttle.endTime && (
              <div>
                <span className="font-medium">End Time:</span> {formatTime(shuttle.endTime)}
              </div>
            )}
          </div>
        </div>

        {/* Capacity Information */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Capacity</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">{totalPassengers}</span> / {shuttle.shuttle?.totalSeats || 'N/A'} passengers
            <span className="text-gray-500 ml-2">
              ({availableSeats} available)
            </span>
          </div>
        </div>

        {/* Bookings Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm">
                Bookings ({shuttle.bookings?.length || 0})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedBookings(!expandedBookings)}
            >
              {expandedBookings ? "Hide Details" : "Show Details"}
            </Button>
          </div>

          {expandedBookings && (
            <div className="space-y-3">
              {shuttle.bookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {booking.guest?.name || 'Unknown Guest'}
                      </span>
                      {booking.guest?.isNonResident && (
                        <Badge variant="outline" className="text-xs">
                          Non-Resident
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {booking.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      {booking.isCompleted ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{booking.numberOfPersons} persons</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      <span>{booking.numberOfBags} bags</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        <span className="font-medium">From:</span> {booking.pickupLocation?.name || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        <span className="font-medium">To:</span> {booking.dropoffLocation?.name || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="flex items-center justify-between text-xs">
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

                  {booking.eta && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>ETA: {booking.eta}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 