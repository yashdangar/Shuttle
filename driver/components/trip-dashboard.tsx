"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  History,
  Calendar,
  Package,
  AlertTriangle,
  ClipboardList,
  Bell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useWebSocket } from "@/context/WebSocketContext";
import { WsEvents } from "@/context/WebSocketContext";
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

interface TripHistory {
  id: string;
  direction: "HOTEL_TO_AIRPORT" | "AIRPORT_TO_HOTEL";
  status: "COMPLETED";
  phase: "COMPLETED";
  startTime: string;
  outboundEndTime?: string;
  returnStartTime?: string;
  endTime: string;
  passengerCount: number;
  totalPersons: number;
  totalBags: number;
  duration: number;
  shuttle: {
    vehicleNumber: string;
  };
  bookings: any[];
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

export default function TripDashboard() {
  const [availableTrips, setAvailableTrips] = useState<AvailableTrip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<CurrentTrip | null>(null);
  const [tripHistory, setTripHistory] = useState<TripHistory[]>([]);
  const [liveBookings, setLiveBookings] = useState<LiveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTrip, setStartingTrip] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [showEndTripDialog, setShowEndTripDialog] = useState(false);
  const [newBookingNotification, setNewBookingNotification] =
    useState<LiveBooking | null>(null);
  const { toast } = useToast();
  const { socket, isConnected, onBookingUpdate } = useWebSocket();

  const fetchTripHistory = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setHistoryLoading(true);
        const historyResponse = await api.get(
          `/trips/history?page=${page}&limit=5`
        );
        console.log("Trip history response:", historyResponse);

        const newTrips = historyResponse.trips || [];
        const pagination = historyResponse.pagination;

        if (append) {
          setTripHistory((prev) => [...prev, ...newTrips]);
        } else {
          setTripHistory(newTrips);
        }

        setHistoryPage(page);
        setHasMoreHistory(pagination && page < pagination.pages);
      } catch (error) {
        console.error("Error fetching trip history:", error);
        toast({
          title: "Error",
          description: "Failed to load trip history",
          variant: "destructive",
        });
      } finally {
        setHistoryLoading(false);
      }
    },
    [toast]
  );

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

      // Log schedule information for debugging
      console.log("=== SCHEDULE DEBUG INFO ===");
      console.log("Current schedule:", availableTripsResponse.currentSchedule);
      if (availableTripsResponse.currentSchedule) {
        console.log("Schedule ID:", availableTripsResponse.currentSchedule.id);
        console.log("Shuttle:", availableTripsResponse.currentSchedule.shuttle);
        console.log("Start Time:", availableTripsResponse.currentSchedule.startTime);
        console.log("End Time:", availableTripsResponse.currentSchedule.endTime);
        console.log("Current time:", new Date().toISOString());
      } else {
        console.log("❌ No current schedule found");
      }
      console.log("Available trips count:", availableTripsResponse.availableTrips?.length || 0);
      console.log("=== END SCHEDULE DEBUG ===");

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

      // Fetch initial trip history
      await fetchTripHistory(1);
    } catch (error) {
      console.error("Error fetching trip data:", error);
      // Only show toast if component is mounted and not during initial render
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
  }, [toast, fetchTripHistory]);

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

        // Only show toast if component is mounted
        setTimeout(() => {
          toast({
            title: "✅ Trip Started!",
            description: response.message,
          });
        }, 100);

        // Refresh trip data
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

  const getDirectionIcon = (direction: string) => {
    return direction === "HOTEL_TO_AIRPORT" ? "🏨→✈️" : "✈️→🏨";
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading trip dashboard...</p>
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
            Trip Dashboard
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
          <Button
            onClick={async () => {
              try {
                // Get booking debug info
                const bookingResponse = await api.get("/trips/debug/bookings");
                console.log("=== DEBUG DRIVER BOOKINGS ===");
                console.log("Response:", bookingResponse);
                
                // Get schedule debug info
                const scheduleResponse = await api.get("/trips/debug/schedule");
                console.log("=== DEBUG DRIVER SCHEDULE ===");
                console.log("Schedule Response:", scheduleResponse);
                
                // Get detailed schedule info
                console.log("=== SCHEDULE DETAILED DEBUG ===");
                const today = new Date();
                const startOfDay = new Date(today);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);
                
                console.log("Today's date range:", {
                  startOfDay: startOfDay.toISOString(),
                  endOfDay: endOfDay.toISOString(),
                  currentTime: today.toISOString()
                });
                
                if (bookingResponse.currentSchedule) {
                  console.log("Current Schedule Details:", {
                    id: bookingResponse.currentSchedule.id,
                    shuttleId: bookingResponse.currentSchedule.shuttleId,
                    shuttle: bookingResponse.currentSchedule.shuttle,
                    startTime: bookingResponse.currentSchedule.startTime,
                    endTime: bookingResponse.currentSchedule.endTime,
                    isActive: new Date(bookingResponse.currentSchedule.startTime) <= today && 
                              new Date(bookingResponse.currentSchedule.endTime) >= today
                  });
                }
                
                console.log("=== END SCHEDULE DEBUG ===");
                
                toast({
                  title: "Debug Info",
                  description: `Found ${bookingResponse.availableBookings?.length || 0} available bookings. Check console for details.`,
                });
              } catch (error) {
                console.error("Debug error:", error);
                toast({
                  title: "Debug Error",
                  description: "Failed to get debug info",
                  variant: "destructive",
                });
              }
            }}
            variant="outline"
            size="sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Debug
          </Button>
        </div>
      </div>

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
                      {new Date(booking.preferredTime).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Assigned{" "}
                      {new Date(booking.assignedAt).toLocaleTimeString()}
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
                        {new Date(trip.earliestTime).toLocaleTimeString()} -{" "}
                        {new Date(trip.latestTime).toLocaleTimeString()}
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
      )}

      {/* Trip History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Round Trips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tripHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No recent trips found
            </p>
          ) : (
            <div className="space-y-4">
              {tripHistory.map((trip) => (
                <div
                  key={trip.id}
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
                        {trip.totalPersons} passengers • {trip.totalBags} bags •{" "}
                        {trip.duration} min
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(trip.startTime).toLocaleDateString()}{" "}
                        {new Date(trip.startTime).toLocaleTimeString()} -{" "}
                        {new Date(trip.endTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Completed</Badge>
                </div>
              ))}
              {hasMoreHistory && (
                <Button
                  onClick={() => fetchTripHistory(historyPage + 1, true)}
                  disabled={historyLoading}
                  variant="outline"
                  className="w-full"
                >
                  {historyLoading ? "Loading..." : "Load More"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
