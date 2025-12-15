"use strict";
import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { findBestAvailableSlot } from "../lib/slotFinder";
import { Id } from "../_generated/dataModel";

const generateToken = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;

// ============================================
// PUBLIC MUTATIONS
// ============================================

export const createBooking = mutation({
  args: {
    guestId: v.id("users"),
    tripId: v.id("trips"),
    scheduledDate: v.string(),
    desiredTime: v.string(), // e.g., "07:45" or "1970-01-01T07:45:00.000Z"
    seats: v.number(),
    bags: v.number(),
    hotelId: v.id("hotels"),
    name: v.optional(v.string()),
    confirmationNum: v.optional(v.string()),
    notes: v.string(),
    isParkSleepFly: v.boolean(),
    paymentMethod: v.union(
      v.literal("APP"),
      v.literal("FRONTDESK"),
      v.literal("DEPOSIT")
    ),
    qrCodePath: v.string(),
    encryptionKey: v.string(),
  },
  async handler(ctx, args) {
    const guest = await ctx.db.get(args.guestId);
    if (!guest || guest.role !== "guest") {
      throw new ConvexError("Invalid guest");
    }

    if (args.seats <= 0) {
      throw new ConvexError("Seats must be greater than 0");
    }

    if (args.bags < 0) {
      throw new ConvexError("Bags cannot be negative");
    }

    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError("Trip not found");
    }

    if (trip.hotelId !== args.hotelId) {
      throw new ConvexError("Trip does not belong to the specified hotel");
    }

    const bookingDate = new Date(args.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      throw new ConvexError("Cannot book for a past date");
    }

    // Validate seats don't exceed any shuttle capacity
    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel_active", (q) =>
        q.eq("hotelId", args.hotelId).eq("isActive", true)
      )
      .collect();

    if (shuttles.length === 0) {
      throw new ConvexError("No active shuttles available");
    }

    const maxShuttleCapacity = Math.max(
      ...shuttles.map((s) => Number(s.totalSeats))
    );

    if (args.seats > maxShuttleCapacity) {
      throw new ConvexError(
        `Cannot book ${args.seats} seats. Maximum shuttle capacity is ${maxShuttleCapacity} seats.`
      );
    }

    // Find the best available slot using the smart slot finder
    const slotResult = await findBestAvailableSlot(
      ctx,
      args.tripId,
      args.hotelId,
      args.scheduledDate,
      args.desiredTime,
      args.seats
    );

    const totalPrice = trip.charges * args.seats;

    if (slotResult.found && slotResult.slot) {
      const { slot } = slotResult;
      let tripInstanceId = slot.existingTripInstanceId;

      // Create new TripInstance if one doesn't exist
      if (!tripInstanceId) {
        tripInstanceId = await ctx.runMutation(
          internal.tripInstances.mutations.getOrCreateTripInstance,
          {
            tripId: args.tripId,
            scheduledDate: args.scheduledDate,
            scheduledStartTime: slot.startTime,
            scheduledEndTime: slot.endTime,
            shuttleId: slot.shuttleId,
          }
        );
      }

      const bookingId: Id<"bookings"> = await ctx.db.insert("bookings", {
        guestId: args.guestId,
        seats: BigInt(args.seats),
        bags: BigInt(args.bags),
        hotelId: args.hotelId,
        name: args.name,
        confirmationNum: args.confirmationNum,
        notes: args.notes,
        isParkSleepFly: args.isParkSleepFly,
        paymentMethod: args.paymentMethod,
        qrCodePath: args.qrCodePath,
        encryptionKey: args.encryptionKey,
        totalPrice,
        bookingStatus: "PENDING",
        paymentStatus: "UNPAID",
        qrCodeStatus: "UNVERIFIED",
        tripInstanceId,
      });

      await ctx.runMutation(
        internal.tripInstances.mutations.updateTripInstanceSeats,
        {
          tripInstanceId,
          seatsHeldDelta: args.seats,
          seatsOccupiedDelta: 0,
        }
      );

      await ctx.runMutation(
        internal.tripInstances.mutations.addBookingToTripInstance,
        {
          tripInstanceId,
          bookingId,
        }
      );

      const hotel = await ctx.db.get(args.hotelId);
      if (hotel) {
        await ctx.db.patch(args.hotelId, {
          bookingIds: [...hotel.bookingIds, bookingId],
        });
      }

      const frontdeskUsers = await ctx.db
        .query("users")
        .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId))
        .collect();

      for (const frontdesk of frontdeskUsers.filter(
        (u) => u.role === "frontdesk"
      )) {
        await ctx.runMutation(internal.notifications.index.createNotification, {
          userId: frontdesk._id,
          title: "New Booking Request",
          message: `New booking for ${args.seats} seat(s) on ${args.scheduledDate}`,
          type: "NEW_BOOKING",
          relatedBookingId: bookingId,
        });
      }

      return {
        bookingId,
        success: true,
        message: "Booking created successfully. Awaiting confirmation.",
        assignedSlot: {
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      };
    } else {
      // No slot available - create rejected booking
      // We still need to create a tripInstance for record-keeping
      // Get the first TripTime for this trip to store the booking
      const tripTimes = [];
      for (const tripTimeId of trip.tripTimesIds) {
        const tripTime = await ctx.db.get(tripTimeId);
        if (tripTime) {
          tripTimes.push(tripTime);
          break; // Just need one for record keeping
        }
      }

      let tripInstanceId = undefined;
      if (tripTimes.length > 0) {
        tripInstanceId = await ctx.runMutation(
          internal.tripInstances.mutations.getOrCreateTripInstance,
          {
            tripId: args.tripId,
            scheduledDate: args.scheduledDate,
            scheduledStartTime: tripTimes[0].startTime,
            scheduledEndTime: tripTimes[0].endTime,
            shuttleId: undefined,
          }
        );
      }

      const bookingId: Id<"bookings"> = await ctx.db.insert("bookings", {
        guestId: args.guestId,
        seats: BigInt(args.seats),
        bags: BigInt(args.bags),
        hotelId: args.hotelId,
        name: args.name,
        confirmationNum: args.confirmationNum,
        notes: args.notes,
        isParkSleepFly: args.isParkSleepFly,
        paymentMethod: args.paymentMethod,
        qrCodePath: args.qrCodePath,
        encryptionKey: args.encryptionKey,
        totalPrice,
        bookingStatus: "REJECTED",
        paymentStatus: "UNPAID",
        qrCodeStatus: "UNVERIFIED",
        tripInstanceId,
        cancelledBy: "AUTO_CANCEL",
        cancellationReason: slotResult.reason || "No shuttle available",
      });

      const hotel = await ctx.db.get(args.hotelId);
      if (hotel) {
        await ctx.db.patch(args.hotelId, {
          bookingIds: [...hotel.bookingIds, bookingId],
        });
      }

      await ctx.runMutation(internal.notifications.index.createNotification, {
        userId: args.guestId,
        title: "Booking Failed",
        message: `Your booking could not be completed. ${slotResult.reason || "No shuttle available for the selected time slot."}`,
        type: "BOOKING_FAILED",
        relatedBookingId: bookingId,
      });

      const frontdeskUsers = await ctx.db
        .query("users")
        .withIndex("by_hotel", (q) => q.eq("hotelId", args.hotelId))
        .collect();

      for (const frontdesk of frontdeskUsers.filter(
        (u) => u.role === "frontdesk"
      )) {
        await ctx.runMutation(internal.notifications.index.createNotification, {
          userId: frontdesk._id,
          title: "Booking Auto-Rejected",
          message: `Booking for ${args.seats} seat(s) on ${args.scheduledDate} was auto-rejected: ${slotResult.reason || "No shuttle availability"}`,
          type: "BOOKING_FAILED",
          relatedBookingId: bookingId,
        });
      }

      return {
        bookingId,
        success: false,
        message:
          slotResult.reason ||
          "No shuttle available for the selected time slot.",
      };
    }
  },
});

export const confirmBooking = mutation({
  args: {
    frontdeskUserId: v.id("users"),
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const frontdesk = await ctx.db.get(args.frontdeskUserId);
    if (!frontdesk || frontdesk.role !== "frontdesk") {
      throw new ConvexError("Only frontdesk staff can confirm bookings");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new ConvexError("Booking not found");
    }

    if (booking.hotelId !== frontdesk.hotelId) {
      throw new ConvexError("Booking does not belong to your hotel");
    }

    if (booking.bookingStatus !== "PENDING") {
      throw new ConvexError("Only pending bookings can be confirmed");
    }

    if (!booking.tripInstanceId) {
      throw new ConvexError("Booking has no associated trip instance");
    }

    await ctx.db.patch(args.bookingId, {
      bookingStatus: "CONFIRMED",
      verifiedAt: new Date().toISOString(),
      verifiedBy: args.frontdeskUserId,
      qrCodeStatus: "UNVERIFIED",
    });

    await ctx.runMutation(
      internal.tripInstances.mutations.updateTripInstanceSeats,
      {
        tripInstanceId: booking.tripInstanceId,
        seatsHeldDelta: -Number(booking.seats),
        seatsOccupiedDelta: Number(booking.seats),
      }
    );

    await ctx.runMutation(internal.notifications.index.createNotification, {
      userId: booking.guestId,
      title: "Booking Confirmed",
      message: "Your booking has been confirmed by the frontdesk.",
      type: "BOOKING_CONFIRMED",
      relatedBookingId: args.bookingId,
    });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const existingToken = await ctx.db
      .query("qrVerificationTokens")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (existingToken) {
      await ctx.db.patch(existingToken._id, {
        token,
        expiresAt,
        isUsed: false,
      });
    } else {
      await ctx.db.insert("qrVerificationTokens", {
        token,
        bookingId: args.bookingId,
        expiresAt,
        isUsed: false,
      });
    }

    await ctx.db.patch(args.bookingId, {
      qrCodePath: token,
      encryptionKey: generateToken(),
    });

    return {
      success: true,
      message: "Booking confirmed successfully",
      qrPayload: token,
      expiresAt,
    };
  },
});

export const rejectBooking = mutation({
  args: {
    frontdeskUserId: v.id("users"),
    bookingId: v.id("bookings"),
    reason: v.string(),
  },
  async handler(ctx, args) {
    const frontdesk = await ctx.db.get(args.frontdeskUserId);
    if (!frontdesk || frontdesk.role !== "frontdesk") {
      throw new ConvexError("Only frontdesk staff can reject bookings");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new ConvexError("Booking not found");
    }

    if (booking.hotelId !== frontdesk.hotelId) {
      throw new ConvexError("Booking does not belong to your hotel");
    }

    if (booking.bookingStatus !== "PENDING") {
      throw new ConvexError("Only pending bookings can be rejected");
    }

    await ctx.db.patch(args.bookingId, {
      bookingStatus: "REJECTED",
      cancellationReason: args.reason,
      cancelledBy: "FRONTDESK",
    });

    if (booking.tripInstanceId) {
      await ctx.runMutation(
        internal.tripInstances.mutations.updateTripInstanceSeats,
        {
          tripInstanceId: booking.tripInstanceId,
          seatsHeldDelta: -Number(booking.seats),
          seatsOccupiedDelta: 0,
        }
      );

      await ctx.runMutation(
        internal.tripInstances.mutations.removeBookingFromTripInstance,
        {
          tripInstanceId: booking.tripInstanceId,
          bookingId: args.bookingId,
        }
      );
    }

    await ctx.runMutation(internal.notifications.index.createNotification, {
      userId: booking.guestId,
      title: "Booking Rejected",
      message: `Your booking has been rejected. Reason: ${args.reason}`,
      type: "BOOKING_REJECTED",
      relatedBookingId: args.bookingId,
    });

    return { success: true, message: "Booking rejected successfully" };
  },
});

export const cancelBooking = mutation({
  args: {
    userId: v.id("users"),
    bookingId: v.id("bookings"),
    reason: v.string(),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new ConvexError("Booking not found");
    }

    if (booking.guestId !== args.userId && user.role === "guest") {
      throw new ConvexError("You can only cancel your own bookings");
    }

    if (booking.bookingStatus === "REJECTED") {
      throw new ConvexError("Booking is already cancelled/rejected");
    }

    let cancelledBy: "GUEST" | "DRIVER" | "FRONTDESK" | "ADMIN" = "GUEST";
    if (user.role === "driver") cancelledBy = "DRIVER";
    else if (user.role === "frontdesk") cancelledBy = "FRONTDESK";
    else if (user.role === "admin") cancelledBy = "ADMIN";

    await ctx.db.patch(args.bookingId, {
      bookingStatus: "REJECTED",
      cancellationReason: args.reason,
      cancelledBy,
    });

    if (booking.tripInstanceId) {
      if (booking.bookingStatus === "PENDING") {
        await ctx.runMutation(
          internal.tripInstances.mutations.updateTripInstanceSeats,
          {
            tripInstanceId: booking.tripInstanceId,
            seatsHeldDelta: -Number(booking.seats),
            seatsOccupiedDelta: 0,
          }
        );
      } else if (booking.bookingStatus === "CONFIRMED") {
        await ctx.runMutation(
          internal.tripInstances.mutations.updateTripInstanceSeats,
          {
            tripInstanceId: booking.tripInstanceId,
            seatsHeldDelta: 0,
            seatsOccupiedDelta: -Number(booking.seats),
          }
        );
      }

      await ctx.runMutation(
        internal.tripInstances.mutations.removeBookingFromTripInstance,
        {
          tripInstanceId: booking.tripInstanceId,
          bookingId: args.bookingId,
        }
      );
    }

    if (user.role !== "guest") {
      await ctx.runMutation(internal.notifications.index.createNotification, {
        userId: booking.guestId,
        title: "Booking Cancelled",
        message: `Your booking has been cancelled. Reason: ${args.reason}`,
        type: "BOOKING_REJECTED",
        relatedBookingId: args.bookingId,
      });
    }

    return { success: true, message: "Booking cancelled successfully" };
  },
});

// ============================================
// PUBLIC QUERIES
// ============================================

export const getPendingBookingsForHotel = query({
  args: {
    frontdeskUserId: v.id("users"),
  },
  async handler(ctx, args) {
    const frontdesk = await ctx.db.get(args.frontdeskUserId);
    if (!frontdesk || frontdesk.role !== "frontdesk" || !frontdesk.hotelId) {
      return [];
    }

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_hotel_status", (q) =>
        q.eq("hotelId", frontdesk.hotelId!).eq("bookingStatus", "PENDING")
      )
      .collect();

    const results = await Promise.all(
      bookings.map(async (booking) => {
        const guest = await ctx.db.get(booking.guestId);
        let tripName = "Unknown Trip";
        let scheduledDate = "";
        let scheduledTime = "";

        if (booking.tripInstanceId) {
          const tripInstance = await ctx.db.get(booking.tripInstanceId);
          if (tripInstance) {
            const trip = await ctx.db.get(tripInstance.tripId);
            if (trip) {
              tripName = trip.name;
            }
            scheduledDate = tripInstance.scheduledDate;
            scheduledTime = `${tripInstance.scheduledStartTime} - ${tripInstance.scheduledEndTime}`;
          }
        }

        return {
          _id: booking._id,
          guestId: booking.guestId,
          guestName: guest?.name ?? "Unknown Guest",
          seats: Number(booking.seats),
          tripName,
          scheduledDate,
          scheduledTime,
          createdAt: new Date(booking._creationTime).toISOString(),
        };
      })
    );

    return results;
  },
});

export const getBookingById = query({
  args: {
    bookingId: v.id("bookings"),
  },
  async handler(ctx, args) {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return null;
    }

    const guest = (await ctx.db.get(
      booking.guestId as Id<"users">
    )) as any;
    let tripDetails = null;

    if (booking.tripInstanceId) {
      const tripInstance = await ctx.db.get(booking.tripInstanceId);
      if (tripInstance) {
        const trip = await ctx.db.get(tripInstance.tripId);
        const [sourceLocation, destinationLocation] = await Promise.all([
          trip ? ctx.db.get(trip.sourceLocationId) : null,
          trip ? ctx.db.get(trip.destinationLocationId) : null,
        ]);

        let shuttleDetails = null;
        if (tripInstance.shuttleId) {
          const shuttle = await ctx.db.get(tripInstance.shuttleId);
          if (shuttle) {
            shuttleDetails = {
              vehicleNumber: shuttle.vehicleNumber,
              totalSeats: Number(shuttle.totalSeats),
            };
          }
        }

        // Get driver from shuttle's currentlyAssignedTo field
        let driverDetails = null;
        if (tripInstance.shuttleId) {
          const shuttle = await ctx.db.get(tripInstance.shuttleId);
          if (shuttle?.currentlyAssignedTo) {
            const driver = await ctx.db.get(shuttle.currentlyAssignedTo);
            if (driver) {
              driverDetails = {
                name: (driver as any).name,
                phoneNumber: (driver as any).phoneNumber,
              };
            }
          }
        }

        tripDetails = {
          tripId: tripInstance.tripId,
          tripName: trip?.name ?? "Unknown",
          sourceLocation: sourceLocation?.name ?? "Unknown",
          destinationLocation: destinationLocation?.name ?? "Unknown",
          scheduledDate: tripInstance.scheduledDate,
          scheduledStartTime: tripInstance.scheduledStartTime,
          scheduledEndTime: tripInstance.scheduledEndTime,
          status: tripInstance.status,
          shuttle: shuttleDetails,
          driver: driverDetails,
        };
      }
    }

    return {
      _id: booking._id,
      guestId: booking.guestId,
      guestName: guest?.name ?? "Unknown",
      guestEmail: guest?.email ?? "Unknown",
      guestPhone: guest?.phoneNumber ?? "Unknown",
      seats: Number(booking.seats),
      bags: Number(booking.bags),
      hotelId: booking.hotelId,
      name: booking.name,
      confirmationNum: booking.confirmationNum,
      notes: booking.notes,
      isParkSleepFly: booking.isParkSleepFly,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.bookingStatus,
      totalPrice: booking.totalPrice,
      verifiedAt: booking.verifiedAt,
      qrCodePath: booking.qrCodePath,
      qrCodeStatus: booking.qrCodeStatus,
      encryptionKey: booking.encryptionKey,
      verifiedBy: booking.verifiedBy,
      cancellationReason: booking.cancellationReason,
      cancelledBy: booking.cancelledBy,
      createdAt: new Date(booking._creationTime).toISOString(),
      tripDetails,
    };
  },
});

export const getGuestBookings = query({
  args: {
    guestId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("CONFIRMED"),
        v.literal("REJECTED")
      )
    ),
  },
  async handler(ctx, args) {
    const bookingsQuery = ctx.db
      .query("bookings")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId));

    const allBookings = await bookingsQuery.collect();

    const filteredBookings = args.status
      ? allBookings.filter((b) => b.bookingStatus === args.status)
      : allBookings;

    const results = await Promise.all(
      filteredBookings.map(async (booking) => {
        let tripDetails = null;

        if (booking.tripInstanceId) {
          const tripInstance = await ctx.db.get(booking.tripInstanceId);
          if (tripInstance) {
            const trip = await ctx.db.get(tripInstance.tripId);
            const [sourceLocation, destinationLocation] = await Promise.all([
              trip ? ctx.db.get(trip.sourceLocationId) : null,
              trip ? ctx.db.get(trip.destinationLocationId) : null,
            ]);

            tripDetails = {
              tripName: trip?.name ?? "Unknown",
              sourceLocation: sourceLocation?.name ?? "Unknown",
              destinationLocation: destinationLocation?.name ?? "Unknown",
              scheduledDate: tripInstance.scheduledDate,
              scheduledStartTime: tripInstance.scheduledStartTime,
              scheduledEndTime: tripInstance.scheduledEndTime,
              status: tripInstance.status,
            };
          }
        }

        return {
          _id: booking._id,
          seats: Number(booking.seats),
          bags: Number(booking.bags),
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          totalPrice: booking.totalPrice,
          createdAt: new Date(booking._creationTime).toISOString(),
          tripDetails,
        };
      })
    );

    return results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
});

export const getBookingsByTripInstance = query({
  args: {
    tripInstanceId: v.id("tripInstances"),
  },
  async handler(ctx, args) {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_trip_instance", (q) =>
        q.eq("tripInstanceId", args.tripInstanceId)
      )
      .collect();

    const results = await Promise.all(
      bookings.map(async (booking) => {
        const guest = await ctx.db.get(booking.guestId);

        return {
          _id: booking._id,
          guestId: booking.guestId,
          guestName: booking.name || guest?.name || "Unknown",
          guestEmail: guest?.email,
          guestPhone: guest?.phoneNumber,
          seats: Number(booking.seats),
          bags: Number(booking.bags),
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          totalPrice: booking.totalPrice,
          notes: booking.notes,
          isParkSleepFly: booking.isParkSleepFly,
          confirmationNum: booking.confirmationNum,
          qrCodeStatus: booking.qrCodeStatus,
          verifiedAt: booking.verifiedAt,
          verifiedBy: booking.verifiedBy,
        };
      })
    );

    return results;
  },
});

export const getHotelBookings = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("CONFIRMED"),
        v.literal("REJECTED")
      )
    ),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.hotelId) {
      return [];
    }

    if (!["admin", "frontdesk"].includes(user.role)) {
      return [];
    }

    const pageSize = Math.max(1, Math.min(args.limit ?? 50, 100));

    let bookings;
    if (args.status) {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_hotel_status", (q) =>
          q.eq("hotelId", user.hotelId!).eq("bookingStatus", args.status!)
        )
        .take(pageSize);
    } else {
      const allBookings = await ctx.db.query("bookings").collect();
      bookings = allBookings
        .filter((b) => b.hotelId === user.hotelId)
        .slice(0, pageSize);
    }

    const results = await Promise.all(
      bookings.map(async (booking) => {
        const guest = await ctx.db.get(booking.guestId);
        let tripDetails = null;

        if (booking.tripInstanceId) {
          const tripInstance = await ctx.db.get(booking.tripInstanceId);
          if (tripInstance) {
            const trip = await ctx.db.get(tripInstance.tripId);
            tripDetails = {
              tripName: trip?.name ?? "Unknown",
              scheduledDate: tripInstance.scheduledDate,
              scheduledStartTime: tripInstance.scheduledStartTime,
              scheduledEndTime: tripInstance.scheduledEndTime,
            };
          }
        }

        return {
          _id: booking._id,
          guestId: booking.guestId,
          guestName: guest?.name ?? "Unknown",
          guestEmail: guest?.email ?? "Unknown",
          seats: Number(booking.seats),
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          totalPrice: booking.totalPrice,
          createdAt: new Date(booking._creationTime).toISOString(),
          tripDetails,
        };
      })
    );

    return results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
});

// ===========================================================
// DRIVER QR VERIFICATION
// ===========================================================

const ensureDriver = async (ctx: any, driverId: Id<"users">) => {
  const driver = await ctx.db.get(driverId);
  if (!driver || driver.role !== "driver") {
    throw new ConvexError("Driver not found");
  }
  return driver;
};

const loadBookingWithToken = async (ctx: any, token: string) => {
  const tokenRow = await ctx.db
    .query("qrVerificationTokens")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!tokenRow) {
    throw new ConvexError("Invalid verification token");
  }

  if (tokenRow.isUsed) {
    throw new ConvexError("Verification token already used");
  }

  if (new Date(tokenRow.expiresAt) < new Date()) {
    throw new ConvexError("Verification token expired");
  }

  const booking = await ctx.db.get(tokenRow.bookingId);
  if (!booking) {
    throw new ConvexError("Booking not found");
  }

  return { tokenRow, booking };
};

export const checkQrCode = mutation({
  args: {
    driverId: v.id("users"),
    qrData: v.string(),
  },
  async handler(ctx, args) {
    const driver = await ensureDriver(ctx, args.driverId);

    const token =
      (() => {
        try {
          const parsed = JSON.parse(args.qrData) as {
            token?: string;
            expiresAt?: string;
          };
          return parsed.token || args.qrData;
        } catch {
          return args.qrData;
        }
      })() || "";

    if (!token) {
      throw new ConvexError("Invalid QR data");
    }

    const { booking } = await loadBookingWithToken(ctx, token);

    if (booking.hotelId !== driver.hotelId) {
      throw new ConvexError("Driver not authorized for this booking");
    }

    if (booking.bookingStatus !== "CONFIRMED") {
      throw new ConvexError("Booking not confirmed");
    }

    if (booking.qrCodeStatus === "VERIFIED") {
      throw new ConvexError("Booking already verified");
    }

    const guest = (await ctx.db.get(
      booking.guestId as Id<"users">
    )) as any;

    return {
      success: true,
      passenger: {
        id: booking._id,
        name: guest?.name ?? "Guest",
        persons: Number(booking.seats),
        bags: Number(booking.bags),
        pickup: "Pickup",
        dropoff: "Dropoff",
        paymentMethod: booking.paymentMethod,
        seatNumber: `A${Math.floor(Math.random() * 20) + 1}`,
        token,
      },
    };
  },
});

export const confirmCheckIn = mutation({
  args: {
    driverId: v.id("users"),
    token: v.string(),
  },
  async handler(ctx, args) {
    const driver = await ensureDriver(ctx, args.driverId);
    const { tokenRow, booking } = await loadBookingWithToken(ctx, args.token);

    if (booking.hotelId !== driver.hotelId) {
      throw new ConvexError("Driver not authorized for this booking");
    }

    await ctx.db.patch(tokenRow._id, { isUsed: true });
    await ctx.db.patch(booking._id, {
      qrCodeStatus: "VERIFIED",
      verifiedAt: new Date().toISOString(),
      verifiedBy: driver._id,
    });

    const guest = (await ctx.db.get(
      booking.guestId as Id<"users">
    )) as any;

    return {
      success: true,
      passenger: {
        id: booking._id,
        name: guest?.name ?? "Guest",
        persons: Number(booking.seats),
        bags: Number(booking.bags),
        pickup: "Pickup",
        dropoff: "Dropoff",
        paymentMethod: booking.paymentMethod,
        seatNumber: `A${Math.floor(Math.random() * 20) + 1}`,
        isVerified: true,
      },
    };
  },
});
