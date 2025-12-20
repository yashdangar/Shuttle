import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";

export const getRouteInstancesByTripInstance = query({
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
          tripInstanceId: ri.tripInstanceId,
          routeId: ri.routeId,
          orderIndex: Number(ri.orderIndex),
          seatsOccupied: Number(ri.seatsOccupied),
          seatHeld: Number(ri.seatHeld),
          completed: ri.completed,
          eta: ri.eta,
          startLocationName,
          endLocationName,
          charges: route?.charges ?? 0,
        };
      })
    );

    return results;
  },
});

export const getRouteInstanceById = query({
  args: {
    routeInstanceId: v.id("routeInstances"),
  },
  async handler(ctx, args) {
    const ri = await ctx.db.get(args.routeInstanceId);
    if (!ri) return null;

    const route = await ctx.db.get(ri.routeId);
    let startLocationName = "Unknown";
    let endLocationName = "Unknown";
    let startLocation = null;
    let endLocation = null;

    if (route) {
      [startLocation, endLocation] = await Promise.all([
        ctx.db.get(route.startLocationId),
        ctx.db.get(route.endLocationId),
      ]);
      startLocationName = startLocation?.name ?? "Unknown";
      endLocationName = endLocation?.name ?? "Unknown";
    }

    return {
      _id: ri._id,
      tripInstanceId: ri.tripInstanceId,
      routeId: ri.routeId,
      orderIndex: Number(ri.orderIndex),
      seatsOccupied: Number(ri.seatsOccupied),
      seatHeld: Number(ri.seatHeld),
      completed: ri.completed,
      eta: ri.eta,
      startLocationName,
      endLocationName,
      startLocation: startLocation
        ? {
            _id: startLocation._id,
            name: startLocation.name,
            latitude: startLocation.latitude,
            longitude: startLocation.longitude,
          }
        : null,
      endLocation: endLocation
        ? {
            _id: endLocation._id,
            name: endLocation.name,
            latitude: endLocation.latitude,
            longitude: endLocation.longitude,
          }
        : null,
      charges: route?.charges ?? 0,
    };
  },
});

export const getRouteInstancesForTripInstanceInternal = internalQuery({
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

    return routeInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );
  },
});

export const getIncompleteRouteInstances = query({
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

export const getTripInstanceSeatSummary = query({
  args: {
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const tripInstance = await ctx.db.get(args.tripInstanceId);
    if (!tripInstance) return null;

    let shuttleCapacity = 0;
    if (tripInstance.shuttleId) {
      const shuttle = await ctx.db.get(tripInstance.shuttleId);
      shuttleCapacity = Number(shuttle?.totalSeats ?? 0);
    }

    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    let maxOccupied = 0;
    let maxHeld = 0;
    let maxTotal = 0;

    for (const ri of routeInstances) {
      const occupied = Number(ri.seatsOccupied);
      const held = Number(ri.seatHeld);
      const total = occupied + held;

      maxOccupied = Math.max(maxOccupied, occupied);
      maxHeld = Math.max(maxHeld, held);
      maxTotal = Math.max(maxTotal, total);
    }

    return {
      shuttleCapacity,
      maxSeatsOccupied: maxOccupied,
      maxSeatsHeld: maxHeld,
      maxTotalUsed: maxTotal,
      availableSeats: Math.max(0, shuttleCapacity - maxTotal),
    };
  },
});
