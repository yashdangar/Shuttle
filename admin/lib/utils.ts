import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Timezone utility functions (matching schedule system)
export const getTimeZoneAbbr = (date: Date) => {
  // Try to get abbreviation (e.g., 'EDT')
  return date
    .toLocaleTimeString([], { timeZoneName: "short" })
    .split(" ")
    .pop();
};

export const formatTimeForDisplay = (isoString: string | null | undefined) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Show local time in HH:mm AM/PM (TZ)
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const abbr = getTimeZoneAbbr(date);
  return `${time} (${abbr})`;
};

export const formatDateTimeForDisplay = (isoString: string | null | undefined) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Show local date and time with timezone abbreviation
  const dateStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const abbr = getTimeZoneAbbr(date);
  return `${dateStr} ${timeStr} (${abbr})`;
};

// Converts local date+time to UTC ISO string
export const toUtcIso = (dateStr: string, timeStr: string) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  return localDate.toISOString();
};

// Handles overnight shifts (end time < start time)
export const getStartEndUtc = (
  dateStr: string,
  startTime: string,
  endTime: string
) => {
  const startUtc = toUtcIso(dateStr, startTime);
  let endDate = dateStr;
  if (endTime < startTime) {
    // Crosses midnight, increment date
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    endDate = d.toISOString().split("T")[0];
  }
  const endUtc = toUtcIso(endDate, endTime);
  return { startUtc, endUtc };
};

// Get user's timezone info
export const getUserTimeZone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};