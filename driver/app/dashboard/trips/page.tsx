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
import { useIsMobile } from "@/hooks/use-mobile";
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
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const { toast } = useToast();
  const { socket, isConnected, onBookingUpdate, connectWebSocket } =
    useWebSocket();
  const isMobile = useIsMobile();

  const fetchTripData = useCallback(async (options?: { silent?: boolean }) => {
    try {
      const silent = options?.silent === true;
      if (!silent) setLoading(true);

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
      // Avoid forcing a full page skeleton when doing silent refreshes
      if (!(options?.silent === true)) setLoading(false);
    }
  }, [toast]);

  // Handle WebSocket connection retry
  useEffect(() => {
    if (!isConnected && connectionRetryCount < 3) {
      const timer = setTimeout(() => {
        console.log(
          `Retrying WebSocket connection... Attempt ${connectionRetryCount + 1}`
        );
        setConnectionRetryCount((prev) => prev + 1);
        // Try to connect manually
        connectWebSocket();
      }, 2000 * (connectionRetryCount + 1)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [isConnected, connectionRetryCount, connectWebSocket]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!onBookingUpdate) return;

    const cleanup = onBookingUpdate((updatedBooking) => {
      console.log("Booking update received via WebSocket:", updatedBooking);

      // Create a new booking notification
      const safeGuest = updatedBooking.guest || {
        firstName: "Guest",
        lastName: "",
        email: "",
        phoneNumber: "",
      };
      const newBooking: LiveBooking = {
        id: updatedBooking.id,
        guest: safeGuest,
        numberOfPersons: updatedBooking.numberOfPersons || 0,
        numberOfBags: updatedBooking.numberOfBags || 0,
        preferredTime: updatedBooking.preferredTime,
        pickupLocation: updatedBooking.pickupLocation || null,
        dropoffLocation: updatedBooking.dropoffLocation || null,
        bookingType: updatedBooking.bookingType,
        assignedAt: new Date().toISOString(),
      };

      const isForCurrentTrip = Boolean(
        currentTrip && updatedBooking.tripId && updatedBooking.tripId === currentTrip.id
      );

      const guestName = `${newBooking.guest.firstName || "Guest"} ${newBooking.guest.lastName || ""}`.trim();
      toast({
        title: isForCurrentTrip ? "🚗 New Booking Assigned!" : "🕒 Booking Added To Next Trip",
        description: `${guestName} - ${newBooking.numberOfPersons} person(s)`,
      });

      if (isForCurrentTrip) {
        setLiveBookings((prev) => {
          const exists = prev.some((b) => b.id === newBooking.id);
          const next = exists ? prev : [...prev, newBooking];
          // Recalculate current trip aggregates from next live bookings
          setCurrentTrip((prevTrip) => {
            if (!prevTrip) return prevTrip;
            const totals = next.reduce(
              (acc, b) => {
                acc.people += b.numberOfPersons || 0;
                acc.bookings += 1;
                acc.bags += b.numberOfBags || 0;
                return acc;
              },
              { people: 0, bookings: 0, bags: 0 }
            );
            return {
              ...prevTrip,
              totalPeople: totals.people,
              totalBookings: totals.bookings,
              totalBags: totals.bags,
            } as any;
          });
          return next;
        });
        setNewBookingNotification(newBooking);
      } else {
        // If the booking was previously in the live list (e.g., moved to next trip), remove and recalc counters
        setLiveBookings((prev) => {
          const exists = prev.find((b) => b.id === newBooking.id);
          if (!exists) return prev;
          const next = prev.filter((b) => b.id !== newBooking.id);
          setCurrentTrip((prevTrip) => {
            if (!prevTrip) return prevTrip;
            const totals = next.reduce(
              (acc, b) => {
                acc.people += b.numberOfPersons || 0;
                acc.bookings += 1;
                acc.bags += b.numberOfBags || 0;
                return acc;
              },
              { people: 0, bookings: 0, bags: 0 }
            );
            return {
              ...prevTrip,
              totalPeople: totals.people,
              totalBookings: totals.bookings,
              totalBags: totals.bags,
            } as any;
          });
          return next;
        });
      }

      // Keep Available Trips aggregate in sync for drivers not yet in an active trip
      setAvailableTrips((prev) => {
        const direction = (updatedBooking.bookingType === "HOTEL_TO_AIRPORT" || updatedBooking.bookingType === "AIRPORT_TO_HOTEL")
          ? updatedBooking.bookingType
          : (updatedBooking.direction || "HOTEL_TO_AIRPORT");

        const preferredTime = updatedBooking.preferredTime || new Date().toISOString();

        let found = false;
        const updatedList = prev.map((trip) => {
          if (trip.direction === direction) {
            found = true;
            const earliest = new Date(trip.earliestTime) < new Date(preferredTime) ? trip.earliestTime : preferredTime;
            const latest = new Date(trip.latestTime) > new Date(preferredTime) ? trip.latestTime : preferredTime;
            return {
              ...trip,
              bookingCount: (trip.bookingCount || 0) + 1,
              totalPersons: (trip.totalPersons || 0) + (updatedBooking.numberOfPersons || 0),
              totalBags: (trip.totalBags || 0) + (updatedBooking.numberOfBags || 0),
              earliestTime: earliest,
              latestTime: latest,
            };
          }
          return trip;
        });

        if (!found) {
          return [
            ...prev,
            {
              direction,
              bookingCount: 1,
              totalPersons: updatedBooking.numberOfPersons || 0,
              totalBags: updatedBooking.numberOfBags || 0,
              earliestTime: preferredTime,
              latestTime: preferredTime,
            },
          ];
        }

        return updatedList;
      });
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
          description: error.response?.data?.message || "Failed to start trip",
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

  const handleTransitionPhase = useCallback(
    async (phase: "RETURN") => {
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
          description:
            error.response?.data?.message || "Failed to transition trip phase",
          variant: "destructive",
        });
      }
    },
    [currentTrip, toast, fetchTripData]
  );

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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-center h-48 sm:h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm sm:text-base">
              Loading trips...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Trip Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage your shuttle trips and passengers
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isConnected && (
            <Badge
              variant="destructive"
              className="flex items-center gap-1 text-xs"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Offline
            </Badge>
          )}
          {!isConnected && connectionRetryCount < 3 && (
            <Button
              onClick={connectWebSocket}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Retry Connection
            </Button>
          )}
          {!isConnected && connectionRetryCount >= 3 && (
            <span className="text-xs text-red-600">
              Connection failed. Please refresh the page.
            </span>
          )}
          {/* QR Scanner Button - Only show when trip is active */}
          {currentTrip && currentTrip.status === "ACTIVE" && (
            <Button
              onClick={() => setShowQRScanner(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
              size={isMobile ? "sm" : "default"}
            >
              <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {isMobile ? "Scan" : "Scan QR"}
            </Button>
          )}
          <Button
            onClick={fetchTripData}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            disabled={loading}
            className="text-xs sm:text-sm"
          >
            <div
              className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${
                loading ? "animate-spin" : ""
              }`}
            >
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
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-xs sm:text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      {/* Location Tracker - Only active when trip is active */}
      {currentTrip && currentTrip.status === "ACTIVE" && (
        <LocationTracker
          isActive={true}
          onLocationUpdate={(location) => {
            console.log("Location updated:", location);
            // The location tracker will automatically send location to server
          }}
        />
      )}

      {/* New Booking Notification */}
      {newBookingNotification && (
        <Card className="border-green-200 bg-green-50 animate-pulse">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800 text-sm sm:text-base">
                    New Booking Assigned!
                  </h3>
                  <p className="text-xs sm:text-sm text-green-700">
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
                className="text-green-600 hover:text-green-800 text-xs"
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
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                Active Round Trip
              </div>
              <Badge
                variant="secondary"
                className="self-start sm:ml-auto text-xs"
              >
                {getDirectionLabel(currentTrip.direction)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trip Phase Display */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Trip Phase:
                </span>
                <Badge
                  className={`${getPhaseColor(currentTrip.phase)} text-xs`}
                >
                  {getPhaseLabel(currentTrip.phase)}
                </Badge>
              </div>

              {/* Phase Progress - Simplified for mobile */}
              {isMobile ? (
                <div className="flex items-center justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        currentTrip.phase === "OUTBOUND" ||
                        currentTrip.phase === "RETURN" ||
                        currentTrip.phase === "COMPLETED"
                          ? "bg-blue-500"
                          : "bg-gray-300"
                      }`}
                    ></div>
                    <span>Outbound</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        currentTrip.phase === "RETURN" ||
                        currentTrip.phase === "COMPLETED"
                          ? "bg-orange-500"
                          : "bg-gray-300"
                      }`}
                    ></div>
                    <span>Return</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        currentTrip.phase === "COMPLETED"
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    ></div>
                    <span>Complete</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      currentTrip.phase === "OUTBOUND" ||
                      currentTrip.phase === "RETURN" ||
                      currentTrip.phase === "COMPLETED"
                        ? "bg-blue-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-xs text-gray-600">Outbound</span>
                  <div className="flex-1 h-1 bg-gray-200 rounded"></div>
                  <div
                    className={`w-4 h-4 rounded-full ${
                      currentTrip.phase === "RETURN" ||
                      currentTrip.phase === "COMPLETED"
                        ? "bg-orange-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-xs text-gray-600">Return</span>
                  <div className="flex-1 h-1 bg-gray-200 rounded"></div>
                  <div
                    className={`w-4 h-4 rounded-full ${
                      currentTrip.phase === "COMPLETED"
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-xs text-gray-600">Complete</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-xs sm:text-sm text-gray-600">
                  {currentTrip.checkedInPeople} / {currentTrip.totalPeople}{" "}
                  Passengers
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                <span className="text-xs sm:text-sm text-gray-600">
                  {currentTrip.checkedInBookings} / {currentTrip.totalBookings}{" "}
                  Bookings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-xs sm:text-sm text-gray-600">
                  {currentTrip.totalBags} Total Bags
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-xs sm:text-sm text-gray-600">
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

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Phase Transition Button */}
              {currentTrip.phase === "OUTBOUND" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => handleTransitionPhase("RETURN")}
                    variant="outline"
                    className="flex-1 h-12 sm:h-11 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200"
                    size="default"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Navigation className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">
                        {isMobile ? "Start Return" : "Start Return Journey"}
                      </span>
                    </div>
                  </Button>
                </div>
              )}

              {/* End Trip Button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleEndTrip}
                  disabled={endingTrip}
                  variant="destructive"
                  className="flex-1 h-12 sm:h-11 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  size="default"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Square className="h-4 w-4" />
                    <span className="font-medium">
                      {endingTrip ? "Ending Trip..." : "End Trip"}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-gray-200">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                No Active Trip
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm sm:text-base text-gray-600">
                Start a round trip to begin serving passengers
              </p>
              {availableTrips.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {availableTrips.map((trip, index) => (
                    <Button
                      key={index}
                      onClick={() => handleStartTrip(trip.direction)}
                      disabled={startingTrip}
                      className="w-full h-12 sm:h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      size="default"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Play className="h-4 w-4" />
                        <span className="font-medium">
                          {startingTrip ? "Starting Trip..." : `Start ${getDirectionLabel(trip.direction)}`}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4 text-sm sm:text-base">
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
          height={isMobile ? "300px" : "500px"}
          onRefreshTripData={() => fetchTripData({ silent: true })}
        />
      )}

      {/* Live Bookings */}
      {currentTrip && liveBookings.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
              Live Bookings ({liveBookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-blue-50 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm sm:text-base truncate">
                        {booking.guest.firstName} {booking.guest.lastName}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {booking.numberOfPersons} person(s) •{" "}
                        {booking.numberOfBags} bag(s)
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {booking.pickupLocation?.name || "Hotel Lobby"} →{" "}
                        {booking.dropoffLocation?.name || "Airport"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right sm:text-left sm:ml-auto">
                    <p className="text-xs sm:text-sm font-medium">
                      {formatTimeForDisplay(booking.preferredTime)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Assigned {formatTimeForDisplay(booking.assignedAt)}
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
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Available Round Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {availableTrips.map((trip, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl sm:text-2xl">🏨↔️✈️</div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm sm:text-base">
                          {getDirectionLabel(trip.direction)}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600">
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
                      size="default"
                      className="h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 self-start sm:self-center"
                    >
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {startingTrip ? "Starting..." : "Start Trip"}
                        </span>
                      </div>
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
