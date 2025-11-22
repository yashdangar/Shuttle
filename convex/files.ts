import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadProfilePicture = mutation({
  args: {
    storageId: v.id("_storage"),
    userId: v.id("users"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      uiName: args.fileName,
      uploadedByUserId: args.userId,
    });

    await ctx.db.patch(args.userId, {
      profilePictureId: fileId,
    });

    return fileId;
  },
});

const MAX_HOTEL_IMAGES = 10;

export const uploadHotelImage = mutation({
  args: {
    storageId: v.id("_storage"),
    hotelId: v.id("hotels"),
    userId: v.id("users"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const hotel = await ctx.db.get(args.hotelId);
    if (!hotel) {
      throw new Error("Hotel not found");
    }

    if (hotel.imageIds.length >= MAX_HOTEL_IMAGES) {
      throw new Error(`Maximum ${MAX_HOTEL_IMAGES} images allowed per hotel`);
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      uiName: args.fileName,
      uploadedByUserId: args.userId,
    });

    await ctx.db.patch(args.hotelId, {
      imageIds: [...hotel.imageIds, fileId],
    });

    return fileId;
  },
});

export const getProfilePictureUrl = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }
    return await ctx.storage.getUrl(file.storageId);
  },
});

export const getHotelImageUrl = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }
    return await ctx.storage.getUrl(file.storageId);
  },
});

export const getHotelImageUrls = query({
  args: {
    fileIds: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const urls: (string | null)[] = [];
    for (const fileId of args.fileIds) {
      const file = await ctx.db.get(fileId);
      if (file) {
        const url = await ctx.storage.getUrl(file.storageId);
        urls.push(url);
      } else {
        urls.push(null);
      }
    }
    return urls;
  },
});
