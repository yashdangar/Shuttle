import { action, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
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


export const listStaffByRole = query({
  args: {
    role: staffRoleSchema,
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 10, 50));

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .paginate({
        numItems: pageSize,
        cursor: args.cursor ?? null,
      });

    return {
      staff: users.page.map(formatStaffAccount),
      nextCursor: users.isDone ? null : users.continueCursor ?? null,
    };
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

    const hotel = await ctx.runQuery(api.hotels.getHotelByAdmin, {
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

    const userId = await ctx.runMutation(internal.auth.createUserInternal, {
      email: normalized.email,
      name: normalized.name,
      phoneNumber: normalized.phoneNumber,
      hashedPassword,
      role: normalized.role,
    });

    await ctx.runMutation(internal.hotels.addUserToHotelInternal, {
      hotelId: hotel.id,
      userId,
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
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<StaffAccount> {

    const existing = await ctx.runQuery(api.users.getStaffAccountById, {
      userId: args.userId,
    });

    if (!existing) {
      throw new Error("User not found");
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

    await ctx.runMutation(internal.users.updateStaffAccountInternal, {
      userId: args.userId,
      ...payload,
    });

    const updated = await ctx.runQuery(api.users.getStaffAccountById, {
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
    userId: v.id("users"),
  },
  async handler(ctx, args): Promise<{ success: true }> {

    const existing = await ctx.runQuery(api.users.getStaffAccountById, {
      userId: args.userId,
    });

    if (!existing) {
      throw new Error("User not found");
    }

    const hotel = await ctx.runQuery(api.hotels.getHotelByUserId, {
      userId: args.userId,
    });

    await ctx.runMutation(internal.users.deleteStaffAccountInternal, {
      userId: args.userId,
    });

    if (hotel) {
      await ctx.runMutation(internal.hotels.removeUserFromHotelInternal, {
        hotelId: hotel.id,
        userId: args.userId,
      });
    }

    return { success: true };
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

