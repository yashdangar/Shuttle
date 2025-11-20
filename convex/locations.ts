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
});

export const listLocations = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 25, 100));

    const page = await ctx.db
      .query("locations")
      .order("desc")
      .paginate({
        numItems: pageSize,
        cursor: args.cursor ?? null,
      });

    return {
      locations: page.page.map(formatLocation),
      nextCursor: page.isDone ? null : (page.continueCursor ?? null),
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
  },
  async handler(ctx, args) {
    return ctx.db.insert("locations", {
      name: args.name,
      address: args.address,
      latitude: args.latitude,
      longitude: args.longitude,
      locationType: args.locationType,
      isAirportLocation: args.isAirportLocation,
      createdByUserId: args.createdByUserId,
    });
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
