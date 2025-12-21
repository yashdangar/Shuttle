import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Helper to get current UTC date string
function getUTCDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export const assignDriverToShuttle = mutation({
  args: {
    driverId: v.id("users"),
    shuttleId: v.id("shuttles"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new Error("Invalid driver");
    }

    const shuttle = await ctx.db.get(args.shuttleId);
    if (!shuttle) {
      throw new Error("Shuttle not found");
    }

    if (!shuttle.isActive) {
      throw new Error("Cannot assign to inactive shuttle");
    }

    if (driver.hotelId !== shuttle.hotelId) {
      throw new Error(
        "Driver does not belong to the same hotel as the shuttle"
      );
    }

    // If driver is already assigned to another shuttle, unassign first
    const allShuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel", (q) => q.eq("hotelId", driver.hotelId!))
      .collect();

    for (const s of allShuttles) {
      if (s.currentlyAssignedTo === args.driverId && s._id !== args.shuttleId) {
        await ctx.db.patch(s._id, {
          currentlyAssignedTo: undefined,
        });
      }
    }

    // Assign driver to the new shuttle
    await ctx.db.patch(args.shuttleId, {
      currentlyAssignedTo: args.driverId,
    });

    // Notify driver of new assignment
    const assignedShuttle = await ctx.db.get(args.shuttleId);
    if (assignedShuttle) {
      await ctx.runMutation(internal.notifications.index.sendNotification, {
        title: "New Shuttle Assignment",
        message: `You have been assigned to shuttle ${assignedShuttle.vehicleNumber}. Please check your dashboard for trip assignments.`,
        type: "GENERAL",
        relatedBookingId: undefined,
        userIds: [args.driverId],
      });
    }

    // Get today's trip instances count for this shuttle (UTC date)
    const today = getUTCDateString();
    const tripInstances = await ctx.db
      .query("tripInstances")
      .withIndex("by_shuttle_date", (q) =>
        q.eq("shuttleId", args.shuttleId).eq("scheduledDate", today)
      )
      .collect();

    return {
      success: true,
      shuttleId: args.shuttleId,
      vehicleNumber: shuttle.vehicleNumber,
      tripInstancesCount: tripInstances.length,
    };
  },
});

export const unassignDriverFromShuttle = mutation({
  args: {
    driverId: v.id("users"),
  },
  async handler(ctx, args) {
    const driver = await ctx.db.get(args.driverId);
    if (!driver || driver.role !== "driver") {
      throw new Error("Invalid driver");
    }

    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel", (q) => q.eq("hotelId", driver.hotelId!))
      .collect();

    let unassignedFrom: string | null = null;

    for (const shuttle of shuttles) {
      if (shuttle.currentlyAssignedTo === args.driverId) {
        await ctx.db.patch(shuttle._id, {
          currentlyAssignedTo: undefined,
        });
        unassignedFrom = shuttle.vehicleNumber;
        
        // Notify driver of unassignment
        await ctx.runMutation(internal.notifications.index.sendNotification, {
          title: "Shuttle Unassigned",
          message: `You have been unassigned from shuttle ${shuttle.vehicleNumber}.`,
          type: "GENERAL",
          relatedBookingId: undefined,
          userIds: [args.driverId],
        });
      }
    }

    return {
      success: true,
      unassignedFrom,
    };
  },
});

export const updateShuttleCurrentDriver = internalMutation({
  args: {
    shuttleId: v.id("shuttles"),
    driverId: v.optional(v.id("users")),
  },
  async handler(ctx, args) {
    await ctx.db.patch(args.shuttleId, {
      currentlyAssignedTo: args.driverId,
    });
  },
});
