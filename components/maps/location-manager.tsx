"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LatLngLiteral } from "@/types/maps";

import { useDriverTracker } from "@/hooks/maps/use-driver-tracker";
import { useMapInstance } from "@/hooks/maps/use-map-instance";
import { useMarker } from "@/hooks/maps/use-marker";
import { usePlacesAutocomplete } from "@/hooks/maps/use-places-autocomplete";

const DEFAULT_CENTER: LatLngLiteral = { lat: 19.076, lng: 72.8777 };

export function LocationManager() {
  const [selectedLocation, setSelectedLocation] =
    useState<LatLngLiteral>(DEFAULT_CENTER);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastDriverUpdate, setLastDriverUpdate] = useState<Date | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const driverRoute = useMemo<LatLngLiteral[]>(
    () => [
      { lat: 19.082197, lng: 72.741114 },
      { lat: 19.106837, lng: 72.848186 },
      { lat: 19.134243, lng: 72.86962 },
      { lat: 19.154764, lng: 72.878942 },
      { lat: 19.186797, lng: 72.852881 },
      { lat: 19.213871, lng: 72.838027 },
      { lat: 19.189901, lng: 72.821329 },
      { lat: 19.14307, lng: 72.816421 },
      { lat: 19.111213, lng: 72.82715 },
    ],
    []
  );
  const driverIndexRef = useRef(0);

  const fetchDriverLocation = useCallback(async () => {
    driverIndexRef.current = (driverIndexRef.current + 1) % driverRoute.length;
    return driverRoute[driverIndexRef.current];
  }, [driverRoute]);

  const {
    location: driverLocation,
    isFetching: isDriverUpdating,
    error: driverError,
  } = useDriverTracker({
    fetchLocation: fetchDriverLocation,
    intervalMs: 180_000,
  });

  useEffect(() => {
    if (driverLocation) {
      setLastDriverUpdate(new Date());
    }
  }, [driverLocation]);

  const handleMapClick = useCallback((coords: LatLngLiteral) => {
    setSelectedLocation(coords);
    setSelectedAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
  }, []);

  const {
    containerRef,
    map,
    isLoaded: isMapReady,
    isLoading: isMapLoading,
    error: mapError,
  } = useMapInstance({
    center: selectedLocation,
    zoom: 13,
    onClick: handleMapClick,
  });

  usePlacesAutocomplete({
    inputRef: searchInputRef,
    onPlaceChanged: (place) => {
      const geometry = place?.geometry?.location;
      if (!geometry) return;
      const lat = geometry.lat();
      const lng = geometry.lng();
      setSelectedLocation({ lat, lng });
      setSelectedAddress(
        place?.formatted_address ??
          place?.name ??
          `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      );
    },
  });

  useMarker(map, selectedLocation, {
    title: "Selected location",
    label: "S",
  });

  useMarker(map, driverLocation, {
    title: "Driver",
    icon: {
      url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    },
  });

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedLocation(coords);
        setSelectedAddress("Current location");
        setGeoError(null);
      },
      (error) => {
        setGeoError(error.message);
      }
    );
  }, []);

  const handleResetLocation = useCallback(() => {
    setSelectedLocation(DEFAULT_CENTER);
    setSelectedAddress("");
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Select a location</CardTitle>
          <CardDescription>
            Search or click on the map to choose a precise coordinate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Search with autocomplete
            </label>
            <Input
              ref={searchInputRef}
              placeholder="Start typing an address or place"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleUseMyLocation}>
              Use my location
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetLocation}
            >
              Reset
            </Button>
          </div>
          {geoError && (
            <p className="text-sm text-destructive" role="alert">
              {geoError}
            </p>
          )}
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Latitude</span>
              <span className="font-semibold">
                {selectedLocation.lat.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Longitude</span>
              <span className="font-semibold">
                {selectedLocation.lng.toFixed(5)}
              </span>
            </div>
            {selectedAddress && (
              <div className="mt-2 text-muted-foreground">
                {selectedAddress}
              </div>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Driver status</p>
                <p className="text-xs text-muted-foreground">
                  Refreshes every ~3 minutes
                </p>
              </div>
              <Badge variant={isDriverUpdating ? "secondary" : "outline"}>
                {isDriverUpdating ? "Updating…" : "Idle"}
              </Badge>
            </div>
            {driverLocation && (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Latitude</dt>
                  <dd className="font-medium">
                    {driverLocation.lat.toFixed(5)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Longitude</dt>
                  <dd className="font-medium">
                    {driverLocation.lng.toFixed(5)}
                  </dd>
                </div>
                {lastDriverUpdate && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Last update</dt>
                    <dd>{formatRelativeTime(lastDriverUpdate)}</dd>
                  </div>
                )}
              </dl>
            )}
            {driverError && (
              <p className="mt-2 text-xs text-destructive">
                {driverError.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="p-0">
        <div className="relative h-[520px] w-full overflow-hidden rounded-xl">
          {!isMapReady || isMapLoading ? (
            <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
          ) : null}
          <div
            ref={containerRef}
            className="h-full w-full rounded-xl"
            aria-label="Google map"
          />
          {(mapError || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && (
            <div className="absolute left-4 top-4 rounded-md bg-destructive/90 px-3 py-2 text-sm text-white shadow-lg">
              {mapError?.message ?? "Google Maps failed to load."}
            </div>
          )}
          {driverLocation && (
            <div className="absolute bottom-4 left-4 rounded-lg bg-background/90 px-4 py-2 text-sm shadow-lg">
              <p className="font-semibold">Driver location</p>
              <p>
                {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
              </p>
              {lastDriverUpdate && (
                <p className="text-xs text-muted-foreground">
                  Updated {formatRelativeTime(lastDriverUpdate)}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes <= 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
