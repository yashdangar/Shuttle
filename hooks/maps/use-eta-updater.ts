"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ETA_UPDATE_INTERVAL_MS } from "@/lib/constants/eta";

interface UseETAUpdaterOptions {
  tripInstanceId: Id<"tripInstances"> | null;
  driverId: Id<"users"> | null;
  enabled?: boolean;
}

interface UseETAUpdaterResult {
  isUpdating: boolean;
  lastUpdate: Date | null;
  error: string | null;
  triggerUpdate: () => Promise<void>;
}

export function useETAUpdater({
  tripInstanceId,
  driverId,
  enabled = true,
}: UseETAUpdaterOptions): UseETAUpdaterResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calculateETAs = useAction(api.eta.actions.calculateAndUpdateETAs);
  const updateDriverLocation = useMutation(
    api.users.index.updateDriverLocation
  );

  const getDriverLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      const handleError = (geoError: GeolocationPositionError) => {
        let message: string;
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message = "Location permission denied. Please enable location access in your browser settings.";
            break;
          case geoError.POSITION_UNAVAILABLE:
            message = "Location information is unavailable. Please check your device's GPS.";
            break;
          case geoError.TIMEOUT:
            message = "Location request timed out. Please try again.";
            break;
          default:
            message = geoError.message || "Failed to get location";
        }
        reject(new Error(message));
      };

      // Try high accuracy first, fallback to low accuracy on timeout
      navigator.geolocation.getCurrentPosition(
        resolve,
        (geoError: GeolocationPositionError) => {
          // If high accuracy times out, try with low accuracy
          if (geoError.code === geoError.TIMEOUT) {
            console.log("High accuracy timed out, trying low accuracy...");
            navigator.geolocation.getCurrentPosition(
              resolve,
              handleError,
              {
                enableHighAccuracy: true,
                timeout: 5000, // 5 seconds
                maximumAge: 0, // Accept cached position up to 1 minute old
              }
            );
          } else {
            handleError(geoError);
          }
        },
       { 
          enableHighAccuracy: true,
          timeout: 5000, // 5 seconds
          maximumAge: 0,
        }
      );
    });
  }, []);

  const updateETAs = useCallback(async () => {
    if (!tripInstanceId || !driverId || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const position = await getDriverLocation();
      const { latitude, longitude } = position.coords;

      await updateDriverLocation({
        driverId,
        latitude,
        longitude,
      });

      const result = await calculateETAs({
        tripInstanceId,
        driverLatitude: latitude,
        driverLongitude: longitude,
      });

      if (result.success) {
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (!errorMessage.includes("API key not configured")) {
        setError(errorMessage);
        console.error("ETA update failed:", errorMessage);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [
    tripInstanceId,
    driverId,
    isUpdating,
    getDriverLocation,
    updateDriverLocation,
    calculateETAs,
  ]);

  useEffect(() => {
    if (!enabled || !tripInstanceId || !driverId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Don't fetch instantly - wait for the first interval or manual trigger
    intervalRef.current = setInterval(() => {
      updateETAs();
    }, ETA_UPDATE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, tripInstanceId, driverId, updateETAs]);

  return {
    isUpdating,
    lastUpdate,
    error,
    triggerUpdate: updateETAs,
  };
}
