import { mutation, query } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { validateTripTime } from "../lib/tripTimeUtils";

// ============================================
// PUBLIC MUTATIONS
// ============================================

export const createBooking: any = mutation({
  args: {
    guestId: v.id("users"),
    tripId: v.id("trips"),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
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

    await validateTripTime(
      ctx,
      args.tripId,
      args.scheduledStartTime,
      args.scheduledEndTime
    );

    const shuttleId = await ctx.runQuery(
      internal.shuttles.queries.getAvailableShuttle,
      {
        hotelId: args.hotelId,
        scheduledDate: args.scheduledDate,
        scheduledStartTime: args.scheduledStartTime,
        scheduledEndTime: args.scheduledEndTime,
        requiredSeats: args.seats,
      }
    );

    const totalPrice = trip.charges * args.seats;

    if (shuttleId) {
      const tripInstanceId = await ctx.runMutation(
        internal.tripInstances.mutations.getOrCreateTripInstance,
        {
          tripId: args.tripId,
          scheduledDate: args.scheduledDate,
          scheduledStartTime: args.scheduledStartTime,
          scheduledEndTime: args.scheduledEndTime,
          shuttleId,
        }
      );

      const bookingId = await ctx.db.insert("bookings", {
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
      };
    } else {
      const tripInstanceId = await ctx.runMutation(
        internal.tripInstances.mutations.getOrCreateTripInstance,
        {
          tripId: args.tripId,
          scheduledDate: args.scheduledDate,
          scheduledStartTime: args.scheduledStartTime,
          scheduledEndTime: args.scheduledEndTime,
          shuttleId: undefined,
        }
      );

      const bookingId = await ctx.db.insert("bookings", {
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
        tripInstanceId,
        cancelledBy: "AUTO_CANCEL",
        cancellationReason: "No shuttle available",
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
        message:
          "Your booking could not be completed. No shuttle available for the selected time slot.",
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
          message: `Booking for ${args.seats} seat(s) on ${args.scheduledDate} was auto-rejected due to no shuttle availability`,
          type: "BOOKING_FAILED",
          relatedBookingId: bookingId,
        });
      }

      return {
        bookingId,
        success: false,
        message: "No shuttle available for the selected time slot.",
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

    return { success: true, message: "Booking confirmed successfully" };
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

    const guest = await ctx.db.get(booking.guestId);
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
                name: driver.name,
                phoneNumber: driver.phoneNumber,
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
