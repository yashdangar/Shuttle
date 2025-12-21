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

    // Sort route instances by orderIndex
    const sortedRouteInstances = routeInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    // Find the route instance that the guest boards FROM
    const boardingRouteInstance = sortedRouteInstances.find(
      (ri) => Number(ri.orderIndex) === fromRouteIndex
    );

    if (!boardingRouteInstance) {
      return null;
    }

    // Get the pickup location name (start location of the boarding route)
    const boardingRoute = await ctx.db.get(boardingRouteInstance.routeId);
    let pickupLocationName = "Unknown";

    if (boardingRoute) {
      const startLoc = await ctx.db.get(boardingRoute.startLocationId);
      pickupLocationName = startLoc?.name ?? "Unknown";
    }

    // For ETA to pickup location:
    // Each route instance stores ETA to its END location
    // So for a guest boarding at the START of segment N:
    // - If N = 0: Pickup is the trip's starting point. Driver starts here when trip begins.
    //   The shuttle is AT the first pickup when trip is IN_PROGRESS and first segment not complete.
    // - If N > 0: Pickup ETA = ETA stored on segment (N-1), since that's when driver reaches 
    //   the END of segment (N-1), which is the START of segment N (our pickup).
    
    let eta: string | undefined;
    let isCompleted = false;

    if (fromRouteIndex === 0) {
      // First pickup location - driver starts here
      isCompleted = boardingRouteInstance.completed;
      if (!isCompleted) {
        // Driver is at or near the first pickup location
        eta = "At pickup";
      }
    } else {
      // For fromRouteIndex > 0, get ETA from the previous route instance
      const previousRouteInstance = sortedRouteInstances.find(
        (ri) => Number(ri.orderIndex) === fromRouteIndex - 1
      );

      if (previousRouteInstance) {
        // The pickup is "completed" when the previous segment is completed
        // (meaning driver has arrived at our pickup location)
        isCompleted = previousRouteInstance.completed;
        
        if (!isCompleted) {
          // Show ETA to our pickup (which is end of previous segment)
          eta = previousRouteInstance.eta;
        } else {
          // Driver has arrived at our pickup
          eta = "At pickup";
        }
      }
    }

    return {
      bookingId: args.bookingId,
      pickupLocationName,
      eta,
      isCompleted,
    };
  },
});

