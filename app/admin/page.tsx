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
import { CreateHotelForm } from "@/components/interfaces/admin";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user: sessionUser, status } = useAuthSession();
  const isAdmin = sessionUser?.role === "admin";
  const hotelArgs = useMemo(
    () =>
      isAdmin && sessionUser?.id
        ? { adminId: sessionUser.id as Id<"users"> }
        : undefined,
    [isAdmin, sessionUser?.id]
  );

  const hotel = useQuery(api.hotels.getHotelByAdmin, hotelArgs ?? "skip");
  const isLoading = status === "loading" || (isAdmin && hotel === undefined);

  if (!isAdmin && status !== "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <CardDescription>
            You must be an administrator to access this area.
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
        title="Let's set up your hotel"
        description="Create your hotel to unlock driver, frontdesk, and shuttle management."
        size="large"
      >
        <CreateHotelForm />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={hotel.name}
      description="You're all set! Manage your staff and shuttles using the navigation."
    >
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Hotel Overview</CardTitle>
          <CardDescription>{hotel.address}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Phone:</span>{" "}
            {hotel.phoneNumber}
          </p>
          <p>
            <span className="font-medium text-foreground">Email:</span>{" "}
            {hotel.email}
          </p>
          <p>
            <span className="font-medium text-foreground">Time Zone:</span>{" "}
            {hotel.timeZone}
          </p>
          <p>
            <span className="font-medium text-foreground">Coordinates:</span>{" "}
            {hotel.latitude}, {hotel.longitude}
          </p>
          <p className="text-xs">
            Use the sidebar to manage drivers, frontdesk staff, shuttles, and
            more.
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
