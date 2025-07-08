"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Users,
  Clock,
  Navigation,
  Play,
  Square,
  Calendar,
  Package,
  ClipboardList,
  Bell,
  QrCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";
import { formatTimeForDisplay, getUserTimeZone } from "@/lib/utils";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import DriverRouteMap from "@/components/driver-route-map";
import LocationTracker from "@/components/location-tracker";
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

interface AvailableTrip {
  direction: "HOTEL_TO_AIRPORT" | "AIRPORT_TO_HOTEL";
  bookingCount: number;
  totalPersons: number;
  totalBags: number;
  earliestTime: string;
  latestTime: string;
}

interface CurrentTrip {
  id: string;
  direction: "HOTEL_TO_AIRPORT" | "AIRPORT_TO_HOTEL";
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  phase: "OUTBOUND" | "RETURN" | "COMPLETED";
  startTime: string;
  outboundEndTime?: string;
  returnStartTime?: string;
  endTime?: string;
  shuttle: {
    vehicleNumber: string;
  };
  passengers: any[];
  totalPeople: number;
  checkedInPeople: number;
  totalBookings: number;
  checkedInBookings: number;
  totalBags: number;
}

interface LiveBooking {
  id: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  numberOfPersons: number;
  numberOfBags: number;
  preferredTime: string;
  pickupLocation: {
    name: string;
  } | null;
  dropoffLocation: {
    name: string;
  } | null;
  bookingType: string;
  assignedAt: string;
}

export default function TripsPage() {
  const [availableTrips, setAvailableTrips] = useState<AvailableTrip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<CurrentTrip | null>(null);
  const [liveBookings, setLiveBookings] = useState<LiveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTrip, setStartingTrip] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [showEndTripDialog, setShowEndTripDialog] = useState(false);
  const [newBookingNotification, setNewBookingNotification] =
    useState<LiveBooking | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const { toast } = useToast();
  const { socket, isConnected, onBookingUpdate } = useWebSocket();

  const fetchTripData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch current trip
      const currentTripResponse = await api.get("/trips/current");
      console.log("Current trip response:", currentTripResponse);
      setCurrentTrip(currentTripResponse.currentTrip);

      // Fetch available trips
      const availableTripsResponse = await api.get("/trips/available");
      console.log("Available trips response:", availableTripsResponse);
      setAvailableTrips(availableTripsResponse.availableTrips);

      // Fetch live bookings for current trip
      if (currentTripResponse.currentTrip) {
        try {
          const liveBookingsResponse = await api.get("/trips/current/bookings");
          console.log("Live bookings response:", liveBookingsResponse);
          setLiveBookings(liveBookingsResponse.bookings || []);
        } catch (error) {
          console.log("No live bookings endpoint available, using empty array");
          setLiveBookings([]);
        }
      }
    } catch (error) {
      console.error("Error fetching trip data:", error);
      setTimeout(() => {
        toast({
          title: "Error",
          description: "Failed to load trip data",
          variant: "destructive",
        });
      }, 100);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!onBookingUpdate) return;

    const cleanup = onBookingUpdate((updatedBooking) => {
      console.log("Booking update received via WebSocket:", updatedBooking);
      
      // Create a new booking notification
      const newBooking: LiveBooking = {
        id: updatedBooking.id,
        guest: updatedBooking.guest,
        numberOfPersons: updatedBooking.numberOfPersons,
        numberOfBags: updatedBooking.numberOfBags,
        preferredTime: updatedBooking.preferredTime,
        pickupLocation: updatedBooking.pickupLocation,
        dropoffLocation: updatedBooking.dropoffLocation,
        bookingType: updatedBooking.bookingType,
        assignedAt: new Date().toISOString(),
      };
      
      setLiveBookings((prev) => [...prev, newBooking]);
      setNewBookingNotification(newBooking);
      
      toast({
        title: "🚗 New Booking Assigned!",
        description: `${newBooking.guest.firstName} ${newBooking.guest.lastName} - ${newBooking.numberOfPersons} person(s)`,
      });
      
      // Refresh trip data
      fetchTripData();
    });

    return cleanup;
  }, [onBookingUpdate, toast, fetchTripData]);

  useEffect(() => {
    fetchTripData();
  }, [fetchTripData]);

  const handleStartTrip = useCallback(
    async (direction: "HOTEL_TO_AIRPORT" | "AIRPORT_TO_HOTEL") => {
      try {
        setStartingTrip(true);
        const response = await api.post("/trips/start", { direction });

        setTimeout(() => {
          toast({
            title: "✅ Trip Started!",
            description: response.message,
          });
        }, 100);

        await fetchTripData();
      } catch (error: any) {
        console.error("Error starting trip:", error);
        toast({
          title: "Error",
          description:
            error.response?.data?.message || "Failed to start trip",
          variant: "destructive",
        });
      } finally {
        setStartingTrip(false);
      }
    },
    [toast, fetchTripData]
  );

  const endTripConfirmed = useCallback(async () => {
    if (!currentTrip) return;

    try {
      setEndingTrip(true);
      const response = await api.post(`/trips/${currentTrip.id}/end`, {
        direction: currentTrip.direction,
      });

      setTimeout(() => {
        if (toast) {
          const summary = response.summary;
          if (summary && summary.cancelledBookings > 0) {
            toast({
              title: "✅ Trip Completed!",
              description: `${summary.completedBookings} passengers served, ${summary.cancelledBookings} bookings cancelled due to no-show.`,
              variant: "default",
            });
          } else {
            toast({
              title: "✅ Trip Completed!",
              description: response.message,
            });
          }
        }
      }, 100);

      await fetchTripData();
    } catch (error: any) {
      console.error("Error ending trip:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to end trip",
        variant: "destructive",
      });
    } finally {
      setEndingTrip(false);
      setShowEndTripDialog(false);
    }
  }, [currentTrip, toast, fetchTripData]);

  const handleEndTrip = useCallback(async () => {
    if (!currentTrip) return;

    const unverifiedBookingCount =
      currentTrip.totalBookings - currentTrip.checkedInBookings;

    if (unverifiedBookingCount > 0) {
      setShowEndTripDialog(true);
    } else {
      await endTripConfirmed();
    }
  }, [currentTrip, endTripConfirmed]);

  const handleTransitionPhase = useCallback(async (phase: "RETURN") => {
    if (!currentTrip) return;

    try {
      await api.post(`/trips/${currentTrip.id}/transition`, { phase });
      
      toast({
        title: "Trip Phase Updated",
        description: `Trip transitioned to ${phase.toLowerCase()} phase`,
      });
      
      fetchTripData();
    } catch (error: any) {
      console.error("Error transitioning trip phase:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to transition trip phase",
        variant: "destructive",
      });
    }
  }, [currentTrip, toast, fetchTripData]);

  const getDirectionLabel = (direction: string) => {
    return direction === "HOTEL_TO_AIRPORT"
      ? "Hotel → Airport"
      : "Airport → Hotel";
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "OUTBOUND":
        return "Outbound (Hotel → Airport)";
      case "RETURN":
        return "Return (Airport → Hotel)";
      case "COMPLETED":
        return "Completed";
      default:
        return phase;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "OUTBOUND":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "RETURN":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const dismissNewBookingNotification = () => {
    setNewBookingNotification(null);
  };

  const handleQRScanSuccess = (passengerData: any) => {
    toast({
      title: "✅ Passenger Checked In!",
      description: `${passengerData.name} has been successfully checked in.`,
    });
    
    // Refresh trip data to update passenger counts
    fetchTripData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading trips...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Trip Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your shuttle trips and passengers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Offline
            </Badge>
          )}
          <Button
            onClick={() => setShowQRScanner(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          <Button
            onClick={fetchTripData}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <div className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </div>
            Refresh
          </Button>
        </div>
      </div>

      {/* Timezone Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      {/* Location Tracker */}
      <LocationTracker 
        isActive={!!currentTrip} 
        onLocationUpdate={(location) => {
          console.log('Location updated:', location);
          // The location tracker will automatically send location to server
        }}
      />

      {/* New Booking Notification */}
      {newBookingNotification && (
        <Card className="border-green-200 bg-green-50 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">
                    New Booking Assigned!
                  </h3>
                  <p className="text-sm text-green-700">
                    {newBookingNotification.guest.firstName}{" "}
                    {newBookingNotification.guest.lastName} -{" "}
                    {newBookingNotification.numberOfPersons} person(s)
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissNewBookingNotification}
                className="text-green-600 hover:text-green-800"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Trip Status */}
      {currentTrip ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-green-600" />
              Active Round Trip
              <Badge variant="secondary" className="ml-auto">
                {getDirectionLabel(currentTrip.direction)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Trip Phase Display */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Trip Phase:</span>
                <Badge className={getPhaseColor(currentTrip.phase)}>
                  {getPhaseLabel(currentTrip.phase)}
                </Badge>
              </div>
              
              {/* Phase Progress */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-4 h-4 rounded-full ${currentTrip.phase === "OUTBOUND" || currentTrip.phase === "RETURN" || currentTrip.phase === "COMPLETED" ? "bg-blue-500" : "bg-gray-300"}`}></div>
                <span className="text-xs text-gray-600">Outbound</span>
                <div className="flex-1 h-1 bg-gray-200 rounded"></div>
                <div className={`w-4 h-4 rounded-full ${currentTrip.phase === "RETURN" || currentTrip.phase === "COMPLETED" ? "bg-orange-500" : "bg-gray-300"}`}></div>
                <span className="text-xs text-gray-600">Return</span>
                <div className="flex-1 h-1 bg-gray-200 rounded"></div>
                <div className={`w-4 h-4 rounded-full ${currentTrip.phase === "COMPLETED" ? "bg-green-500" : "bg-gray-300"}`}></div>
                <span className="text-xs text-gray-600">Complete</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {currentTrip.checkedInPeople} / {currentTrip.totalPeople}{" "}
                  Passengers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {currentTrip.checkedInBookings} / {currentTrip.totalBookings}{" "}
                  Bookings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {currentTrip.totalBags} Total Bags
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Started:{" "}
                  {new Date(currentTrip.startTime).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <Progress
              value={
                currentTrip.totalPeople > 0
                  ? (currentTrip.checkedInPeople / currentTrip.totalPeople) *
                    100
                  : 0
              }
              className="mb-4"
            />

            {/* Phase Transition Buttons */}
            <div className="flex gap-2 mb-4">
              {currentTrip.phase === "OUTBOUND" && (
                <Button
                  onClick={() => handleTransitionPhase("RETURN")}
                  variant="outline"
                  className="flex-1"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Start Return Journey
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleEndTrip}
                disabled={endingTrip}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                {endingTrip ? "Ending..." : "End Trip"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* General Map Overview */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                Service Area Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DriverRouteMap
                passengers={[]} // Empty passengers for overview
                currentTrip={null}
                height="400px"
              />
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                No Active Trip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Start a round trip to begin serving passengers
              </p>
              {availableTrips.length > 0 ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStartTrip("HOTEL_TO_AIRPORT")}
                    disabled={startingTrip}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {startingTrip ? "Starting..." : "Start Round Trip"}
                  </Button>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  No trips available to start
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Route Map */}
      {currentTrip && liveBookings.length > 0 && (
        <DriverRouteMap
          passengers={liveBookings.map((booking) => ({
            id: booking.id,
            name: `${booking.guest.firstName} ${booking.guest.lastName}`,
            pickup: booking.pickupLocation?.name || "Hotel Lobby",
            dropoff: booking.dropoffLocation?.name || "Airport",
            persons: booking.numberOfPersons,
            bags: booking.numberOfBags,
            isVerified: false, // This will be updated based on actual verification status
            pickupLocation: undefined, // Let the map component handle coordinate resolution
            dropoffLocation: undefined, // Let the map component handle coordinate resolution
          }))}
          currentTrip={currentTrip}
          height="500px"
        />
      )}

      {/* Live Bookings */}
      {currentTrip && liveBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Live Bookings ({liveBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-blue-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {booking.guest.firstName} {booking.guest.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {booking.numberOfPersons} person(s) •{" "}
                        {booking.numberOfBags} bag(s)
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.pickupLocation?.name || "Hotel Lobby"} →{" "}
                        {booking.dropoffLocation?.name || "Airport"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatTimeForDisplay(booking.preferredTime)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Assigned{" "}
                      {formatTimeForDisplay(booking.assignedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Trips */}
      {availableTrips.length > 0 && (
        <>
          {/* Preview Map for Available Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Route Preview
                <Badge variant="secondary" className="ml-2">
                  {availableTrips[0]?.direction === 'HOTEL_TO_AIRPORT' ? 'Hotel → Airport' : 'Airport → Hotel'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DriverRouteMap
                passengers={[]} // Empty passengers for preview
                currentTrip={{
                  direction: availableTrips[0]?.direction || 'HOTEL_TO_AIRPORT',
                  phase: 'OUTBOUND'
                }}
                height="400px"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Available Round Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {availableTrips.map((trip, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        🏨↔️✈️
                      </div>
                      <div>
                        <h4 className="font-medium">
                          Round Trip (Hotel ↔ Airport)
                        </h4>
                        <p className="text-sm text-gray-600">
                          {trip.bookingCount} bookings • {trip.totalPersons}{" "}
                          passengers • {trip.totalBags} bags
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeForDisplay(trip.earliestTime)} -{" "}
                          {formatTimeForDisplay(trip.latestTime)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStartTrip(trip.direction)}
                      disabled={startingTrip}
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Round Trip
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* End Trip Confirmation Dialog */}
      <AlertDialog open={showEndTripDialog} onOpenChange={setShowEndTripDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              End Trip with Unverified Bookings?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have{" "}
              {currentTrip
                ? currentTrip.totalBookings - currentTrip.checkedInBookings
                : 0}{" "}
              unverified bookings. These bookings will be cancelled if you end
              the trip now. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={endTripConfirmed}>
              End Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={handleQRScanSuccess}
        passengerList={liveBookings}
      />
    </div>
  );
} 