"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { withAuth } from "@/components/withAuth";
import { api } from "@/lib/api";
import { DateRangePicker } from "@/components/date-range-picker";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import {
  Building2,
  Users,
  Car,
  Truck,
  UserCheck,
  TrendingUp,
  Plane,
  Home,
  BarChart3,
  Clock,
  Calendar,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface DashboardStats {
  stats: {
    totalHotels: number;
    totalFrontdeskStaff: number;
    totalDrivers: number;
    totalShuttles: number;
    totalGuests: number;
  };
  bookings: {
    liveBookings: number;
    totalBookings: number;
    completedBookings: number;
    revenue: number;
    hotelToAirport: number;
    airportToHotel: number;
    hotelToAirportRevenue: number;
    airportToHotelRevenue: number;
  };
  hotelBookings: Record<string, number>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
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

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // 1st of current month
    to: new Date(), // today
  });

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append("startDate", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append("endDate", dateRange.to.toISOString());
      }

      const response = await api.get(
        `/admin/dashboard/stats?${params.toString()}`
      );
      setStats(response);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySchedules = async () => {
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
        `/admin/get/schedule?${params.toString()}`
      );
      setTodaySchedules(response.schedules || []);
    } catch (error) {
      console.error("Error fetching today's schedules:", error);
    } finally {
      setSchedulesLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchTodaySchedules();
  }, [dateRange]);

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

  const scheduleBlocks = getTodayScheduleBlocks();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600">
              Welcome back! Here's what's happening with your shuttle
              operations.
            </p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={fetchDashboardStats}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">
            Welcome back! Here's what's happening with your shuttle operations.
          </p>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Today's Schedule Timeline */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Today's Schedule Overview
          </CardTitle>
          <div className="text-sm text-slate-600">
            All times shown in your local timezone: <b>{getUserTimeZone()}</b> (
            {getTimeZoneAbbr(new Date())})
          </div>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-slate-600">Loading schedules...</span>
            </div>
          ) : scheduleBlocks.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                No schedules today
              </h3>
              <p className="text-slate-500">
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
                    <h4 className="font-medium text-slate-900 flex items-center gap-2">
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
                      <div className="block sm:hidden text-xs text-slate-500 text-center mb-2 bg-blue-50 rounded border border-blue-200 py-1">
                        👈 Scroll horizontally to view full timeline
                      </div>

                      {/* Scrollable timeline container */}
                      <div className="overflow-x-auto scrollbar-thin">
                        <div className="w-[1200px]">
                          {/* Hour markers */}
                          <div className="flex text-xs text-slate-400 mb-2">
                            {[...Array(24)].map((_, hour) => (
                              <div
                                key={hour}
                                className="text-center border-l border-slate-200 first:border-l-0"
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
                          <div className="relative h-20 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                            {/* Hour grid lines */}
                            <div className="absolute inset-0 flex">
                              {[...Array(24)].map((_, hour) => (
                                <div
                                  key={hour}
                                  className="border-r border-slate-200 last:border-r-0"
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
                                  <div className="text-[10px] sm:text-xs text-slate-700 truncate w-full text-center">
                                    {block.shuttle.vehicleNumber}
                                  </div>
                                  <div className="text-[8px] sm:text-[10px] text-slate-500 text-center leading-tight">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Front Desk Staff
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.stats.totalFrontdeskStaff || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Active Drivers
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.stats.totalDrivers || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Car className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Shuttles
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.stats.totalShuttles || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50">
                <Truck className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Guests
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.stats.totalGuests || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50">
                <UserCheck className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-slate-900 truncate">
                  {formatCurrency(stats?.bookings.revenue || 0)}
                </p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-lg bg-emerald-50 ml-3">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Bookings & Revenue */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Live Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Live Bookings</p>
                <p className="text-sm text-slate-600">Currently active</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-600">
                  {stats?.bookings.liveBookings || 0}
                </p>
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Completed Bookings</p>
                <p className="text-sm text-slate-600">Successfully completed</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">
                  {stats?.bookings.completedBookings || 0}
                </p>
                <Badge variant="secondary" className="text-xs">
                  Completed
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Total Bookings</p>
                <p className="text-sm text-slate-600">In selected period</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-600">
                  {stats?.bookings.totalBookings || 0}
                </p>
                <Badge variant="secondary" className="text-xs">
                  All
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Types & Revenue */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Booking Types & Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="font-medium text-slate-900">Hotel to Airport</p>
                  <p className="text-sm text-slate-600">Outbound trips</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-indigo-600">
                  {stats?.bookings.hotelToAirport || 0}
                </p>
                <p className="text-sm text-indigo-600 font-medium">
                  {formatCurrency(stats?.bookings.hotelToAirportRevenue || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-medium text-slate-900">Airport to Hotel</p>
                  <p className="text-sm text-slate-600">Inbound trips</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-purple-600">
                  {stats?.bookings.airportToHotel || 0}
                </p>
                <p className="text-sm text-purple-600 font-medium">
                  {formatCurrency(stats?.bookings.airportToHotelRevenue || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Total Revenue</p>
                <p className="text-sm text-slate-600">All completed bookings</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(stats?.bookings.revenue || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Completion Rate</p>
                <p className="text-sm text-slate-600">Completed vs Total</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-600">
                  {stats?.bookings.totalBookings
                    ? Math.round(
                        (stats.bookings.completedBookings /
                          stats.bookings.totalBookings) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Date Range Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Start Date</p>
              <p className="font-semibold text-slate-900">
                {stats?.dateRange.startDate
                  ? format(new Date(stats.dateRange.startDate), "MMM dd, yyyy")
                  : "N/A"}
              </p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">End Date</p>
              <p className="font-semibold text-slate-900">
                {stats?.dateRange.endDate
                  ? format(new Date(stats.dateRange.endDate), "MMM dd, yyyy")
                  : "N/A"}
              </p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Period</p>
              <p className="font-semibold text-slate-900">
                {stats?.dateRange.startDate && stats?.dateRange.endDate
                  ? differenceInDays(
                      new Date(stats.dateRange.endDate),
                      new Date(stats.dateRange.startDate)
                    ) + 1
                  : 0}{" "}
                days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(DashboardPage);
