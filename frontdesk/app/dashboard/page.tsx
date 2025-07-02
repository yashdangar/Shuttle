"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, MapPin, Bell, RefreshCw, AlertCircle } from "lucide-react";
import { useWebSocket } from "@/context/WebSocketContext";
import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import LiveShuttleCard from "@/components/live-shuttle-card";
import PendingBookingsCard from "@/components/pending-bookings-card";

interface LiveShuttle {
  tripId: string;
  shuttle: {
    id: number;
    vehicleNumber: string;
    totalSeats: number;
    availableSeats: number;
    utilization: number;
  };
  driver: {
    id: number;
    name: string;
    phoneNumber: string;
    email: string;
  };
  direction: string;
  phase: string;
  startTime: string;
  outboundEndTime: string;
  returnStartTime: string;
  endTime: string;
  bookings: any[];
  totalBookings: number;
}

interface PendingBooking {
  id: string;
  guest: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    isNonResident: boolean;
  };
  numberOfPersons: number;
  numberOfBags: number;
  pickupLocation: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  };
  dropoffLocation: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  };
  preferredTime: string;
  paymentMethod: string;
  bookingType: string;
  isPaid: boolean;
  isVerified: boolean;
  needsFrontdeskVerification: boolean;
  eta: string;
  notes: string;
  createdAt: string;
  timeSinceCreated: number;
}

export default function DashboardPage() {
  const { isConnected, socket, markUserInteraction } = useWebSocket();
  const [liveShuttles, setLiveShuttles] = useState<LiveShuttle[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalLiveShuttles: 0,
    totalActiveBookings: 0,
    totalPendingBookings: 0,
  });

  // Track user interaction to enable audio playback
  useEffect(() => {
    const handleUserInteraction = () => {
      markUserInteraction();
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [markUserInteraction]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const [liveShuttleData, pendingBookingsData] = await Promise.all([
        api.getLiveShuttleData(),
        api.getPendingBookingsLastHour(),
      ]);

      setLiveShuttles(liveShuttleData.liveShuttles || []);
      setPendingBookings(pendingBookingsData.pendingBookings || []);
      setStats({
        totalLiveShuttles: liveShuttleData.totalLiveShuttles || 0,
        totalActiveBookings: liveShuttleData.totalActiveBookings || 0,
        totalPendingBookings: pendingBookingsData.totalPendingBookings || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new bookings from guests
    const handleNewBooking = (data: any) => {
      console.log("New booking received:", data);
      // Refresh dashboard data when a new booking is created
      fetchDashboardData();
    };

    // Listen for trip status changes
    const handleTripStarted = (data: any) => {
      console.log("Trip started:", data);
      // Refresh dashboard data when a trip starts
      fetchDashboardData();
    };

    const handleTripUpdated = (data: any) => {
      console.log("Trip updated:", data);
      // Refresh dashboard data when a trip is updated
      fetchDashboardData();
    };

    const handleBookingAssigned = (data: any) => {
      console.log("Booking assigned:", data);
      // Refresh dashboard data when a booking is assigned to a trip
      fetchDashboardData();
    };

    const handleBookingUpdated = (data: any) => {
      console.log("Booking updated:", data);
      // Refresh dashboard data when a booking is updated
      fetchDashboardData();
    };

    const handleBookingCancelled = (data: any) => {
      console.log("Booking cancelled:", data);
      // Refresh dashboard data when a booking is cancelled
      fetchDashboardData();
    };

    // Subscribe to WebSocket events
    socket.on("new_booking", handleNewBooking);
    socket.on("trip_started", handleTripStarted);
    socket.on("trip_updated", handleTripUpdated);
    socket.on("booking_assigned", handleBookingAssigned);
    socket.on("booking_updated", handleBookingUpdated);
    socket.on("booking_cancelled", handleBookingCancelled);

    // Cleanup event listeners
    return () => {
      socket.off("new_booking", handleNewBooking);
      socket.off("trip_started", handleTripStarted);
      socket.off("trip_updated", handleTripUpdated);
      socket.off("booking_assigned", handleBookingAssigned);
      socket.off("booking_updated", handleBookingUpdated);
      socket.off("booking_cancelled", handleBookingCancelled);
    };
  }, [socket, fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    fetchDashboardData();
  };

  const dashboardStats = [
    { 
      name: "Live Shuttles", 
      value: stats.totalLiveShuttles.toString(), 
      icon: Car, 
      color: "text-blue-600" 
    },
    { 
      name: "Active Bookings", 
      value: stats.totalActiveBookings.toString(), 
      icon: Users, 
      color: "text-green-600" 
    },
    { 
      name: "Pending Bookings", 
      value: stats.totalPendingBookings.toString(), 
      icon: MapPin, 
      color: "text-orange-600" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening today.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {isConnected && (
              <span className="text-sm text-blue-600">
                Real-time updates enabled
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardStats.map((stat) => (
          <Card key={stat.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Shuttles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Live Shuttles</h2>
          <Badge className="bg-blue-100 text-blue-800">
            {stats.totalLiveShuttles} Active
          </Badge>
        </div>
        
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading live shuttle data...</span>
              </div>
            </CardContent>
          </Card>
        ) : liveShuttles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liveShuttles.map((shuttle) => (
              <LiveShuttleCard key={shuttle.tripId} shuttle={shuttle} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                <Car className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Live Shuttles</h3>
                <p className="text-sm">
                  No shuttles are currently active. Check back later for updates.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Bookings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Pending Bookings (Last Hour)</h2>
          <Badge className="bg-orange-100 text-orange-800">
            {stats.totalPendingBookings} Pending
          </Badge>
        </div>
        
        <PendingBookingsCard 
          bookings={pendingBookings}
          totalPendingBookings={stats.totalPendingBookings}
          timeRange={{
            from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          }}
        />
      </div>
    </div>
  );
}
