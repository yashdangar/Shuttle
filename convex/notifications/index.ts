import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

export type NotificationRecord = {
  id: Id<"notifications">;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;
};

const formatNotification = (
  notification: Doc<"notifications">
): NotificationRecord => ({
  id: notification._id,
  title: notification.title,
  message: notification.message,
  isRead: notification.isRead,
  createdAt: notification._creationTime,
});

export const listUserNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const pageSize = Math.max(1, Math.min(args.limit ?? 50, 100));
    const results = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(pageSize);
    return results.map(formatNotification);
  },
});

export const markNotificationRead = mutation({
  args: {
    userId: v.id("users"),
    notificationId: v.id("notifications"),
  },
  async handler(ctx, args) {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    if (notification.userId !== args.userId) {
      throw new Error("You do not have access to this notification");
    }
    if (notification.isRead) {
      return { updated: false };
    }
    await ctx.db.patch(notification._id, { isRead: true });
    return { updated: true };
  },
});

export const markAllNotificationsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return { updated: unreadNotifications.length };
  },
});

export const clearNotifications = mutation({
  args: {
    userId: v.id("users"),
    notificationIds: v.array(v.id("notifications")),
  },
  async handler(ctx, args) {
    const uniqueIds = Array.from(new Set(args.notificationIds));
    let cleared = 0;

    for (const notificationId of uniqueIds) {
      const notification = await ctx.db.get(notificationId);
      if (!notification || notification.userId !== args.userId) {
        continue;
      }
      await ctx.db.delete(notification._id);
      cleared += 1;
    }

    return { cleared };
  },
});

export const clearAllNotifications = mutation({
  args: {
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return { cleared: notifications.length };
  },
});
