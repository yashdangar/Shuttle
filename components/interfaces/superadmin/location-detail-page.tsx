"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Calendar, Clock, Globe } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMapInstance } from "@/hooks/maps/use-map-instance";
import { useMarker } from "@/hooks/maps/use-marker";
import { LatLngLiteral } from "@/types/maps";

interface LocationDetailPageProps {
  locationId: string;
}

export function LocationDetailPage({ locationId }: LocationDetailPageProps) {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<LatLngLiteral | null>(null);

  const location = useQuery(api.locations.index.getLocationById, {
    locationId: locationId as Id<"locations">,
  });

  useEffect(() => {
    if (location) {
      setSelectedLocation({ lat: location.latitude, lng: location.longitude });
    }
  }, [location]);

  const {
    containerRef,
    map,
    isLoaded: isMapReady,
    isLoading: isMapLoading,
    error: mapError,
  } = useMapInstance({
    center: selectedLocation || { lat: 19.076, lng: 72.8777 },
    zoom: 15,
    onClick: undefined, // Disable click for view-only mode
  });

  useMarker(map, selectedLocation, { title: location?.name || "Location" });

  if (location === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (location === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-muted-foreground">Location not found</div>
            <Button onClick={() => router.back()} variant="outline" className="mt-2">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "hotel": return "bg-blue-100 text-blue-800";
      case "airport": return "bg-green-100 text-green-800";
      case "other": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Locations
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{location.name}</h1>
          <p className="text-muted-foreground">Location Details</p>
        </div>
      </div>

      {/* Location Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
          <CardDescription>Complete details about this location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Address</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                {location.address}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Type</span>
              </div>
              <div className="ml-6">
                <Badge className={getTypeColor(location.locationType)}>
                  {location.locationType.charAt(0).toUpperCase() + location.locationType.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Created</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                {formatDate(location.createdAt)}
              </div>
            </div>

            <div className="space-y-3 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Coordinates</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                Latitude: {location.latitude.toFixed(6)}, Longitude: {location.longitude.toFixed(6)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Card */}
      <Card>
        <CardHeader>
          <CardTitle>Location Map</CardTitle>
          <CardDescription>Visual representation of the location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-[400px] overflow-hidden rounded-xl border">
            {!isMapReady || isMapLoading ? (
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            ) : null}
            <div ref={containerRef} className="h-full w-full rounded-xl" />
            {mapError && (
              <div className="absolute left-4 top-4 rounded-md bg-destructive/90 px-3 py-2 text-sm text-white shadow-lg">
                {mapError.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
