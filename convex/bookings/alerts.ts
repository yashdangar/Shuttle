    "use strict";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// Query to get unacknowledged booking alerts for frontdesk
// This uses the notifications table with type "NEW_BOOKING" and checks isRead status
export const getUnacknowledgedBookingAlerts = query({
  args: {
    frontdeskUserId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.frontdeskUserId);
    if (!user || user.role !== "frontdesk") {
      return [];
    }

    // Get all unread NEW_BOOKING notifications for this frontdesk user
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) =>
        q.eq("userId", args.frontdeskUserId).eq("isRead", false)
      )
      .collect();

    // Filter for NEW_BOOKING type and get booking details
    const bookingAlerts = [];
    
    for (const notification of notifications) {
      if (notification.type !== "NEW_BOOKING" || !notification.relatedBookingId) {
        continue;
      }

      const booking = await ctx.db.get(notification.relatedBookingId);
      if (!booking) continue;

      // Only include pending bookings
      if (booking.bookingStatus !== "PENDING") continue;

      const guest = await ctx.db.get(booking.guestId);
      
      let tripDetails = null;
      if (booking.tripInstanceId) {
        const tripInstance = await ctx.db.get(booking.tripInstanceId);
        if (tripInstance) {
          const trip = await ctx.db.get(tripInstance.tripId);
          tripDetails = {
            tripName: trip?.name ?? "Unknown Trip",
            scheduledDate: tripInstance.scheduledDate,
            scheduledStartTime: tripInstance.scheduledStartTime,
          };
        }
      }

      bookingAlerts.push({
        notificationId: notification._id,
        bookingId: booking._id,
        guestName: guest?.name ?? booking.name ?? "Unknown Guest",
        guestEmail: guest?.email ?? "Unknown",
        seats: Number(booking.seats),
        bags: Number(booking.bags),
        notes: booking.notes,
        totalPrice: booking.totalPrice,
        createdAt: notification._creationTime,
        tripDetails,
      });
    }

    // Sort by creation time (newest first)
    return bookingAlerts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Mutation to acknowledge a booking alert (marks notification as read)
export const acknowledgeBookingAlert = mutation({
  args: {
    frontdeskUserId: v.id("users"),
    notificationId: v.id("notifications"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.frontdeskUserId);
    if (!user || user.role !== "frontdesk") {
      throw new Error("Only frontdesk users can acknowledge booking alerts");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== args.frontdeskUserId) {
      throw new Error("You do not have access to this notification");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });

    return { success: true };
  },
});

// Mutation to acknowledge all pending booking alerts
export const acknowledgeAllBookingAlerts = mutation({
  args: {
    frontdeskUserId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.frontdeskUserId);
    if (!user || user.role !== "frontdesk") {
      throw new Error("Only frontdesk users can acknowledge booking alerts");
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) =>
        q.eq("userId", args.frontdeskUserId).eq("isRead", false)
      )
      .collect();

    let acknowledgedCount = 0;
    for (const notification of notifications) {
      if (notification.type === "NEW_BOOKING") {
        await ctx.db.patch(notification._id, { isRead: true });
        acknowledgedCount++;
      }
    }

    return { acknowledgedCount };
  },
});

// Query to get the count of pending booking alerts (for badge display)
export const getPendingBookingAlertsCount = query({
  args: {
    frontdeskUserId: v.id("users"),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.frontdeskUserId);
    if (!user || user.role !== "frontdesk") {
      return 0;
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) =>
        q.eq("userId", args.frontdeskUserId).eq("isRead", false)
      )
      .collect();

    // Count only NEW_BOOKING notifications with pending bookings
    let count = 0;
    for (const notification of notifications) {
      if (notification.type !== "NEW_BOOKING" || !notification.relatedBookingId) {
        continue;
      }
      const booking = await ctx.db.get(notification.relatedBookingId);
      if (booking && booking.bookingStatus === "PENDING") {
        count++;
      }
    }

    return count;
  },
});
