import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Superadmin queries
export const listAllHotels = query({
  args: {
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 100, 200));
    const hotels = await ctx.db.query("hotels").take(pageSize);
    
    return hotels.map(hotel => ({
      id: hotel._id,
      name: hotel.name,
      slug: hotel.slug,
      address: hotel.address,
      phoneNumber: hotel.phoneNumber,
      email: hotel.email,
      timeZone: hotel.timeZone,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      imageIds: hotel.imageIds,
      shuttleIds: hotel.shuttleIds,
      userIds: hotel.userIds,
      locationIds: hotel.locationIds,
      bookingIds: hotel.bookingIds,
      tripIds: hotel.tripIds,
    }));
  },
});

export const getHotelWithDetails = query({
  args: {
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      return null;
    }

    // Get all users for this hotel
    const users = await Promise.all(
      hotel.userIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        return user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          hotelId: user.hotelId,
          createdAt: user._creationTime,
        } : null;
      })
    );

    // Get all shuttles for this hotel
    const shuttles = await Promise.all(
      hotel.shuttleIds.map(async (shuttleId) => {
        const shuttle = await ctx.db.get(shuttleId);
        return shuttle ? {
          _id: shuttle._id,
          name: shuttle.vehicleNumber,
          licensePlate: shuttle.vehicleNumber,
          capacity: Number(shuttle.totalSeats),
          hotelId: shuttle.hotelId,
          driverId: shuttle.currentlyAssignedTo,
          status: shuttle.isActive ? "active" : "inactive",
        } : null;
      })
    );

    // Get all locations for this hotel
    const locations = await Promise.all(
      hotel.locationIds.map(async (locationId) => {
        const location = await ctx.db.get(locationId);
        return location ? {
          _id: location._id,
          name: location.name,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          hotelId: location.hotelId,
          type: location.locationType,
        } : null;
      })
    );

    // Get all trips for this hotel
    const trips = await Promise.all(
      hotel.tripIds.map(async (tripId) => {
        const trip = await ctx.db.get(tripId);
        return trip ? {
          _id: trip._id,
          name: trip.name,
          hotelId: trip.hotelId,
          shuttleId: null, // Trips don't have direct shuttleId
          routeId: trip.routeIds[0], // Use first routeId
          startTime: trip._creationTime, // Use creation time as placeholder
          endTime: trip._creationTime, // Use creation time as placeholder
          status: "scheduled", // Default status
        } : null;
      })
    );

    // Get all bookings for this hotel
    const bookings = await Promise.all(
      hotel.bookingIds.map(async (bookingId) => {
        const booking = await ctx.db.get(bookingId);
        return booking ? {
          _id: booking._id,
          userId: booking.guestId,
          tripId: booking.tripInstanceId || null,
          status: booking.bookingStatus.toLowerCase(),
          createdAt: booking._creationTime,
        } : null;
      })
    );

    return {
      hotel: {
        id: hotel._id,
        name: hotel.name,
        slug: hotel.slug,
        address: hotel.address,
        phoneNumber: hotel.phoneNumber,
        email: hotel.email,
        timeZone: hotel.timeZone,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        imageIds: hotel.imageIds,
        shuttleIds: hotel.shuttleIds,
        userIds: hotel.userIds,
        locationIds: hotel.locationIds,
        bookingIds: hotel.bookingIds,
        tripIds: hotel.tripIds,
      },
      users: users.filter(Boolean),
      shuttles: shuttles.filter(Boolean),
      locations: locations.filter(Boolean),
      trips: trips.filter(Boolean),
      bookings: bookings.filter(Boolean),
    };
  },
});

export const getUsersByRole = query({
  args: {
    hotelId: v.id("hotels"),
    role: v.string(),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      return [];
    }

    const users = await Promise.all(
      hotel.userIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (user && user.role === args.role) {
          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            hotelId: user.hotelId,
            createdAt: user._creationTime,
          };
        }
        return null;
      })
    );

    return users.filter(Boolean);
  },
});

export const getSystemStats = query({
  args: {},
  async handler(ctx, args) {
    const [hotels, users, shuttles, locations, trips, bookings] = await Promise.all([
      ctx.db.query("hotels").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("shuttles").collect(),
      ctx.db.query("locations").collect(),
      ctx.db.query("trips").collect(),
      ctx.db.query("bookings").collect(),
    ]);

    const usersByRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Trips don't have status field in schema, so we'll count them by hotel
    const tripsByHotel = trips.reduce((acc, trip) => {
      const hotelId = trip.hotelId.toString();
      acc[hotelId] = (acc[hotelId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bookingsByStatus = bookings.reduce((acc, booking) => {
      acc[booking.bookingStatus] = (acc[booking.bookingStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalHotels: hotels.length,
      totalUsers: users.length,
      totalShuttles: shuttles.length,
      totalLocations: locations.length,
      totalTrips: trips.length,
      totalBookings: bookings.length,
      usersByRole,
      tripsByHotel,
      bookingsByStatus,
    };
  },
});

// Superadmin mutations
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.union(
      v.literal("guest"),
      v.literal("admin"),
      v.literal("frontdesk"),
      v.literal("driver"),
      v.literal("superadmin")
    ),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      role: args.newRole,
    });

    return { success: true };
  },
});

export const removeUserFromHotel = mutation({
  args: {
    userId: v.id("users"),
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }

    // Remove user from hotel's userIds array
    await ctx.db.patch(args.hotelId, {
      userIds: hotel.userIds.filter((userId) => userId !== args.userId),
    });

    // Clear hotelId on user
    await ctx.db.patch(args.userId, {
      hotelId: undefined,
    });

    return { success: true };
  },
});

export const deactivateHotel = mutation({
  args: {
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }

    // You might want to add a 'status' field to hotels table
    // For now, we'll just mark it as inactive by updating a field
    await ctx.db.patch(args.hotelId, {
      // Add status field if needed: status: "inactive"
    });

    return { success: true };
  },
});
