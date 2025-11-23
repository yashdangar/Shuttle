import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

export type TripTimeRecord = {
  id: Id<"tripTimes">;
  tripId: Id<"trips">;
  shuttleId: Id<"shuttles">;
  startTime: string;
  endTime: string;
  startTimeDisplay: string;
  endTimeDisplay: string;
  shuttleVehicleNumber: string;
  shuttleTotalSeats: number;
};

function timeToUTCString(timeString: string): string {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date(Date.UTC(1970, 0, 1, hours, minutes || 0, 0, 0));
  return date.toISOString();
}

function utcStringToTime(utcString: string): string {
  const date = new Date(utcString);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeRangesOverlap(
  utcStart1: string,
  utcEnd1: string,
  utcStart2: string,
  utcEnd2: string
): boolean {
  const start1 = new Date(utcStart1).getTime();
  const end1 = new Date(utcEnd1).getTime();
  const start2 = new Date(utcStart2).getTime();
  const end2 = new Date(utcEnd2).getTime();
  return start1 < end2 && start2 < end1;
}

export type TripRecord = {
  id: Id<"trips">;
  name: string;
  sourceLocationId: Id<"locations">;
  destinationLocationId: Id<"locations">;
  sourceLocationName: string;
  destinationLocationName: string;
  charges: number;
  hotelId: Id<"hotels">;
  tripSlots: TripTimeRecord[];
  createdAt: number;
};

const formatTripTime = async (
  ctx: any,
  tripTime: Doc<"tripTimes">
): Promise<TripTimeRecord> => {
  const shuttle = await ctx.db.get(tripTime.shuttleId);
  if (!shuttle) {
    throw new Error("Shuttle not found");
  }

  return {
    id: tripTime._id,
    tripId: tripTime.tripId,
    shuttleId: tripTime.shuttleId,
    startTime: tripTime.startTime,
    endTime: tripTime.endTime,
    startTimeDisplay: utcStringToTime(tripTime.startTime),
    endTimeDisplay: utcStringToTime(tripTime.endTime),
    shuttleVehicleNumber: shuttle.vehicleNumber,
    shuttleTotalSeats: Number(shuttle.totalSeats),
  };
};

const formatTrip = async (
  ctx: any,
  trip: Doc<"trips">
): Promise<TripRecord> => {
  const sourceLocation = await ctx.db.get(trip.sourceLocationId);
  const destinationLocation = await ctx.db.get(trip.destinationLocationId);

  if (!sourceLocation || !destinationLocation) {
    throw new Error("Location not found");
  }

  const tripSlotsPromises = trip.tripTimesIds.map(async (tripTimeId) => {
    const tripTime = await ctx.db.get(tripTimeId);
    if (!tripTime) {
      return null;
    }
    return formatTripTime(ctx, tripTime);
  });

  const tripSlotsResults = await Promise.all(tripSlotsPromises);
  const tripSlots = tripSlotsResults.filter(
    (slot): slot is TripTimeRecord => slot !== null
  );

  return {
    id: trip._id,
    name: trip.name,
    sourceLocationId: trip.sourceLocationId,
    destinationLocationId: trip.destinationLocationId,
    sourceLocationName: sourceLocation.name,
    destinationLocationName: destinationLocation.name,
    charges: trip.charges,
    hotelId: trip.hotelId,
    tripSlots,
    createdAt: trip._creationTime,
  };
};

export const listAdminTrips = query({
  args: {
    adminId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.adminId);

    if (!user || !user.hotelId) {
      return {
        trips: [],
        nextCursor: null,
      };
    }

    const pageSize = Math.max(1, Math.min(args.limit ?? 25, 100));
    const allTrips = await ctx.db
      .query("trips")
      .withIndex("by_hotel", (q) => q.eq("hotelId", user.hotelId!))
      .collect();

    const sortedTrips = allTrips.sort(
      (a, b) => b._creationTime - a._creationTime
    );

    const startIndex = args.cursor
      ? sortedTrips.findIndex((trip) => trip._id === args.cursor) + 1
      : 0;
    const endIndex = startIndex + pageSize;
    const page = sortedTrips.slice(startIndex, endIndex);

    const formattedTrips = await Promise.all(
      page.map((trip) => formatTrip(ctx, trip))
    );

    return {
      trips: formattedTrips,
      nextCursor:
        endIndex >= sortedTrips.length
          ? null
          : (sortedTrips[endIndex - 1]._id as string),
    };
  },
});

export const getTripById = query({
  args: {
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      return null;
    }
    return formatTrip(ctx, trip);
  },
});

export const checkTripSlotConflicts = query({
  args: {
    hotelId: v.id("hotels"),
    tripSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
        shuttleId: v.id("shuttles"),
      })
    ),
    excludeTripId: v.optional(v.id("trips")),
  },
  async handler(ctx, args) {
    const allTrips = await ctx.db
      .query("trips")
      .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId))
      .collect();

    const conflicts: Array<{
      slot: { startTime: string; endTime: string; shuttleId: Id<"shuttles"> };
      conflictingTrip: { id: Id<"trips">; name: string; slot: { startTime: string; endTime: string } };
    }> = [];

    for (const newSlot of args.tripSlots) {
      for (const trip of allTrips) {
        if (args.excludeTripId && trip._id === args.excludeTripId) {
          continue;
        }

        for (const tripTimeId of trip.tripTimesIds) {
          const existingSlot = await ctx.db.get(tripTimeId);
          if (!existingSlot) {
            continue;
          }

          if (existingSlot.shuttleId === newSlot.shuttleId) {
            if (
              timeRangesOverlap(
                newSlot.startTime,
                newSlot.endTime,
                existingSlot.startTime,
                existingSlot.endTime
              )
            ) {
              conflicts.push({
                slot: newSlot,
                conflictingTrip: {
                  id: trip._id,
                  name: trip.name,
                  slot: {
                    startTime: existingSlot.startTime,
                    endTime: existingSlot.endTime,
                  },
                },
              });
            }
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  },
});

export const createTrip = action({
  args: {
    currentUserId: v.id("users"),
    name: v.string(),
    sourceLocationId: v.id("locations"),
    destinationLocationId: v.id("locations"),
    charges: v.number(),
    tripSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
        shuttleId: v.id("shuttles"),
      })
    ),
  },
  async handler(ctx, args): Promise<TripRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can create trips");
    }

    const userDoc = await ctx.runQuery(internal.users.getUserByIdInternal, {
      userId: args.currentUserId,
    });

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    if (args.sourceLocationId === args.destinationLocationId) {
      throw new Error("Source and destination must be different");
    }

    if (args.charges <= 0) {
      throw new Error("Charges must be a positive number");
    }

    if (args.tripSlots.length === 0) {
      throw new Error("At least one trip slot is required");
    }

    // Parallelize location queries
    const [sourceLocation, destinationLocation] = await Promise.all([
      ctx.runQuery(api.locations.getLocationById, {
        locationId: args.sourceLocationId,
      }),
      ctx.runQuery(api.locations.getLocationById, {
        locationId: args.destinationLocationId,
      }),
    ]);

    if (!sourceLocation) {
      throw new Error("Source location not found");
    }

    if (sourceLocation.hotelId !== hotel.id) {
      throw new Error("Source location does not belong to your hotel");
    }

    if (!destinationLocation) {
      throw new Error("Destination location not found");
    }

    if (destinationLocation.hotelId !== hotel.id) {
      throw new Error("Destination location does not belong to your hotel");
    }

    // Validate time formats and collect unique shuttle IDs
    const timeRegex = /^([0-1][0-9]|2[0-3]):00$/;
    const uniqueShuttleIds = new Set<Id<"shuttles">>();

    for (const slot of args.tripSlots) {
      if (!timeRegex.test(slot.startTime)) {
        throw new Error(
          `Start time "${slot.startTime}" must be in hour-only format (HH:00)`
        );
      }
      if (!timeRegex.test(slot.endTime)) {
        throw new Error(
          `End time "${slot.endTime}" must be in hour-only format (HH:00)`
        );
      }

      const startDate = new Date(timeToUTCString(slot.startTime));
      const endDate = new Date(timeToUTCString(slot.endTime));

      if (startDate >= endDate) {
        throw new Error("Start time must be before end time");
      }

      const durationMinutes =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      if (durationMinutes < 60) {
        throw new Error(
          "Minimum duration must be at least 1 hour between start and end time"
        );
      }

      uniqueShuttleIds.add(slot.shuttleId);
    }

    // Batch shuttle lookups in parallel
    const shuttleLookups = Array.from(uniqueShuttleIds).map((shuttleId) =>
      ctx.runQuery(api.shuttles.getShuttleById, { shuttleId })
    );
    const shuttles = await Promise.all(shuttleLookups);
    const shuttleMap = new Map<Id<"shuttles">, typeof shuttles[0]>();
    
    for (let i = 0; i < shuttles.length; i++) {
      const shuttle = shuttles[i];
      if (!shuttle) {
        throw new Error("Shuttle not found");
      }
      if (shuttle.hotelId !== hotel.id) {
        throw new Error("Shuttle does not belong to your hotel");
      }
      shuttleMap.set(Array.from(uniqueShuttleIds)[i], shuttle);
    }

    const utcTripSlots = args.tripSlots.map((slot) => ({
      startTime: timeToUTCString(slot.startTime),
      endTime: timeToUTCString(slot.endTime),
      shuttleId: slot.shuttleId,
    }));

    // Check for conflicts within the same trip
    const internalConflicts: Array<{
      slot1: { startTime: string; endTime: string; shuttleId: Id<"shuttles"> };
      slot2: { startTime: string; endTime: string; shuttleId: Id<"shuttles"> };
    }> = [];

    for (let i = 0; i < utcTripSlots.length; i++) {
      for (let j = i + 1; j < utcTripSlots.length; j++) {
        const slot1 = utcTripSlots[i];
        const slot2 = utcTripSlots[j];
        if (slot1.shuttleId === slot2.shuttleId) {
          if (
            timeRangesOverlap(
              slot1.startTime,
              slot1.endTime,
              slot2.startTime,
              slot2.endTime
            )
          ) {
            internalConflicts.push({ slot1, slot2 });
          }
        }
      }
    }

    if (internalConflicts.length > 0) {
      // Use cached shuttle data instead of querying again
      const conflictMessages = internalConflicts.map((conflict, idx) => {
        const shuttle = shuttleMap.get(conflict.slot1.shuttleId);
        const shuttleName = shuttle?.vehicleNumber || "Unknown Shuttle";
        return `${idx + 1}. Shuttle "${shuttleName}" has overlapping time slots: ${utcStringToTime(conflict.slot1.startTime)}-${utcStringToTime(conflict.slot1.endTime)} and ${utcStringToTime(conflict.slot2.startTime)}-${utcStringToTime(conflict.slot2.endTime)}`;
      });
      throw new Error(
        `Scheduling conflicts within this trip:\n${conflictMessages.join("\n")}`
      );
    }

    const conflictCheck = await ctx.runQuery(api.trips.checkTripSlotConflicts, {
      hotelId: hotel.id,
      tripSlots: utcTripSlots,
    });

    if (conflictCheck.hasConflict && conflictCheck.conflicts.length > 0) {
      // Get unique shuttle IDs from conflicts that we haven't already looked up
      const conflictShuttleIds = new Set<Id<"shuttles">>();
      for (const conflict of conflictCheck.conflicts) {
        if (!shuttleMap.has(conflict.slot.shuttleId)) {
          conflictShuttleIds.add(conflict.slot.shuttleId);
        }
      }

      // Batch lookup missing shuttles in parallel
      if (conflictShuttleIds.size > 0) {
        const missingShuttleLookups = Array.from(conflictShuttleIds).map(
          (shuttleId) => ctx.runQuery(api.shuttles.getShuttleById, { shuttleId })
        );
        const missingShuttles = await Promise.all(missingShuttleLookups);
        for (let i = 0; i < missingShuttles.length; i++) {
          const shuttle = missingShuttles[i];
          if (shuttle) {
            shuttleMap.set(Array.from(conflictShuttleIds)[i], shuttle);
          }
        }
      }

      // Use cached shuttle data
      const conflictMessages = conflictCheck.conflicts.map((conflict, idx) => {
        const shuttle = shuttleMap.get(conflict.slot.shuttleId);
        const shuttleName = shuttle?.vehicleNumber || "Unknown Shuttle";
        return `${idx + 1}. Shuttle "${shuttleName}" is already assigned from ${utcStringToTime(conflict.slot.startTime)} to ${utcStringToTime(conflict.slot.endTime)} in trip "${conflict.conflictingTrip.name}" (${utcStringToTime(conflict.conflictingTrip.slot.startTime)}-${utcStringToTime(conflict.conflictingTrip.slot.endTime)})`;
      });
      throw new Error(
        `Scheduling conflicts detected:\n${conflictMessages.join("\n")}`
      );
    }

    const tripId = await ctx.runMutation(internal.trips.createTripInternal, {
      name: args.name.trim(),
      sourceLocationId: args.sourceLocationId,
      destinationLocationId: args.destinationLocationId,
      charges: args.charges,
      hotelId: hotel.id,
    });

    const tripTimeIds: Id<"tripTimes">[] = [];

    for (const slot of utcTripSlots) {
      const tripTimeId = await ctx.runMutation(
        internal.trips.createTripTimeInternal,
        {
          tripId,
          shuttleId: slot.shuttleId,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }
      );
      tripTimeIds.push(tripTimeId);
    }

    await ctx.runMutation(internal.trips.updateTripTimesIdsInternal, {
      tripId,
      tripTimesIds: tripTimeIds,
    });

    const created = await ctx.runQuery(api.trips.getTripById, {
      tripId,
    });

    if (!created) {
      throw new Error("Trip not found after creation");
    }

    return created;
  },
});

export const updateTrip = action({
  args: {
    currentUserId: v.id("users"),
    tripId: v.id("trips"),
    name: v.string(),
    sourceLocationId: v.id("locations"),
    destinationLocationId: v.id("locations"),
    charges: v.number(),
    tripSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
        shuttleId: v.id("shuttles"),
      })
    ),
  },
  async handler(ctx, args): Promise<TripRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can update trips");
    }

    const userDoc = await ctx.runQuery(internal.users.getUserByIdInternal, {
      userId: args.currentUserId,
    });

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const existing = await ctx.runQuery(api.trips.getTripById, {
      tripId: args.tripId,
    });

    if (!existing) {
      throw new Error("Trip not found");
    }

    if (existing.hotelId !== hotel.id) {
      throw new Error("Trip does not belong to your hotel");
    }

    if (args.sourceLocationId === args.destinationLocationId) {
      throw new Error("Source and destination must be different");
    }

    if (args.charges <= 0) {
      throw new Error("Charges must be a positive number");
    }

    if (args.tripSlots.length === 0) {
      throw new Error("At least one trip slot is required");
    }

    // Parallelize location queries
    const [sourceLocation, destinationLocation] = await Promise.all([
      ctx.runQuery(api.locations.getLocationById, {
        locationId: args.sourceLocationId,
      }),
      ctx.runQuery(api.locations.getLocationById, {
        locationId: args.destinationLocationId,
      }),
    ]);

    if (!sourceLocation) {
      throw new Error("Source location not found");
    }

    if (sourceLocation.hotelId !== hotel.id) {
      throw new Error("Source location does not belong to your hotel");
    }

    if (!destinationLocation) {
      throw new Error("Destination location not found");
    }

    if (destinationLocation.hotelId !== hotel.id) {
      throw new Error("Destination location does not belong to your hotel");
    }

    // Validate time formats and collect unique shuttle IDs
    const timeRegex = /^([0-1][0-9]|2[0-3]):00$/;
    const uniqueShuttleIds = new Set<Id<"shuttles">>();

    for (const slot of args.tripSlots) {
      if (!timeRegex.test(slot.startTime)) {
        throw new Error(
          `Start time "${slot.startTime}" must be in hour-only format (HH:00)`
        );
      }
      if (!timeRegex.test(slot.endTime)) {
        throw new Error(
          `End time "${slot.endTime}" must be in hour-only format (HH:00)`
        );
      }

      const startDate = new Date(timeToUTCString(slot.startTime));
      const endDate = new Date(timeToUTCString(slot.endTime));

      if (startDate >= endDate) {
        throw new Error("Start time must be before end time");
      }

      const durationMinutes =
        (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      if (durationMinutes < 60) {
        throw new Error(
          "Minimum duration must be at least 1 hour between start and end time"
        );
      }

      uniqueShuttleIds.add(slot.shuttleId);
    }

    // Batch shuttle lookups in parallel
    const shuttleLookups = Array.from(uniqueShuttleIds).map((shuttleId) =>
      ctx.runQuery(api.shuttles.getShuttleById, { shuttleId })
    );
    const shuttles = await Promise.all(shuttleLookups);
    const shuttleMap = new Map<Id<"shuttles">, typeof shuttles[0]>();
    
    for (let i = 0; i < shuttles.length; i++) {
      const shuttle = shuttles[i];
      if (!shuttle) {
        throw new Error("Shuttle not found");
      }
      if (shuttle.hotelId !== hotel.id) {
        throw new Error("Shuttle does not belong to your hotel");
      }
      shuttleMap.set(Array.from(uniqueShuttleIds)[i], shuttle);
    }

    const utcTripSlots = args.tripSlots.map((slot) => ({
      startTime: timeToUTCString(slot.startTime),
      endTime: timeToUTCString(slot.endTime),
      shuttleId: slot.shuttleId,
    }));

    // Check for conflicts within the same trip
    const internalConflicts: Array<{
      slot1: { startTime: string; endTime: string; shuttleId: Id<"shuttles"> };
      slot2: { startTime: string; endTime: string; shuttleId: Id<"shuttles"> };
    }> = [];

    for (let i = 0; i < utcTripSlots.length; i++) {
      for (let j = i + 1; j < utcTripSlots.length; j++) {
        const slot1 = utcTripSlots[i];
        const slot2 = utcTripSlots[j];
        if (slot1.shuttleId === slot2.shuttleId) {
          if (
            timeRangesOverlap(
              slot1.startTime,
              slot1.endTime,
              slot2.startTime,
              slot2.endTime
            )
          ) {
            internalConflicts.push({ slot1, slot2 });
          }
        }
      }
    }

    if (internalConflicts.length > 0) {
      // Use cached shuttle data instead of querying again
      const conflictMessages = internalConflicts.map((conflict, idx) => {
        const shuttle = shuttleMap.get(conflict.slot1.shuttleId);
        const shuttleName = shuttle?.vehicleNumber || "Unknown Shuttle";
        return `${idx + 1}. Shuttle "${shuttleName}" has overlapping time slots: ${utcStringToTime(conflict.slot1.startTime)}-${utcStringToTime(conflict.slot1.endTime)} and ${utcStringToTime(conflict.slot2.startTime)}-${utcStringToTime(conflict.slot2.endTime)}`;
      });
      throw new Error(
        `Scheduling conflicts within this trip:\n${conflictMessages.join("\n")}`
      );
    }

    const conflictCheck = await ctx.runQuery(api.trips.checkTripSlotConflicts, {
      hotelId: hotel.id,
      tripSlots: utcTripSlots,
      excludeTripId: args.tripId,
    });

    if (conflictCheck.hasConflict && conflictCheck.conflicts.length > 0) {
      // Get unique shuttle IDs from conflicts that we haven't already looked up
      const conflictShuttleIds = new Set<Id<"shuttles">>();
      for (const conflict of conflictCheck.conflicts) {
        if (!shuttleMap.has(conflict.slot.shuttleId)) {
          conflictShuttleIds.add(conflict.slot.shuttleId);
        }
      }

      // Batch lookup missing shuttles in parallel
      if (conflictShuttleIds.size > 0) {
        const missingShuttleLookups = Array.from(conflictShuttleIds).map(
          (shuttleId) => ctx.runQuery(api.shuttles.getShuttleById, { shuttleId })
        );
        const missingShuttles = await Promise.all(missingShuttleLookups);
        for (let i = 0; i < missingShuttles.length; i++) {
          const shuttle = missingShuttles[i];
          if (shuttle) {
            shuttleMap.set(Array.from(conflictShuttleIds)[i], shuttle);
          }
        }
      }

      // Use cached shuttle data
      const conflictMessages = conflictCheck.conflicts.map((conflict, idx) => {
        const shuttle = shuttleMap.get(conflict.slot.shuttleId);
        const shuttleName = shuttle?.vehicleNumber || "Unknown Shuttle";
        return `${idx + 1}. Shuttle "${shuttleName}" is already assigned from ${utcStringToTime(conflict.slot.startTime)} to ${utcStringToTime(conflict.slot.endTime)} in trip "${conflict.conflictingTrip.name}" (${utcStringToTime(conflict.conflictingTrip.slot.startTime)}-${utcStringToTime(conflict.conflictingTrip.slot.endTime)})`;
      });
      throw new Error(
        `Scheduling conflicts detected:\n${conflictMessages.join("\n")}`
      );
    }

    const existingTripDoc = await ctx.runQuery(
      internal.trips.getTripByIdInternal,
      {
        tripId: args.tripId,
      }
    );

    if (!existingTripDoc) {
      throw new Error("Trip not found");
    }

    // Parallelize trip time deletions
    const deletePromises = existingTripDoc.tripTimesIds.map((tripTimeId) =>
      ctx.runMutation(internal.trips.deleteTripTimeInternal, {
        tripTimeId,
      })
    );
    await Promise.all(deletePromises);

    await ctx.runMutation(internal.trips.updateTripInternal, {
      tripId: args.tripId,
      name: args.name.trim(),
      sourceLocationId: args.sourceLocationId,
      destinationLocationId: args.destinationLocationId,
      charges: args.charges,
    });

    const tripTimeIds: Id<"tripTimes">[] = [];

    for (const slot of utcTripSlots) {
      const tripTimeId = await ctx.runMutation(
        internal.trips.createTripTimeInternal,
        {
          tripId: args.tripId,
          shuttleId: slot.shuttleId,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }
      );
      tripTimeIds.push(tripTimeId);
    }

    await ctx.runMutation(internal.trips.updateTripTimesIdsInternal, {
      tripId: args.tripId,
      tripTimesIds: tripTimeIds,
    });

    const updated = await ctx.runQuery(api.trips.getTripById, {
      tripId: args.tripId,
    });

    if (!updated) {
      throw new Error("Trip not found after update");
    }

    return updated;
  },
});

export const deleteTrip = action({
  args: {
    currentUserId: v.id("users"),
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can delete trips");
    }

    const userDoc = await ctx.runQuery(internal.users.getUserByIdInternal, {
      userId: args.currentUserId,
    });

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const existing = await ctx.runQuery(api.trips.getTripById, {
      tripId: args.tripId,
    });

    if (!existing) {
      throw new Error("Trip not found");
    }

    if (existing.hotelId !== hotel.id) {
      throw new Error("Trip does not belong to your hotel");
    }

    const existingTripDoc = await ctx.runQuery(
      internal.trips.getTripByIdInternal,
      {
        tripId: args.tripId,
      }
    );

    if (!existingTripDoc) {
      throw new Error("Trip not found");
    }

    for (const tripTimeId of existingTripDoc.tripTimesIds) {
      await ctx.runMutation(internal.trips.deleteTripTimeInternal, {
        tripTimeId,
      });
    }

    await ctx.runMutation(internal.trips.deleteTripInternal, {
      tripId: args.tripId,
    });

    return { success: true };
  },
});

export const createTripInternal = internalMutation({
  args: {
    name: v.string(),
    sourceLocationId: v.id("locations"),
    destinationLocationId: v.id("locations"),
    charges: v.float64(),
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    return await ctx.db.insert("trips", {
      name: args.name,
      sourceLocationId: args.sourceLocationId,
      destinationLocationId: args.destinationLocationId,
      charges: args.charges,
      hotelId: args.hotelId,
      tripTimesIds: [],
    });
  },
});

export const createTripTimeInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
    shuttleId: v.id("shuttles"),
    startTime: v.string(),
    endTime: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db.insert("tripTimes", {
      tripId: args.tripId,
      shuttleId: args.shuttleId,
      startTime: args.startTime,
      endTime: args.endTime,
    });
  },
});

export const updateTripInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
    sourceLocationId: v.id("locations"),
    destinationLocationId: v.id("locations"),
    charges: v.float64(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.tripId, {
      name: args.name,
      sourceLocationId: args.sourceLocationId,
      destinationLocationId: args.destinationLocationId,
      charges: args.charges,
    });
  },
});

export const updateTripTimesIdsInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
    tripTimesIds: v.array(v.id("tripTimes")),
  },
  async handler(ctx, args) {
    const validTripTimeIds: Id<"tripTimes">[] = [];
    for (const tripTimeId of args.tripTimesIds) {
      const tripTime = await ctx.db.get(tripTimeId);
      if (tripTime) {
        validTripTimeIds.push(tripTimeId);
      }
    }
    await ctx.db.patch(args.tripId, {
      tripTimesIds: validTripTimeIds,
    });
  },
});

export const deleteTripInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.tripId);
  },
});

export const deleteTripTimeInternal = internalMutation({
  args: {
    tripTimeId: v.id("tripTimes"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.tripTimeId);
  },
});

export const getTripByIdInternal = internalQuery({
  args: {
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    return await ctx.db.get(args.tripId);
  },
});

