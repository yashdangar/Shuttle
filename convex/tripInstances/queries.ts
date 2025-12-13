import { query } from "../_generated/server";
import { v } from "convex/values";

// Helper to get current UTC date string
function getUTCDateString(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split("T")[0];
}

export const getDriverTripInstances = query({
  args: {
    driverId: v.id("users"),
    date: v.optional(v.string()), // UTC date string, defaults to today
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      return [];
    }

    // Get the date to query (use provided date or current UTC date)
    const targetDate = args.date || getUTCDateString();

    // Find all shuttles currently assigned to this driver
    const allShuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", driver.hotelId!).eq("isActive", true)
      )
      .collect();

    const driverShuttles = allShuttles.filter(
      (s) => s.currentlyAssignedTo === args.driverId
    );

    if (driverShuttles.length === 0) {
      return [];
    }

    // Get trip instances for all shuttles assigned to this driver for the target date
    const allTripInstances = [];

    for (const shuttle of driverShuttles) {
      const instances = await ctx.db
        .query("tripInstances")
        .withIndex("by_shuttle_date", (q) =>
          q.eq("shuttleId", shuttle._id).eq("scheduledDate", targetDate)
        )
        .collect();

      for (const instance of instances) {
        allTripInstances.push({ ...instance, shuttle });
      }
    }

    const results = await Promise.all(
      allTripInstances.map(async ({ shuttle, ...instance }) => {
        const trip = await ctx.db.get(instance.tripId);
        if (!trip) {
          return null;
        }

        const [sourceLocation, destinationLocation] = await Promise.all([
          ctx.db.get(trip.sourceLocationId),
          ctx.db.get(trip.destinationLocationId),
        ]);

        return {
          _id: instance._id,
          tripId: instance.tripId,
          tripName: trip.name,
          sourceLocation: sourceLocation?.name ?? "Unknown",
          destinationLocation: destinationLocation?.name ?? "Unknown",
          scheduledDate: instance.scheduledDate,
          scheduledStartTime: instance.scheduledStartTime,
          scheduledEndTime: instance.scheduledEndTime,
          seatsOccupied: Number(instance.seatsOccupied),
          seatsHeld: Number(instance.seatHeld),
          totalSeats: Number(shuttle.totalSeats),
          status: instance.status,
          shuttleId: shuttle._id,
          vehicleNumber: shuttle.vehicleNumber,
          bookingCount: instance.bookingIds.length,
        };
      })
    );

    // Sort by start time
    return results
      .filter((r) => r !== null)
      .sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
  },
});

export const getTripInstanceAvailability = query({
  args: {
    tripId: v.id("trips"),
    hotelId: v.id("hotels"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
  },
  async handler(ctx, args) {
    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", args.hotelId).eq("isActive", true)
      )
      .collect();

    const shuttleAvailability = await Promise.all(
      shuttles.map(async (shuttle) => {
        const tripInstances = await ctx.db
          .query("tripInstances")
          .withIndex("by_shuttle_date", (q) =>
            q
              .eq("shuttleId", shuttle._id)
              .eq("scheduledDate", args.scheduledDate)
          )
          .collect();

        const matchingInstance = tripInstances.find(
          (instance) =>
            instance.scheduledStartTime === args.scheduledStartTime &&
            instance.scheduledEndTime === args.scheduledEndTime
        );

        const usedSeats = matchingInstance
          ? Number(matchingInstance.seatsOccupied) +
            Number(matchingInstance.seatHeld)
          : 0;

        const availableSeats = Number(shuttle.totalSeats) - usedSeats;

        return {
          shuttleId: shuttle._id,
          vehicleNumber: shuttle.vehicleNumber,
          availableSeats: Math.max(0, availableSeats),
        };
      })
    );

    const totalAvailableSeats = shuttleAvailability.reduce(
      (sum, s) => sum + s.availableSeats,
      0
    );

    return {
      totalAvailableSeats,
      shuttles: shuttleAvailability.filter((s) => s.availableSeats > 0),
    };
  },
});

export const getTripInstanceById = query({
  args: {
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const instance = await ctx.db.get(args.tripInstanceId);
    if (!instance) return null;

    // Get driver from shuttle
    let driverInfo = null;
    if (instance.shuttleId) {
      const shuttle = await ctx.db.get(instance.shuttleId);
      if (shuttle?.currentlyAssignedTo) {
        const driver = await ctx.db.get(shuttle.currentlyAssignedTo);
        if (driver) {
          driverInfo = {
            _id: driver._id,
            name: driver.name,
            phoneNumber: driver.phoneNumber,
          };
        }
      }
    }

    return {
      ...instance,
      seatsOccupied: Number(instance.seatsOccupied),
      seatHeld: Number(instance.seatHeld),
      driverInfo,
    };
  },
});

export const getTripInstancesByShuttleAndDate = query({
  args: {
    shuttleId: v.id("shuttles"),
    date: v.string(), // UTC date string YYYY-MM-DD
  },
  async handler(ctx, args) {
    const instances = await ctx.db
      .query("tripInstances")
      .withIndex("by_shuttle_date", (q) =>
        q.eq("shuttleId", args.shuttleId).eq("scheduledDate", args.date)
      )
      .collect();

    const results = await Promise.all(
      instances.map(async (instance) => {
        const trip = await ctx.db.get(instance.tripId);

        return {
          _id: instance._id,
          tripName: trip?.name ?? "Unknown Trip",
          scheduledStartTime: instance.scheduledStartTime,
          scheduledEndTime: instance.scheduledEndTime,
          status: instance.status,
          seatsOccupied: Number(instance.seatsOccupied),
          seatsHeld: Number(instance.seatHeld),
          bookingCount: instance.bookingIds.length,
        };
      })
    );

    return results.sort((a, b) =>
      a.scheduledStartTime.localeCompare(b.scheduledStartTime)
    );
  },
});
