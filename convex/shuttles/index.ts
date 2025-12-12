import { action, internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

type ShuttleRecord = {
  id: Id<"shuttles">;
  hotelId: Id<"hotels">;
  vehicleNumber: string;
  totalSeats: number;
  isActive: boolean;
};

const formatShuttle = (shuttle: Doc<"shuttles">): ShuttleRecord => ({
  id: shuttle._id,
  hotelId: shuttle.hotelId,
  vehicleNumber: shuttle.vehicleNumber,
  totalSeats: Number(shuttle.totalSeats),
  isActive: shuttle.isActive,
});

export const findShuttleByVehicleNumber = query({
  args: {
    hotelId: v.id("hotels"),
    vehicleNumber: v.string(),
  },
  async handler(ctx, args) {
    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId))
      .collect();

    return (
      shuttles.find(
        (shuttle) =>
          shuttle.vehicleNumber.toLowerCase() ===
          args.vehicleNumber.toLowerCase()
      ) ?? null
    );
  },
});

export const listShuttles = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 10, 50));

    let hotelId: Id<"hotels"> | null = null;
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return {
          shuttles: [],
          nextCursor: null,
        };
      }

      // Try to get hotelId from user first
      if (user.hotelId) {
        hotelId = user.hotelId;
      } else {
        // Fallback: find hotel that has this user in userIds array
        const hotels = await ctx.db.query("hotels").collect();
        const userHotel = hotels.find((h) => h.userIds.includes(user._id));
        if (userHotel) {
          hotelId = userHotel._id;
        } else {
          return {
            shuttles: [],
            nextCursor: null,
          };
        }
      }
    }

    if (hotelId) {
      const result = await ctx.db
        .query("shuttles")
        .withIndex("by_hotel", (q) => q.eq("hotelId", hotelId))
        .paginate({
          numItems: pageSize,
          cursor: args.cursor ?? null,
        });

      return {
        shuttles: result.page.map(formatShuttle),
        nextCursor: result.isDone ? null : (result.continueCursor ?? null),
      };
    }

    const result = await ctx.db.query("shuttles").paginate({
      numItems: pageSize,
      cursor: args.cursor ?? null,
    });

    return {
      shuttles: result.page.map(formatShuttle),
      nextCursor: result.isDone ? null : (result.continueCursor ?? null),
    };
  },
});

export const getShuttleById = query({
  args: {
    shuttleId: v.id("shuttles"),
  },
  async handler(ctx, args) {
    const shuttle = await ctx.db.get(args.shuttleId);
    if (!shuttle) {
      return null;
    }
    return formatShuttle(shuttle);
  },
});

export const createShuttle = action({
  args: {
    adminId: v.id("users"),
    vehicleNumber: v.string(),
    totalSeats: v.number(),
    isActive: v.optional(v.boolean()),
  },
  async handler(ctx, args): Promise<ShuttleRecord> {
    const admin = await ctx.runQuery(api.auth.getUserById, {
      id: args.adminId,
    });
    if (!admin || admin.role !== "admin") {
      throw new Error("Only administrators can create shuttles");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelByAdmin, {
      adminId: args.adminId,
    });
    if (!hotel) {
      throw new Error("Create a hotel before managing shuttles.");
    }

    const vehicleNumber = args.vehicleNumber.trim();
    if (!vehicleNumber) {
      throw new Error("Vehicle number is required");
    }

    if (!Number.isInteger(args.totalSeats) || args.totalSeats <= 0) {
      throw new Error("Total seats must be a positive integer");
    }

    const existing = await ctx.runQuery(
      api.shuttles.index.findShuttleByVehicleNumber,
      {
        hotelId: hotel.id,
        vehicleNumber,
      }
    );

    if (existing) {
      throw new Error("A shuttle with this vehicle number already exists");
    }

    const shuttleId = await ctx.runMutation(
      internal.shuttles.index.createShuttleInternal,
      {
        hotelId: hotel.id,
        vehicleNumber,
        totalSeats: args.totalSeats,
        isActive: args.isActive ?? true,
      }
    );

    await ctx.runMutation(internal.hotels.index.addShuttleToHotelInternal, {
      hotelId: hotel.id,
      shuttleId,
    });

    const created = await ctx.runQuery(api.shuttles.index.getShuttleById, {
      shuttleId,
    });

    if (!created) {
      throw new Error("Shuttle creation failed");
    }

    return created;
  },
});

export const updateShuttle = action({
  args: {
    currentUserId: v.id("users"),
    shuttleId: v.id("shuttles"),
    vehicleNumber: v.optional(v.string()),
    totalSeats: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  async handler(ctx, args): Promise<ShuttleRecord> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });
    if (!currentUser) {
      throw new Error("User not found");
    }

    const isAdmin = currentUser.role === "admin";
    const isFrontdesk = currentUser.role === "frontdesk";

    if (!isAdmin && !isFrontdesk) {
      throw new Error("Only administrators and frontdesk staff can update shuttles");
    }

    const userHotel = await ctx.runQuery(api.hotels.index.getHotelByUserId, {
      userId: args.currentUserId,
    });
    if (!userHotel) {
      throw new Error("You must be assigned to a hotel to update shuttles");
    }

    const existing = await ctx.runQuery(api.shuttles.index.getShuttleById, {
      shuttleId: args.shuttleId,
    });

    if (!existing) {
      throw new Error("Shuttle not found");
    }

    if (existing.hotelId !== userHotel.id) {
      throw new Error("Shuttle does not belong to your hotel");
    }

    const updates: {
      vehicleNumber?: string;
      totalSeats?: number;
      isActive?: boolean;
    } = {};

    if (typeof args.vehicleNumber === "string") {
      const trimmed = args.vehicleNumber.trim();
      if (!trimmed) {
        throw new Error("Vehicle number cannot be empty");
      }
      if (trimmed.toLowerCase() !== existing.vehicleNumber.toLowerCase()) {
        const duplicate = await ctx.runQuery(
          api.shuttles.index.findShuttleByVehicleNumber,
          {
            hotelId: existing.hotelId,
            vehicleNumber: trimmed,
          }
        );

        if (duplicate) {
          throw new Error("Another shuttle already uses this vehicle number");
        }
      }
      updates.vehicleNumber = trimmed;
    }

    if (typeof args.totalSeats === "number") {
      if (!Number.isInteger(args.totalSeats) || args.totalSeats <= 0) {
        throw new Error("Total seats must be a positive integer");
      }
      updates.totalSeats = args.totalSeats;
    }

    if (typeof args.isActive === "boolean") {
      updates.isActive = args.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    await ctx.runMutation(internal.shuttles.index.updateShuttleInternal, {
      shuttleId: args.shuttleId,
      ...updates,
    });

    const updated = await ctx.runQuery(api.shuttles.index.getShuttleById, {
      shuttleId: args.shuttleId,
    });

    if (!updated) {
      throw new Error("Shuttle not found after update");
    }

    return updated;
  },
});

export const deleteShuttle = action({
  args: {
    currentUserId: v.id("users"),
    shuttleId: v.id("shuttles"),
  },
  async handler(ctx, args): Promise<{ success: true }> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });
    if (!currentUser) {
      throw new Error("User not found");
    }

    const isAdmin = currentUser.role === "admin";
    const isFrontdesk = currentUser.role === "frontdesk";

    if (!isAdmin && !isFrontdesk) {
      throw new Error("Only administrators and frontdesk staff can delete shuttles");
    }

    const userHotel = await ctx.runQuery(api.hotels.index.getHotelByUserId, {
      userId: args.currentUserId,
    });
    if (!userHotel) {
      throw new Error("You must be assigned to a hotel to delete shuttles");
    }

    const existing = await ctx.runQuery(api.shuttles.index.getShuttleById, {
      shuttleId: args.shuttleId,
    });

    if (!existing) {
      throw new Error("Shuttle not found");
    }

    if (existing.hotelId !== userHotel.id) {
      throw new Error("Shuttle does not belong to your hotel");
    }

    await ctx.runMutation(
      internal.hotels.index.removeShuttleFromHotelInternal,
      {
        hotelId: existing.hotelId,
        shuttleId: args.shuttleId,
      }
    );

    await ctx.runMutation(internal.shuttles.index.deleteShuttleInternal, {
      shuttleId: args.shuttleId,
    });

    return { success: true };
  },
});

export const createShuttleInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    vehicleNumber: v.string(),
    totalSeats: v.number(),
    isActive: v.boolean(),
  },
  async handler(ctx, args) {
    return await ctx.db.insert("shuttles", {
      hotelId: args.hotelId,
      vehicleNumber: args.vehicleNumber,
      totalSeats: BigInt(args.totalSeats),
      isActive: args.isActive,
    });
  },
});

export const updateShuttleInternal = internalMutation({
  args: {
    shuttleId: v.id("shuttles"),
    vehicleNumber: v.optional(v.string()),
    totalSeats: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const updates: Record<string, any> = {};

    if (typeof args.vehicleNumber === "string") {
      updates.vehicleNumber = args.vehicleNumber;
    }

    if (typeof args.totalSeats === "number") {
      updates.totalSeats = BigInt(args.totalSeats);
    }

    if (typeof args.isActive === "boolean") {
      updates.isActive = args.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await ctx.db.patch(args.shuttleId, updates);
  },
});

export const deleteShuttleInternal = internalMutation({
  args: {
    shuttleId: v.id("shuttles"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.shuttleId);
  },
});
