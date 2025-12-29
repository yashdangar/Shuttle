/**
 * Timezone utility functions for converting between UTC and hotel timezones.
 * Uses native Intl.DateTimeFormat API - no external libraries needed.
 */

export type TimeFormat = "12h" | "24h";
export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

export interface FormatOptions {
  timeFormat?: TimeFormat;
  dateFormat?: DateFormat;
  showOffset?: boolean;
  showSeconds?: boolean;
}

const DEFAULT_OPTIONS: FormatOptions = {
  timeFormat: "24h",
  dateFormat: "MM/DD/YYYY",
  showOffset: false,
  showSeconds: false,
};

/**
 * Get the timezone offset string like "UTC-5" or "UTC+5:30"
 */
export function getTimezoneOffset(timeZone: string, date?: Date): string {
  const targetDate = date || new Date();

  // Get the offset in minutes using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });

  const parts = formatter.formatToParts(targetDate);
  const offsetPart = parts.find((part) => part.type === "timeZoneName");

  if (offsetPart?.value) {
    // Format is like "GMT-05:00" or "GMT+05:30"
    const match = offsetPart.value.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (match) {
      const [, sign, hours, minutes] = match;
      const h = parseInt(hours, 10);
      const m = parseInt(minutes, 10);

      if (m === 0) {
        return `UTC${sign}${h}`;
      }
      return `UTC${sign}${h}:${minutes}`;
    }
    // Handle GMT (UTC+0)
    if (offsetPart.value === "GMT") {
      return "UTC+0";
    }
  }

  return "UTC";
}

/**
 * Get the timezone abbreviation like "EST", "IST", "PST"
 */
export function getTimezoneAbbr(timeZone: string, date?: Date): string {
  const targetDate = date || new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  });

  const parts = formatter.formatToParts(targetDate);
  const abbr = parts.find((part) => part.type === "timeZoneName");

  return abbr?.value || timeZone;
}

/**
 * Format a time string in the specified timezone
 * @param utcDate - Date object or ISO string in UTC
 * @param timeZone - IANA timezone string (e.g., "America/New_York")
 * @param options - Formatting options
 */
export function formatTime(
  utcDate: Date | string,
  timeZone: string,
  options: FormatOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;

  if (isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: opts.showSeconds ? "2-digit" : undefined,
    hour12: opts.timeFormat === "12h",
  });

  let formatted = formatter.format(date);

  // For 24h format, ensure leading zeros
  if (opts.timeFormat === "24h") {
    // Intl returns "14:30" format which is correct
    formatted = formatted.replace(/^(\d):/, "0$1:");
  }

  if (opts.showOffset) {
    formatted += ` (${getTimezoneOffset(timeZone, date)})`;
  }

  return formatted;
}

/**
 * Format a date string in the specified timezone
 * @param utcDate - Date object or ISO string in UTC
 * @param timeZone - IANA timezone string
 * @param options - Formatting options
 */
export function formatDate(
  utcDate: Date | string,
  timeZone: string,
  options: FormatOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;

  if (isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || "";

  switch (opts.dateFormat) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "MM/DD/YYYY":
    default:
      return `${month}/${day}/${year}`;
  }
}

/**
 * Format a datetime string in the specified timezone
 * @param utcDate - Date object or ISO string in UTC
 * @param timeZone - IANA timezone string
 * @param options - Formatting options
 */
export function formatDateTime(
  utcDate: Date | string,
  timeZone: string,
  options: FormatOptions = {}
): string {
  const dateStr = formatDate(utcDate, timeZone, options);
  const timeStr = formatTime(utcDate, timeZone, options);

  if (!dateStr || !timeStr) {
    return "";
  }

  return `${dateStr} ${timeStr}`;
}

/**
 * Combine a date string (YYYY-MM-DD) and a UTC time string into a proper UTC datetime.
 * This handles the case where times are stored as "1970-01-01T09:00:00.000Z".
 *
 * @param scheduledDate - Date in YYYY-MM-DD format
 * @param utcTimeString - Time as ISO string (e.g., "1970-01-01T09:00:00.000Z")
 * @returns Combined Date object in UTC
 */
export function combineScheduledDateTime(
  scheduledDate: string,
  utcTimeString: string
): Date {
  // Extract time parts from the UTC time string
  const timeDate = new Date(utcTimeString);
  const hours = timeDate.getUTCHours();
  const minutes = timeDate.getUTCMinutes();
  const seconds = timeDate.getUTCSeconds();

  // Parse the scheduled date
  const [year, month, day] = scheduledDate.split("-").map(Number);

  // Create a new UTC date with the combined values
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}

/**
 * Format a scheduled date+time combination for display
 * @param scheduledDate - Date in YYYY-MM-DD format
 * @param utcTimeString - Time as ISO string
 * @param timeZone - IANA timezone string
 * @param options - Formatting options
 */
export function formatScheduledDateTime(
  scheduledDate: string,
  utcTimeString: string,
  timeZone: string,
  options: FormatOptions = {}
): { date: string; time: string; dateTime: string } {
  const combined = combineScheduledDateTime(scheduledDate, utcTimeString);

  return {
    date: formatDate(combined, timeZone, options),
    time: formatTime(combined, timeZone, options),
    dateTime: formatDateTime(combined, timeZone, options),
  };
}

/**
 * Convert a local time in a specific timezone to UTC
 * @param localDate - Date representing local time
 * @param timeZone - IANA timezone of the local time
 * @returns Date object in UTC
 */
export function toUTC(localDate: Date | string, timeZone: string): Date {
  const date = typeof localDate === "string" ? new Date(localDate) : localDate;

  if (isNaN(date.getTime())) {
    return new Date(NaN);
  }

  // Get the local time components as if they were in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Format the current date in the target timezone to get the offset
  const targetParts = formatter.formatToParts(date);
  const getPart = (type: string) =>
    targetParts.find((p) => p.type === type)?.value || "0";

  // The date object represents the "wall clock" time the user sees
  // We need to find what UTC time would display as this wall clock time in the target timezone

  // Calculate offset by comparing local interpretation vs UTC interpretation
  const localMs = date.getTime();

  // Create a date from the formatted parts (which are in target timezone)
  const targetYear = parseInt(getPart("year"), 10);
  const targetMonth = parseInt(getPart("month"), 10) - 1;
  const targetDay = parseInt(getPart("day"), 10);
  const targetHour = parseInt(getPart("hour"), 10);
  const targetMinute = parseInt(getPart("minute"), 10);
  const targetSecond = parseInt(getPart("second"), 10);

  const targetAsUtc = Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    targetHour,
    targetMinute,
    targetSecond
  );

  // The offset is the difference between the two
  const offsetMs = targetAsUtc - localMs;

  // Subtract the offset to get UTC
  return new Date(localMs - offsetMs);
}

/**
 * Convert a time string (HH:mm) to a UTC ISO string for storage
 * Uses 1970-01-01 as the base date (matching existing convention)
 * @param timeString - Time in HH:mm format (local to timezone)
 * @param timeZone - IANA timezone string
 */
export function timeStringToUTC(timeString: string, timeZone: string): string {
  const [hours, minutes] = timeString.split(":").map(Number);

  // Create a date in the target timezone
  // Using 1970-01-01 as the reference date
  const localDate = new Date(1970, 0, 1, hours, minutes || 0, 0, 0);

  const utcDate = toUTC(localDate, timeZone);

  return utcDate.toISOString();
}

/**
 * Convert a date string (YYYY-MM-DD) and time string (HH:mm) to UTC ISO string
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:mm format (local to timezone)
 * @param timeZone - IANA timezone string
 */
export function dateTimeToUTC(
  dateString: string,
  timeString: string,
  timeZone: string
): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hours, minutes] = timeString.split(":").map(Number);

  const localDate = new Date(year, month - 1, day, hours, minutes || 0, 0, 0);

  const utcDate = toUTC(localDate, timeZone);

  return utcDate.toISOString();
}

/**
 * Get the current date string in a specific timezone (YYYY-MM-DD)
 * Useful for "today" comparisons in the hotel's timezone
 */
export function getTodayInTimezone(timeZone: string): string {
  return formatDate(new Date(), timeZone, { dateFormat: "YYYY-MM-DD" });
}

/**
 * Check if a date is today in the specified timezone
 */
export function isToday(date: Date | string, timeZone: string): boolean {
  const dateStr = formatDate(date, timeZone, { dateFormat: "YYYY-MM-DD" });
  const todayStr = getTodayInTimezone(timeZone);
  return dateStr === todayStr;
}

/**
 * Get a human-readable relative time description
 * e.g., "Today", "Tomorrow", "Yesterday", or the formatted date
 */
export function getRelativeDate(
  date: Date | string,
  timeZone: string,
  options: FormatOptions = {}
): string {
  const targetDate = typeof date === "string" ? new Date(date) : new Date(date);
  const now = new Date();

  const targetDateStr = formatDate(targetDate, timeZone, {
    dateFormat: "YYYY-MM-DD",
  });
  const todayStr = getTodayInTimezone(timeZone);

  // Calculate tomorrow and yesterday in the timezone
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const tomorrowStr = formatDate(tomorrow, timeZone, {
    dateFormat: "YYYY-MM-DD",
  });
  const yesterdayStr = formatDate(yesterday, timeZone, {
    dateFormat: "YYYY-MM-DD",
  });

  if (targetDateStr === todayStr) {
    return "Today";
  }
  if (targetDateStr === tomorrowStr) {
    return "Tomorrow";
  }
  if (targetDateStr === yesterdayStr) {
    return "Yesterday";
  }

  return formatDate(targetDate, timeZone, options);
}
