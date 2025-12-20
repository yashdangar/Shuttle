import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";

export type TripTimeRecord = {
  id: Id<"tripTimes">;
  tripId: Id<"trips">;
  startTime: string;
  endTime: string;
  startTimeDisplay: string;
  endTimeDisplay: string;
};

export type RouteRecord = {
  id: Id<"routes">;
  tripId: Id<"trips">;
  startLocationId: Id<"locations">;
  endLocationId: Id<"locations">;
  startLocationName: string;
  endLocationName: string;
  charges: number;
  orderIndex: number;
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

export type TripRecord = {
  id: Id<"trips">;
  name: string;
  hotelId: Id<"hotels">;
  routes: RouteRecord[];
  tripSlots: TripTimeRecord[];
  totalCharges: number;
  createdAt: number;
};

const formatTripTime = async (
  _ctx: any,
  tripTime: Doc<"tripTimes">
): Promise<TripTimeRecord> => {
  return {
    id: tripTime._id,
    tripId: tripTime.tripId,
    startTime: tripTime.startTime,
    endTime: tripTime.endTime,
    startTimeDisplay: utcStringToTime(tripTime.startTime),
    endTimeDisplay: utcStringToTime(tripTime.endTime),
  };
};

const formatTrip = async (
  ctx: any,
  trip: Doc<"trips">
): Promise<TripRecord> => {
  const routes = await ctx.db
    .query("routes")
    .withIndex("by_trip", (q: any) => q.eq("tripId", trip._id))
    .collect();

  const sortedRoutes = routes.sort(
    (a: Doc<"routes">, b: Doc<"routes">) =>
      Number(a.orderIndex) - Number(b.orderIndex)
  );

  const routeRecords: RouteRecord[] = await Promise.all(
    sortedRoutes.map(async (route: Doc<"routes">) => {
      const [startLoc, endLoc] = await Promise.all([
        ctx.db.get(route.startLocationId),
        ctx.db.get(route.endLocationId),
      ]);

      return {
        id: route._id,
        tripId: route.tripId,
        startLocationId: route.startLocationId,
        endLocationId: route.endLocationId,
        startLocationName: startLoc?.name ?? "Unknown",
        endLocationName: endLoc?.name ?? "Unknown",
        charges: route.charges,
        orderIndex: Number(route.orderIndex),
      };
    })
  );

  const totalCharges = routeRecords.reduce((sum, r) => sum + r.charges, 0);

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
    hotelId: trip.hotelId,
    routes: routeRecords,
    tripSlots,
    totalCharges,
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

export const listHotelTrips = query({
  args: {
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId))
      .collect();

    const formattedTrips = await Promise.all(
      trips.map((trip) => formatTrip(ctx, trip))
    );

    return formattedTrips;
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

export const getAvailableSlotsForTrip = query({
  args: {
    tripId: v.id("trips"),
    hotelId: v.id("hotels"),
    scheduledDate: v.string(),
    requiredSeats: v.number(),
    fromRouteIndex: v.optional(v.number()),
    toRouteIndex: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      return [];
    }

    const routes = await ctx.db
      .query("routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    if (routes.length === 0) {
      return [];
    }

    const fromIndex = args.fromRouteIndex ?? 0;
    const toIndex = args.toRouteIndex ?? routes.length - 1;

    const tripTimes: Doc<"tripTimes">[] = [];
    for (const tripTimeId of trip.tripTimesIds) {
      const tripTime = await ctx.db.get(tripTimeId);
      if (tripTime) {
        tripTimes.push(tripTime);
      }
    }

    if (tripTimes.length === 0) {
      return [];
    }

    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", args.hotelId).eq("isActive", true)
      )
      .collect();

    if (shuttles.length === 0) {
      return [];
    }

    const maxShuttleCapacity = Math.max(
      ...shuttles.map((s) => Number(s.totalSeats))
    );

    if (args.requiredSeats > maxShuttleCapacity) {
      return [];
    }

    const parseTimeToHour = (timeStr: string): number => {
      if (timeStr.includes("T")) {
        const date = new Date(timeStr);
        return date.getUTCHours();
      } else if (timeStr.includes(":")) {
        const [hours] = timeStr.split(":");
        return parseInt(hours, 10);
      }
      return parseInt(timeStr, 10);
    };

    const hourToISOTime = (hour: number): string => {
      const paddedHour = String(hour).padStart(2, "0");
      return `1970-01-01T${paddedHour}:00:00.000Z`;
    };

    const checkSlotAvailability = async (
      slotStartTime: string,
      slotEndTime: string
    ): Promise<boolean> => {
      for (const shuttle of shuttles) {
        if (Number(shuttle.totalSeats) < args.requiredSeats) {
          continue;
        }

        const existingInstances = await ctx.db
          .query("tripInstances")
          .withIndex("by_trip_date_time", (q) =>
            q
              .eq("tripId", args.tripId)
              .eq("scheduledDate", args.scheduledDate)
              .eq("scheduledStartTime", slotStartTime)
          )
          .collect();

        const matchingInstance = existingInstances.find(
          (instance) =>
            instance.scheduledEndTime === slotEndTime &&
            instance.shuttleId === shuttle._id
        );

        if (!matchingInstance) {
          return true;
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
          let anySegmentCompleted = false;
          for (const ri of routeInstances) {
            const orderIdx = Number(ri.orderIndex);
            if (orderIdx >= fromIndex && orderIdx <= toIndex) {
              if (ri.completed) {
                anySegmentCompleted = true;
                break;
              }
            }
          }
          if (anySegmentCompleted) {
            continue;
          }
        }

        let maxUsed = 0;
        for (const ri of routeInstances) {
          const orderIdx = Number(ri.orderIndex);
          if (orderIdx >= fromIndex && orderIdx <= toIndex) {
            const used = Number(ri.seatsOccupied) + Number(ri.seatHeld);
            maxUsed = Math.max(maxUsed, used);
          }
        }

        const availableSeats = Number(shuttle.totalSeats) - maxUsed;
        if (availableSeats >= args.requiredSeats) {
          return true;
        }
      }

      return false;
    };

    const allSlots: Array<{
      startTime: string;
      endTime: string;
      startTimeDisplay: string;
      endTimeDisplay: string;
    }> = [];

    for (const tripTime of tripTimes) {
      const startHour = parseTimeToHour(tripTime.startTime);
      const endHour = parseTimeToHour(tripTime.endTime);

      for (let hour = startHour; hour < endHour; hour++) {
        const slotStartTime = hourToISOTime(hour);
        const slotEndTime = hourToISOTime(hour + 1);
        allSlots.push({
          startTime: slotStartTime,
          endTime: slotEndTime,
          startTimeDisplay: utcStringToTime(slotStartTime),
          endTimeDisplay: utcStringToTime(slotEndTime),
        });
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const isToday = args.scheduledDate === today;
    const currentHour = isToday ? new Date().getHours() : -1;

    const availableSlots = [];
    for (const slot of allSlots) {
      const slotHour = parseTimeToHour(slot.startTime);

      if (isToday && slotHour < currentHour) {
        continue;
      }

      const isAvailable = await checkSlotAvailability(
        slot.startTime,
        slot.endTime
      );

      if (isAvailable) {
        availableSlots.push(slot);
      }
    }

    return availableSlots;
  },
});

export const getMaxShuttleCapacity = query({
  args: {
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", args.hotelId).eq("isActive", true)
      )
      .collect();

    if (shuttles.length === 0) {
      return { maxCapacity: 0 };
    }

    const maxCapacity = Math.max(...shuttles.map((s) => Number(s.totalSeats)));

    return { maxCapacity };
  },
});

export const getSlotCapacity = query({
  args: {
    tripId: v.id("trips"),
    hotelId: v.id("hotels"),
    scheduledDate: v.string(),
    slotStartTime: v.string(),
    slotEndTime: v.string(),
    fromRouteIndex: v.optional(v.number()),
    toRouteIndex: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      return { maxCapacity: 0, availableCapacity: 0 };
    }

    const routes = await ctx.db
      .query("routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    const fromIndex = args.fromRouteIndex ?? 0;
    const toIndex = args.toRouteIndex ?? routes.length - 1;

    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", args.hotelId).eq("isActive", true)
      )
      .collect();

    if (shuttles.length === 0) {
      return { maxCapacity: 0, availableCapacity: 0 };
    }

    let maxCapacity = 0;
    let maxAvailableCapacity = 0;

    for (const shuttle of shuttles) {
      const totalSeats = Number(shuttle.totalSeats);
      maxCapacity = Math.max(maxCapacity, totalSeats);

      const existingInstances = await ctx.db
        .query("tripInstances")
        .withIndex("by_trip_date_time", (q) =>
          q
            .eq("tripId", args.tripId)
            .eq("scheduledDate", args.scheduledDate)
            .eq("scheduledStartTime", args.slotStartTime)
        )
        .collect();

      const matchingInstance = existingInstances.find(
        (instance) =>
          instance.scheduledEndTime === args.slotEndTime &&
          instance.shuttleId === shuttle._id &&
          instance.status === "SCHEDULED"
      );

      if (!matchingInstance) {
        maxAvailableCapacity = Math.max(maxAvailableCapacity, totalSeats);
      } else {
        const routeInstances = await ctx.db
          .query("routeInstances")
          .withIndex("by_trip_instance", (q) =>
            q.eq("tripInstanceId", matchingInstance._id)
          )
          .collect();

        let maxUsed = 0;
        for (const ri of routeInstances) {
          const orderIdx = Number(ri.orderIndex);
          if (orderIdx >= fromIndex && orderIdx <= toIndex) {
            const used = Number(ri.seatsOccupied) + Number(ri.seatHeld);
            maxUsed = Math.max(maxUsed, used);
          }
        }

        const availableSeats = totalSeats - maxUsed;
        maxAvailableCapacity = Math.max(maxAvailableCapacity, availableSeats);
      }
    }

    return {
      maxCapacity,
      availableCapacity: maxAvailableCapacity,
    };
  },
});

export const createTrip = action({
  args: {
    currentUserId: v.id("users"),
    name: v.string(),
    stops: v.array(
      v.object({
        locationId: v.id("locations"),
        charges: v.number(),
      })
    ),
    tripSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
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

    const userDoc = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.currentUserId,
      }
    );

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    if (args.stops.length < 2) {
      throw new Error("At least 2 stops are required to create a trip");
    }

    if (args.tripSlots.length === 0) {
      throw new Error("At least one trip slot is required");
    }

    for (const stop of args.stops) {
      const location = await ctx.runQuery(api.locations.index.getLocationById, {
        locationId: stop.locationId,
      });

      if (!location) {
        throw new Error("Location not found");
      }

      if (location.hotelId !== hotel.id) {
        throw new Error("Location does not belong to your hotel");
      }
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):00$/;
    const seenSlots = new Set<string>();

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

      const slotKey = `${slot.startTime}-${slot.endTime}`;
      if (seenSlots.has(slotKey)) {
        throw new Error(
          `Duplicate trip slot ${slot.startTime}-${slot.endTime} is not allowed`
        );
      }
      seenSlots.add(slotKey);
    }

    const utcTripSlots = args.tripSlots.map((slot) => ({
      startTime: timeToUTCString(slot.startTime),
      endTime: timeToUTCString(slot.endTime),
    }));

    const tripId = await ctx.runMutation(
      internal.trips.index.createTripInternal,
      {
        name: args.name.trim(),
        hotelId: hotel.id,
      }
    );

    await ctx.runMutation(internal.hotels.index.addTripToHotelInternal, {
      hotelId: hotel.id,
      tripId,
    });

    const routeIds: Id<"routes">[] = [];

    for (let i = 0; i < args.stops.length - 1; i++) {
      const routeId = await ctx.runMutation(
        internal.routes.index.createRouteInternal,
        {
          tripId,
          startLocationId: args.stops[i].locationId,
          endLocationId: args.stops[i + 1].locationId,
          charges: args.stops[i].charges,
          orderIndex: i,
        }
      );
      routeIds.push(routeId);
    }

    await ctx.runMutation(internal.trips.index.updateTripRouteIdsInternal, {
      tripId,
      routeIds,
    });

    const tripTimeIds: Id<"tripTimes">[] = [];

    for (const slot of utcTripSlots) {
      const tripTimeId = await ctx.runMutation(
        internal.trips.index.createTripTimeInternal,
        {
          tripId,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }
      );
      tripTimeIds.push(tripTimeId);
    }

    await ctx.runMutation(internal.trips.index.updateTripTimesIdsInternal, {
      tripId,
      tripTimesIds: tripTimeIds,
    });

    const created = await ctx.runQuery(api.trips.index.getTripById, {
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
    stops: v.array(
      v.object({
        locationId: v.id("locations"),
        charges: v.number(),
      })
    ),
    tripSlots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
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

    const userDoc = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.currentUserId,
      }
    );

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const existing = await ctx.runQuery(api.trips.index.getTripById, {
      tripId: args.tripId,
    });

    if (!existing) {
      throw new Error("Trip not found");
    }

    if (existing.hotelId !== hotel.id) {
      throw new Error("Trip does not belong to your hotel");
    }

    if (args.stops.length < 2) {
      throw new Error("At least 2 stops are required");
    }

    if (args.tripSlots.length === 0) {
      throw new Error("At least one trip slot is required");
    }

    for (const stop of args.stops) {
      const location = await ctx.runQuery(api.locations.index.getLocationById, {
        locationId: stop.locationId,
      });

      if (!location) {
        throw new Error("Location not found");
      }

      if (location.hotelId !== hotel.id) {
        throw new Error("Location does not belong to your hotel");
      }
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):00$/;
    const seenSlots = new Set<string>();

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

      const slotKey = `${slot.startTime}-${slot.endTime}`;
      if (seenSlots.has(slotKey)) {
        throw new Error(
          `Duplicate trip slot ${slot.startTime}-${slot.endTime} is not allowed`
        );
      }
      seenSlots.add(slotKey);
    }

    const utcTripSlots = args.tripSlots.map((slot) => ({
      startTime: timeToUTCString(slot.startTime),
      endTime: timeToUTCString(slot.endTime),
    }));

    const existingTripDoc = await ctx.runQuery(
      internal.trips.index.getTripByIdInternal,
      {
        tripId: args.tripId,
      }
    );

    if (!existingTripDoc) {
      throw new Error("Trip not found");
    }

    for (const tripTimeId of existingTripDoc.tripTimesIds) {
      await ctx.runMutation(internal.trips.index.deleteTripTimeInternal, {
        tripTimeId,
      });
    }

    await ctx.runMutation(internal.routes.index.deleteRoutesByTripInternal, {
      tripId: args.tripId,
    });

    await ctx.runMutation(internal.trips.index.updateTripInternal, {
      tripId: args.tripId,
      name: args.name.trim(),
    });

    const routeIds: Id<"routes">[] = [];

    for (let i = 0; i < args.stops.length - 1; i++) {
      const routeId = await ctx.runMutation(
        internal.routes.index.createRouteInternal,
        {
          tripId: args.tripId,
          startLocationId: args.stops[i].locationId,
          endLocationId: args.stops[i + 1].locationId,
          charges: args.stops[i].charges,
          orderIndex: i,
        }
      );
      routeIds.push(routeId);
    }

    await ctx.runMutation(internal.trips.index.updateTripRouteIdsInternal, {
      tripId: args.tripId,
      routeIds,
    });

    const tripTimeIds: Id<"tripTimes">[] = [];

    for (const slot of utcTripSlots) {
      const tripTimeId = await ctx.runMutation(
        internal.trips.index.createTripTimeInternal,
        {
          tripId: args.tripId,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }
      );
      tripTimeIds.push(tripTimeId);
    }

    await ctx.runMutation(internal.trips.index.updateTripTimesIdsInternal, {
      tripId: args.tripId,
      tripTimesIds: tripTimeIds,
    });

    const updated = await ctx.runQuery(api.trips.index.getTripById, {
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

    const userDoc = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.currentUserId,
      }
    );

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const existing = await ctx.runQuery(api.trips.index.getTripById, {
      tripId: args.tripId,
    });

    if (!existing) {
      throw new Error("Trip not found");
    }

    if (existing.hotelId !== hotel.id) {
      throw new Error("Trip does not belong to your hotel");
    }

    const existingTripDoc = await ctx.runQuery(
      internal.trips.index.getTripByIdInternal,
      {
        tripId: args.tripId,
      }
    );

    if (!existingTripDoc) {
      throw new Error("Trip not found");
    }

    for (const tripTimeId of existingTripDoc.tripTimesIds) {
      await ctx.runMutation(internal.trips.index.deleteTripTimeInternal, {
        tripTimeId,
      });
    }

    await ctx.runMutation(internal.routes.index.deleteRoutesByTripInternal, {
      tripId: args.tripId,
    });

    await ctx.runMutation(internal.hotels.index.removeTripFromHotelInternal, {
      hotelId: hotel.id,
      tripId: args.tripId,
    });

    await ctx.runMutation(internal.trips.index.deleteTripInternal, {
      tripId: args.tripId,
    });

    return { success: true };
  },
});

export const createTripInternal = internalMutation({
  args: {
    name: v.string(),
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    return await ctx.db.insert("trips", {
      name: args.name,
      hotelId: args.hotelId,
      routeIds: [],
      tripTimesIds: [],
    });
  },
});

export const createTripTimeInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
    startTime: v.string(),
    endTime: v.string(),
  },
  async handler(ctx, args) {
    return await ctx.db.insert("tripTimes", {
      tripId: args.tripId,
      startTime: args.startTime,
      endTime: args.endTime,
    });
  },
});

export const updateTripInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.tripId, {
      name: args.name,
    });
  },
});

export const updateTripRouteIdsInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
    routeIds: v.array(v.id("routes")),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.tripId, {
      routeIds: args.routeIds,
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
