import { internalMutation, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

export const createRouteInstancesForTripInstance = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    const routes = await ctx.db
      .query("routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    const sortedRoutes = routes.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    const routeInstanceIds: Id<"routeInstances">[] = [];

    for (const route of sortedRoutes) {
      const routeInstanceId = await ctx.db.insert("routeInstances", {
        tripInstanceId: args.tripInstanceId,
        routeId: route._id,
        orderIndex: route.orderIndex,
        seatsOccupied: BigInt(0),
        seatHeld: BigInt(0),
        completed: false,
      });
      routeInstanceIds.push(routeInstanceId);
    }

    return routeInstanceIds;
  },
});

export const updateRouteInstanceSeats = internalMutation({
  args: {
    routeInstanceId: v.id("routeInstances"),
    seatHeldDelta: v.number(),
    seatsOccupiedDelta: v.number(),
  },
  async handler(ctx, args) {
    const routeInstance = await ctx.db.get(args.routeInstanceId);
    if (!routeInstance) {
      throw new Error("RouteInstance not found");
    }

    const newSeatHeld = Math.max(
      0,
      Number(routeInstance.seatHeld) + args.seatHeldDelta
    );
    const newSeatsOccupied = Math.max(
      0,
      Number(routeInstance.seatsOccupied) + args.seatsOccupiedDelta
    );

    await ctx.db.patch(args.routeInstanceId, {
      seatHeld: BigInt(newSeatHeld),
      seatsOccupied: BigInt(newSeatsOccupied),
    });
  },
});

export const updateMultipleRouteInstanceSeats = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
    fromIndex: v.number(),
    toIndex: v.number(),
    seatHeldDelta: v.number(),
    seatsOccupiedDelta: v.number(),
  },
  async handler(ctx, args) {
    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    for (const ri of routeInstances) {
      const orderIndex = Number(ri.orderIndex);
      if (orderIndex >= args.fromIndex && orderIndex <= args.toIndex) {
        const newSeatHeld = Math.max(
          0,
          Number(ri.seatHeld) + args.seatHeldDelta
        );
        const newSeatsOccupied = Math.max(
          0,
          Number(ri.seatsOccupied) + args.seatsOccupiedDelta
        );

        await ctx.db.patch(ri._id, {
          seatHeld: BigInt(newSeatHeld),
          seatsOccupied: BigInt(newSeatsOccupied),
        });
      }
    }
  },
});

export const completeRouteInstance = mutation({
  args: {
    driverId: v.id("users"),
    routeInstanceId: v.id("routeInstances"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can complete route instances");
    }

    const routeInstance = await ctx.db.get(args.routeInstanceId);
    if (!routeInstance) {
      throw new ConvexError("Route instance not found");
    }

    const tripInstance = await ctx.db.get(routeInstance.tripInstanceId);
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
        "Trip must be IN_PROGRESS to complete route segments"
      );
    }

    if (routeInstance.completed) {
      throw new ConvexError("Route segment already completed");
    }

    const route = await ctx.db.get(routeInstance.routeId);
    if (!route) {
      throw new ConvexError("Route not found");
    }

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", tripInstance._id)
      )
      .collect();

    let seatsToRelease = 0;
    for (const booking of bookings) {
      if (
        booking.bookingStatus === "CONFIRMED" &&
        booking.toRouteIndex !== undefined &&
        Number(booking.toRouteIndex) === Number(routeInstance.orderIndex)
      ) {
        seatsToRelease += Number(booking.seats);
      }
    }

    await ctx.db.patch(args.routeInstanceId, {
      completed: true,
      seatsOccupied: BigInt(
        Math.max(0, Number(routeInstance.seatsOccupied) - seatsToRelease)
      ),
    });

    const allRouteInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", tripInstance._id)
      )
      .collect();

    const allCompleted = allRouteInstances.every((ri) => ri.completed);

    if (allCompleted) {
      await ctx.db.patch(tripInstance._id, {
        status: "COMPLETED",
        actualEndTime: new Date().toISOString(),
      });
    }

    return {
      success: true,
      message: "Route segment completed",
      allRoutesCompleted: allCompleted,
    };
  },
});

export const uncompleteRouteInstance = mutation({
  args: {
    driverId: v.id("users"),
    routeInstanceId: v.id("routeInstances"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can modify route instances");
    }

    const routeInstance = await ctx.db.get(args.routeInstanceId);
    if (!routeInstance) {
      throw new ConvexError("Route instance not found");
    }

    const tripInstance = await ctx.db.get(routeInstance.tripInstanceId);
    if (!tripInstance) {
      throw new ConvexError("Trip instance not found");
    }

    if (tripInstance.shuttleId) {
      const shuttle = await ctx.db.get(tripInstance.shuttleId);
      if (!shuttle || shuttle.currentlyAssignedTo !== args.driverId) {
        throw new ConvexError("You are not assigned to this shuttle");
      }
    }

    if (!routeInstance.completed) {
      throw new ConvexError("Route segment is not completed");
    }

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", tripInstance._id)
      )
      .collect();

    let seatsToRestore = 0;
    for (const booking of bookings) {
      if (
        booking.bookingStatus === "CONFIRMED" &&
        booking.toRouteIndex !== undefined &&
        Number(booking.toRouteIndex) === Number(routeInstance.orderIndex)
      ) {
        seatsToRestore += Number(booking.seats);
      }
    }

    await ctx.db.patch(args.routeInstanceId, {
      completed: false,
      seatsOccupied: BigInt(
        Number(routeInstance.seatsOccupied) + seatsToRestore
      ),
    });

    if (tripInstance.status === "COMPLETED") {
      await ctx.db.patch(tripInstance._id, {
        status: "IN_PROGRESS",
        actualEndTime: undefined,
      });
    }

    return { success: true, message: "Route segment uncompleted" };
  },
});

export const updateRouteInstanceETA = internalMutation({
  args: {
    routeInstanceId: v.id("routeInstances"),
    eta: v.string(),
  },
  async handler(ctx, args) {
    const routeInstance = await ctx.db.get(args.routeInstanceId);
    if (!routeInstance) {
      throw new Error("RouteInstance not found");
    }

    await ctx.db.patch(args.routeInstanceId, {
      eta: args.eta,
    });
  },
});

export const updateMultipleRouteInstanceETAs = internalMutation({
  args: {
    updates: v.array(
      v.object({
        routeInstanceId: v.id("routeInstances"),
        eta: v.string(),
      })
    ),
  },
  async handler(ctx, args) {
    for (const update of args.updates) {
      await ctx.db.patch(update.routeInstanceId, {
        eta: update.eta,
      });
    }
  },
});

export const deleteRouteInstancesForTripInstance = internalMutation({
  args: {
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    for (const ri of routeInstances) {
      await ctx.db.delete(ri._id);
    }
  },
});
