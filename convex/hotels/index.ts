import { action, internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";

export type HotelRecord = {
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
  bookingIds: Id<"bookings">[];
  tripIds: Id<"trips">[];
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
  bookingIds: hotel.bookingIds,
  tripIds: hotel.tripIds,
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

export const listHotels = query({
  args: {
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 100, 200));
    const hotels = await ctx.db.query("hotels").take(pageSize);
    return hotels.map(formatHotel);
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
    imageIds: v.optional(v.array(v.id("files"))),
  },
  async handler(ctx, args): Promise<HotelRecord> {
    const admin = await ctx.runQuery(api.auth.getUserById, {
      id: args.adminId,
    });
    if (!admin || admin.role !== "admin") {
      throw new Error("Only administrators can create hotels");
    }

    const existingHotel = await ctx.runQuery(api.hotels.index.getHotelByAdmin, {
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

    const duplicateSlug = await ctx.runQuery(api.hotels.index.getHotelBySlug, {
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

    const hotelId = await ctx.runMutation(
      internal.hotels.index.createHotelInternal,
      {
        name: trimmedName,
        slug: normalizedSlug,
        address: trimmedAddress,
        phoneNumber: trimmedPhone,
        email: trimmedEmail,
        timeZone: trimmedTimeZone,
        latitude: args.latitude,
        longitude: args.longitude,
        adminId: args.adminId,
      }
    );

    // Add images if provided
    if (args.imageIds && args.imageIds.length > 0) {
      await ctx.runMutation(internal.hotels.index.addImagesToHotelInternal, {
        hotelId,
        imageIds: args.imageIds,
      });
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId,
    });
    if (!hotel) {
      throw new Error("Failed to create hotel");
    }

    return hotel;
  },
});

export const updateHotel = action({
  args: {
    adminId: v.id("users"),
    hotelId: v.id("hotels"),
    name: v.string(),
    slug: v.optional(v.string()),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    timeZone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    imageIdsToAdd: v.optional(v.array(v.id("files"))),
    imageIdsToRemove: v.optional(v.array(v.id("files"))),
  },
  async handler(ctx, args): Promise<HotelRecord> {
    const admin = await ctx.runQuery(api.auth.getUserById, {
      id: args.adminId,
    });
    if (!admin || admin.role !== "admin") {
      throw new Error("Only administrators can update hotels");
    }

    // Verify the admin owns this hotel
    const existingHotel = await ctx.runQuery(api.hotels.index.getHotelByAdmin, {
      adminId: args.adminId,
    });
    if (!existingHotel || existingHotel.id !== args.hotelId) {
      throw new Error("You can only update your own hotel");
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

    // Generate slug from provided slug or name
    const slugSource = args.slug?.trim().length
      ? args.slug.trim()
      : trimmedName;
    const normalizedSlug = slugify(slugSource);
    if (!normalizedSlug) {
      throw new Error("Slug could not be generated from the provided input");
    }

    // Only check for duplicates if the slug is different from current
    if (normalizedSlug !== existingHotel.slug) {
      const duplicateSlug = await ctx.runQuery(
        api.hotels.index.getHotelBySlug,
        {
          slug: normalizedSlug,
        }
      );
      if (duplicateSlug) {
        throw new Error("A hotel with this slug already exists");
      }
    }

    // Handle image removals
    if (args.imageIdsToRemove && args.imageIdsToRemove.length > 0) {
      for (const fileId of args.imageIdsToRemove) {
        await ctx.runMutation(api.files.index.removeHotelImage, {
          hotelId: args.hotelId,
          fileId,
        });
      }
    }

    // Handle image additions - use uploadHotelImage for each new image
    // Note: For edit form, images should be uploaded before calling updateHotel
    // The imageIdsToAdd should be fileIds that are already uploaded
    if (args.imageIdsToAdd && args.imageIdsToAdd.length > 0) {
      const hotel = await ctx.runQuery(api.hotels.index.getHotelById, {
        hotelId: args.hotelId,
      });
      if (hotel) {
        const currentCount = hotel.imageIds.length;
        const toAddCount = args.imageIdsToAdd.length;
        if (currentCount + toAddCount > 10) {
          throw new Error(
            `Cannot add ${toAddCount} image(s). Maximum 10 images allowed per hotel. Current: ${currentCount}`
          );
        }
        await ctx.runMutation(internal.hotels.index.addImagesToHotelInternal, {
          hotelId: args.hotelId,
          imageIds: args.imageIdsToAdd,
        });
      }
    }

    await ctx.runMutation(internal.hotels.index.updateHotelInternal, {
      hotelId: args.hotelId,
      name: trimmedName,
      slug: normalizedSlug,
      address: trimmedAddress,
      phoneNumber: trimmedPhone,
      email: trimmedEmail,
      timeZone: trimmedTimeZone,
      latitude: args.latitude,
      longitude: args.longitude,
    });

    const updatedHotel = await ctx.runQuery(api.hotels.index.getHotelById, {
      hotelId: args.hotelId,
    });
    if (!updatedHotel) {
      throw new Error("Failed to update hotel");
    }

    return updatedHotel;
  },
});

export const updateHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    name: v.string(),
    slug: v.string(),
    address: v.string(),
    phoneNumber: v.string(),
    email: v.string(),
    timeZone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.hotelId, {
      name: args.name,
      slug: args.slug,
      address: args.address,
      phoneNumber: args.phoneNumber,
      email: args.email,
      timeZone: args.timeZone,
      latitude: args.latitude,
      longitude: args.longitude,
    });
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
      bookingIds: [],
      tripIds: [],
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

export const addTripToHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    if (hotel.tripIds.some((id) => id === args.tripId)) {
      return;
    }
    await ctx.db.patch(args.hotelId, {
      tripIds: [...hotel.tripIds, args.tripId],
    });
  },
});

export const removeTripFromHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    tripId: v.id("trips"),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    if (!hotel.tripIds.some((id) => id === args.tripId)) {
      return;
    }
    await ctx.db.patch(args.hotelId, {
      tripIds: hotel.tripIds.filter((id) => id !== args.tripId),
    });
  },
});

export const addImagesToHotelInternal = internalMutation({
  args: {
    hotelId: v.id("hotels"),
    imageIds: v.array(v.id("files")),
  },
  async handler(ctx, args) {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }
    // Add new image IDs that don't already exist
    const existingIds = new Set(hotel.imageIds);
    const newIds = args.imageIds.filter((id) => !existingIds.has(id));
    if (newIds.length > 0) {
      await ctx.db.patch(args.hotelId, {
        imageIds: [...hotel.imageIds, ...newIds],
      });
    }
  },
});
