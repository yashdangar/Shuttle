import { query } from "../_generated/server";
import { v } from "convex/values";

function getUTCDateString(date?: Date): string {
  const d = date || new Date();
  return d.toISOString().split("T")[0];
}

function getDateStringDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getUTCDateString(date);
}

export const getDashboardStats = query({
  args: {
    adminId: v.id("users"),
  },
  async handler(ctx, args) {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || admin.role !== "admin" || !admin.hotelId) {
      return null;
    }

    const hotelId = admin.hotelId;
    const today = getUTCDateString();
    const thirtyDaysAgo = getDateStringDaysAgo(30);
    const sevenDaysAgo = getDateStringDaysAgo(7);

    // Get all bookings for the hotel
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_hotel", (q) => q.eq("hotelId", hotelId))
      .collect();

    // Get all trip instances for the hotel
    const allTripInstances = await ctx.db
      .query("tripInstances")
      .withIndex("by_date", (q) => q.gte("scheduledDate", thirtyDaysAgo))
      .collect();

    // Filter trip instances by hotel through trips
    const hotelTripIds = await ctx.db
      .query("trips")
      .withIndex("by_hotel", (q) => q.eq("hotelId", hotelId))
      .collect();
    
    const hotelTripInstanceIds = hotelTripIds.flatMap(trip => 
      allTripInstances.filter(instance => instance.tripId === trip._id)
    );

    // Calculate statistics
    const totalBookings = allBookings.length;
    const confirmedBookings = allBookings.filter(b => b.bookingStatus === "CONFIRMED").length;
    const pendingBookings = allBookings.filter(b => b.bookingStatus === "PENDING").length;
    const rejectedBookings = allBookings.filter(b => b.bookingStatus === "REJECTED").length;

    // Today's bookings
    const todayBookings = allBookings.filter(b => {
      const bookingDate = new Date(b._creationTime).toISOString().split("T")[0];
      return bookingDate === today;
    });

    // Last 7 days bookings
    const last7DaysBookings = allBookings.filter(b => {
      const bookingDate = new Date(b._creationTime).toISOString().split("T")[0];
      return bookingDate >= sevenDaysAgo;
    });

    // Last 30 days bookings
    const last30DaysBookings = allBookings.filter(b => {
      const bookingDate = new Date(b._creationTime).toISOString().split("T")[0];
      return bookingDate >= thirtyDaysAgo;
    });

    // Total earnings (sum of confirmed bookings)
    const totalEarnings = allBookings
      .filter(b => b.paymentStatus === "PAID")
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);

    // Last 30 days earnings
    const last30DaysEarnings = last30DaysBookings
      .filter(b => b.paymentStatus === "PAID")
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);

    // Today's earnings
    const todayEarnings = todayBookings
      .filter(b => b.paymentStatus === "PAID")
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);

    // Trip statistics
    const totalTrips = hotelTripInstanceIds.length;
    const completedTrips = hotelTripInstanceIds.filter(t => t.status === "COMPLETED").length;
    const inProgressTrips = hotelTripInstanceIds.filter(t => t.status === "IN_PROGRESS").length;
    const scheduledTrips = hotelTripInstanceIds.filter(t => t.status === "SCHEDULED").length;

    // Today's trips
    const todayTrips = hotelTripInstanceIds.filter(t => t.scheduledDate === today);

    // Get shuttle statistics
    const shuttles = await ctx.db
      .query("shuttles")
      .withIndex("by_hotel", (q) => q.eq("hotelId", hotelId))
      .collect();

    const activeShuttles = shuttles.filter(s => s.isActive).length;
    const totalShuttles = shuttles.length;

    // Get staff statistics
    const staff = await ctx.db
      .query("users")
      .withIndex("by_hotel", (q) => q.eq("hotelId", hotelId))
      .collect();

    const drivers = staff.filter(s => s.role === "driver").length;
    const frontdeskStaff = staff.filter(s => s.role === "frontdesk").length;

    // Daily booking data for the last 30 days
    const dailyBookings = [];
    for (let i = 29; i >= 0; i--) {
      const date = getDateStringDaysAgo(i);
      const dayBookings = allBookings.filter(b => {
        const bookingDate = new Date(b._creationTime).toISOString().split("T")[0];
        return bookingDate === date;
      });
      
      dailyBookings.push({
        date,
        total: dayBookings.length,
        confirmed: dayBookings.filter(b => b.bookingStatus === "CONFIRMED").length,
        pending: dayBookings.filter(b => b.bookingStatus === "PENDING").length,
        rejected: dayBookings.filter(b => b.bookingStatus === "REJECTED").length,
        earnings: dayBookings.filter(b => b.paymentStatus === "PAID").reduce((sum, b) => sum + Number(b.totalPrice), 0),
      });
    }

    // Payment status breakdown
    const paymentStats = {
      paid: allBookings.filter(b => b.paymentStatus === "PAID").length,
      unpaid: allBookings.filter(b => b.paymentStatus === "UNPAID").length,
      refunded: allBookings.filter(b => b.paymentStatus === "REFUNDED").length,
      waived: allBookings.filter(b => b.paymentStatus === "WAIVED").length,
    };

    // Payment method breakdown
    const paymentMethodStats = {
      app: allBookings.filter(b => b.paymentMethod === "APP").length,
      frontdesk: allBookings.filter(b => b.paymentMethod === "FRONTDESK").length,
      deposit: allBookings.filter(b => b.paymentMethod === "DEPOSIT").length,
    };

    return {
      overview: {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        rejectedBookings,
        totalEarnings,
        last30DaysEarnings,
        todayEarnings,
        totalTrips,
        completedTrips,
        inProgressTrips,
        scheduledTrips,
        totalShuttles,
        activeShuttles,
        drivers,
        frontdeskStaff,
      },
      today: {
        bookings: todayBookings.length,
        trips: todayTrips.length,
        earnings: todayEarnings,
      },
      last7Days: {
        bookings: last7DaysBookings.length,
        earnings: last7DaysBookings.filter(b => b.paymentStatus === "PAID").reduce((sum, b) => sum + Number(b.totalPrice), 0),
      },
      last30Days: {
        bookings: last30DaysBookings.length,
        earnings: last30DaysEarnings,
      },
      dailyBookings,
      paymentStats,
      paymentMethodStats,
    };
  },
});

export const getRecentBookings = query({
  args: {
    adminId: v.id("users"),
    limit: v.optional(v.number()),
  },
  async handler(ctx, args) {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || admin.role !== "admin" || !admin.hotelId) {
      return [];
    }

    // Get today's date in UTC
    const today = getUTCDateString();

    // Get all bookings for the hotel
    const allBookings = await ctx.db
      .query("bookings")
      .withIndex("by_hotel", (q) => q.eq("hotelId", admin.hotelId!))
      .collect();

    // Filter bookings created today
    const todayBookings = allBookings.filter(booking => {
      const bookingDate = new Date(booking._creationTime).toISOString().split("T")[0];
      return bookingDate === today;
    });

    // Sort by creation time (newest first) and apply limit
    const bookings = todayBookings
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, args.limit ?? 10);

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
              scheduledDate = tripInstance.scheduledDate;
              scheduledTime = `${tripInstance.scheduledStartTime} - ${tripInstance.scheduledEndTime}`;
            }
          }
        }

        return {
          _id: booking._id,
          guestName: guest?.name ?? "Unknown Guest",
          guestEmail: guest?.email ?? "Unknown",
          seats: Number(booking.seats),
          totalPrice: booking.totalPrice,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          paymentMethod: booking.paymentMethod,
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

export const getActiveTrips = query({
  args: {
    adminId: v.id("users"),
  },
  async handler(ctx, args) {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || admin.role !== "admin" || !admin.hotelId) {
      return [];
    }

    // Get hotel's trips
    const hotelTrips = await ctx.db
      .query("trips")
      .withIndex("by_hotel", (q) => q.eq("hotelId", admin.hotelId!))
      .collect();

    const today = getUTCDateString();

    const results = [];
    for (const trip of hotelTrips) {
      // Get trip instances for today
      const tripInstances = await ctx.db
        .query("tripInstances")
        .withIndex("by_trip_date_time", (q) =>
          q.eq("tripId", trip._id).eq("scheduledDate", today)
        )
        .collect();

      for (const instance of tripInstances) {
        let shuttleInfo = undefined;
        let driverInfo = undefined;

        if (instance.shuttleId) {
          const shuttle = await ctx.db.get(instance.shuttleId);
          if (shuttle) {
            shuttleInfo = {
              vehicleNumber: shuttle.vehicleNumber,
              totalSeats: Number(shuttle.totalSeats),
            };

            if (shuttle.currentlyAssignedTo) {
              const driver = await ctx.db.get(shuttle.currentlyAssignedTo);
              if (driver) {
                driverInfo = {
                  name: driver.name,
                  phoneNumber: driver.phoneNumber,
                };
              }
            }
          }
        }

        const routeInstances = await ctx.db
          .query("routeInstances")
          .withIndex("by_trip_instance", (q) =>
            q.eq("tripInstanceId", instance._id)
          )
          .collect();

        let maxOccupied = 0;
        let maxHeld = 0;
        for (const ri of routeInstances) {
          maxOccupied = Math.max(maxOccupied, Number(ri.seatsOccupied));
          maxHeld = Math.max(maxHeld, Number(ri.seatHeld));
        }

        results.push({
          _id: instance._id,
          tripName: trip.name,
          scheduledStartTime: instance.scheduledStartTime,
          scheduledEndTime: instance.scheduledEndTime,
          status: instance.status,
          bookingCount: instance.bookingIds.length,
          seatsOccupied: maxOccupied,
          seatsHeld: maxHeld,
          totalSeats: shuttleInfo?.totalSeats ?? 0,
          shuttle: shuttleInfo,
          driver: driverInfo,
          completedRoutes: routeInstances.filter((ri) => ri.completed).length,
          totalRoutes: routeInstances.length,
        });
      }
    }

    return results.sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
  },
});
