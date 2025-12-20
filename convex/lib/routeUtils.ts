import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

export interface RouteSegmentResult {
  fromIndex: number;
  toIndex: number;
  routes: Doc<"routes">[];
}

export async function getRoutesForTrip(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">
): Promise<Doc<"routes">[]> {
  const routes = await ctx.db
    .query("routes")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .collect();

  return routes.sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex));
}

export async function getRouteSegmentsForBooking(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  fromLocationId: Id<"locations">,
  toLocationId: Id<"locations">
): Promise<RouteSegmentResult | null> {
  const routes = await getRoutesForTrip(ctx, tripId);

  if (routes.length === 0) {
    return null;
  }

  let fromIndex = -1;
  let toIndex = -1;

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];

    if (route.startLocationId === fromLocationId && fromIndex === -1) {
      fromIndex = i;
    }

    if (route.endLocationId === toLocationId) {
      toIndex = i;
    }
  }

  if (fromIndex === -1 || toIndex === -1 || fromIndex > toIndex) {
    return null;
  }

  const segmentRoutes = routes.slice(fromIndex, toIndex + 1);

  return {
    fromIndex,
    toIndex,
    routes: segmentRoutes,
  };
}

export function calculateTotalCharges(
  routes: Doc<"routes">[],
  fromIndex: number,
  toIndex: number
): number {
  let total = 0;

  for (let i = fromIndex; i <= toIndex && i < routes.length; i++) {
    total += routes[i].charges;
  }

  return total;
}

export async function validateLocationsOnTrip(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  fromLocationId: Id<"locations">,
  toLocationId: Id<"locations">
): Promise<{ valid: boolean; reason?: string }> {
  const routes = await getRoutesForTrip(ctx, tripId);

  if (routes.length === 0) {
    return { valid: false, reason: "Trip has no routes defined" };
  }

  const allLocationIds = new Set<string>();

  for (const route of routes) {
    allLocationIds.add(route.startLocationId);
    allLocationIds.add(route.endLocationId);
  }

  if (!allLocationIds.has(fromLocationId)) {
    return { valid: false, reason: "From location is not a stop on this trip" };
  }

  if (!allLocationIds.has(toLocationId)) {
    return { valid: false, reason: "To location is not a stop on this trip" };
  }

  if (fromLocationId === toLocationId) {
    return { valid: false, reason: "From and To locations cannot be the same" };
  }

  const result = await getRouteSegmentsForBooking(
    ctx,
    tripId,
    fromLocationId,
    toLocationId
  );

  if (!result) {
    return {
      valid: false,
      reason: "Invalid route: from location must come before to location",
    };
  }

  return { valid: true };
}

export async function getAllStopsForTrip(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">
): Promise<Id<"locations">[]> {
  const routes = await getRoutesForTrip(ctx, tripId);

  if (routes.length === 0) {
    return [];
  }

  const stops: Id<"locations">[] = [routes[0].startLocationId];

  for (const route of routes) {
    stops.push(route.endLocationId);
  }

  return stops;
}

export async function getRouteByIndex(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  orderIndex: number
): Promise<Doc<"routes"> | null> {
  const routes = await ctx.db
    .query("routes")
    .withIndex("by_trip_order", (q) =>
      q.eq("tripId", tripId).eq("orderIndex", BigInt(orderIndex))
    )
    .first();

  return routes;
}
