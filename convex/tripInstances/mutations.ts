import { internalMutation, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";

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
      status: "SCHEDULED",
      bookingIds: [],
    });

    await ctx.runMutation(
      internal.routeInstances.mutations.createRouteInstancesForTripInstance,
      {
        tripInstanceId,
        tripId: args.tripId,
      }
    );

    return tripInstanceId;
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

export const updateTripInstancePriority = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
    priority: v.number(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.tripInstanceId, {
      tripInstancePriority: BigInt(args.priority),
    });
  },
});

export const startTripInstance = mutation({
  args: {
    driverId: v.id("users"),
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can start trip instances");
    }

    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new ConvexError("Trip instance not found");
    }

    if (tripInstance.shuttleId) {
      const shuttle = await ctx.db.get(tripInstance.shuttleId);
      if (!shuttle || shuttle.currentlyAssignedTo !== args.driverId) {
        throw new ConvexError("You are not assigned to this shuttle");
      }
    }

    if (tripInstance.status !== "SCHEDULED") {
      throw new ConvexError(
        `Cannot start trip. Current status: ${tripInstance.status}`
      );
    }

    await ctx.db.patch(args.tripInstanceId, {
      status: "IN_PROGRESS",
      actualStartTime: new Date().toISOString(),
    });

    // Notify all guests with confirmed bookings on this trip
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_trip_instance", (q) => q.eq("tripInstanceId", args.tripInstanceId))
      .filter((q) => q.eq(q.field("bookingStatus"), "CONFIRMED"))
      .collect();

    if (bookings.length > 0) {
      const guestIds = bookings.map(b => b.guestId);
      const trip = await ctx.db.get(tripInstance.tripId);
      const tripName = trip?.name || "Trip";
      
      await ctx.runMutation(internal.notifications.index.sendNotification, {
        title: "Trip Started",
        message: `Your ${tripName} on ${tripInstance.scheduledDate} has started. Please be ready for pickup.`,
        type: "GENERAL",
        relatedBookingId: undefined,
        userIds: guestIds,
      });
    }

    return { success: true, message: "Trip started successfully" };
  },
});

export const completeTripInstance = mutation({
  args: {
    driverId: v.id("users"),
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can complete trip instances");
    }

    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new ConvexError("Trip instance not found");
    }

    if (tripInstance.shuttleId) {
      const shuttle = await ctx.db.get(tripInstance.shuttleId);
      if (!shuttle || shuttle.currentlyAssignedTo !== args.driverId) {
        throw new ConvexError("You are not assigned to this shuttle");
      }
    }

    if (tripInstance.status !== "IN_PROGRESS") {
      throw new ConvexError(
        `Cannot complete trip. Current status: ${tripInstance.status}. Trip must be IN_PROGRESS first.`
      );
    }

    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    for (const ri of routeInstances) {
      if (!ri.completed) {
        await ctx.db.patch(ri._id, { completed: true });
      }
    }

    await ctx.db.patch(args.tripInstanceId, {
      status: "COMPLETED",
      actualEndTime: new Date().toISOString(),
    });

    // Notify all guests with confirmed bookings on this trip
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_trip_instance", (q) => q.eq("tripInstanceId", args.tripInstanceId))
      .filter((q) => q.eq(q.field("bookingStatus"), "CONFIRMED"))
      .collect();

    if (bookings.length > 0) {
      const guestIds = bookings.map(b => b.guestId);
      const trip = await ctx.db.get(tripInstance.tripId);
      const tripName = trip?.name || "Trip";
      
      await ctx.runMutation(internal.notifications.index.sendNotification, {
        title: "Trip Completed",
        message: `Your ${tripName} on ${tripInstance.scheduledDate} has been completed. Thank you for traveling with us!`,
        type: "GENERAL",
        relatedBookingId: undefined,
        userIds: guestIds,
      });
    }

    return { success: true, message: "Trip completed successfully" };
  },
});

export const cancelTripInstance = mutation({
  args: {
    driverId: v.id("users"),
    tripInstanceId: v.id("tripInstances"),
    reason: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can cancel trip instances");
    }

    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new ConvexError("Trip instance not found");
    }

    if (tripInstance.shuttleId) {
      const shuttle = await ctx.db.get(tripInstance.shuttleId);
      if (!shuttle || shuttle.currentlyAssignedTo !== args.driverId) {
        throw new ConvexError("You are not assigned to this shuttle");
      }
    }

    if (
      tripInstance.status === "COMPLETED" ||
      tripInstance.status === "CANCELLED"
    ) {
      throw new ConvexError(
        `Cannot cancel trip. Current status: ${tripInstance.status}`
      );
    }

    await ctx.db.patch(args.tripInstanceId, {
      status: "CANCELLED",
    });

    // Notify all guests with confirmed bookings on this trip
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_trip_instance", (q) => q.eq("tripInstanceId", args.tripInstanceId))
      .filter((q) => q.eq(q.field("bookingStatus"), "CONFIRMED"))
      .collect();

    if (bookings.length > 0) {
      const guestIds = bookings.map(b => b.guestId);
      const trip = await ctx.db.get(tripInstance.tripId);
      const tripName = trip?.name || "Trip";
      const reason = args.reason ? ` Reason: ${args.reason}` : "";
      
      await ctx.runMutation(internal.notifications.index.sendNotification, {
        title: "Trip Cancelled",
        message: `Your ${tripName} on ${tripInstance.scheduledDate} has been cancelled.${reason}`,
        type: "GENERAL",
        relatedBookingId: undefined,
        userIds: guestIds,
      });
    }

    return { success: true, message: "Trip cancelled successfully" };
  },
});

export const setTripInstancePriority = mutation({
  args: {
    driverId: v.id("users"),
    tripInstanceId: v.id("tripInstances"),
    priority: v.number(),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can set trip priority");
    }

    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      throw new ConvexError("Trip instance not found");
    }

    if (tripInstance.shuttleId) {
      const shuttle = await ctx.db.get(tripInstance.shuttleId);
      if (!shuttle || shuttle.currentlyAssignedTo !== args.driverId) {
        throw new ConvexError("You are not assigned to this shuttle");
      }
    }

    await ctx.db.patch(args.tripInstanceId, {
      tripInstancePriority: BigInt(args.priority),
    });

    return { success: true, message: "Priority updated successfully" };
  },
});
