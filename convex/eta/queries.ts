import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";

export const getIncompleteRouteInstancesWithLocations = internalQuery({
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

    const incompleteInstances = routeInstances
      .filter((ri) => !ri.completed)
      .sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex));

    const results = await Promise.all(
      incompleteInstances.map(async (ri) => {
        const route = await ctx.db.get(ri.routeId);
        let endLocation = null;

        if (route) {
          const loc = await ctx.db.get(route.endLocationId);
          if (loc) {
            endLocation = {
              _id: loc._id,
              name: loc.name,
              latitude: loc.latitude,
              longitude: loc.longitude,
            };
          }
        }

        return {
          _id: ri._id,
          routeId: ri.routeId,
          orderIndex: Number(ri.orderIndex),
          eta: ri.eta,
          endLocation,
        };
      })
    );

    return results;
  },
});

export const getTripInstanceETAs = query({
  args: {
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) {
      return null;
    }

    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    const sortedInstances = routeInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    const results = await Promise.all(
      sortedInstances.map(async (ri) => {
        const route = await ctx.db.get(ri.routeId);
        let startLocationName = "Unknown";
        let endLocationName = "Unknown";

        if (route) {
          const [startLoc, endLoc] = await Promise.all([
            ctx.db.get(route.startLocationId),
            ctx.db.get(route.endLocationId),
          ]);
          startLocationName = startLoc?.name ?? "Unknown";
          endLocationName = endLoc?.name ?? "Unknown";
        }

        return {
          _id: ri._id,
          orderIndex: Number(ri.orderIndex),
          startLocationName,
          endLocationName,
          eta: ri.eta,
          completed: ri.completed,
        };
      })
    );

    return {
      tripInstanceId: args.tripInstanceId,
      status: tripInstance.status,
      segments: results,
    };
  },
});

export const getBookingETA = query({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || !booking.tripInstanceId) {
      return null;
    }

    const tripInstance = await ctx.db.get(booking.tripInstanceId);
    if (!tripInstance || tripInstance.status !== "IN_PROGRESS") {
      return null;
    }

    const fromRouteIndex = Number(booking.fromRouteIndex ?? 0);

    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", booking.tripInstanceId!)
      )
      .collect();

    const pickupRouteInstance = routeInstances.find(
      (ri) => Number(ri.orderIndex) === fromRouteIndex
    );

    if (!pickupRouteInstance) {
      return null;
    }

    const route = await ctx.db.get(pickupRouteInstance.routeId);
    let pickupLocationName = "Unknown";

    if (route) {
      const startLoc = await ctx.db.get(route.startLocationId);
      pickupLocationName = startLoc?.name ?? "Unknown";
    }

    return {
      bookingId: args.bookingId,
      pickupLocationName,
      eta: pickupRouteInstance.eta,
      isCompleted: pickupRouteInstance.completed,
    };
  },
});

