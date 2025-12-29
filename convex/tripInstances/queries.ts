import { query } from "../_generated/server";
import { v } from "convex/values";

function getUTCDateString(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split("T")[0];
}

export const getDriverTripInstances = query({
  args: {
    driverId: v.id("users"),
    date: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      return { trips: [], hotelTimeZone: "UTC" };
    }

    // Fetch hotel for timezone info
    const hotel = driver.hotelId ? await ctx.db.get(driver.hotelId) : null;
    const hotelTimeZone = hotel?.timeZone ?? "UTC";

    const targetDate = args.date || getUTCDateString();

    const allShuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", driver.hotelId!).eq("isActive", true)
      )
      .collect();

    const driverShuttles = allShuttles.filter(
      (s) => s.currentlyAssignedTo === args.driverId
    );

    if (driverShuttles.length === 0) {
      return [];
    }

    const allTripInstances = [];

    for (const shuttle of driverShuttles) {
      const instances = await ctx.db
        .query("tripInstances")
        .withIndex("by_shuttle_date", (q) =>
          q.eq("shuttleId", shuttle._id).eq("scheduledDate", targetDate)
        )
        .collect();

      for (const instance of instances) {
        allTripInstances.push({ ...instance, shuttle });
      }
    }

    const results = await Promise.all(
      allTripInstances.map(async ({ shuttle, ...instance }) => {
        const trip = await ctx.db.get(instance.tripId);
        if (!trip) {
          return null;
        }

        const routes = await ctx.db
          .query("routes")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .collect();

        const sortedRoutes = routes.sort(
          (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
        );

        let sourceLocation = "Unknown";
        let destinationLocation = "Unknown";

        if (sortedRoutes.length > 0) {
          const firstRoute = sortedRoutes[0];
          const lastRoute = sortedRoutes[sortedRoutes.length - 1];

          const [sourceLoc, destLoc] = await Promise.all([
            ctx.db.get(firstRoute.startLocationId),
            ctx.db.get(lastRoute.endLocationId),
          ]);

          sourceLocation = sourceLoc?.name ?? "Unknown";
          destinationLocation = destLoc?.name ?? "Unknown";
        }

        const routeInstances = await ctx.db
          .query("routeInstances")
          .withIndex("by_trip_instance", (q) =>
            q.eq("tripInstanceId", instance._id)
          )
          .collect();

        let maxOccupied = 0;
        let maxHeld = 0;
        for (const ri of routeInstances) {
          maxOccupied = Math.max(maxOccupied, Number(ri.seatsOccupied));
          maxHeld = Math.max(maxHeld, Number(ri.seatHeld));
        }

        return {
          _id: instance._id,
          tripId: instance.tripId,
          tripName: trip.name,
          sourceLocation,
          destinationLocation,
          scheduledDate: instance.scheduledDate,
          scheduledStartTime: instance.scheduledStartTime,
          scheduledEndTime: instance.scheduledEndTime,
          seatsOccupied: maxOccupied,
          seatsHeld: maxHeld,
          totalSeats: Number(shuttle.totalSeats),
          status: instance.status,
          shuttleId: shuttle._id,
          vehicleNumber: shuttle.vehicleNumber,
          bookingCount: instance.bookingIds.length,
          routeCount: sortedRoutes.length,
          completedRoutes: routeInstances.filter((ri) => ri.completed).length,
        };
      })
    );

    return {
      trips: results
        .filter((r) => r !== null)
        .sort((a, b) =>
          a.scheduledStartTime.localeCompare(b.scheduledStartTime)
        ),
      hotelTimeZone,
    };
  },
});

export const getTripInstanceAvailability = query({
  args: {
    tripId: v.id("trips"),
    hotelId: v.id("hotels"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    fromRouteIndex: v.optional(v.number()),
    toRouteIndex: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      return { totalAvailableSeats: 0, shuttles: [] };
    }

    const routes = await ctx.db
      .query("routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    const fromIndex = args.fromRouteIndex ?? 0;
    const toIndex = args.toRouteIndex ?? routes.length - 1;

    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", args.hotelId).eq("isActive", true)
      )
      .collect();

    const shuttleAvailability = await Promise.all(
      shuttles.map(async (shuttle) => {
        const tripInstances = await ctx.db
          .query("tripInstances")
          .withIndex("by_shuttle_date", (q) =>
            q
              .eq("shuttleId", shuttle._id)
              .eq("scheduledDate", args.scheduledDate)
          )
          .collect();

        const matchingInstance = tripInstances.find(
          (instance) =>
            instance.scheduledStartTime === args.scheduledStartTime &&
            instance.scheduledEndTime === args.scheduledEndTime
        );

        let maxUsedSeats = 0;

        if (matchingInstance) {
          const routeInstances = await ctx.db
            .query("routeInstances")
            .withIndex("by_trip_instance", (q) =>
              q.eq("tripInstanceId", matchingInstance._id)
            )
            .collect();

          for (const ri of routeInstances) {
            const orderIdx = Number(ri.orderIndex);
            if (orderIdx >= fromIndex && orderIdx <= toIndex) {
              const used = Number(ri.seatsOccupied) + Number(ri.seatHeld);
              maxUsedSeats = Math.max(maxUsedSeats, used);
            }
          }
        }

        const availableSeats = Number(shuttle.totalSeats) - maxUsedSeats;

        return {
          shuttleId: shuttle._id,
          vehicleNumber: shuttle.vehicleNumber,
          availableSeats: Math.max(0, availableSeats),
        };
      })
    );

    const totalAvailableSeats = shuttleAvailability.reduce(
      (sum, s) => sum + s.availableSeats,
      0
    );

    return {
      totalAvailableSeats,
      shuttles: shuttleAvailability.filter((s) => s.availableSeats > 0),
    };
  },
});

export const getTripInstanceById = query({
  args: {
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const instance = await ctx.db.get(args.tripInstanceId);
    if (!instance) return null;

    let driverInfo = null;
    if (instance.shuttleId) {
      const shuttle = await ctx.db.get(instance.shuttleId);
      if (shuttle?.currentlyAssignedTo) {
        const driver = await ctx.db.get(shuttle.currentlyAssignedTo);
        if (driver) {
          driverInfo = {
            _id: driver._id,
            name: driver.name,
            phoneNumber: driver.phoneNumber,
          };
        }
      }
    }

    const routeInstances = await ctx.db
      .query("routeInstances")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    const sortedRouteInstances = routeInstances.sort(
      (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
    );

    let maxOccupied = 0;
    let maxHeld = 0;
    for (const ri of routeInstances) {
      maxOccupied = Math.max(maxOccupied, Number(ri.seatsOccupied));
      maxHeld = Math.max(maxHeld, Number(ri.seatHeld));
    }

    const routeInstanceDetails = await Promise.all(
      sortedRouteInstances.map(async (ri) => {
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
          routeId: ri.routeId,
          orderIndex: Number(ri.orderIndex),
          seatsOccupied: Number(ri.seatsOccupied),
          seatHeld: Number(ri.seatHeld),
          completed: ri.completed,
          eta: ri.eta,
          startLocationName,
          endLocationName,
        };
      })
    );

    return {
      ...instance,
      seatsOccupied: maxOccupied,
      seatHeld: maxHeld,
      driverInfo,
      routeInstances: routeInstanceDetails,
    };
  },
});

export const getTripInstancesByShuttleAndDate = query({
  args: {
    shuttleId: v.id("shuttles"),
    date: v.string(),
  },
  async handler(ctx, args) {
    const instances = await ctx.db
      .query("tripInstances")
      .withIndex("by_shuttle_date", (q) =>
        q.eq("shuttleId", args.shuttleId).eq("scheduledDate", args.date)
      )
      .collect();

    const results = await Promise.all(
      instances.map(async (instance) => {
        const trip = await ctx.db.get(instance.tripId);

        const routeInstances = await ctx.db
          .query("routeInstances")
          .withIndex("by_trip_instance", (q) =>
            q.eq("tripInstanceId", instance._id)
          )
          .collect();

        let maxOccupied = 0;
        let maxHeld = 0;
        for (const ri of routeInstances) {
          maxOccupied = Math.max(maxOccupied, Number(ri.seatsOccupied));
          maxHeld = Math.max(maxHeld, Number(ri.seatHeld));
        }

        return {
          _id: instance._id,
          tripName: trip?.name ?? "Unknown Trip",
          scheduledStartTime: instance.scheduledStartTime,
          scheduledEndTime: instance.scheduledEndTime,
          status: instance.status,
          seatsOccupied: maxOccupied,
          seatsHeld: maxHeld,
          bookingCount: instance.bookingIds.length,
          completedRoutes: routeInstances.filter((ri) => ri.completed).length,
          totalRoutes: routeInstances.length,
        };
      })
    );

    return results.sort((a, b) =>
      a.scheduledStartTime.localeCompare(b.scheduledStartTime)
    );
  },
});

export const getInProgressTripInstances = query({
  args: {
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId))
      .collect();

    const allInProgressInstances = [];

    for (const shuttle of shuttles) {
      const instances = await ctx.db
        .query("tripInstances")
        .withIndex("by_shuttle", (q) => q.eq("shuttleId", shuttle._id))
        .filter((q) => q.eq(q.field("status"), "IN_PROGRESS"))
        .collect();

      for (const instance of instances) {
        allInProgressInstances.push({
          ...instance,
          shuttleVehicleNumber: shuttle.vehicleNumber,
          driverId: shuttle.currentlyAssignedTo,
        });
      }
    }

    const results = await Promise.all(
      allInProgressInstances.map(async (instance) => {
        const trip = await ctx.db.get(instance.tripId);

        let driverName = "Unknown";
        let driverLocation = null;

        if (instance.driverId) {
          const driver = await ctx.db.get(instance.driverId);
          if (driver) {
            driverName = driver.name;
            if (driver.driverCurrentLatitude && driver.driverCurrentLongitude) {
              driverLocation = {
                latitude: driver.driverCurrentLatitude,
                longitude: driver.driverCurrentLongitude,
              };
            }
          }
        }

        const routeInstances = await ctx.db
          .query("routeInstances")
          .withIndex("by_trip_instance", (q) =>
            q.eq("tripInstanceId", instance._id)
          )
          .collect();

        const sortedRouteInstances = routeInstances.sort(
          (a, b) => Number(a.orderIndex) - Number(b.orderIndex)
        );

        const incompleteRoutes = sortedRouteInstances.filter(
          (ri) => !ri.completed
        );

        return {
          _id: instance._id,
          tripName: trip?.name ?? "Unknown",
          shuttleVehicleNumber: instance.shuttleVehicleNumber,
          driverName,
          driverLocation,
          scheduledDate: instance.scheduledDate,
          scheduledStartTime: instance.scheduledStartTime,
          actualStartTime: instance.actualStartTime,
          completedRoutes: sortedRouteInstances.filter((ri) => ri.completed)
            .length,
          totalRoutes: sortedRouteInstances.length,
          nextRouteEta:
            incompleteRoutes.length > 0 ? incompleteRoutes[0].eta : null,
        };
      })
    );

    return results;
  },
});
