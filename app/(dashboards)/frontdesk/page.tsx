"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import PageLayout from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Calendar, Clock, AlertCircle, Car } from "lucide-react";
import { StatsCard } from "@/components/interfaces/admin/dashboard/stats-card";
import {
  RecentBookings,
  ActiveTrips,
  BookingsChart,
} from "@/components/interfaces/frontdesk/dashboard";

export default function FrontdeskPage() {
  const { user: sessionUser, status } = useAuthSession();
  const isFrontdesk = sessionUser?.role === "frontdesk";

  const hotelArgs = useMemo(
    () =>
      isFrontdesk && sessionUser?.id
        ? { userId: sessionUser.id as Id<"users"> }
        : undefined,
    [isFrontdesk, sessionUser?.id]
  );

  const hotel = useQuery(
    api.hotels.index.getHotelByUserId,
    hotelArgs ?? "skip"
  );

  const dashboardArgs = useMemo(
    () =>
      isFrontdesk && sessionUser?.id
        ? { frontdeskId: sessionUser.id as Id<"users"> }
        : "skip",
    [isFrontdesk, sessionUser?.id]
  );

  const dashboardStats = useQuery(
    api.dashboard.queries.getFrontdeskDashboardStats,
    dashboardArgs
  );
  const recentBookings = useQuery(
    api.dashboard.queries.getFrontdeskRecentBookings,
    dashboardArgs
  );
  const activeTrips = useQuery(
    api.dashboard.queries.getFrontdeskActiveTrips,
    dashboardArgs
  );

  const isLoading =
    status === "loading" ||
    (isFrontdesk && hotel === undefined) ||
    (isFrontdesk && dashboardStats === undefined);

  if (!isFrontdesk && status !== "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            You must be a frontdesk staff to access this area.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading hotel info...
      </div>
    );
  }

  if (!hotel) {
    return (
      <PageLayout
        title="No Hotel Assigned"
        description="You are not assigned to any hotel yet."
        size="large"
      >
        <Card>
          <CardHeader>
            <CardTitle>No Hotel Found</CardTitle>
            <CardDescription>
              Please contact your administrator to be assigned to a hotel.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageLayout>
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

  return (
    <PageLayout
      title="Dashboard"
      description={`Overview of ${hotel.name} operations and bookings`}
      size="large"
    >
      <div className="space-y-6">
        {/* Key Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Today's Bookings"
            value={dashboardStats.today.bookings}
            icon={Calendar}
            description="New bookings today"
          />
          <StatsCard
            title="Today's Trips"
            value={dashboardStats.today.trips}
            icon={Clock}
            description="Scheduled for today"
          />
          <StatsCard
            title="Pending Bookings"
            value={dashboardStats.overview.pendingBookings}
            icon={AlertCircle}
            description="Requiring action"
          />
          <StatsCard
            title="Active Trips"
            value={dashboardStats.overview.inProgressTrips}
            icon={Car}
            description={`${dashboardStats.overview.totalTrips} total trips`}
          />
        </div>

        {/* Bookings Chart */}
        <BookingsChart data={dashboardStats.dailyBookings} />

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentBookings bookings={recentBookings ?? []} />
          <ActiveTrips trips={activeTrips ?? []} />
        </div>

       
      </div>
    </PageLayout>
  );
}
