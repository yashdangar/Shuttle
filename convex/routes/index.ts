import { internalMutation, internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "../_generated/dataModel";

export const getRoutesByTrip = query({
  args: {
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

    const results = await Promise.all(
      sortedRoutes.map(async (route) => {
        const [startLocation, endLocation] = await Promise.all([
          ctx.db.get(route.startLocationId),
          ctx.db.get(route.endLocationId),
        ]);

        return {
          _id: route._id,
          tripId: route.tripId,
          startLocationId: route.startLocationId,
          endLocationId: route.endLocationId,
          startLocationName: startLocation?.name ?? "Unknown",
          endLocationName: endLocation?.name ?? "Unknown",
          charges: route.charges,
          orderIndex: Number(route.orderIndex),
        };
      })
    );

    return results;
  },
});

export const getRouteById = query({
  args: {
    routeId: v.id("routes"),
  },
  async handler(ctx, args) {
    const route = await ctx.db.get(args.routeId);
    if (!route) return null;

    const [startLocation, endLocation] = await Promise.all([
      ctx.db.get(route.startLocationId),
      ctx.db.get(route.endLocationId),
    ]);

    return {
      _id: route._id,
      tripId: route.tripId,
      startLocationId: route.startLocationId,
      endLocationId: route.endLocationId,
      startLocationName: startLocation?.name ?? "Unknown",
      endLocationName: endLocation?.name ?? "Unknown",
      charges: route.charges,
      orderIndex: Number(route.orderIndex),
    };
  },
});

export const createRouteInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
    startLocationId: v.id("locations"),
    endLocationId: v.id("locations"),
    charges: v.float64(),
    orderIndex: v.number(),
  },
  async handler(ctx, args) {
    const routeId = await ctx.db.insert("routes", {
      tripId: args.tripId,
      startLocationId: args.startLocationId,
      endLocationId: args.endLocationId,
      charges: args.charges,
      orderIndex: BigInt(args.orderIndex),
    });

    return routeId;
  },
});

export const updateRouteInternal = internalMutation({
  args: {
    routeId: v.id("routes"),
    startLocationId: v.optional(v.id("locations")),
    endLocationId: v.optional(v.id("locations")),
    charges: v.optional(v.float64()),
    orderIndex: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new Error("Route not found");
    }

    const updates: Partial<Doc<"routes">> = {};

    if (args.startLocationId !== undefined) {
      updates.startLocationId = args.startLocationId;
    }
    if (args.endLocationId !== undefined) {
      updates.endLocationId = args.endLocationId;
    }
    if (args.charges !== undefined) {
      updates.charges = args.charges;
    }
    if (args.orderIndex !== undefined) {
      updates.orderIndex = BigInt(args.orderIndex);
    }

    await ctx.db.patch(args.routeId, updates);
  },
});

export const deleteRouteInternal = internalMutation({
  args: {
    routeId: v.id("routes"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.routeId);
  },
});

export const deleteRoutesByTripInternal = internalMutation({
  args: {
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    const routes = await ctx.db
      .query("routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    for (const route of routes) {
      await ctx.db.delete(route._id);
    }
  },
});

export const getRoutesByTripInternal = internalQuery({
  args: {
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    const routes = await ctx.db
      .query("routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    return routes.sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex));
  },
});

export const getTripStops = query({
  args: {
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

    if (sortedRoutes.length === 0) {
      return [];
    }

    const stopIds: Id<"locations">[] = [sortedRoutes[0].startLocationId];
    for (const route of sortedRoutes) {
      stopIds.push(route.endLocationId);
    }

    const stops = await Promise.all(
      stopIds.map(async (locId, index) => {
        const location = await ctx.db.get(locId);
        return {
          locationId: locId,
          name: location?.name ?? "Unknown",
          address: location?.address ?? "",
          latitude: location?.latitude ?? 0,
          longitude: location?.longitude ?? 0,
          orderIndex: index,
        };
      })
    );

    return stops;
  },
});
