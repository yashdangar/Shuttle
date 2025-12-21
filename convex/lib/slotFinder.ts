import { MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

export interface SlotResult {
  tripTimeId: Id<"tripTimes">;
  startTime: string;
  endTime: string;
  shuttleId: Id<"shuttles">;
  existingTripInstanceId?: Id<"tripInstances">;
}

export interface SlotSearchResult {
  found: boolean;
  slot?: SlotResult;
  reason?: string;
}

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

function hourToISOTime(hour: number): string {
  const paddedHour = String(hour).padStart(2, "0");
  return `1970-01-01T${paddedHour}:00:00.000Z`;
}

function buildCoveredHoursSet(tripTimes: Doc<"tripTimes">[]): Set<number> {
  const coveredHours = new Set<number>();

  for (const tripTime of tripTimes) {
    const startHour = parseTimeToHour(tripTime.startTime);
    const endHour = parseTimeToHour(tripTime.endTime);

    for (let hour = startHour; hour < endHour; hour++) {
      coveredHours.add(hour);
    }
  }

  return coveredHours;
}

async function getMaxUsedSeatsAcrossRouteSegments(
  ctx: MutationCtx,
  tripInstanceId: Id<"tripInstances">,
  fromIndex: number,
  toIndex: number
): Promise<number> {
  const routeInstances = await ctx.db
    .query("routeInstances")
    .withIndex("by_trip_instance", (q) =>
      q.eq("tripInstanceId", tripInstanceId)
    )
    .collect();

  let maxUsed = 0;

  for (const ri of routeInstances) {
    const orderIndex = Number(ri.orderIndex);
    if (orderIndex >= fromIndex && orderIndex <= toIndex) {
      const used = Number(ri.seatsOccupied) + Number(ri.seatHeld);
      maxUsed = Math.max(maxUsed, used);
    }
  }

  return maxUsed;
}

async function checkSlotAvailabilityForRoutes(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  scheduledDate: string,
  slotStartTime: string,
  slotEndTime: string,
  shuttles: Doc<"shuttles">[],
  requiredSeats: number,
  fromRouteIndex: number,
  toRouteIndex: number
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
      return { available: true, shuttleId: shuttle._id };
    }

    if (
      matchingInstance.status !== "SCHEDULED" &&
      matchingInstance.status !== "IN_PROGRESS"
    ) {
      continue;
    }

    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", matchingInstance._id)
      )
      .collect();

    if (matchingInstance.status === "IN_PROGRESS") {
      // Find the current in-progress route index (first incomplete route)
      const sortedRouteInstances = routeInstances.sort(
        (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
      );
      const currentInProgressIndex = sortedRouteInstances.findIndex(
        (ri) => !ri.completed
      );

      // If all routes are completed, this trip can't accept bookings
      if (currentInProgressIndex === -1) {
        continue;
      }

      const currentRouteOrderIndex = Number(
        sortedRouteInstances[currentInProgressIndex].orderIndex
      );

      // REJECT if the booking's pickup point (fromRouteIndex) is at or before
      // the current in-progress route. This means the driver has already
      // left that location or is currently there.
      // Example: Trip H->C->A, driver is on H->C (index 0)
      // - Booking H->C (from=0): REJECT (driver already left H)
      // - Booking H->A (from=0): REJECT (driver already left H)
      // - Booking C->A (from=1): ALLOW (driver hasn't reached C yet)
      if (fromRouteIndex <= currentRouteOrderIndex) {
        continue;
      }
    }

    let maxUsedSeats = 0;
    for (const ri of routeInstances) {
      const orderIdx = Number(ri.orderIndex);
      if (orderIdx >= fromRouteIndex && orderIdx <= toRouteIndex) {
        const used = Number(ri.seatsOccupied) + Number(ri.seatHeld);
        maxUsedSeats = Math.max(maxUsedSeats, used);
      }
    }

    const availableSeats = Number(shuttle.totalSeats) - maxUsedSeats;

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

export async function findBestAvailableSlot(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  hotelId: Id<"hotels">,
  scheduledDate: string,
  desiredTime: string,
  requiredSeats: number,
  fromRouteIndex: number = 0,
  toRouteIndex?: number
): Promise<SlotSearchResult> {
  const trip = await ctx.db.get(tripId);
  if (!trip) {
    return { found: false, reason: "Trip not found" };
  }

  const routes = await ctx.db
    .query("routes")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .collect();

  if (routes.length === 0) {
    return { found: false, reason: "Trip has no routes defined" };
  }

  const effectiveToIndex =
    toRouteIndex !== undefined ? toRouteIndex : routes.length - 1;

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

  const coveredHours = buildCoveredHoursSet(tripTimes);
  const desiredHour = parseTimeToHour(desiredTime);

  if (!coveredHours.has(desiredHour)) {
    return {
      found: false,
      reason: `No shuttle service available at ${desiredHour}:00`,
    };
  }

  const shuttles = await ctx.db
    .query("shuttles")
    .withIndex("by_hotel_active", (q) =>
      q.eq("hotelId", hotelId).eq("isActive", true)
    )
    .collect();

  if (shuttles.length === 0) {
    return { found: false, reason: "No active shuttles available" };
  }

  const findTripTimeForHour = (hour: number): Doc<"tripTimes"> | undefined => {
    return tripTimes.find((tt) => {
      const start = parseTimeToHour(tt.startTime);
      const end = parseTimeToHour(tt.endTime);
      return hour >= start && hour < end;
    });
  };

  let currentHour = desiredHour;

  while (coveredHours.has(currentHour)) {
    const slotStartTime = hourToISOTime(currentHour);
    const slotEndTime = hourToISOTime(currentHour + 1);

    const tripTime = findTripTimeForHour(currentHour);
    if (!tripTime) {
      break;
    }

    const availability = await checkSlotAvailabilityForRoutes(
      ctx,
      tripId,
      scheduledDate,
      slotStartTime,
      slotEndTime,
      shuttles,
      requiredSeats,
      fromRouteIndex,
      effectiveToIndex
    );

    if (availability.available && availability.shuttleId) {
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

    const nextHour = currentHour + 1;

    if (!coveredHours.has(nextHour)) {
      return {
        found: false,
        reason: `Shuttle full at ${currentHour}:00-${currentHour + 1}:00 and no service available at ${nextHour}:00`,
      };
    }

    currentHour = nextHour;
  }

  return {
    found: false,
    reason: "No shuttle available for the requested time",
  };
}
