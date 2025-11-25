import { action, internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";

export type LocationRecord = {
  id: Id<"locations">;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationPrivacy: "public" | "private";
  locationType: "airport" | "hotel" | "other";
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
  locationPrivacy: doc.locationPrivacy,
  locationType: doc.locationType,
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
      (loc) => loc.hotelId === undefined && loc.locationPrivacy === "public"
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
    locationType: v.union(
      v.literal("airport"),
      v.literal("hotel"),
      v.literal("other")
    ),
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
      internal.locations.index.createLocationInternal,
      {
        name: args.name.trim(),
        address: args.address.trim(),
        latitude: args.latitude,
        longitude: args.longitude,
        locationPrivacy: "public",
        locationType: args.locationType,
        createdByUserId: args.currentUserId,
        hotelId: undefined,
        clonedFromLocationId: undefined,
      }
    );

    const created = await ctx.runQuery(api.locations.index.getLocationById, {
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
    locationType: v.union(
      v.literal("airport"),
      v.literal("hotel"),
      v.literal("other")
    ),
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

    const existing = await ctx.runQuery(api.locations.index.getLocationById, {
      locationId: args.locationId,
    });

    if (!existing) {
      throw new Error("Location not found");
    }

    await ctx.runMutation(internal.locations.index.updateLocationInternal, {
      locationId: args.locationId,
      name: args.name.trim(),
      address: args.address.trim(),
      latitude: args.latitude,
      longitude: args.longitude,
      locationType: args.locationType,
    });

    const updated = await ctx.runQuery(api.locations.index.getLocationById, {
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

    const existing = await ctx.runQuery(api.locations.index.getLocationById, {
      locationId: args.locationId,
    });

    if (!existing) {
      throw new Error("Location not found");
    }

    await ctx.runMutation(internal.locations.index.deleteLocationInternal, {
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
    locationPrivacy: v.union(v.literal("public"), v.literal("private")),
    locationType: v.union(
      v.literal("airport"),
      v.literal("hotel"),
      v.literal("other")
    ),
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
      locationPrivacy: "public" | "private";
      locationType: "airport" | "hotel" | "other";
      createdByUserId: Id<"users">;
      hotelId?: Id<"hotels">;
      clonedFromLocationId?: Id<"locations">;
    } = {
      name: args.name,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      locationPrivacy: args.locationPrivacy,
      locationType: args.locationType,
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
    locationType: v.optional(
      v.union(v.literal("airport"), v.literal("hotel"), v.literal("other"))
    ),
  },
  async handler(ctx, args) {
    const updateData: {
      name: string;
      address: string;
      latitude?: number;
      longitude?: number;
      locationType?: "airport" | "hotel" | "other";
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
    if (args.locationType !== undefined) {
      updateData.locationType = args.locationType;
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
    locationType: v.union(
      v.literal("airport"),
      v.literal("hotel"),
      v.literal("other")
    ),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.locationId, {
      name: args.name,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      locationType: args.locationType,
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
    const user = await ctx.db.get(args.adminId);

    if (!user || !user.hotelId) {
      return {
        locations: [],
        nextCursor: null,
      };
    }

    const pageSize = Math.max(1, Math.min(args.limit ?? 25, 100));
    const allLocations = await ctx.db
      .query("locations")
      .withIndex("by_hotel", (q) => q.eq("hotelId", user.hotelId))
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
    const user = await ctx.db.get(args.adminId);
    const hotel = user?.hotelId ? await ctx.db.get(user.hotelId) : null;

    const pageSize = Math.max(1, Math.min(args.limit ?? 25, 100));

    const allPublicLocations = await ctx.db
      .query("locations")
      .withIndex("by_location_privacy", (q) =>
        q.eq("locationPrivacy", "public")
      )
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

export const listHotelLocations = query({
  args: {
    hotelId: v.id("hotels"),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      return [];
    }

    const pageSize = Math.max(1, Math.min(args.limit ?? 100, 200));

    // Get private locations created by this hotel (where hotelId matches)
    const privateLocations = await ctx.db
      .query("locations")
      .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId))
      .collect();

    // Get imported locations (locations whose IDs are in hotel.locationIds)
    const importedLocationIds = hotel.locationIds ?? [];
    const importedLocations =
      importedLocationIds.length > 0
        ? await Promise.all(
            importedLocationIds.map((id) => ctx.db.get(id))
          ).then((locs) =>
            locs.filter((loc): loc is Doc<"locations"> => loc !== null)
          )
        : [];

    // Combine both types of locations
    const allHotelLocations = [...privateLocations, ...importedLocations];

    // Remove duplicates (in case a location is both private and imported)
    const uniqueLocations = Array.from(
      new Map(allHotelLocations.map((loc) => [loc._id, loc])).values()
    );

    // Sort by creation time (newest first)
    const sortedLocations = uniqueLocations.sort(
      (a, b) => b._creationTime - a._creationTime
    );

    // Limit results
    const limitedLocations = sortedLocations.slice(0, pageSize);

    return limitedLocations.map(formatLocation);
  },
});

export const createAdminLocation = action({
  args: {
    currentUserId: v.id("users"),
    name: v.string(),
    address: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    locationType: v.union(
      v.literal("airport"),
      v.literal("hotel"),
      v.literal("other")
    ),
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

    const userDoc = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.currentUserId,
      }
    );

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const locationId = await ctx.runMutation(
      internal.locations.index.createLocationInternal,
      {
        name: args.name.trim(),
        address: args.address.trim(),
        latitude: args.latitude,
        longitude: args.longitude,
        locationPrivacy: "private",
        locationType: args.locationType,
        createdByUserId: args.currentUserId,
        hotelId: hotel.id,
      }
    );

    await ctx.runMutation(internal.hotels.index.addLocationToHotelInternal, {
      hotelId: hotel.id,
      locationId,
    });

    const created = await ctx.runQuery(api.locations.index.getLocationById, {
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

    const userDoc = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.currentUserId,
      }
    );

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    if (hotel.locationIds.includes(args.publicLocationId)) {
      throw new Error("Location already imported");
    }

    const publicLocation = await ctx.runQuery(
      api.locations.index.getLocationById,
      {
        locationId: args.publicLocationId,
      }
    );

    if (!publicLocation) {
      throw new Error("Public location not found");
    }

    if (publicLocation.locationPrivacy !== "public") {
      throw new Error("Can only import public locations");
    }

    const clonedLocationId = await ctx.runMutation(
      internal.locations.index.createLocationInternal,
      {
        name: publicLocation.name,
        address: publicLocation.address,
        latitude: publicLocation.latitude,
        longitude: publicLocation.longitude,
        locationPrivacy: "private",
        locationType: publicLocation.locationType,
        createdByUserId: args.currentUserId,
        hotelId: hotel.id,
        clonedFromLocationId: args.publicLocationId,
      }
    );

    await ctx.runMutation(internal.hotels.index.addLocationToHotelInternal, {
      hotelId: hotel.id,
      locationId: clonedLocationId,
    });

    const cloned = await ctx.runQuery(api.locations.index.getLocationById, {
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
    locationType: v.optional(
      v.union(v.literal("airport"), v.literal("hotel"), v.literal("other"))
    ),
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

    const userDoc = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.currentUserId,
      }
    );

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const existing = await ctx.runQuery(api.locations.index.getLocationById, {
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
      await ctx.runMutation(
        internal.locations.index.updateAdminLocationInternal,
        {
          locationId: args.locationId,
          name: args.name.trim(),
          address: args.address.trim(),
        }
      );
    } else {
      if (
        args.latitude === undefined ||
        args.longitude === undefined ||
        args.locationType === undefined
      ) {
        throw new Error("All fields are required for private location updates");
      }
      await ctx.runMutation(
        internal.locations.index.updateAdminLocationInternal,
        {
          locationId: args.locationId,
          name: args.name.trim(),
          address: args.address.trim(),
          latitude: args.latitude,
          longitude: args.longitude,
          locationType: args.locationType,
        }
      );
    }

    const updated = await ctx.runQuery(api.locations.index.getLocationById, {
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

    const userDoc = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.currentUserId,
      }
    );

    if (!userDoc || !userDoc.hotelId) {
      throw new Error("Hotel not found for admin");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: userDoc.hotelId,
    });

    if (!hotel) {
      throw new Error("Hotel not found");
    }

    const existing = await ctx.runQuery(api.locations.index.getLocationById, {
      locationId: args.locationId,
    });

    if (!existing) {
      throw new Error("Location not found");
    }

    if (existing.hotelId !== hotel.id) {
      throw new Error("Location does not belong to your hotel");
    }

    await ctx.runMutation(internal.locations.index.deleteLocationInternal, {
      locationId: args.locationId,
    });

    await ctx.runMutation(
      internal.hotels.index.removeLocationFromHotelInternal,
      {
        hotelId: hotel.id,
        locationId: args.locationId,
      }
    );

    return { success: true };
  },
});
