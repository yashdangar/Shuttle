"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import PageLayout from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { StatsCard } from "@/components/interfaces/admin/dashboard/stats-card";
import { RevenueChart } from "@/components/interfaces/admin/dashboard/revenue-chart";
import { BookingsChart } from "@/components/interfaces/admin/dashboard/bookings-chart";
import { PaymentStats } from "@/components/interfaces/admin/dashboard/payment-stats";
import { RecentBookings } from "@/components/interfaces/admin/dashboard/recent-bookings";
import { ActiveTrips } from "@/components/interfaces/admin/dashboard/active-trips";
import { 
  DollarSign, 
  Calendar, 
  Users, 
  Car, 
  TrendingUp,
  UserCheck,
  MapPin,
  Clock
} from "lucide-react";

export default function AdminPage() {
  const { user: sessionUser, status } = useAuthSession();
  const isAdmin = sessionUser?.role === "admin";
  const dashboardArgs = useMemo(
    () =>
      isAdmin && sessionUser?.id
        ? { adminId: sessionUser.id as Id<"users"> }
        : "skip",
    [isAdmin, sessionUser?.id]
  );

  const dashboardStats = useQuery(api.dashboard.queries.getDashboardStats, dashboardArgs);
  const recentBookings = useQuery(api.dashboard.queries.getRecentBookings, dashboardArgs);
  const activeTrips = useQuery(api.dashboard.queries.getActiveTrips, dashboardArgs);

  const isLoading = status === "loading" || (isAdmin && dashboardStats === undefined);

  if (!isAdmin && status !== "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You must be an administrator to access this area.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to load dashboard statistics. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <PageLayout
      title="Dashboard"
      description="Overview of your hotel's performance and operations"
      size="large"
    >
      <div className="space-y-6">
        {/* Key Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Earnings"
            value={formatCurrency(dashboardStats.overview.totalEarnings)}
            icon={DollarSign}
            description="All time revenue"
          />
          <StatsCard
            title="Total Bookings"
            value={dashboardStats.overview.totalBookings}
            icon={Calendar}
            description={`${dashboardStats.overview.confirmedBookings} confirmed`}
          />
          <StatsCard
            title="Active Trips"
            value={dashboardStats.overview.inProgressTrips}
            icon={Car}
            description={`${dashboardStats.overview.totalTrips} total trips`}
          />
          <StatsCard
            title="Total Staff"
            value={dashboardStats.overview.drivers + dashboardStats.overview.frontdeskStaff}
            icon={Users}
            description={`${dashboardStats.overview.drivers} drivers, ${dashboardStats.overview.frontdeskStaff} frontdesk`}
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart data={dashboardStats.dailyBookings} />
          <BookingsChart data={dashboardStats.dailyBookings} />
        </div>

        {/* Payment Statistics */}
        <PaymentStats 
          paymentStats={dashboardStats.paymentStats}
          paymentMethodStats={dashboardStats.paymentMethodStats}
        />

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentBookings bookings={recentBookings ?? []} />
          <ActiveTrips trips={activeTrips ?? []} />
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Today's Earnings"
            value={formatCurrency(dashboardStats.today.earnings)}
            icon={TrendingUp}
            description="Revenue today"
          />
          <StatsCard
            title="Today's Bookings"
            value={dashboardStats.today.bookings}
            icon={Calendar}
            description="New bookings today"
          />
          <StatsCard
            title="Active Shuttles"
            value={dashboardStats.overview.activeShuttles}
            icon={Car}
            description={`${dashboardStats.overview.totalShuttles} total shuttles`}
          />
          <StatsCard
            title="Today's Trips"
            value={dashboardStats.today.trips}
            icon={Clock}
            description="Scheduled for today"
          />
        </div>
      </div>
    </PageLayout>
  );
}
