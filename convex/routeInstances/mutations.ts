import {
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  QueryCtx,
} from "../_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

async function getRoutesWithBookings(
  ctx: QueryCtx | MutationCtx,
  tripInstanceId: Id<"tripInstances">
): Promise<Set<number>> {
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_trip_instance", (q) =>
      q.eq("tripInstanceId", tripInstanceId)
    )
    .collect();

  const routeIndicesWithBookings = new Set<number>();

  for (const booking of bookings) {
    if (
      booking.bookingStatus === "CONFIRMED" ||
      booking.bookingStatus === "PENDING"
    ) {
      const fromIdx = Number(booking.fromRouteIndex ?? 0);
      const toIdx = Number(booking.toRouteIndex ?? 0);
      for (let i = fromIdx; i <= toIdx; i++) {
        routeIndicesWithBookings.add(i);
      }
    }
  }

  return routeIndicesWithBookings;
}

export const getEffectiveNextRouteIndex = internalQuery({
  args: {
    tripInstanceId: v.id("tripInstances"),
    currentIndex: v.number(),
  },
  async handler(ctx, args) {
    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    const sortedRouteInstances = routeInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    const routesWithBookings = await getRoutesWithBookings(
      ctx,
      args.tripInstanceId
    );

    for (let i = args.currentIndex + 1; i < sortedRouteInstances.length; i++) {
      if (routesWithBookings.has(i)) {
        return i;
      }
    }

    return sortedRouteInstances.length - 1;
  },
});

export const getSkippableRoutes = internalQuery({
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

    const sortedRouteInstances = routeInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    const routesWithBookings = await getRoutesWithBookings(
      ctx,
      args.tripInstanceId
    );

    const skippableIndices: number[] = [];

    for (let i = 0; i < sortedRouteInstances.length - 1; i++) {
      if (!routesWithBookings.has(i)) {
        skippableIndices.push(i);
      }
    }

    return skippableIndices;
  },
});

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

export const startNextRouteSegment = mutation({
  args: {
    driverId: v.id("users"),
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can advance route segments");
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
        "Trip must be IN_PROGRESS to advance route segments"
      );
    }

    const allRouteInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    const sortedRouteInstances = allRouteInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    const currentRouteIndex = sortedRouteInstances.findIndex(
      (ri) => !ri.completed
    );

    if (currentRouteIndex === -1) {
      throw new ConvexError("All route segments are already completed");
    }

    const currentRouteInstance = sortedRouteInstances[currentRouteIndex];

    if (currentRouteIndex === sortedRouteInstances.length - 1) {
      throw new ConvexError(
        "This is the last segment. Use complete trip instead."
      );
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
        Number(booking.toRouteIndex) === Number(currentRouteInstance.orderIndex)
      ) {
        seatsToRelease += Number(booking.seats);
      }
    }

    await ctx.db.patch(currentRouteInstance._id, {
      completed: true,
      seatsOccupied: BigInt(
        Math.max(0, Number(currentRouteInstance.seatsOccupied) - seatsToRelease)
      ),
    });

    const route = await ctx.db.get(currentRouteInstance.routeId);
    const nextRouteInstance = sortedRouteInstances[currentRouteIndex + 1];
    const nextRoute = nextRouteInstance
      ? await ctx.db.get(nextRouteInstance.routeId)
      : null;

    let completedLocationName = "Unknown";
    let nextLocationName = "Unknown";

    if (route) {
      const endLoc = await ctx.db.get(route.endLocationId);
      completedLocationName = endLoc?.name ?? "Unknown";
    }

    if (nextRoute) {
      const endLoc = await ctx.db.get(nextRoute.endLocationId);
      nextLocationName = endLoc?.name ?? "Unknown";
    }

    return {
      success: true,
      message: `Arrived at ${completedLocationName}. Next stop: ${nextLocationName}`,
      completedRouteIndex: currentRouteIndex,
      nextRouteIndex: currentRouteIndex + 1,
      seatsReleased: seatsToRelease,
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

export const revertLastRouteCompletion = mutation({
  args: {
    driverId: v.id("users"),
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new ConvexError("Only drivers can revert route completions");
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
      tripInstance.status !== "IN_PROGRESS" &&
      tripInstance.status !== "COMPLETED"
    ) {
      throw new ConvexError("Trip must be IN_PROGRESS or COMPLETED to revert");
    }

    const allRouteInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    const sortedRouteInstances = allRouteInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    const completedRoutes = sortedRouteInstances.filter((ri) => ri.completed);

    if (completedRoutes.length === 0) {
      throw new ConvexError("No completed routes to revert");
    }

    const lastCompletedRoute = completedRoutes[completedRoutes.length - 1];

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
        Number(booking.toRouteIndex) === Number(lastCompletedRoute.orderIndex)
      ) {
        seatsToRestore += Number(booking.seats);
      }
    }

    await ctx.db.patch(lastCompletedRoute._id, {
      completed: false,
      seatsOccupied: BigInt(
        Number(lastCompletedRoute.seatsOccupied) + seatsToRestore
      ),
    });

    if (tripInstance.status === "COMPLETED") {
      await ctx.db.patch(tripInstance._id, {
        status: "IN_PROGRESS",
        actualEndTime: undefined,
      });
    }

    const route = await ctx.db.get(lastCompletedRoute.routeId);
    let revertedLocationName = "Unknown";
    if (route) {
      const endLoc = await ctx.db.get(route.endLocationId);
      revertedLocationName = endLoc?.name ?? "Unknown";
    }

    return {
      success: true,
      message: `Reverted completion of segment ending at ${revertedLocationName}`,
      revertedRouteIndex: Number(lastCompletedRoute.orderIndex),
      seatsRestored: seatsToRestore,
    };
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
