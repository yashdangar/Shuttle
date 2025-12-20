import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

export interface SeatValidationResult {
  valid: boolean;
  reason?: string;
  availableSeats?: number;
}

export interface SegmentOccupancy {
  routeId: Id<"routes">;
  orderIndex: number;
  seatsOccupied: number;
  seatHeld: number;
  totalUsed: number;
  available: number;
}

export async function getRouteInstancesForTripInstance(
  ctx: QueryCtx | MutationCtx,
  tripInstanceId: Id<"tripInstances">
): Promise<Doc<"routeInstances">[]> {
  const routeInstances = await ctx.db
    .query("routeInstances")
    .withIndex("by_trip_instance", (q) =>
      q.eq("tripInstanceId", tripInstanceId)
    )
    .collect();

  return routeInstances.sort(
    (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
  );
}

export async function getRouteInstanceByOrder(
  ctx: QueryCtx | MutationCtx,
  tripInstanceId: Id<"tripInstances">,
  orderIndex: number
): Promise<Doc<"routeInstances"> | null> {
  const routeInstance = await ctx.db
    .query("routeInstances")
    .withIndex("by_trip_instance_order", (q) =>
      q
        .eq("tripInstanceId", tripInstanceId)
        .eq("orderIndex", BigInt(orderIndex))
    )
    .first();

  return routeInstance;
}

export async function calculateSegmentOccupancy(
  ctx: QueryCtx | MutationCtx,
  tripInstanceId: Id<"tripInstances">,
  shuttleCapacity: number
): Promise<Map<number, SegmentOccupancy>> {
  const routeInstances = await getRouteInstancesForTripInstance(
    ctx,
    tripInstanceId
  );

  const occupancyMap = new Map<number, SegmentOccupancy>();

  for (const ri of routeInstances) {
    const occupied = Number(ri.seatsOccupied);
    const held = Number(ri.seatHeld);
    const totalUsed = occupied + held;

    occupancyMap.set(Number(ri.orderIndex), {
      routeId: ri.routeId,
      orderIndex: Number(ri.orderIndex),
      seatsOccupied: occupied,
      seatHeld: held,
      totalUsed,
      available: shuttleCapacity - totalUsed,
    });
  }

  return occupancyMap;
}

export async function getMaxAvailableSeats(
  ctx: QueryCtx | MutationCtx,
  tripInstanceId: Id<"tripInstances">,
  fromIndex: number,
  toIndex: number,
  shuttleCapacity: number
): Promise<number> {
  const occupancyMap = await calculateSegmentOccupancy(
    ctx,
    tripInstanceId,
    shuttleCapacity
  );

  let minAvailable = shuttleCapacity;

  for (let i = fromIndex; i <= toIndex; i++) {
    const occupancy = occupancyMap.get(i);
    if (occupancy) {
      minAvailable = Math.min(minAvailable, occupancy.available);
    }
  }

  return Math.max(0, minAvailable);
}

export async function validateSeatAvailability(
  ctx: QueryCtx | MutationCtx,
  tripInstanceId: Id<"tripInstances">,
  fromIndex: number,
  toIndex: number,
  requiredSeats: number,
  shuttleCapacity: number
): Promise<SeatValidationResult> {
  const routeInstances = await getRouteInstancesForTripInstance(
    ctx,
    tripInstanceId
  );

  for (let i = fromIndex; i <= toIndex; i++) {
    const routeInstance = routeInstances.find(
      (ri) => Number(ri.orderIndex) === i
    );

    if (!routeInstance) {
      return {
        valid: false,
        reason: `Route segment at index ${i} not found`,
      };
    }

    const usedSeats =
      Number(routeInstance.seatsOccupied) + Number(routeInstance.seatHeld);
    const availableSeats = shuttleCapacity - usedSeats;

    if (availableSeats < requiredSeats) {
      const route = await ctx.db.get(routeInstance.routeId);
      if (route) {
        const startLoc = await ctx.db.get(route.startLocationId);
        const endLoc = await ctx.db.get(route.endLocationId);
        return {
          valid: false,
          reason: `Segment ${startLoc?.name || "?"} → ${endLoc?.name || "?"} is at capacity (${availableSeats} seats available, ${requiredSeats} required)`,
          availableSeats,
        };
      }
      return {
        valid: false,
        reason: `Segment at index ${i} is at capacity`,
        availableSeats,
      };
    }
  }

  return { valid: true };
}

export async function updateRouteInstanceSeatsForBooking(
  ctx: MutationCtx,
  tripInstanceId: Id<"tripInstances">,
  fromIndex: number,
  toIndex: number,
  seatHeldDelta: number,
  seatsOccupiedDelta: number
): Promise<void> {
  const routeInstances = await getRouteInstancesForTripInstance(
    ctx,
    tripInstanceId
  );

  for (let i = fromIndex; i <= toIndex; i++) {
    const routeInstance = routeInstances.find(
      (ri) => Number(ri.orderIndex) === i
    );

    if (routeInstance) {
      const newSeatHeld = Math.max(
        0,
        Number(routeInstance.seatHeld) + seatHeldDelta
      );
      const newSeatsOccupied = Math.max(
        0,
        Number(routeInstance.seatsOccupied) + seatsOccupiedDelta
      );

      await ctx.db.patch(routeInstance._id, {
        seatHeld: BigInt(newSeatHeld),
        seatsOccupied: BigInt(newSeatsOccupied),
      });
    }
  }
}

export async function getTotalSeatsForTripInstance(
  ctx: QueryCtx | MutationCtx,
  tripInstanceId: Id<"tripInstances">
): Promise<{ maxOccupied: number; maxHeld: number }> {
  const routeInstances = await getRouteInstancesForTripInstance(
    ctx,
    tripInstanceId
  );

  let maxOccupied = 0;
  let maxHeld = 0;

  for (const ri of routeInstances) {
    maxOccupied = Math.max(maxOccupied, Number(ri.seatsOccupied));
    maxHeld = Math.max(maxHeld, Number(ri.seatHeld));
  }

  return { maxOccupied, maxHeld };
}
