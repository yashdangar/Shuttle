"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Users, CreditCard, QrCode, ExternalLink, CheckCircle, Clock, Navigation } from "lucide-react";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import LocationTracker from "@/components/location-tracker";
import DriverRouteMap from "@/components/driver-route-map";

export default function CurrentTripPage() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [passengerList, setPassengerList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();

  // Fetch current trip data
  const fetchCurrentTrip = async () => {
    try {
      setLoading(true);
      const response = await api.get('/driver/current-trip');
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
      toast({
        title: "Error",
        description: "Failed to load current trip data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchCurrentTrip();
    // Refresh data every 2 minutes instead of 30 seconds
    const interval = setInterval(fetchCurrentTrip, 120000);
    return () => clearInterval(interval);
  }, []);

  const checkedInCount = passengerList.filter((p) => p.isVerified).length;
  const totalPassengers = passengerList.reduce((sum, p) => sum + p.persons, 0);
  const occupancyPercentage = passengerList.length > 0 ? (checkedInCount / passengerList.length) * 100 : 0;

  const nextPassenger = passengerList.find((p) => !p.isVerified);

  const handleQRScanSuccess = (passengerData: any) => {
    setPassengerList((prev) =>
      prev.map((p) =>
        p.id === passengerData.id ? { ...p, isVerified: true, seatNumber: passengerData.seatNumber } : p,
      ),
    );
    toast({
      title: "✅ Check-in successful!",
      description: `${passengerData.name} checked in. Seat ${passengerData.seatNumber} assigned.`,
    });
  };

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
            <Button 
              onClick={async () => {
                try {
                  const debugResponse = await api.get('/driver/debug');
                  console.log('Debug Info:', debugResponse);
                  toast({
                    title: "Debug Info",
                    description: `Driver: ${debugResponse.driver?.name}, Schedules: ${debugResponse.schedules?.length}, Bookings: ${debugResponse.activeBookings?.length}`,
                  });
                } catch (error) {
                  console.error('Debug error:', error);
                  toast({
                    title: "Debug Error",
                    description: "Failed to get debug info",
                    variant: "destructive",
                  });
                }
              }}
              variant="outline"
            >
              Debug Info
            </Button>
            <Button 
              onClick={async () => {
                try {
                  const response = await api.post('/driver/assign-bookings', {});
                  console.log('Assignment Response:', response);
                  toast({
                    title: "Bookings Assigned",
                    description: response.message,
                  });
                  // Refresh the current trip data
                  fetchCurrentTrip();
                } catch (error) {
                  console.error('Assignment error:', error);
                  toast({
                    title: "Assignment Error",
                    description: "Failed to assign bookings",
                    variant: "destructive",
                  });
                }
              }}
              variant="outline"
              className="ml-2"
            >
              Assign Bookings
            </Button>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Current Trip</h1>
          {currentTrip.shuttle && (
            <p className="text-gray-600 dark:text-gray-400">
              Shuttle: {currentTrip.shuttle.vehicleNumber}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()} | Auto-refresh: 2 min
          </p>
        </div>
        <div className="flex gap-2">
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
            onClick={() => {
              setShowQRScanner(true);
              toast({
                title: "📱 QR Scanner",
                description: "Opening camera scanner...",
              });
            }}
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

      {/* Trip Overview */}
      <Card className="shadow-lg border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            Trip Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Shuttle Occupancy</span>
            <span className="font-bold text-lg">
              {checkedInCount} / {passengerList.length} passengers
            </span>
          </div>
          <Progress value={occupancyPercentage} className="h-3" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total persons: {totalPassengers} | Checked in: {checkedInCount}
          </div>
        </CardContent>
      </Card>

      {/* Next Passenger Highlight */}
      {nextPassenger && (
        <Card className="border-2 border-blue-500 shadow-xl bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <div className="p-2 bg-blue-500 rounded-lg animate-pulse">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              Next Pickup - Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-bold text-xl text-blue-800 dark:text-blue-200">{nextPassenger.name}</p>
              <p className="text-blue-600 dark:text-blue-400 font-medium">{nextPassenger.pickup}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {nextPassenger.persons} passengers • {nextPassenger.bags} bags
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() =>
                  toast({
                    title: "🗺️ Opening map",
                    description: "Loading pickup location...",
                  })
                }
              >
                <MapPin className="h-4 w-4 mr-2" />
                View Map
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "🚗 Opening navigation",
                    description: "Launching Google Maps...",
                  })
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Navigate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Maps Embed */}
      <DriverRouteMap 
        passengers={passengerList}
        currentTrip={currentTrip}
        height="400px"
      />

      {/* Passenger List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Passengers ({passengerList.length})</h2>
        <div className="grid gap-3">
          {passengerList.map((passenger) => (
            <Card
              key={passenger.id}
              className={`shadow-md hover:shadow-lg transition-all ${
                !passenger.isVerified && passengerList.indexOf(passenger) === 0 ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-lg">{passenger.name}</h3>
                      <Badge
                        variant={
                          passenger.isVerified
                            ? "default"
                            : passengerList.indexOf(passenger) === 0
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          passenger.isVerified
                            ? "bg-green-500 hover:bg-green-600"
                            : passengerList.indexOf(passenger) === 0
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : ""
                        }
                      >
                        {passenger.isVerified
                          ? "✓ Checked In"
                          : passengerList.indexOf(passenger) === 0
                            ? "→ Next Pickup"
                            : "⏳ Pending"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">{passenger.pickup}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Users className="h-4 w-4" />
                        <span>
                          {passenger.persons} passengers • {passenger.bags} bags
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <CreditCard className="h-4 w-4" />
                        <span>{passenger.paymentMethod}</span>
                      </div>
                      {passenger.seatNumber && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Seat: {passenger.seatNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {passenger.isVerified && <CheckCircle className="h-8 w-8 text-green-500" />}
                    {!passenger.isVerified && passengerList.indexOf(passenger) === 0 && (
                      <Clock className="h-8 w-8 text-blue-500 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop-off:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{passenger.dropoff}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {showQRScanner && (
        <QRScannerModal
          onClose={() => setShowQRScanner(false)}
          onSuccess={handleQRScanSuccess}
          passengerList={passengerList}
        />
      )}
    </div>
  );
}
