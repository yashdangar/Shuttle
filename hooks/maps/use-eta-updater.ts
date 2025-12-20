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
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });
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

    updateETAs();

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
