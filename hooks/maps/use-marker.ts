"use client";

import { useEffect, useRef } from "react";

import { LatLngLiteral } from "@/types/maps";

type MarkerOptions = Omit<google.maps.MarkerOptions, "map" | "position">;

export function useMarker(
  map: google.maps.Map | null,
  position: LatLngLiteral | null,
  options?: MarkerOptions
) {
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map || !position) return;

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        position,
        ...options,
      });
      return;
    }

    markerRef.current.setPosition(position);
    if (options?.icon) markerRef.current.setIcon(options.icon);
    if (options?.label) markerRef.current.setLabel(options.label);
    if (options?.title) markerRef.current.setTitle(options.title);
  }, [map, options?.icon, options?.label, options?.title, position]);

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
    };
  }, []);

  return markerRef.current;
}
