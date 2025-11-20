"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LatLngLiteral } from "@/types/maps";

type DriverTrackerOptions = {
  fetchLocation: () => Promise<LatLngLiteral>;
  intervalMs?: number;
  immediate?: boolean;
};

export function useDriverTracker({
  fetchLocation,
  intervalMs = 180_000,
  immediate = true,
}: DriverTrackerOptions) {
  const [location, setLocation] = useState<LatLngLiteral | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runFetch = useCallback(async () => {
    setIsFetching(true);
    try {
      const coords = await fetchLocation();
      setLocation(coords);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsFetching(false);
    }
  }, [fetchLocation]);

  useEffect(() => {
    if (immediate) {
      void runFetch();
    }

    timerRef.current = setInterval(() => {
      void runFetch();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [immediate, intervalMs, runFetch]);

  return {
    location,
    isFetching,
    error,
  };
}
