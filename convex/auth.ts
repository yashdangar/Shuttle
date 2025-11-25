import { v } from "convex/values";
import { query, action, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import bcrypt from "bcryptjs";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
  },
});

export const createUserInternal = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    phoneNumber: v.string(),
    hashedPassword: v.string(),
    role: v.union(
      v.literal("guest"),
      v.literal("admin"),
      v.literal("frontdesk"),
      v.literal("driver"),
      v.literal("superadmin")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      phoneNumber: args.phoneNumber,
      password: args.hashedPassword,
      role: args.role,
      notificationIds: [],
      chatIds: [],
    });

    return userId;
  },
});

export const createUser = action({
  args: {
    email: v.string(),
    name: v.string(),
    phoneNumber: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("guest"),
      v.literal("admin"),
      v.literal("frontdesk"),
      v.literal("driver"),
      v.literal("superadmin")
    ),
  },
  handler: async (ctx, args): Promise<string> => {
    const normalizedEmail = normalizeEmail(args.email);
    const existingUser = await ctx.runQuery(api.auth.getUserByEmail, {
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(args.password, 10);

    const userId = await ctx.runMutation(internal.auth.createUserInternal, {
      email: normalizedEmail,
      name: args.name,
      phoneNumber: args.phoneNumber,
      hashedPassword,
      role: args.role,
    });

    return userId;
  },
});

export const getUserById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return null;
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      profilePictureId: user.profilePictureId,
    };
  },
});

export const verifyPassword = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler : async (ctx,args):Promise<
  {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null> =>{
    const normalizedEmail = normalizeEmail(args.email);
    const user = await ctx.runQuery(api.auth.getUserByEmail, {
      email: normalizedEmail,
    });

    if (!user || !user.password) {
      throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(args.password, user.password);

    if (!isValid) {
      throw new Error("Invalid password");
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
})
