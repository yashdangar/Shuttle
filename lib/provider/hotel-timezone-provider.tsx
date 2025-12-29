"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthSession } from "@/hooks/use-auth-session";

interface HotelTimezoneContextValue {
  timeZone: string | null;
  hotelId: Id<"hotels"> | null;
  hotelName: string | null;
  isLoading: boolean;
}

const HotelTimezoneContext = createContext<HotelTimezoneContextValue>({
  timeZone: null,
  hotelId: null,
  hotelName: null,
  isLoading: true,
});

/**
 * Provider that fetches and provides the hotel timezone for hotel staff
 * (admin, frontdesk, driver roles).
 *
 * For guests who are not tied to a specific hotel, the context will have
 * null values - they should use useHotelTime(hotelId) with a specific hotelId.
 */
export function HotelTimezoneProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, status } = useAuthSession();

  // Only fetch hotel for staff roles that are tied to a hotel
  const isHotelStaff =
    user?.role === "admin" ||
    user?.role === "frontdesk" ||
    user?.role === "driver";

  const hotel = useQuery(
    api.hotels.index.getHotelByUserId,
    isAuthenticated && isHotelStaff && user?.id
      ? { userId: user.id as Id<"users"> }
      : "skip"
  );

  const value = useMemo<HotelTimezoneContextValue>(() => {
    // Still loading auth
    if (status === "loading") {
      return {
        timeZone: null,
        hotelId: null,
        hotelName: null,
        isLoading: true,
      };
    }

    // Not authenticated or not a hotel staff member
    if (!isAuthenticated || !isHotelStaff) {
      return {
        timeZone: null,
        hotelId: null,
        hotelName: null,
        isLoading: false,
      };
    }

    // Waiting for hotel query
    if (hotel === undefined) {
      return {
        timeZone: null,
        hotelId: null,
        hotelName: null,
        isLoading: true,
      };
    }

    // Hotel not found (shouldn't happen for properly configured staff)
    if (hotel === null) {
      return {
        timeZone: null,
        hotelId: null,
        hotelName: null,
        isLoading: false,
      };
    }

    // Hotel found
    return {
      timeZone: hotel.timeZone,
      hotelId: hotel.id,
      hotelName: hotel.name,
      isLoading: false,
    };
  }, [status, isAuthenticated, isHotelStaff, hotel]);

  return (
    <HotelTimezoneContext.Provider value={value}>
      {children}
    </HotelTimezoneContext.Provider>
  );
}

/**
 * Hook to access the hotel timezone context.
 * For hotel staff (admin, frontdesk, driver), this provides the timezone
 * of their associated hotel.
 *
 * For guests, use useHotelTime(hotelId) instead with a specific hotel ID.
 */
export function useHotelTimezoneContext() {
  return useContext(HotelTimezoneContext);
}
