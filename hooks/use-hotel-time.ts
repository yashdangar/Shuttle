"use client";

import { useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useHotelTimezoneContext } from "@/lib/provider/hotel-timezone-provider";
import {
  formatTime as formatTimeUtil,
  formatDate as formatDateUtil,
  formatDateTime as formatDateTimeUtil,
  formatScheduledDateTime as formatScheduledDateTimeUtil,
  getTimezoneOffset as getOffsetUtil,
  getTimezoneAbbr as getAbbrUtil,
  toUTC as toUTCUtil,
  timeStringToUTC as timeStringToUTCUtil,
  dateTimeToUTC as dateTimeToUTCUtil,
  getTodayInTimezone,
  isToday as isTodayUtil,
  getRelativeDate as getRelativeDateUtil,
  combineScheduledDateTime,
  type FormatOptions,
} from "@/lib/timezone";

// Default timezone as fallback (UTC)
const FALLBACK_TIMEZONE = "UTC";

interface UseHotelTimeReturn {
  /** The timezone string (IANA format) */
  timeZone: string;
  /** Whether timezone data is still loading */
  isLoading: boolean;
  /** Format a UTC time for display in hotel timezone */
  formatTime: (utcDate: Date | string, options?: FormatOptions) => string;
  /** Format a UTC date for display in hotel timezone */
  formatDate: (utcDate: Date | string, options?: FormatOptions) => string;
  /** Format a UTC datetime for display in hotel timezone */
  formatDateTime: (utcDate: Date | string, options?: FormatOptions) => string;
  /** Format scheduled date + time (handles the date/time separation in schema) */
  formatScheduledDateTime: (
    scheduledDate: string,
    utcTimeString: string,
    options?: FormatOptions
  ) => { date: string; time: string; dateTime: string };
  /** Get timezone offset string like "UTC-5" */
  getOffset: (date?: Date) => string;
  /** Get timezone abbreviation like "EST" */
  getAbbr: (date?: Date) => string;
  /** Convert a local date to UTC */
  toUTC: (localDate: Date | string) => Date;
  /** Convert a time string (HH:mm) to UTC ISO string */
  timeStringToUTC: (timeString: string) => string;
  /** Convert a date + time string to UTC ISO string */
  dateTimeToUTC: (dateString: string, timeString: string) => string;
  /** Get today's date string (YYYY-MM-DD) in hotel timezone */
  getToday: () => string;
  /** Check if a date is today in hotel timezone */
  isToday: (date: Date | string) => boolean;
  /** Get relative date description (Today, Tomorrow, Yesterday, or formatted) */
  getRelativeDate: (date: Date | string, options?: FormatOptions) => string;
  /** Combine scheduled date and time into a single Date object */
  combineDateTime: (scheduledDate: string, utcTimeString: string) => Date;
}

/**
 * Hook for timezone-aware date/time formatting.
 *
 * Usage patterns:
 * 1. For hotel staff (admin, frontdesk, driver) - no argument needed:
 *    `const { formatTime } = useHotelTime();`
 *
 * 2. For guests viewing a specific hotel's booking:
 *    `const { formatTime } = useHotelTime(booking.hotelId);`
 *
 * 3. With explicit timezone (when you already have it):
 *    `const { formatTime } = useHotelTime({ timeZone: hotel.timeZone });`
 *
 * @param hotelIdOrOptions - Hotel ID to fetch timezone for, or options object with timezone
 */
export function useHotelTime(
  hotelIdOrOptions?: Id<"hotels"> | { timeZone: string }
): UseHotelTimeReturn {
  const context = useHotelTimezoneContext();

  // Determine if we're using explicit timezone, fetching by ID, or using context
  const isExplicitTimezone =
    hotelIdOrOptions !== undefined &&
    typeof hotelIdOrOptions === "object" &&
    "timeZone" in hotelIdOrOptions;

  const hotelIdToFetch =
    !isExplicitTimezone && typeof hotelIdOrOptions === "string"
      ? hotelIdOrOptions
      : null;

  // Fetch hotel timezone if a specific hotelId was provided
  const hotelQuery = useQuery(
    api.hotels.index.getHotelById,
    hotelIdToFetch ? { hotelId: hotelIdToFetch } : "skip"
  );

  // Determine the final timezone and loading state
  const { timeZone, isLoading } = useMemo(() => {
    // Case 1: Explicit timezone provided
    if (isExplicitTimezone) {
      return {
        timeZone: (hotelIdOrOptions as { timeZone: string }).timeZone,
        isLoading: false,
      };
    }

    // Case 2: Hotel ID provided - fetch timezone
    if (hotelIdToFetch) {
      if (hotelQuery === undefined) {
        return { timeZone: FALLBACK_TIMEZONE, isLoading: true };
      }
      return {
        timeZone: hotelQuery?.timeZone || FALLBACK_TIMEZONE,
        isLoading: false,
      };
    }

    // Case 3: Use context (for hotel staff)
    if (context.timeZone) {
      return { timeZone: context.timeZone, isLoading: context.isLoading };
    }

    // Case 4: No timezone available - use fallback
    return { timeZone: FALLBACK_TIMEZONE, isLoading: context.isLoading };
  }, [
    isExplicitTimezone,
    hotelIdOrOptions,
    hotelIdToFetch,
    hotelQuery,
    context,
  ]);

  // Memoized formatting functions
  const formatTime = useCallback(
    (utcDate: Date | string, options?: FormatOptions) =>
      formatTimeUtil(utcDate, timeZone, options),
    [timeZone]
  );

  const formatDate = useCallback(
    (utcDate: Date | string, options?: FormatOptions) =>
      formatDateUtil(utcDate, timeZone, options),
    [timeZone]
  );

  const formatDateTime = useCallback(
    (utcDate: Date | string, options?: FormatOptions) =>
      formatDateTimeUtil(utcDate, timeZone, options),
    [timeZone]
  );

  const formatScheduledDateTime = useCallback(
    (scheduledDate: string, utcTimeString: string, options?: FormatOptions) =>
      formatScheduledDateTimeUtil(
        scheduledDate,
        utcTimeString,
        timeZone,
        options
      ),
    [timeZone]
  );

  const getOffset = useCallback(
    (date?: Date) => getOffsetUtil(timeZone, date),
    [timeZone]
  );

  const getAbbr = useCallback(
    (date?: Date) => getAbbrUtil(timeZone, date),
    [timeZone]
  );

  const toUTC = useCallback(
    (localDate: Date | string) => toUTCUtil(localDate, timeZone),
    [timeZone]
  );

  const timeStringToUTC = useCallback(
    (timeString: string) => timeStringToUTCUtil(timeString, timeZone),
    [timeZone]
  );

  const dateTimeToUTC = useCallback(
    (dateString: string, timeString: string) =>
      dateTimeToUTCUtil(dateString, timeString, timeZone),
    [timeZone]
  );

  const getToday = useCallback(() => getTodayInTimezone(timeZone), [timeZone]);

  const isToday = useCallback(
    (date: Date | string) => isTodayUtil(date, timeZone),
    [timeZone]
  );

  const getRelativeDate = useCallback(
    (date: Date | string, options?: FormatOptions) =>
      getRelativeDateUtil(date, timeZone, options),
    [timeZone]
  );

  const combineDateTime = useCallback(
    (scheduledDate: string, utcTimeString: string) =>
      combineScheduledDateTime(scheduledDate, utcTimeString),
    []
  );

  return {
    timeZone,
    isLoading,
    formatTime,
    formatDate,
    formatDateTime,
    formatScheduledDateTime,
    getOffset,
    getAbbr,
    toUTC,
    timeStringToUTC,
    dateTimeToUTC,
    getToday,
    isToday,
    getRelativeDate,
    combineDateTime,
  };
}
