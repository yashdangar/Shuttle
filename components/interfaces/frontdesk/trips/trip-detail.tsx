"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";
import PageLayout from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Clock, Users, Calendar } from "lucide-react";
import Link from "next/link";
import type { TripRecord } from "@/convex/trips";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatTimestamp(timestamp: number) {
  return dateFormatter.format(new Date(timestamp));
}

export function FrontdeskTripDetail({ tripId }: { tripId: string }) {
  const { user } = useAuthSession();

  const trip = useQuery(api.trips.index.getTripById, {
    tripId: tripId as Id<"trips">,
  });

  const userHotel = useQuery(api.hotels.index.getHotelByUserId, {
    userId: user?.id as Id<"users">,
  });

  const isLoading = trip === undefined || userHotel === undefined;

  if (isLoading) {
    return (
      <PageLayout title="Trip Details" description="Loading trip information..." size="full">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  if (!trip) {
    return (
      <PageLayout title="Trip Not Found" description="This trip may have been removed." size="full">
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Trip not found</h2>
            <p className="text-muted-foreground mt-2">
              This trip doesn't exist or has been removed.
            </p>
            <Link href="/frontdesk/trips">
              <Button className="mt-4">Back to Trips</Button>
            </Link>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  if (!userHotel || trip.hotelId !== userHotel.id) {
    return (
      <PageLayout title="Access Denied" description="You don't have permission to view this trip." size="full">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              This trip does not belong to your hotel.
            </p>
            <Link href="/frontdesk/trips">
              <Button className="mt-4">Back to Trips</Button>
            </Link>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={trip.name}
      description="Trip details and route information."
      size="full"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Trip Information</CardTitle>
              <Link href="/frontdesk/trips">
                <Button variant="outline">Back to Trips</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <p className="font-medium">{formatTimestamp(trip.createdAt)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Total Charges</span>
                </div>
                <p className="font-medium">${trip.totalCharges.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trip.routes && trip.routes.length > 0 ? (
              <div className="space-y-3">
                {trip.routes.map((route, index) => (
                  <div key={route.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{route.startLocationName}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{route.endLocationName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        ${route.charges.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No routes defined for this trip</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trip.tripSlots && trip.tripSlots.length > 0 ? (
              <div className="space-y-3">
                {trip.tripSlots.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{slot.startTimeDisplay}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{slot.endTimeDisplay}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No time slots defined for this trip</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
