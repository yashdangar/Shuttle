import { action, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Id, Doc } from "../_generated/dataModel";

export type AdminAccount = {
  id: Id<"users">;
  name: string;
  email: string;
  phoneNumber: string;
  role: "admin";
};

const formatAdminAccount = (user: Doc<"users">): AdminAccount => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: "admin",
});

export function formatZodError(error: z.ZodError): string {
  const firstError = error.issues[0];
  if (firstError) {
    return firstError.message;
  }
  return "Validation failed";
}

const createAdminSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(120, "Name is too long"),
    email: z.string().email("Enter a valid email"),
    phoneNumber: z
      .string()
      .min(5, "Phone number is required")
      .max(25, "Phone number is too long"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const updateAdminSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name is too long")
    .optional(),
  email: z.string().email("Enter a valid email").optional(),
  phoneNumber: z
    .string()
    .min(5, "Phone number is required")
    .max(25, "Phone number is too long")
    .optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

export const listAdmins = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 10, 50));

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .paginate({
        numItems: pageSize,
        cursor: args.cursor ?? null,
      });

    return {
      admins: users.page.map(formatAdminAccount),
      nextCursor: users.isDone ? null : (users.continueCursor ?? null),
    };
  },
});

export const createAdmin = action({
  args: {
    currentUserId: v.id("users"),
    name: v.string(),
    email: v.string(),
    phoneNumber: v.string(),
    password: v.string(),
    confirmPassword: v.string(),
  },
  async handler(ctx, args): Promise<AdminAccount> {
    const currentUser = await ctx.runQuery(api.auth.index.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "superadmin") {
      throw new Error("Only superadmin can create admin users");
    }

    const validationResult = createAdminSchema.safeParse({
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      phoneNumber: args.phoneNumber.trim(),
      password: args.password,
      confirmPassword: args.confirmPassword,
    });

    if (!validationResult.success) {
      throw new Error(formatZodError(validationResult.error));
    }

    const normalized = validationResult.data;

    const existingUser = await ctx.runQuery(api.auth.index.getUserByEmail, {
      email: normalized.email,
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(normalized.password, 10);

    const userId = await ctx.runMutation(internal.auth.index.createUserInternal, {
      email: normalized.email,
      name: normalized.name,
      phoneNumber: normalized.phoneNumber,
      hashedPassword,
      role: "admin",
    });

    const createdUser = await ctx.runQuery(api.auth.index.getUserById, {
      id: userId,
    });

    if (!createdUser) {
      throw new Error("Failed to create admin user");
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://shuttles.devitaliya.me";
    const loginUrl = `${baseUrl}/sign-in`;

    await ctx.runAction(internal.email.index.sendAccountCredentialsEmail, {
      to: normalized.email,
      subject:
        "Welcome to Shuttle Management System - Administrator Account Created",
      name: normalized.name,
      email: normalized.email,
      password: normalized.password,
      role: "admin",
      loginUrl,
    });

    return {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      phoneNumber: createdUser.phoneNumber,
      role: "admin" as const,
    };
  },
});

export const getAdminById = query({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    if (user.role !== "admin") {
      return null;
    }

    return formatAdminAccount(user);
  },
});

export const updateAdmin = action({
  args: {
    currentUserId: v.id("users"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<AdminAccount> {
    const currentUser = await ctx.runQuery(api.auth.index.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "superadmin") {
      throw new Error("Only superadmin can update admin users");
    }

    const existing = await ctx.runQuery(api.admins.index.getAdminById, {
      userId: args.userId,
    });

    if (!existing) {
      throw new Error("Admin not found");
    }

    const updateData: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      password?: string;
    } = {};

    if (typeof args.name === "string") {
      updateData.name = args.name.trim();
    }
    if (typeof args.email === "string") {
      updateData.email = args.email.trim().toLowerCase();
    }
    if (typeof args.phoneNumber === "string") {
      updateData.phoneNumber = args.phoneNumber.trim();
    }
    if (typeof args.password === "string" && args.password.length > 0) {
      updateData.password = args.password;
    }

    if (
      !updateData.name &&
      !updateData.email &&
      !updateData.phoneNumber &&
      !updateData.password
    ) {
      return existing;
    }

    const validationResult = updateAdminSchema.safeParse(updateData);

    if (!validationResult.success) {
      throw new Error(formatZodError(validationResult.error));
    }

    const validated = validationResult.data;

    if (validated.email) {
      const userWithEmail = await ctx.runQuery(api.auth.index.getUserByEmail, {
        email: validated.email,
      });
      if (userWithEmail && userWithEmail._id !== args.userId) {
        throw new Error("Another user already uses this email");
      }
    }

    const payload: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      hashedPassword?: string;
    } = {};

    if (validated.name) {
      payload.name = validated.name;
    }
    if (validated.email) {
      payload.email = validated.email;
    }
    if (validated.phoneNumber) {
      payload.phoneNumber = validated.phoneNumber;
    }
    if (validated.password) {
      payload.hashedPassword = await bcrypt.hash(validated.password, 10);
    }

    await ctx.runMutation(internal.admins.index.updateAdminInternal, {
      userId: args.userId,
      ...payload,
    });

    const updated = await ctx.runQuery(api.admins.index.getAdminById, {
      userId: args.userId,
    });

    if (!updated) {
      throw new Error("Admin not found after update");
    }

    return updated;
  },
});

export const deleteAdmin = action({
  args: {
    currentUserId: v.id("users"),
    userId: v.id("users"),
  },
  async handler(ctx, args): Promise<{ success: true }> {
    const currentUser = await ctx.runQuery(api.auth.index.getUserById, {
      id: args.currentUserId,
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.role !== "superadmin") {
      throw new Error("Only superadmin can delete admin users");
    }

    const existing = await ctx.runQuery(api.admins.index.getAdminById, {
      userId: args.userId,
    });

    if (!existing) {
      throw new Error("Admin not found");
    }

    await ctx.runMutation(internal.admins.index.deleteAdminInternal, {
      userId: args.userId,
    });

    return { success: true };
  },
});

export const updateAdminInternal = internalMutation({
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

export const deleteAdminInternal = internalMutation({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await ctx.db.delete(args.userId);
  },
});
