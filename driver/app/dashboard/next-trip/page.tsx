"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, CreditCard, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";

export default function NextTripPage() {
  const [nextTrip, setNextTrip] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { onBookingUpdate } = useWebSocket();

  const fetchNextTrip = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/trips/next');
      console.log('Next trip response:', response);
      
      if (response.nextTrip) {
        setNextTrip(response.nextTrip);
        setPassengers(response.nextTrip.passengers || []);
      } else {
        setNextTrip(null);
        setPassengers([]);
      }
    } catch (error) {
      console.error('Error fetching next trip:', error);
      toast.error("Failed to fetch next trip data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNextTrip();
  }, [fetchNextTrip]);

  // Listen for real-time booking updates
  useEffect(() => {
    if (!onBookingUpdate) return;

    const cleanup = onBookingUpdate((updatedBooking) => {
      console.log("Booking update received via WebSocket:", updatedBooking);
      // Refresh next trip data when new bookings are assigned
      fetchNextTrip();
    });

    return cleanup;
  }, [onBookingUpdate, fetchNextTrip]);

  const handleCardClick = (passengerName: string) => {
    toast.info(`Viewing details for ${passengerName}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Next Trip</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading next trip...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!nextTrip) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Next Trip</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Trips</h2>
            <p className="text-gray-600">You don't have any scheduled trips at the moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-foreground">Next Trip</h1>

      {/* Trip Details */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            Trip Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Departure Time
              </p>
              <p className="text-3xl font-bold text-foreground">{nextTrip.time}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Duration
              </p>
              <p className="text-xl font-semibold text-foreground">
                {nextTrip.estimatedDuration}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Route</p>
            <p className="font-bold text-lg text-foreground">{nextTrip.route}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-foreground">
                {nextTrip.totalPassengers} passengers
              </span>
            </div>
            <Badge className="bg-blue-600 dark:bg-blue-500 text-white">Scheduled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Route Map Preview */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Navigation className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Route Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <p className="text-lg font-medium text-foreground">Route Map Preview</p>
              <p className="text-sm text-foreground">
                {nextTrip.route}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passenger List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          Passengers ({passengers.length})
        </h2>
        <div className="grid gap-3">
          {passengers.map((passenger) => (
            <Card
              key={passenger.id}
              className="hover:shadow-lg transition-all cursor-pointer border-border hover:border-blue-300 dark:hover:border-blue-700"
              onClick={() => handleCardClick(`${passenger.guest?.firstName} ${passenger.guest?.lastName}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg text-foreground">
                        {passenger.guest?.firstName} {passenger.guest?.lastName}
                      </h3>
                      <Badge variant="outline" className="border-blue-200 dark:border-blue-800 text-foreground">Scheduled</Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">
                          {passenger.pickupLocation?.name || 'Pickup Location'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>
                          {passenger.numberOfPersons} passengers • {passenger.numberOfBags} bags
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>{passenger.bookingType || 'Standard'}</span>
                      </div>
                    </div>
                  </div>

                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-sm font-medium text-foreground">
                    Drop-off:
                  </p>
                  <p className="text-sm text-foreground">
                    {passenger.dropoffLocation?.name || 'Dropoff Location'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
