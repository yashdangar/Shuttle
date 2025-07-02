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
  BarChart3
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

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
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
        params.append('startDate', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString());
      }
      
      const response = await api.get(`/admin/dashboard/stats?${params.toString()}`);
      setStats(response);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
            <p className="text-slate-600">Welcome back! Here's what's happening with your shuttle operations.</p>
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
          <p className="text-slate-600">Welcome back! Here's what's happening with your shuttle operations.</p>
        </div>
        
        {/* Date Range Picker */}
        <DateRangePicker 
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Hotels</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.stats.totalHotels || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Front Desk Staff</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.stats.totalFrontdeskStaff || 0}</p>
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
                <p className="text-sm font-medium text-slate-600">Active Drivers</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.stats.totalDrivers || 0}</p>
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
                <p className="text-sm font-medium text-slate-600">Total Shuttles</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.stats.totalShuttles || 0}</p>
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
                <p className="text-sm font-medium text-slate-600">Total Guests</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.stats.totalGuests || 0}</p>
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
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900 truncate">{formatCurrency(stats?.bookings.revenue || 0)}</p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-lg bg-emerald-50 ml-3">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <p className="text-xl font-bold text-green-600">{stats?.bookings.liveBookings || 0}</p>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Completed Bookings</p>
                <p className="text-sm text-slate-600">Successfully completed</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">{stats?.bookings.completedBookings || 0}</p>
                <Badge variant="secondary" className="text-xs">Completed</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Total Bookings</p>
                <p className="text-sm text-slate-600">In selected period</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-600">{stats?.bookings.totalBookings || 0}</p>
                <Badge variant="secondary" className="text-xs">All</Badge>
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
                <p className="text-xl font-bold text-indigo-600">{stats?.bookings.hotelToAirport || 0}</p>
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
                <p className="text-xl font-bold text-purple-600">{stats?.bookings.airportToHotel || 0}</p>
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
                  {stats?.bookings.totalBookings ? 
                    Math.round((stats.bookings.completedBookings / stats.bookings.totalBookings) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Performance */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Hotel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.hotelBookings ? 
                Object.entries(stats.hotelBookings)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([hotelName, bookingCount]) => (
                    <div key={hotelName} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <p className="text-sm font-medium text-slate-900 truncate">{hotelName}</p>
                      <Badge variant="outline">{bookingCount} bookings</Badge>
                    </div>
                  ))
                : 
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500">No booking data available</p>
                </div>
              }
            </div>
          </CardContent>
        </Card>
      </div>

             {/* Date Range Info */}
       <Card className="border-slate-200">
         <CardHeader>
           <CardTitle className="text-lg font-semibold text-slate-900">Date Range Information</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="text-center p-4 bg-slate-50 rounded-lg">
               <p className="text-sm text-slate-600">Start Date</p>
               <p className="font-semibold text-slate-900">
                 {stats?.dateRange.startDate ? format(new Date(stats.dateRange.startDate), 'MMM dd, yyyy') : 'N/A'}
               </p>
             </div>
             <div className="text-center p-4 bg-slate-50 rounded-lg">
               <p className="text-sm text-slate-600">End Date</p>
               <p className="font-semibold text-slate-900">
                 {stats?.dateRange.endDate ? format(new Date(stats.dateRange.endDate), 'MMM dd, yyyy') : 'N/A'}
               </p>
             </div>
             <div className="text-center p-4 bg-slate-50 rounded-lg">
               <p className="text-sm text-slate-600">Period</p>
               <p className="font-semibold text-slate-900">
                 {stats?.dateRange.startDate && stats?.dateRange.endDate ? 
                   differenceInDays(new Date(stats.dateRange.endDate), new Date(stats.dateRange.startDate)) + 1 : 0} days
               </p>
             </div>
           </div>
         </CardContent>
       </Card>


    </div>
  );
}

export default withAuth(DashboardPage);