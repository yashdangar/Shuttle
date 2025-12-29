"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Users, Calendar, Clock } from "lucide-react";
import { useHotelTime } from "@/hooks/use-hotel-time";

interface ActiveTripsProps {
  trips: Array<{
    _id: string;
    tripName: string;
    scheduledDate?: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    status: string;
    bookingCount: number;
    seatsOccupied: number;
    seatsHeld: number;
    totalSeats: number;
    shuttle?: {
      vehicleNumber: string;
      totalSeats: number;
    };
    driver?: {
      name: string;
      phoneNumber: string;
    };
    completedRoutes: number;
    totalRoutes: number;
  }>;
}

export function ActiveTrips({ trips }: ActiveTripsProps) {
  const { formatTime, formatScheduledDateTime, getOffset, getToday } = useHotelTime();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Calendar className="h-3 w-3" />;
      case "IN_PROGRESS":
        return <Clock className="h-3 w-3" />;
      case "COMPLETED":
        return <MapPin className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getOccupancyPercentage = (occupied: number, held: number, total: number) => {
    if (total === 0) return 0;
    return Math.round(((occupied + held) / total) * 100);
  };

  // Format trip time - if scheduledDate provided, use formatScheduledDateTime, otherwise format UTC time directly
  const formatTripTime = (scheduledDate: string | undefined, timeStr: string) => {
    if (scheduledDate) {
      return formatScheduledDateTime(scheduledDate, timeStr).time;
    }
    // Fallback for times without date context
    return formatTime(timeStr);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Today's Trips</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[30vw] overflow-y-auto">
          <div className="p-4 space-y-4">
            {trips.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No trips scheduled for today
              </p>
            ) : (
              trips.map((trip) => (
              <div
                key={trip._id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium truncate">{trip.tripName}</h4>
                    <Badge className={getStatusColor(trip.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(trip.status)}
                        <span>{trip.status.replace("_", " ")}</span>
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTripTime(trip.scheduledDate, trip.scheduledStartTime)} - {formatTripTime(trip.scheduledDate, trip.scheduledEndTime)}
                        <span className="text-xs ml-1 text-muted-foreground/70">({getOffset()})</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{trip.bookingCount} bookings</span>
                    </div>
                  </div>

                  {trip.shuttle && (
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Shuttle:</span> {trip.shuttle.vehicleNumber}
                      {trip.driver && (
                        <span className="ml-2">
                          <span className="font-medium">Driver:</span> {trip.driver.name}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Occupancy</span>
                      <span>
                        {trip.seatsOccupied + trip.seatsHeld} / {trip.totalSeats} seats
                      </span>
                    </div>
                    <Progress 
                      value={getOccupancyPercentage(trip.seatsOccupied, trip.seatsHeld, trip.totalSeats)}
                      className="h-2"
                    />
                    {trip.totalRoutes > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Route Progress</span>
                        <span>{trip.completedRoutes} / {trip.totalRoutes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
