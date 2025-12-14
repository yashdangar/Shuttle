import { MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

export interface SlotResult {
  tripTimeId: Id<"tripTimes">;
  startTime: string; // 1-hour slot start (e.g., "1970-01-01T13:00:00.000Z")
  endTime: string; // 1-hour slot end (e.g., "1970-01-01T14:00:00.000Z")
  shuttleId: Id<"shuttles">;
  existingTripInstanceId?: Id<"tripInstances">;
}

export interface SlotSearchResult {
  found: boolean;
  slot?: SlotResult;
  reason?: string;
}

/**
 * Parses time string to get hour value for comparison
 * Handles both ISO format ("1970-01-01T09:00:00.000Z") and simple format ("09:00")
 */
function parseTimeToHour(timeStr: string): number {
  if (timeStr.includes("T")) {
    const date = new Date(timeStr);
    return date.getUTCHours();
  } else if (timeStr.includes(":")) {
    const [hours] = timeStr.split(":");
    return parseInt(hours, 10);
  }
  return parseInt(timeStr, 10);
}

/**
 * Converts hour to ISO time string format
 */
function hourToISOTime(hour: number): string {
  const paddedHour = String(hour).padStart(2, "0");
  return `1970-01-01T${paddedHour}:00:00.000Z`;
}

/**
 * Builds a Set of all hours covered by the TripTimes.
 * This is used to check if consecutive hours exist.
 *
 * Example: TripTime 9-14 covers hours [9, 10, 11, 12, 13]
 * Example: TripTime 15-16 covers hours [15]
 */
function buildCoveredHoursSet(tripTimes: Doc<"tripTimes">[]): Set<number> {
  const coveredHours = new Set<number>();

  for (const tripTime of tripTimes) {
    const startHour = parseTimeToHour(tripTime.startTime);
    const endHour = parseTimeToHour(tripTime.endTime);

    // Add all hours from start to end-1 (since 13-14 means hour 13 is covered)
    for (let hour = startHour; hour < endHour; hour++) {
      coveredHours.add(hour);
    }
  }

  return coveredHours;
}

/**
 * Generates all 1-hour slots within a TripTime's operating hours
 * that are at or after the desired hour.
 *
 * Example: TripTime 9-14, desiredHour 13 -> returns [(13,14)]
 * Example: TripTime 9-14, desiredHour 10 -> returns [(10,11), (11,12), (12,13), (13,14)]
 */
function generate1HourSlots(
  tripTime: Doc<"tripTimes">,
  desiredHour: number
): Array<{ startHour: number; endHour: number }> {
  const tripStartHour = parseTimeToHour(tripTime.startTime);
  const tripEndHour = parseTimeToHour(tripTime.endTime);

  const slots: Array<{ startHour: number; endHour: number }> = [];

  // Start from the hour containing/after desired time, but not before trip start
  const startFrom = Math.max(desiredHour, tripStartHour);

  // Generate 1-hour slots
  for (let hour = startFrom; hour < tripEndHour; hour++) {
    slots.push({
      startHour: hour,
      endHour: hour + 1,
    });
  }

  return slots;
}

/**
 * Checks if a slot is available on any shuttle.
 * Returns the shuttle ID if available, null otherwise.
 */
async function checkSlotAvailability(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  scheduledDate: string,
  slotStartTime: string,
  slotEndTime: string,
  shuttles: Doc<"shuttles">[],
  requiredSeats: number
): Promise<{
  available: boolean;
  shuttleId?: Id<"shuttles">;
  existingTripInstanceId?: Id<"tripInstances">;
}> {
  for (const shuttle of shuttles) {
    const existingInstances = await ctx.db
      .query("tripInstances")
      .withIndex("by_trip_date_time", (q) =>
        q
          .eq("tripId", tripId)
          .eq("scheduledDate", scheduledDate)
          .eq("scheduledStartTime", slotStartTime)
      )
      .collect();

    const matchingInstance = existingInstances.find(
      (instance) =>
        instance.scheduledEndTime === slotEndTime &&
        instance.shuttleId === shuttle._id
    );

    if (!matchingInstance) {
      // No TripInstance exists - slot is available
      return { available: true, shuttleId: shuttle._id };
    }

    if (matchingInstance.status !== "SCHEDULED") {
      // Status is IN_PROGRESS, COMPLETED, or CANCELLED - skip this shuttle
      continue;
    }

    // Check seat availability
    const usedSeats =
      Number(matchingInstance.seatsOccupied) +
      Number(matchingInstance.seatHeld);
    const availableSeats = Number(shuttle.totalSeats) - usedSeats;

    if (availableSeats >= requiredSeats) {
      return {
        available: true,
        shuttleId: shuttle._id,
        existingTripInstanceId: matchingInstance._id,
      };
    }
  }

  return { available: false };
}

/**
 * Finds the best available 1-hour slot for a booking based on desired time.
 *
 * Key Rules:
 * 1. TripTimes define operating hours (e.g., 9:00-14:00, 15:00-16:00)
 * 2. TripInstances are created in 1-hour slots (e.g., 13:00-14:00)
 * 3. **NO GAPS ALLOWED**: If current slot is full, only try NEXT CONSECUTIVE hour
 *    - If TripTimes are 9-14 and 15-16, and user wants 13:30
 *    - If 13-14 is full, check if 14-15 exists in TripTimes
 *    - If 14-15 doesn't exist (gap), AUTO_CANCEL - don't jump to 15-16
 *
 * Algorithm:
 * 1. Parse desired time to get the hour (13:25 -> 13)
 * 2. Build set of all covered hours from TripTimes
 * 3. Starting from desired hour, check slots ONE BY ONE
 * 4. If current slot unavailable, check if NEXT CONSECUTIVE hour is covered
 *    - If yes, try next slot
 *    - If no (gap), reject immediately means let say right now its 13:00 and the next slot is 14:00 and the shuttle is full then reject the booking means auto cancel the booking but dont even try to look for 15:00 or 16:00 or any other slot.
 */
export async function findBestAvailableSlot(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  hotelId: Id<"hotels">,
  scheduledDate: string,
  desiredTime: string,
  requiredSeats: number
): Promise<SlotSearchResult> {
  const trip = await ctx.db.get(tripId);
  if (!trip) {
    return { found: false, reason: "Trip not found" };
  }

  // Get all TripTimes for this trip
  const tripTimes: Doc<"tripTimes">[] = [];
  for (const tripTimeId of trip.tripTimesIds) {
    const tripTime = await ctx.db.get(tripTimeId);
    if (tripTime) {
      tripTimes.push(tripTime);
    }
  }

  if (tripTimes.length === 0) {
    return { found: false, reason: "No time slots available for this trip" };
  }

  // Build set of all hours covered by TripTimes
  const coveredHours = buildCoveredHoursSet(tripTimes);

  // Parse desired time to get the hour
  const desiredHour = parseTimeToHour(desiredTime);

  // Check if desired hour is covered
  if (!coveredHours.has(desiredHour)) {
    return {
      found: false,
      reason: `No shuttle service available at ${desiredHour}:00`,
    };
  }

  // Get all active shuttles for this hotel
  const shuttles = await ctx.db
    .query("shuttles")
    .withIndex("by_hotel_active", (q) =>
      q.eq("hotelId", hotelId).eq("isActive", true)
    )
    .collect();

  if (shuttles.length === 0) {
    return { found: false, reason: "No active shuttles available" };
  }

  // Find the TripTime that covers the desired hour (for tripTimeId reference)
  const findTripTimeForHour = (hour: number): Doc<"tripTimes"> | undefined => {
    return tripTimes.find((tt) => {
      const start = parseTimeToHour(tt.startTime);
      const end = parseTimeToHour(tt.endTime);
      return hour >= start && hour < end;
    });
  };

  // Start checking from desired hour, one slot at a time
  let currentHour = desiredHour;

  while (coveredHours.has(currentHour)) {
    const slotStartTime = hourToISOTime(currentHour);
    const slotEndTime = hourToISOTime(currentHour + 1);

    const tripTime = findTripTimeForHour(currentHour);
    if (!tripTime) {
      // This shouldn't happen if coveredHours is correct, but safety check
      break;
    }

    const availability = await checkSlotAvailability(
      ctx,
      tripId,
      scheduledDate,
      slotStartTime,
      slotEndTime,
      shuttles,
      requiredSeats
    );

    if (availability.available && availability.shuttleId) {
      // Found an available slot!
      return {
        found: true,
        slot: {
          tripTimeId: tripTime._id,
          startTime: slotStartTime,
          endTime: slotEndTime,
          shuttleId: availability.shuttleId,
          existingTripInstanceId: availability.existingTripInstanceId,
        },
      };
    }

    // Current slot is not available - check if NEXT CONSECUTIVE hour is covered
    const nextHour = currentHour + 1;

    if (!coveredHours.has(nextHour)) {
      // Gap detected! Next hour is not covered by any TripTime
      // Reject the booking - don't jump to a later non-consecutive slot
      return {
        found: false,
        reason: `Shuttle full at ${currentHour}:00-${currentHour + 1}:00 and no service available at ${nextHour}:00`,
      };
    }

    // Next hour is covered - continue to next slot
    currentHour = nextHour;
  }

  // Exhausted all consecutive hours
  return {
    found: false,
    reason: "No shuttle available for the requested time",
  };
}
