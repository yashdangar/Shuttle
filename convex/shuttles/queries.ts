import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

function getUTCDateString(): string {
  return new Date().toISOString().split("T")[0];
}

async function getMaxUsedSeatsForTripInstance(
  ctx: any,
  tripInstanceId: Id<"tripInstances">
): Promise<number> {
  const routeInstances = await ctx.db
    .query("routeInstances")
    .withIndex("by_trip_instance", (q: any) =>
      q.eq("tripInstanceId", tripInstanceId)
    )
    .collect();

  let maxUsed = 0;
  for (const ri of routeInstances) {
    const used = Number(ri.seatsOccupied) + Number(ri.seatHeld);
    maxUsed = Math.max(maxUsed, used);
  }
  return maxUsed;
}

export const getAvailableShuttle = internalQuery({
  args: {
    hotelId: v.id("hotels"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    requiredSeats: v.number(),
    fromRouteIndex: v.optional(v.number()),
    toRouteIndex: v.optional(v.number()),
  },
  async handler(ctx, args): Promise<Id<"shuttles"> | null> {
    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", args.hotelId).eq("isActive", true)
      )
      .collect();

    const shuttleAvailability: Array<{
      shuttleId: Id<"shuttles">;
      availableSeats: number;
    }> = [];

    for (const shuttle of shuttles) {
      const tripInstances = await ctx.db
        .query("tripInstances")
        .withIndex("by_shuttle_date", (q) =>
          q.eq("shuttleId", shuttle._id).eq("scheduledDate", args.scheduledDate)
        )
        .collect();

      const matchingInstance = tripInstances.find(
        (instance) =>
          instance.scheduledStartTime === args.scheduledStartTime &&
          instance.scheduledEndTime === args.scheduledEndTime
      );

      if (
        matchingInstance &&
        (matchingInstance.status === "IN_PROGRESS" ||
          matchingInstance.status === "COMPLETED" ||
          matchingInstance.status === "CANCELLED")
      ) {
        continue;
      }

      let usedSeats = 0;
      if (matchingInstance) {
        const routeInstances = await ctx.db
          .query("routeInstances")
          .withIndex("by_trip_instance", (q) =>
            q.eq("tripInstanceId", matchingInstance._id)
          )
          .collect();

        const fromIdx = args.fromRouteIndex ?? 0;
        const toIdx = args.toRouteIndex ?? routeInstances.length - 1;

        for (const ri of routeInstances) {
          const orderIdx = Number(ri.orderIndex);
          if (orderIdx >= fromIdx && orderIdx <= toIdx) {
            const used = Number(ri.seatsOccupied) + Number(ri.seatHeld);
            usedSeats = Math.max(usedSeats, used);
          }
        }
      }

      const availableSeats = Number(shuttle.totalSeats) - usedSeats;

      if (availableSeats >= args.requiredSeats) {
        shuttleAvailability.push({
          shuttleId: shuttle._id,
          availableSeats,
        });
      }
    }

    if (shuttleAvailability.length === 0) {
      return null;
    }

    shuttleAvailability.sort((a, b) => a.availableSeats - b.availableSeats);

    return shuttleAvailability[0].shuttleId;
  },
});

export const getAvailableShuttlesForDriver = query({
  args: {
    driverId: v.id("users"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver" || !driver.hotelId) {
      return [];
    }

    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", driver.hotelId!).eq("isActive", true)
      )
      .collect();

    const today = getUTCDateString();

    const results = await Promise.all(
      shuttles.map(async (shuttle) => {
        const todayInstances = await ctx.db
          .query("tripInstances")
          .withIndex("by_shuttle_date", (q) =>
            q.eq("shuttleId", shuttle._id).eq("scheduledDate", today)
          )
          .collect();

        let currentDriverName: string | undefined;
        let isAssignedToMe = false;

        if (shuttle.currentlyAssignedTo) {
          isAssignedToMe = shuttle.currentlyAssignedTo === args.driverId;
          const currentDriver = await ctx.db.get(shuttle.currentlyAssignedTo);
          currentDriverName = currentDriver?.name;
        }

        let totalBookings = 0;
        let totalSeatsBooked = 0;

        for (const instance of todayInstances) {
          totalBookings += instance.bookingIds.length;
          totalSeatsBooked += await getMaxUsedSeatsForTripInstance(
            ctx,
            instance._id
          );
        }

        return {
          _id: shuttle._id,
          vehicleNumber: shuttle.vehicleNumber,
          totalSeats: Number(shuttle.totalSeats),
          tripCountToday: todayInstances.length,
          totalBookingsToday: totalBookings,
          totalSeatsBookedToday: totalSeatsBooked,
          currentlyAssignedTo: shuttle.currentlyAssignedTo,
          currentDriverName,
          isAssignedToMe,
        };
      })
    );

    return results;
  },
});

export const getShuttleById = query({
  args: {
    shuttleId: v.id("shuttles"),
  },
  async handler(ctx, args) {
    const shuttle = await ctx.db.get(args.shuttleId);
    if (!shuttle) return null;

    let driverInfo = null;
    if (shuttle.currentlyAssignedTo) {
      const driver = await ctx.db.get(shuttle.currentlyAssignedTo);
      if (driver) {
        driverInfo = {
          _id: driver._id,
          name: driver.name,
          phoneNumber: driver.phoneNumber,
        };
      }
    }

    return {
      ...shuttle,
      totalSeats: Number(shuttle.totalSeats),
      driverInfo,
    };
  },
});

export const getHotelShuttles = query({
  args: {
    hotelId: v.id("hotels"),
    activeOnly: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    let shuttlesQuery = ctx.db
      .query("shuttles")
      .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId));

    const shuttles = await shuttlesQuery.collect();

    const filtered = args.activeOnly
      ? shuttles.filter((s) => s.isActive)
      : shuttles;

    const results = await Promise.all(
      filtered.map(async (shuttle) => {
        let driverInfo = null;
        if (shuttle.currentlyAssignedTo) {
          const driver = await ctx.db.get(shuttle.currentlyAssignedTo);
          if (driver) {
            driverInfo = {
              _id: driver._id,
              name: driver.name,
            };
          }
        }

        return {
          _id: shuttle._id,
          vehicleNumber: shuttle.vehicleNumber,
          totalSeats: Number(shuttle.totalSeats),
          isActive: shuttle.isActive,
          driverInfo,
        };
      })
    );

    return results;
  },
});
