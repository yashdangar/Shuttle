"use client";

import { useEffect, useRef, useState } from "react";

import { LatLngLiteral } from "@/types/maps";

import { useGoogleMapsLoader } from "./use-google-maps-loader";

type UseMapInstanceOptions = {
  center: LatLngLiteral;
  zoom?: number;
  mapId?: string;
  options?: google.maps.MapOptions;
  onClick?: (coords: LatLngLiteral) => void;
  onReady?: (map: google.maps.Map) => void;
};

export function useMapInstance({
  center,
  zoom = 12,
  mapId,
  options,
  onClick,
  onReady,
}: UseMapInstanceOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapState, setMapState] = useState<google.maps.Map | null>(null);
  const lastCenterRef = useRef<LatLngLiteral | null>(null);
  const lastZoomRef = useRef<number | null>(null);

  const { maps, isLoaded, isLoading, error } = useGoogleMapsLoader();
  const initialOptionsRef = useRef<google.maps.MapOptions>({
    disableDefaultUI: true,
    gestureHandling: "greedy",
    mapId,
    ...options,
  });

  useEffect(() => {
    initialOptionsRef.current = {
      disableDefaultUI: true,
      gestureHandling: "greedy",
      mapId,
      ...options,
    };
  }, [mapId, options]);

  useEffect(() => {
    if (!maps || !isLoaded || mapRef.current || !containerRef.current) return;

    const map = new maps.Map(containerRef.current, {
      center,
      zoom,
      ...initialOptionsRef.current,
    });

    mapRef.current = map;
    setMapState(map);
    lastCenterRef.current = center;
    lastZoomRef.current = zoom;
    onReady?.(map);
  }, [center, zoom, isLoaded, maps, onReady]);

  useEffect(() => {
    if (!mapState || !center) return;
    const lastCenter = lastCenterRef.current;
    if (lastCenter && areCoordinatesEqual(lastCenter, center)) return;

    mapState.panTo(center);
    lastCenterRef.current = center;
  }, [center, mapState]);

  useEffect(() => {
    if (!mapState || typeof zoom !== "number") return;
    if (lastZoomRef.current === zoom) return;

    mapState.setZoom(zoom);
    lastZoomRef.current = zoom;
  }, [zoom, mapState]);

  useEffect(() => {
    if (!mapState || !onClick) return;
    const listener = mapState.addListener(
      "click",
      (event: google.maps.MapMouseEvent) => {
        const latLng = event.latLng;
        if (!latLng) return;
        onClick({ lat: latLng.lat(), lng: latLng.lng() });
      }
    );

    return () => {
      listener.remove();
    };
  }, [onClick, mapState]);

  return {
    containerRef,
    map: mapState,
    maps,
    isLoaded,
    isLoading,
    error,
  };
}

function areCoordinatesEqual(a: LatLngLiteral, b: LatLngLiteral) {
  return (
    Number(a.lat.toFixed(6)) === Number(b.lat.toFixed(6)) &&
    Number(a.lng.toFixed(6)) === Number(b.lng.toFixed(6))
  );
}
