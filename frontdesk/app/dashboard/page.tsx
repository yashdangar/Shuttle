"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Users,
  MapPin,
  Bell,
  RefreshCw,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { useWebSocket } from "@/context/WebSocketContext";
import { api } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import LiveShuttleCard from "@/components/live-shuttle-card";
import PendingBookingsCard from "@/components/pending-bookings-card";
import { Button } from "@/components/ui/button";

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
  isParkSleepFly: boolean;
}

interface Schedule {
  id: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  driver: {
    id: string;
    name: string;
    email: string;
  };
  shuttle: {
    id: string;
    vehicleNumber: string;
    seats: number;
  };
}

export default function DashboardPage() {
  const {
    isConnected,
    socket,
    markUserInteraction,
    connectWebSocket,
    stopNotificationSound,
  } = useWebSocket();
  const [liveShuttles, setLiveShuttles] = useState<LiveShuttle[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const [stats, setStats] = useState({
    totalLiveShuttles: 0,
    totalActiveBookings: 0,
    totalPendingBookings: 0,
  });

  // Mark user interaction on component mount to enable audio
  useEffect(() => {
    markUserInteraction();
  }, [markUserInteraction]);

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

  const fetchTodaySchedules = useCallback(async () => {
    try {
      setSchedulesLoading(true);

      // Get today's start and end
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get tomorrow's start to check for extended schedules
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const params = new URLSearchParams();
      params.append("start", today.toISOString());
      params.append("end", tomorrow.toISOString());

      const response = await api.get(
        `/frontdesk/schedule?${params.toString()}`
      );
      setTodaySchedules(response.schedules || []);
    } catch (error) {
      console.error("Error fetching today's schedules:", error);
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  // Timezone utility functions
  const getUserTimeZone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const getTimeZoneAbbr = (date: Date) => {
    return date
      .toLocaleTimeString([], { timeZoneName: "short" })
      .split(" ")
      .pop();
  };

  const formatTimeForDisplay = (isoString: string | null | undefined) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const abbr = getTimeZoneAbbr(date);
    return `${time} (${abbr})`;
  };

  // Generate colors for different shuttles
  const getShuttleColor = (shuttleId: string | number) => {
    const colors = [
      "bg-blue-100 border-blue-300 text-blue-800",
      "bg-green-100 border-green-300 text-green-800",
      "bg-purple-100 border-purple-300 text-purple-800",
      "bg-orange-100 border-orange-300 text-orange-800",
      "bg-pink-100 border-pink-300 text-pink-800",
      "bg-indigo-100 border-indigo-300 text-indigo-800",
      "bg-red-100 border-red-300 text-red-800",
      "bg-yellow-100 border-yellow-300 text-yellow-800",
    ];
    const hash = String(shuttleId)
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Get today's schedule blocks for timeline
  const getTodayScheduleBlocks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const blocks: any[] = [];

    todaySchedules.forEach((schedule) => {
      const scheduleStart = new Date(schedule.startTime);
      const scheduleEnd = new Date(schedule.endTime);

      // Today's portion
      if (scheduleStart <= todayEnd) {
        const blockStart = scheduleStart > today ? scheduleStart : today;
        const blockEnd = scheduleEnd < todayEnd ? scheduleEnd : todayEnd;

        if (blockStart < blockEnd) {
          blocks.push({
            ...schedule,
            displayStart: blockStart,
            displayEnd: blockEnd,
            isToday: true,
            dayLabel: "Today",
          });
        }
      }

      // Tomorrow's portion (only if schedule extends from today)
      if (scheduleEnd > todayEnd && scheduleStart <= todayEnd) {
        const blockStart = tomorrow;
        const blockEnd = scheduleEnd < tomorrowEnd ? scheduleEnd : tomorrowEnd;

        if (blockStart < blockEnd) {
          blocks.push({
            ...schedule,
            displayStart: blockStart,
            displayEnd: blockEnd,
            isToday: false,
            dayLabel: "Tomorrow",
          });
        }
      }
    });

    return blocks;
  };

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
    fetchTodaySchedules();
  }, [fetchDashboardData, fetchTodaySchedules]);

  const handleManualRefresh = () => {
    fetchDashboardData();
    fetchTodaySchedules();
  };



  const scheduleBlocks = getTodayScheduleBlocks();

  const dashboardStats = [
    {
      name: "Live Shuttles",
      value: stats.totalLiveShuttles.toString(),
      icon: Car,
      color: "text-blue-600",
    },
    {
      name: "Active Bookings",
      value: stats.totalActiveBookings.toString(),
      icon: Users,
      color: "text-green-600",
    },
    {
      name: "Pending Bookings",
      value: stats.totalPendingBookings.toString(),
      icon: MapPin,
      color: "text-orange-600",
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
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-gray-600">
              WebSocket: {isConnected ? "Connected" : "Disconnected"}
            </span>
            {isConnected && (
              <span className="text-sm text-blue-600">
                Real-time updates enabled
              </span>
            )}
            {!isConnected && connectionRetryCount < 3 && (
              <button
                onClick={connectWebSocket}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Retry Connection
              </button>
            )}
            {!isConnected && connectionRetryCount >= 3 && (
              <span className="text-sm text-red-600">
                Connection failed. Please refresh the page.
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

        </div>
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

      {/* Pending Bookings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Pending Bookings (Last Hour)
          </h2>
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

      {/* Today's Schedule Timeline */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Today's Schedule Overview
          </CardTitle>
          <div className="text-sm text-gray-600">
            All times shown in your local timezone: <b>{getUserTimeZone()}</b> (
            {getTimeZoneAbbr(new Date())})
          </div>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading schedules...</span>
            </div>
          ) : scheduleBlocks.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No schedules today
              </h3>
              <p className="text-gray-500">
                There are no scheduled shuttles for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group by day */}
              {["Today", "Tomorrow"].map((dayLabel) => {
                const dayBlocks = scheduleBlocks.filter(
                  (block) => block.dayLabel === dayLabel
                );
                if (dayBlocks.length === 0) return null;

                return (
                  <div key={dayLabel} className="space-y-2">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          dayLabel === "Today" ? "bg-blue-500" : "bg-orange-500"
                        }`}
                      ></span>
                      {dayLabel}
                    </h4>

                    {/* Timeline for this day */}
                    <div className="relative">
                      {/* Scroll indicator for mobile */}
                      <div className="block sm:hidden text-xs text-gray-500 text-center mb-2 bg-blue-50 rounded border border-blue-200 py-1">
                        👈 Scroll horizontally to view full timeline
                      </div>

                      {/* Scrollable timeline container */}
                      <div className="overflow-x-auto scrollbar-thin">
                        <div className="w-[1200px]">
                          {/* Hour markers */}
                          <div className="flex text-xs text-gray-400 mb-2">
                            {[...Array(24)].map((_, hour) => (
                              <div
                                key={hour}
                                className="text-center border-l border-gray-200 first:border-l-0"
                                style={{ width: "50px" }}
                              >
                                {hour === 0
                                  ? "12 AM"
                                  : hour < 12
                                  ? `${hour} AM`
                                  : hour === 12
                                  ? "12 PM"
                                  : `${hour - 12} PM`}
                              </div>
                            ))}
                          </div>

                          {/* Timeline background */}
                          <div className="relative h-20 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            {/* Hour grid lines */}
                            <div className="absolute inset-0 flex">
                              {[...Array(24)].map((_, hour) => (
                                <div
                                  key={hour}
                                  className="border-r border-gray-200 last:border-r-0"
                                  style={{ width: "50px" }}
                                ></div>
                              ))}
                            </div>

                            {/* Current time indicator */}
                            {dayLabel === "Today" &&
                              (() => {
                                const now = new Date();
                                const currentHour =
                                  now.getHours() + now.getMinutes() / 60;
                                const currentPosition = currentHour * 50; // 50px per hour

                                return (
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30"
                                    style={{ left: `${currentPosition}px` }}
                                  >
                                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                  </div>
                                );
                              })()}

                            {/* Schedule blocks */}
                            {dayBlocks.map((block, index) => {
                              const dayStart = new Date(block.displayStart);
                              dayStart.setHours(0, 0, 0, 0);
                              const dayEnd = new Date(dayStart);
                              dayEnd.setHours(23, 59, 59, 999);

                              const blockStart = block.displayStart;
                              const blockEnd = block.displayEnd;

                              // Calculate position and width in pixels (50px per hour)
                              const startHour =
                                (blockStart.getTime() - dayStart.getTime()) /
                                (1000 * 60 * 60);
                              const endHour =
                                (blockEnd.getTime() - dayStart.getTime()) /
                                (1000 * 60 * 60);

                              const left = startHour * 50; // 50px per hour
                              const width = (endHour - startHour) * 50; // 50px per hour

                              return (
                                <div
                                  key={`${block.id}-${index}`}
                                  className={`absolute rounded-md shadow-sm cursor-pointer transition-all hover:shadow-md ${getShuttleColor(
                                    block.shuttle.id
                                  )} flex flex-col justify-center items-center p-1 sm:p-2`}
                                  style={{
                                    left: `${left}px`,
                                    width: `${width}px`,
                                    top: "8px",
                                    height: "calc(100% - 16px)",
                                    minWidth: "80px",
                                    zIndex: 10 + index,
                                  }}
                                  title={`${block.driver.name} - ${block.shuttle.vehicleNumber}`}
                                >
                                  <div className="font-semibold text-[10px] sm:text-xs truncate w-full text-center">
                                    {block.driver.name}
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-gray-700 truncate w-full text-center">
                                    {block.shuttle.vehicleNumber}
                                  </div>
                                  <div className="text-[8px] sm:text-[10px] text-gray-500 text-center leading-tight">
                                    {
                                      formatTimeForDisplay(
                                        block.displayStart.toISOString()
                                      ).split(" ")[0]
                                    }{" "}
                                    -{" "}
                                    {
                                      formatTimeForDisplay(
                                        block.displayEnd.toISOString()
                                      ).split(" ")[0]
                                    }
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Shuttles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Live Shuttles</h2>
          {/* <Badge className="bg-blue-100 text-blue-800">
            {stats.totalLiveShuttles} Active
          </Badge> */}
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">
                  Loading live shuttle data...
                </span>
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
                  No shuttles are currently active. Check back later for
                  updates.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
