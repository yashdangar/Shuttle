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
import { Loader2 } from "lucide-react";

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

  const hotel = useQuery(api.hotels.getHotelByUserId, hotelArgs ?? "skip");
  const isLoading =
    status === "loading" || (isFrontdesk && hotel === undefined);

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

  return (
    <PageLayout
      title={hotel.name}
      description="View your hotel information and manage bookings."
      size="large"
    >
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Hotel Details</CardTitle>
            <CardDescription>{hotel.address}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Phone
                </span>
                <span className="text-sm text-foreground">
                  {hotel.phoneNumber}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Email
                </span>
                <span className="text-sm text-foreground">{hotel.email}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Time Zone
                </span>
                <span className="text-sm text-foreground">
                  {hotel.timeZone}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
