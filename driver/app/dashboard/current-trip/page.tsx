"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Users, CreditCard, QrCode, ExternalLink, CheckCircle, Clock, Navigation, Car } from "lucide-react";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import LocationTracker from "@/components/location-tracker";
import DriverRouteMap from "@/components/driver-route-map";
import { useWebSocket } from "@/context/WebSocketContext";
import Link from "next/link";
import { getUserTimeZone } from "@/lib/utils";

export default function CurrentTripPage() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [passengerList, setPassengerList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();
  const { onBookingUpdate } = useWebSocket();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch current trip data
  const fetchCurrentTrip = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/trips/current');
      console.log('API Response:', response);
      console.log('Current Trip Data:', response.currentTrip);
      
      setCurrentTrip(response.currentTrip);
      if (response.currentTrip?.passengers) {
        console.log('Passengers found:', response.currentTrip.passengers);
        setPassengerList(response.currentTrip.passengers);
      } else {
        console.log('No passengers found in current trip');
        setPassengerList([]);
      }
    } catch (error) {
      console.error('Error fetching current trip:', error);
      // Only show toast if component is mounted and not during initial render
      if (mountedRef.current) {
        setTimeout(() => {
          if (mountedRef.current) {
            toast({
              title: "Error",
              description: "Failed to load current trip data",
              variant: "destructive",
            });
          }
        }, 100);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLastRefresh(new Date());
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchCurrentTrip();
    // Refresh data every 2 minutes instead of 30 seconds
    const interval = setInterval(fetchCurrentTrip, 120000);
    return () => clearInterval(interval);
  }, [fetchCurrentTrip]);

  // Listen for real-time booking updates
  useEffect(() => {
    if (!onBookingUpdate) return

    const cleanup = onBookingUpdate((updatedBooking) => {
      console.log("Booking update received via WebSocket:", updatedBooking);
      // Refresh trip data when a new booking is assigned
      fetchCurrentTrip();
    })

    return cleanup
  }, [onBookingUpdate, fetchCurrentTrip])

  const checkedInCount = passengerList.filter((p) => p.isVerified).length;
  const totalPassengers = passengerList.reduce((sum, p) => sum + p.persons, 0);
  const occupancyPercentage = passengerList.length > 0 ? (checkedInCount / passengerList.length) * 100 : 0;

  const nextPassenger = passengerList.find((p) => !p.isVerified);

  const handleQRScanSuccess = useCallback((passengerData: any) => {
    setPassengerList((prev) =>
      prev.map((p) =>
        p.id === passengerData.id ? { ...p, isVerified: true, seatNumber: passengerData.seatNumber } : p,
      ),
    );
    // Only show toast if component is mounted
    if (mountedRef.current) {
      setTimeout(() => {
        if (mountedRef.current) {
          toast({
            title: "✅ Check-in successful!",
            description: `${passengerData.name} checked in. Seat ${passengerData.seatNumber} assigned.`,
          });
        }
      }, 100);
    }
  }, [toast]);

  const getDirectionLabel = (direction: string) => {
    return direction === 'HOTEL_TO_AIRPORT' ? 'Hotel → Airport' : 'Airport → Hotel';
  };

  const handleDebugInfo = useCallback(async () => {
    try {
      const debugResponse = await api.get('/driver/debug');
      console.log('Debug Info:', debugResponse);
      if (mountedRef.current) {
        toast({
          title: "Debug Info",
          description: `Driver: ${debugResponse.driver?.name}, Schedules: ${debugResponse.schedules?.length}, Bookings: ${debugResponse.activeBookings?.length}`,
        });
      }
    } catch (error) {
      console.error('Debug error:', error);
      if (mountedRef.current) {
        toast({
          title: "Debug Error",
          description: "Failed to get debug info",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleOpenQRScanner = useCallback(() => {
    setShowQRScanner(true);
    if (mountedRef.current) {
      toast({
        title: "📱 QR Scanner",
        description: "Opening camera scanner...",
      });
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading current trip...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Navigation className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Trip</h2>
            <p className="text-gray-600 mb-4">You don't have any active trips at the moment.</p>
            <div className="flex gap-2 justify-center">
              <Link href="/dashboard/trips">
                <Button variant="default">
                  <Car className="h-4 w-4 mr-2" />
                  Manage Trips
                </Button>
              </Link>
              <Button 
                onClick={handleDebugInfo}
                variant="outline"
              >
                Debug Info
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timezone Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
        All times shown in your local timezone: <b>{getUserTimeZone()}</b>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Current Trip</h1>
          {currentTrip.shuttle && (
            <p className="text-gray-600 dark:text-gray-400">
              Shuttle: {currentTrip.shuttle.vehicleNumber}
            </p>
          )}
          {currentTrip.direction && (
            <Badge variant="secondary" className="mt-1">
              {getDirectionLabel(currentTrip.direction)}
            </Badge>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()} | Auto-refresh: 2 min
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/trips">
            <Button variant="outline" size="sm">
              <Car className="h-4 w-4 mr-2" />
              Trip Dashboard
            </Button>
          </Link>
          <Button
            onClick={fetchCurrentTrip}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <div className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </div>
            Refresh
          </Button>
          <Button
            onClick={handleOpenQRScanner}
            className="h-11 shadow-lg"
          >
            <QrCode className="h-5 w-5 mr-2" />
            Scan QR
          </Button>
        </div>
      </div>

      {/* Location Tracking */}
      <LocationTracker 
        isActive={!!currentTrip} 
        onLocationUpdate={(location) => {
          console.log('Location updated:', location);
        }}
      />

      {/* Trip Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Progress className="h-2 flex-1" value={occupancyPercentage} />
            <span className="text-sm text-gray-600">
              {checkedInCount}/{passengerList.length} Checked In
            </span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Passenger List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Passengers ({passengerList.length})
            </span>
            <Badge variant="outline">
              {totalPassengers} Total Persons
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passengerList.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No passengers assigned to this trip</p>
            </div>
          ) : (
            <div className="space-y-4">
              {passengerList.map((passenger, index) => (
                <div
                  key={passenger.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    passenger.isVerified
                      ? "bg-green-50 border-green-200"
                      : passenger.status === "next"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">{passenger.name}</span>
                      <span className="text-sm text-gray-600">
                        {passenger.persons} person(s) • {passenger.bags} bag(s)
                      </span>
                      <span className="text-sm text-gray-500">
                        {passenger.pickup} → {passenger.dropoff}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {passenger.isVerified ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Checked In
                      </Badge>
                    ) : passenger.status === "next" ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Next
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    {passenger.seatNumber && (
                      <Badge variant="outline">Seat {passenger.seatNumber}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Map */}
      {currentTrip && passengerList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DriverRouteMap
              passengers={passengerList}
              currentTrip={currentTrip}
            />
          </CardContent>
        </Card>
      )}

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onSuccess={handleQRScanSuccess}
        passengerList={passengerList.filter((p) => !p.isVerified)}
      />
    </div>
  );
}
