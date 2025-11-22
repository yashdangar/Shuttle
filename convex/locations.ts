import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

export type LocationRecord = {
  id: Id<"locations">;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType: "public" | "private";
  isAirportLocation: boolean;
  createdByUserId: Id<"users">;
  createdAt: number;
  hotelId?: Id<"hotels">;
  clonedFromLocationId?: Id<"locations">;
};

const formatLocation = (doc: Doc<"locations">): LocationRecord => ({
  id: doc._id,
  name: doc.name,
  address: doc.address,
  latitude: doc.latitude,
  longitude: doc.longitude,
  locationType: doc.locationType,
  isAirportLocation: doc.isAirportLocation,
  createdByUserId: doc.createdByUserId,
  createdAt: doc._creationTime,
  hotelId: doc.hotelId,
  clonedFromLocationId: doc.clonedFromLocationId,
});

export const listLocations = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 25, 100));

    const allLocations = await ctx.db.query("locations").collect();
    
    const publicLocations = allLocations.filter(
      (loc) => loc.hotelId === undefined && loc.locationType === "public"
    );

    const sortedLocations = publicLocations.sort(
      (a, b) => b._creationTime - a._creationTime
    );

    const startIndex = args.cursor
      ? sortedLocations.findIndex((loc) => loc._id === args.cursor) + 1
      : 0;
    const endIndex = startIndex + pageSize;
    const page = sortedLocations.slice(startIndex, endIndex);

    return {
      locations: page.map(formatLocation),
      nextCursor:
        endIndex >= sortedLocations.length
          ? null
          : (sortedLocations[endIndex - 1]._id as string),
    };
  },
});

export const getLocationById = query({
  args: {
    locationId: v.id("locations"),
  },
  async handler(ctx, args) {
    const doc = await ctx.db.get(args.locationId);
    return doc ? formatLocation(doc) : null;
  },
});

export const createLocation = action({
  args: {
    currentUserId: v.id("users"),
    name: v.string(),
    address: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    isAirportLocation: v.boolean(),
  },
  async handler(ctx, args): Promise<LocationRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "superadmin") {
      throw new Error("Only superadmin can create locations");
    }

    const locationId = await ctx.runMutation(
      internal.locations.createLocationInternal,
      {
        name: args.name.trim(),
        address: args.address.trim(),
        latitude: args.latitude,
        longitude: args.longitude,
        locationType: "public",
        isAirportLocation: args.isAirportLocation,
        createdByUserId: args.currentUserId,
        hotelId: undefined,
        clonedFromLocationId: undefined,
      }
    );

    const created = await ctx.runQuery(api.locations.getLocationById, {
      locationId,
    });

    if (!created) {
      throw new Error("Location not found after creation");
    }

    return created;
  },
});

export const updateLocation = action({
  args: {
    currentUserId: v.id("users"),
    locationId: v.id("locations"),
    name: v.string(),
    address: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    isAirportLocation: v.boolean(),
  },
  async handler(ctx, args): Promise<LocationRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "superadmin") {
      throw new Error("Only superadmin can update locations");
    }

    const existing = await ctx.runQuery(api.locations.getLocationById, {
      locationId: args.locationId,
    });

    if (!existing) {
      throw new Error("Location not found");
    }

    await ctx.runMutation(internal.locations.updateLocationInternal, {
      locationId: args.locationId,
      name: args.name.trim(),
      address: args.address.trim(),
      latitude: args.latitude,
      longitude: args.longitude,
      isAirportLocation: args.isAirportLocation,
    });

    const updated = await ctx.runQuery(api.locations.getLocationById, {
      locationId: args.locationId,
    });

    if (!updated) {
      throw new Error("Location not found after update");
    }

    return updated;
  },
});

export const deleteLocation = action({
  args: {
    currentUserId: v.id("users"),
    locationId: v.id("locations"),
  },
  async handler(ctx, args) {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "superadmin") {
      throw new Error("Only superadmin can delete locations");
    }

    const existing = await ctx.runQuery(api.locations.getLocationById, {
      locationId: args.locationId,
    });

    if (!existing) {
      throw new Error("Location not found");
    }

    await ctx.runMutation(internal.locations.deleteLocationInternal, {
      locationId: args.locationId,
    });

    return { success: true };
  },
});

export const createLocationInternal = internalMutation({
  args: {
    name: v.string(),
    address: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    locationType: v.union(v.literal("public"), v.literal("private")),
    isAirportLocation: v.boolean(),
    createdByUserId: v.id("users"),
    hotelId: v.optional(v.id("hotels")),
    clonedFromLocationId: v.optional(v.id("locations")),
  },
  async handler(ctx, args) {
    const locationData: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      locationType: "public" | "private";
      isAirportLocation: boolean;
      createdByUserId: Id<"users">;
      hotelId?: Id<"hotels">;
      clonedFromLocationId?: Id<"locations">;
    } = {
      name: args.name,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      locationType: args.locationType,
      isAirportLocation: args.isAirportLocation,
      createdByUserId: args.createdByUserId,
    };

    if (args.hotelId !== undefined) {
      locationData.hotelId = args.hotelId;
    }

    if (args.clonedFromLocationId !== undefined) {
      locationData.clonedFromLocationId = args.clonedFromLocationId;
    }

    return ctx.db.insert("locations", locationData);
  },
});

export const updateAdminLocationInternal = internalMutation({
  args: {
    locationId: v.id("locations"),
    name: v.string(),
    address: v.string(),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    isAirportLocation: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const updateData: {
      name: string;
      address: string;
      latitude?: number;
      longitude?: number;
      isAirportLocation?: boolean;
    } = {
      name: args.name,
      address: args.address,
    };

    if (args.latitude !== undefined) {
      updateData.latitude = args.latitude;
    }
    if (args.longitude !== undefined) {
      updateData.longitude = args.longitude;
    }
    if (args.isAirportLocation !== undefined) {
      updateData.isAirportLocation = args.isAirportLocation;
    }

    await ctx.db.patch(args.locationId, updateData);
  },
});

export const updateLocationInternal = internalMutation({
  args: {
    locationId: v.id("locations"),
    name: v.string(),
    address: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    isAirportLocation: v.boolean(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.locationId, {
      name: args.name,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      isAirportLocation: args.isAirportLocation,
    });
  },
});

export const deleteLocationInternal = internalMutation({
  args: {
    locationId: v.id("locations"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.locationId);
  },
});

export const listAdminLocations = query({
  args: {
    adminId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const hotels = await ctx.db.query("hotels").collect();
    const hotel = hotels.find((entry) =>
      entry.userIds.some((userId: Id<"users">) => userId === args.adminId)
    );

    if (!hotel) {
      return {
        locations: [],
        nextCursor: null,
      };
    }

    const pageSize = Math.max(1, Math.min(args.limit ?? 25, 100));
    const allLocations = await ctx.db
      .query("locations")
      .withIndex("by_hotel", (q) => q.eq("hotelId", hotel._id))
      .collect();

    const sortedLocations = allLocations.sort(
      (a, b) => b._creationTime - a._creationTime
    );

    const startIndex = args.cursor
      ? sortedLocations.findIndex((loc) => loc._id === args.cursor) + 1
      : 0;
    const endIndex = startIndex + pageSize;
    const page = sortedLocations.slice(startIndex, endIndex);

    return {
      locations: page.map(formatLocation),
      nextCursor:
        endIndex >= sortedLocations.length
          ? null
          : (sortedLocations[endIndex - 1]._id as string),
    };
  },
});

export const listPublicLocations = query({
  args: {
    adminId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const hotels = await ctx.db.query("hotels").collect();
    const hotel = hotels.find((entry) =>
      entry.userIds.some((userId: Id<"users">) => userId === args.adminId)
    );

    const pageSize = Math.max(1, Math.min(args.limit ?? 25, 100));

    const allPublicLocations = await ctx.db
      .query("locations")
      .withIndex("by_location_type", (q) => q.eq("locationType", "public"))
      .collect();

    const publicLocations = allPublicLocations.filter(
      (loc) => loc.hotelId === undefined
    );

    const sortedLocations = publicLocations.sort(
      (a, b) => b._creationTime - a._creationTime
    );

    const startIndex = args.cursor
      ? sortedLocations.findIndex((loc) => loc._id === args.cursor) + 1
      : 0;
    const endIndex = startIndex + pageSize;
    const page = sortedLocations.slice(startIndex, endIndex);

    const importedLocationIds = hotel?.locationIds ?? [];
    const allLocations = await ctx.db.query("locations").collect();
    const importedClonedLocations = allLocations.filter(
      (loc) => importedLocationIds.includes(loc._id) && loc.clonedFromLocationId
    );
    const importedSourceIds = new Set(
      importedClonedLocations.map((loc) => loc.clonedFromLocationId)
    );

    return {
      locations: page.map((loc) => ({
        ...formatLocation(loc),
        isImported: importedSourceIds.has(loc._id),
      })),
      nextCursor:
        endIndex >= sortedLocations.length
          ? null
          : (sortedLocations[endIndex - 1]._id as string),
    };
  },
});

export const createAdminLocation = action({
  args: {
    currentUserId: v.id("users"),
    name: v.string(),
    address: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    isAirportLocation: v.boolean(),
  },
  async handler(ctx, args): Promise<LocationRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can create private locations");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelByAdmin, {
      adminId: args.currentUserId,
    });

    if (!hotel) {
      throw new Error("Hotel not found for admin");
    }

    const locationId = await ctx.runMutation(
      internal.locations.createLocationInternal,
      {
        name: args.name.trim(),
        address: args.address.trim(),
        latitude: args.latitude,
        longitude: args.longitude,
        locationType: "private",
        isAirportLocation: args.isAirportLocation,
        createdByUserId: args.currentUserId,
        hotelId: hotel.id,
      }
    );

    await ctx.runMutation(internal.hotels.addLocationToHotelInternal, {
      hotelId: hotel.id,
      locationId,
    });

    const created = await ctx.runQuery(api.locations.getLocationById, {
      locationId,
    });

    if (!created) {
      throw new Error("Location not found after creation");
    }

    return created;
  },
});

export const importLocation = action({
  args: {
    currentUserId: v.id("users"),
    publicLocationId: v.id("locations"),
  },
  async handler(ctx, args): Promise<LocationRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can import locations");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelByAdmin, {
      adminId: args.currentUserId,
    });

    if (!hotel) {
      throw new Error("Hotel not found for admin");
    }

    if (hotel.locationIds.includes(args.publicLocationId)) {
      throw new Error("Location already imported");
    }

    const publicLocation = await ctx.runQuery(api.locations.getLocationById, {
      locationId: args.publicLocationId,
    });

    if (!publicLocation) {
      throw new Error("Public location not found");
    }

    if (publicLocation.locationType !== "public") {
      throw new Error("Can only import public locations");
    }

    const clonedLocationId = await ctx.runMutation(
      internal.locations.createLocationInternal,
      {
        name: publicLocation.name,
        address: publicLocation.address,
        latitude: publicLocation.latitude,
        longitude: publicLocation.longitude,
        locationType: "private",
        isAirportLocation: publicLocation.isAirportLocation,
        createdByUserId: args.currentUserId,
        hotelId: hotel.id,
        clonedFromLocationId: args.publicLocationId,
      }
    );

    await ctx.runMutation(internal.hotels.addLocationToHotelInternal, {
      hotelId: hotel.id,
      locationId: clonedLocationId,
    });

    const cloned = await ctx.runQuery(api.locations.getLocationById, {
      locationId: clonedLocationId,
    });

    if (!cloned) {
      throw new Error("Location not found after cloning");
    }

    return cloned;
  },
});

export const updateAdminLocation = action({
  args: {
    currentUserId: v.id("users"),
    locationId: v.id("locations"),
    name: v.string(),
    address: v.string(),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    isAirportLocation: v.optional(v.boolean()),
  },
  async handler(ctx, args): Promise<LocationRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can update locations");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelByAdmin, {
      adminId: args.currentUserId,
    });

    if (!hotel) {
      throw new Error("Hotel not found for admin");
    }

    const existing = await ctx.runQuery(api.locations.getLocationById, {
      locationId: args.locationId,
    });

    if (!existing) {
      throw new Error("Location not found");
    }

    if (existing.hotelId !== hotel.id) {
      throw new Error("Location does not belong to your hotel");
    }

    const isImported = !!existing.clonedFromLocationId;

    if (isImported) {
      await ctx.runMutation(internal.locations.updateAdminLocationInternal, {
        locationId: args.locationId,
        name: args.name.trim(),
        address: args.address.trim(),
      });
    } else {
      if (
        args.latitude === undefined ||
        args.longitude === undefined ||
        args.isAirportLocation === undefined
      ) {
        throw new Error(
          "All fields are required for private location updates"
        );
      }
      await ctx.runMutation(internal.locations.updateAdminLocationInternal, {
        locationId: args.locationId,
        name: args.name.trim(),
        address: args.address.trim(),
        latitude: args.latitude,
        longitude: args.longitude,
        isAirportLocation: args.isAirportLocation,
      });
    }

    const updated = await ctx.runQuery(api.locations.getLocationById, {
      locationId: args.locationId,
    });

    if (!updated) {
      throw new Error("Location not found after update");
    }

    return updated;
  },
});

export const deleteAdminLocation = action({
  args: {
    currentUserId: v.id("users"),
    locationId: v.id("locations"),
  },
  async handler(ctx, args) {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "admin") {
      throw new Error("Only admin can delete locations");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelByAdmin, {
      adminId: args.currentUserId,
    });

    if (!hotel) {
      throw new Error("Hotel not found for admin");
    }

    const existing = await ctx.runQuery(api.locations.getLocationById, {
      locationId: args.locationId,
    });

    if (!existing) {
      throw new Error("Location not found");
    }

    if (existing.hotelId !== hotel.id) {
      throw new Error("Location does not belong to your hotel");
    }

    await ctx.runMutation(internal.locations.deleteLocationInternal, {
      locationId: args.locationId,
    });

    await ctx.runMutation(internal.hotels.removeLocationFromHotelInternal, {
      hotelId: hotel.id,
      locationId: args.locationId,
    });

    return { success: true };
  },
});
