"use client";

import { useEffect, useMemo, useState } from "react";

const SCRIPT_ID = "google-maps-api-script";
const CALLBACK_NAME = "__googleMapsOnLoad__";
const DEFAULT_LIBRARIES = ["places", "marker"];

let loaderPromise: Promise<typeof google.maps> | null = null;

type LoaderOptions = {
  libraries?: string[];
};

export function useGoogleMapsLoader(options: LoaderOptions = {}): {
  maps: typeof google.maps | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const [maps, setMaps] = useState<typeof google.maps | null>(() => {
    if (typeof window === "undefined") return null;
    return window.google?.maps ?? null;
  });
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(() => !maps);

  const libraries = useMemo(() => {
    const libs = new Set([...(options.libraries ?? []), ...DEFAULT_LIBRARIES]);
    return Array.from(libs);
  }, [options.libraries]);

  useEffect(() => {
    if (maps || typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      setError(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    if (!loaderPromise) {
      loaderPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById(
          SCRIPT_ID
        ) as HTMLScriptElement | null;

        if (existingScript && window.google?.maps) {
          resolve(window.google.maps);
          return;
        }

        const globalWithCallback = window as typeof window &
          Record<string, () => void>;

        globalWithCallback[CALLBACK_NAME] = () => {
          resolve(window.google!.maps);
          delete globalWithCallback[CALLBACK_NAME];
        };

        const script = existingScript ?? document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${
          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        }&libraries=${libraries.join(",")}&callback=${CALLBACK_NAME}`;
        script.async = true;
        script.defer = true;
        script.setAttribute("data-google-maps", "true");
        script.onerror = () => {
          reject(new Error("Failed to load Google Maps API"));
        };

        if (!existingScript) {
          document.head.appendChild(script);
        }
      });
    }

    loaderPromise
      .then((gmaps) => {
        if (!cancelled) {
          setMaps(gmaps);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [libraries, maps]);

  return {
    maps,
    isLoaded: Boolean(maps),
    isLoading,
    error,
  };
}
