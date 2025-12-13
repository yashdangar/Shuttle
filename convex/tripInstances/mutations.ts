import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const getOrCreateTripInstance = internalMutation({
  args: {
    tripId: v.id("trips"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    shuttleId: v.optional(v.id("shuttles")),
  },
  returns: v.id("tripInstances"),
  async handler(ctx, args) {
    const existingInstances = await ctx.db
      .query("tripInstances")
      .withIndex("by_trip_date_time", (q) =>
        q
          .eq("tripId", args.tripId)
          .eq("scheduledDate", args.scheduledDate)
          .eq("scheduledStartTime", args.scheduledStartTime)
      )
      .collect();

    const matchingInstance = existingInstances.find(
      (instance) =>
        instance.scheduledEndTime === args.scheduledEndTime &&
        instance.shuttleId === args.shuttleId
    );

    if (matchingInstance) {
      return matchingInstance._id;
    }

    const tripInstanceId = await ctx.db.insert("tripInstances", {
      tripId: args.tripId,
      scheduledDate: args.scheduledDate,
      scheduledStartTime: args.scheduledStartTime,
      scheduledEndTime: args.scheduledEndTime,
      shuttleId: args.shuttleId,
      seatsOccupied: BigInt(0),
      seatHeld: BigInt(0),
      status: "SCHEDULED",
      bookingIds: [],
    });

    return tripInstanceId;
  },
});

export const updateTripInstanceSeats = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
    seatsHeldDelta: v.number(),
    seatsOccupiedDelta: v.number(),
  },
  async handler(ctx, args) {
    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new Error("TripInstance not found");
    }

    const newSeatHeld = Number(tripInstance.seatHeld) + args.seatsHeldDelta;
    const newSeatsOccupied =
      Number(tripInstance.seatsOccupied) + args.seatsOccupiedDelta;

    await ctx.db.patch(args.tripInstanceId, {
      seatHeld: BigInt(Math.max(0, newSeatHeld)),
      seatsOccupied: BigInt(Math.max(0, newSeatsOccupied)),
    });
  },
});

export const addBookingToTripInstance = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new Error("TripInstance not found");
    }

    if (!tripInstance.bookingIds.includes(args.bookingId)) {
      await ctx.db.patch(args.tripInstanceId, {
        bookingIds: [...tripInstance.bookingIds, args.bookingId],
      });
    }
  },
});

export const removeBookingFromTripInstance = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new Error("TripInstance not found");
    }

    await ctx.db.patch(args.tripInstanceId, {
      bookingIds: tripInstance.bookingIds.filter((id) => id !== args.bookingId),
    });
  },
});

export const updateTripInstanceStatus = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
    actualStartTime: v.optional(v.string()),
    actualEndTime: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new Error("TripInstance not found");
    }

    const updateData: {
      status: typeof args.status;
      actualStartTime?: string;
      actualEndTime?: string;
    } = { status: args.status };

    if (args.actualStartTime) {
      updateData.actualStartTime = args.actualStartTime;
    }
    if (args.actualEndTime) {
      updateData.actualEndTime = args.actualEndTime;
    }

    await ctx.db.patch(args.tripInstanceId, updateData);
  },
});
