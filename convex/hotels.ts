import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

type HotelRecord = {
  id: Id<"hotels">;
  name: string;
  slug: string;
  address: string;
  phoneNumber: string;
  email: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  imageIds: Id<"files">[];
  shuttleIds: Id<"shuttles">[];
  userIds: Id<"users">[];
  locationIds: Id<"locations">[];
};

const formatHotel = (hotel: Doc<"hotels">): HotelRecord => ({
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
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Get hotel by admin user ID using direct hotelId reference
export const getHotelByAdmin = query({
  args: {
    adminId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.adminId);
    if (!user || !user.hotelId) {
      return null;
    }
    const hotel = await ctx.db.get(user.hotelId);
    if (!hotel) {
      return null;
    }
    return formatHotel(hotel);
  },
});

// Get hotel by any user ID (admin, frontdesk, or driver) using direct hotelId reference
export const getHotelByUserId = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.hotelId) {
      return null;
    }
    const hotel = await ctx.db.get(user.hotelId);
    if (!hotel) {
      return null;
    }
    return formatHotel(hotel);
  },
});

export const getHotelBySlug = query({
  args: {
    slug: v.string(),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db
      .query("hotels")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!hotel) {
      return null;
    }
    return formatHotel(hotel);
  },
});

export const getHotelById = query({
  args: {
    hotelId: v.id("hotels"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      return null;
    }
    return formatHotel(hotel);
  },
});

export const createHotel = action({
  args: {
    adminId: v.id("users"),
    name: v.string(),
    slug: v.optional(v.string()),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    timeZone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  async handler(ctx, args): Promise<HotelRecord> {
    const admin = await ctx.runQuery(api.auth.getUserById, {
      id: args.adminId,
    });
    if (!admin || admin.role !== "admin") {
      throw new Error("Only administrators can create hotels");
    }

    const existingHotel = await ctx.runQuery(api.hotels.getHotelByAdmin, {
      adminId: args.adminId,
    });
    if (existingHotel) {
      throw new Error("You have already created a hotel");
    }

    const slugSource = args.slug?.trim().length
      ? args.slug.trim()
      : args.name.trim();
    const normalizedSlug = slugify(slugSource);
    if (!normalizedSlug) {
      throw new Error("Slug could not be generated from the provided input");
    }

    const duplicateSlug = await ctx.runQuery(api.hotels.getHotelBySlug, {
      slug: normalizedSlug,
    });
    if (duplicateSlug) {
      throw new Error("A hotel with this slug already exists");
    }

    const trimmedName = args.name.trim();
    const trimmedAddress = args.address.trim();
    const trimmedPhone = args.phoneNumber.trim();
    const trimmedEmail = args.email.trim().toLowerCase();
    const trimmedTimeZone = args.timeZone.trim();

    if (
      !trimmedName ||
      !trimmedAddress ||
      !trimmedPhone ||
      !trimmedEmail ||
      !trimmedTimeZone
    ) {
      throw new Error("All fields are required");
    }

    const hotelId = await ctx.runMutation(internal.hotels.createHotelInternal, {
      name: trimmedName,
      slug: normalizedSlug,
      address: trimmedAddress,
      phoneNumber: trimmedPhone,
      email: trimmedEmail,
      timeZone: trimmedTimeZone,
      latitude: args.latitude,
      longitude: args.longitude,
      adminId: args.adminId,
    });

    const hotel = await ctx.runQuery(api.hotels.getHotelById, {
      hotelId,
    });
    if (!hotel) {
      throw new Error("Failed to create hotel");
    }

    return hotel;
  },
});

export const createHotelInternal = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    timeZone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    adminId: v.id("users"),
  },
  async handler(ctx, args) {
    const hotelId = await ctx.db.insert("hotels", {
      name: args.name,
      slug: args.slug,
      address: args.address,
      phoneNumber: args.phoneNumber,
      email: args.email,
      imageIds: [],
      timeZone: args.timeZone,
      latitude: args.latitude,
      longitude: args.longitude,
      shuttleIds: [],
      userIds: [args.adminId],
      locationIds: [],
    });

    // Set hotelId on the admin user for direct reference
    await ctx.db.patch(args.adminId, {
      hotelId,
    });

    return hotelId;
  },
});

export const addUserToHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    // Check if user already has this hotelId
    if (user.hotelId === args.hotelId) {
      return;
    }
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    // Add user to hotel's userIds array (for backward compatibility)
    await ctx.db.patch(args.hotelId, {
      userIds: [...hotel.userIds, args.userId],
    });
    // Set hotelId on user for direct reference
    await ctx.db.patch(args.userId, {
      hotelId: args.hotelId,
    });
  },
});

export const removeUserFromHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    // Check if user doesn't belong to this hotel
    if (user.hotelId !== args.hotelId) {
      return;
    }
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    // Remove user from hotel's userIds array (for backward compatibility)
    await ctx.db.patch(args.hotelId, {
      userIds: hotel.userIds.filter((userId) => userId !== args.userId),
    });
    // Clear hotelId on user
    await ctx.db.patch(args.userId, {
      hotelId: undefined,
    });
  },
});

export const addShuttleToHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    shuttleId: v.id("shuttles"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    if (hotel.shuttleIds.some((id) => id === args.shuttleId)) {
      return;
    }
    await ctx.db.patch(args.hotelId, {
      shuttleIds: [...hotel.shuttleIds, args.shuttleId],
    });
  },
});

export const removeShuttleFromHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    shuttleId: v.id("shuttles"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    if (!hotel.shuttleIds.some((id) => id === args.shuttleId)) {
      return;
    }
    await ctx.db.patch(args.hotelId, {
      shuttleIds: hotel.shuttleIds.filter((id) => id !== args.shuttleId),
    });
  },
});

export const addLocationToHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    locationId: v.id("locations"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    if (hotel.locationIds.some((id) => id === args.locationId)) {
      return;
    }
    await ctx.db.patch(args.hotelId, {
      locationIds: [...hotel.locationIds, args.locationId],
    });
  },
});

export const removeLocationFromHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    locationId: v.id("locations"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    if (!hotel.locationIds.some((id) => id === args.locationId)) {
      return;
    }
    await ctx.db.patch(args.hotelId, {
      locationIds: hotel.locationIds.filter((id) => id !== args.locationId),
    });
  },
});
