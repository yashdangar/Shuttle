import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import bcrypt from "bcryptjs";

type StaffRole = "driver" | "frontdesk";

const staffRoleSchema = v.union(v.literal("driver"), v.literal("frontdesk"));
type StaffAccount = {
  id: Id<"users">;
  name: string;
  email: string;
  phoneNumber: string;
  role: StaffRole;
  hasPassword: boolean;
};

const formatStaffAccount = (user: Doc<"users">): StaffAccount => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role as StaffRole,
  hasPassword: !!user.password,
});

export type UserProfile = {
  id: Id<"users">;
  name: string;
  email: string;
  phoneNumber: string;
  role: Doc<"users">["role"];
  profilePictureId: Id<"files"> | null;
  notificationCount: number;
  chatCount: number;
  hasPassword: boolean;
};

const formatUserProfile = (user: Doc<"users">): UserProfile => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  profilePictureId: (user.profilePictureId ?? null) as Id<"files"> | null,
  notificationCount: user.notificationIds?.length ?? 0,
  chatCount: user.chatIds?.length ?? 0,
  hasPassword: !!user.password,
});

export const listStaffByRole = query({
  args: {
    role: staffRoleSchema,
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 10, 50));

    let hotelId: Id<"hotels"> | null = null;
    let hotelUserIds: Id<"users">[] | null = null;
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        return {
          staff: [],
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
            staff: [],
            nextCursor: null,
          };
        }
      }

      // Get hotel's userIds array for backward compatibility
      const hotel = await ctx.db.get(hotelId);
      if (hotel) {
        hotelUserIds = hotel.userIds;
      }
    }

    let filteredUsers: Doc<"users">[];
    if (hotelId) {
      // Query by role index, then filter by hotelId
      // Check both user.hotelId and hotel.userIds array for backward compatibility
      const allUsers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role))
        .collect();
      filteredUsers = allUsers.filter((user) => {
        // Check if user has hotelId set (new way)
        if (user.hotelId === hotelId) {
          return true;
        }
        // Fallback: check if user is in hotel's userIds array (backward compatibility)
        if (hotelUserIds && hotelUserIds.includes(user._id)) {
          return true;
        }
        return false;
      });
    } else {
      // No hotel filter - get all users with the role
      filteredUsers = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role))
        .collect();
    }

    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = filteredUsers.findIndex(
        (u) => u._id === (args.cursor as Id<"users">)
      );
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      } else {
        return {
          staff: [],
          nextCursor: null,
        };
      }
    }

    const endIndex = startIndex + pageSize;
    const page = filteredUsers.slice(startIndex, endIndex);
    const nextCursor =
      endIndex < filteredUsers.length
        ? (page[page.length - 1]._id as string)
        : null;

    return {
      staff: page.map(formatStaffAccount),
      nextCursor,
    };
  },
});

export const getUserProfile = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return formatUserProfile(user);
  },
});

export const getStaffAccountById = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    if (user.role !== "driver" && user.role !== "frontdesk") {
      return null;
    }

    return formatStaffAccount(user);
  },
});

export const updateUserProfile = action({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    currentPassword: v.optional(v.string()),
    newPassword: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<UserProfile> {
    const existing = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.userId,
      }
    );

    const updates: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      hashedPassword?: string;
    } = {};

    if (typeof args.name === "string") {
      const value = args.name.trim();
      if (!value) {
        throw new Error("Name cannot be empty");
      }
      updates.name = value;
    }

    if (typeof args.email === "string") {
      const value = args.email.trim().toLowerCase();
      if (!value) {
        throw new Error("Email cannot be empty");
      }
      const userWithEmail = await ctx.runQuery(api.auth.getUserByEmail, {
        email: value,
      });
      if (userWithEmail && userWithEmail._id !== args.userId) {
        throw new Error("Another user already uses this email");
      }
      updates.email = value;
    }

    if (typeof args.phoneNumber === "string") {
      const value = args.phoneNumber.trim();
      if (!value) {
        throw new Error("Phone number cannot be empty");
      }
      updates.phoneNumber = value;
    }

    if (typeof args.newPassword === "string") {
      if (!args.currentPassword || !args.currentPassword.trim()) {
        throw new Error("Current password is required to set a new password");
      }
      if (!existing.password) {
        throw new Error("This account does not have a password set");
      }
      const isValid = await bcrypt.compare(
        args.currentPassword,
        existing.password
      );
      if (!isValid) {
        throw new Error("Current password is incorrect");
      }
      updates.hashedPassword = await bcrypt.hash(args.newPassword, 10);
    }

    if (Object.keys(updates).length === 0) {
      return formatUserProfile(existing);
    }

    await ctx.runMutation(internal.users.index.updateStaffAccountInternal, {
      userId: args.userId,
      ...updates,
    });
    const updated = await ctx.runQuery(
      internal.users.index.getUserByIdInternal,
      {
        userId: args.userId,
      }
    );

    return formatUserProfile(updated);
  },
});

export const createStaffAccount = action({
  args: {
    adminId: v.id("users"),
    name: v.string(),
    email: v.string(),
    phoneNumber: v.string(),
    password: v.string(),
    role: staffRoleSchema,
  },
  async handler(ctx, args): Promise<StaffAccount> {
    const admin = await ctx.runQuery(api.auth.getUserById, {
      id: args.adminId,
    });
    if (!admin || admin.role !== "admin") {
      throw new Error("Only administrators can create staff accounts");
    }

    const hotel = await ctx.runQuery(api.hotels.index.getHotelByAdmin, {
      adminId: args.adminId,
    });
    if (!hotel) {
      throw new Error("Create a hotel before managing staff.");
    }

    const normalized = {
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      phoneNumber: args.phoneNumber.trim(),
      password: args.password,
      role: args.role,
    };

    if (!normalized.name) {
      throw new Error("Name is required");
    }

    if (!normalized.email) {
      throw new Error("Email is required");
    }

    if (!normalized.phoneNumber) {
      throw new Error("Phone number is required");
    }

    const existingUser = await ctx.runQuery(api.auth.getUserByEmail, {
      email: normalized.email,
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(normalized.password, 10);

    const userId = await ctx.runMutation(
      internal.auth.createUserInternal,
      {
        email: normalized.email,
        name: normalized.name,
        phoneNumber: normalized.phoneNumber,
        hashedPassword,
        role: normalized.role,
      }
    );

    await ctx.runMutation(internal.hotels.index.addUserToHotelInternal, {
      hotelId: hotel.id,
      userId,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const loginUrl = `${baseUrl}/sign-in`;

    await ctx.runAction(internal.email.index.sendAccountCredentialsEmail, {
      to: normalized.email,
      subject: `Welcome to Shuttle Management System - ${normalized.role === "driver" ? "Driver" : "Front Desk"} Account Created`,
      name: normalized.name,
      email: normalized.email,
      password: normalized.password,
      role: normalized.role,
      loginUrl,
    });

    return {
      id: userId,
      name: normalized.name,
      email: normalized.email,
      phoneNumber: normalized.phoneNumber,
      role: normalized.role,
      hasPassword: true,
    };
  },
});

export const updateStaffAccount = action({
  args: {
    currentUserId: v.id("users"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<StaffAccount> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only administrators can update staff accounts");
    }

    const adminHotel = await ctx.runQuery(api.hotels.index.getHotelByAdmin, {
      adminId: args.currentUserId,
    });
    if (!adminHotel) {
      throw new Error("Admin must have a hotel to update staff");
    }

    const existing = await ctx.runQuery(api.users.index.getStaffAccountById, {
      userId: args.userId,
    });

    if (!existing) {
      throw new Error("User not found");
    }

    const userHotel = await ctx.runQuery(api.hotels.index.getHotelByUserId, {
      userId: args.userId,
    });
    if (!userHotel || userHotel.id !== adminHotel.id) {
      throw new Error("User does not belong to your hotel");
    }

    const payload: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      hashedPassword?: string;
    } = {};

    if (typeof args.name === "string") {
      const value = args.name.trim();
      if (!value) throw new Error("Name cannot be empty");
      payload.name = value;
    }

    if (typeof args.email === "string") {
      const value = args.email.trim().toLowerCase();
      if (!value) throw new Error("Email cannot be empty");
      const userWithEmail = await ctx.runQuery(api.auth.getUserByEmail, {
        email: value,
      });
      if (userWithEmail && userWithEmail._id !== args.userId) {
        throw new Error("Another user already uses this email");
      }
      payload.email = value;
    }

    if (typeof args.phoneNumber === "string") {
      const value = args.phoneNumber.trim();
      if (!value) throw new Error("Phone number cannot be empty");
      payload.phoneNumber = value;
    }

    if (typeof args.password === "string" && args.password.length) {
      payload.hashedPassword = await bcrypt.hash(args.password, 10);
    }

    if (
      !payload.name &&
      !payload.email &&
      !payload.phoneNumber &&
      !payload.hashedPassword
    ) {
      return existing;
    }

    await ctx.runMutation(internal.users.index.updateStaffAccountInternal, {
      userId: args.userId,
      ...payload,
    });

    const updated = await ctx.runQuery(api.users.index.getStaffAccountById, {
      userId: args.userId,
    });

    if (!updated) {
      throw new Error("User not found after update");
    }

    return updated;
  },
});

export const deleteStaffAccount = action({
  args: {
    currentUserId: v.id("users"),
    userId: v.id("users"),
  },
  async handler(ctx, args): Promise<{ success: true }> {
    const currentUser = await ctx.runQuery(api.auth.getUserById, {
      id: args.currentUserId,
    });
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only administrators can delete staff accounts");
    }

    const adminHotel = await ctx.runQuery(api.hotels.index.getHotelByAdmin, {
      adminId: args.currentUserId,
    });
    if (!adminHotel) {
      throw new Error("Admin must have a hotel to delete staff");
    }

    const existing = await ctx.runQuery(api.users.index.getStaffAccountById, {
      userId: args.userId,
    });

    if (!existing) {
      throw new Error("User not found");
    }

    const userHotel = await ctx.runQuery(api.hotels.index.getHotelByUserId, {
      userId: args.userId,
    });
    if (!userHotel || userHotel.id !== adminHotel.id) {
      throw new Error("User does not belong to your hotel");
    }

    const hotel = userHotel;

    await ctx.runMutation(internal.users.index.deleteStaffAccountInternal, {
      userId: args.userId,
    });

    if (hotel) {
      await ctx.runMutation(internal.hotels.index.removeUserFromHotelInternal, {
        hotelId: hotel.id,
        userId: args.userId,
      });
    }

    return { success: true };
  },
});

export const getUserByIdInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  },
});

export const updateStaffAccountInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    hashedPassword: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const updates: Record<string, any> = {};

    if (typeof args.name === "string") {
      updates.name = args.name;
    }
    if (typeof args.email === "string") {
      updates.email = args.email;
    }
    if (typeof args.phoneNumber === "string") {
      updates.phoneNumber = args.phoneNumber;
    }
    if (typeof args.hashedPassword === "string") {
      updates.password = args.hashedPassword;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await ctx.db.patch(args.userId, updates);
  },
});

export const deleteStaffAccountInternal = internalMutation({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.userId);
  },
});
