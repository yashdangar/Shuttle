import { Request, Response } from "express";
import prisma from "../db/prisma";
import { TripDirection, TripStatus, TripPhase } from "@prisma/client";
import { sendToUser } from "../ws/index";
import { WsEvents } from "../ws/events";
import { getISTDateRange } from "../utils/bookingUtils";

// Start a new round trip (includes both outbound and return)
const startTrip = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;

    // Check if driver has an active schedule
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany({
      where: {
        driverId,
        scheduleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        shuttle: true,
      },
    });

    console.log(`=== START TRIP ===`);
    console.log(`Driver ID: ${driverId}`);
    console.log(`Found ${schedules.length} schedules for driver today`);

    // Find the currently active schedule using UTC time comparison
    let currentSchedule = null;
    for (const schedule of schedules) {
      // Current time is already UTC-based in Node.js
      const currentTimeUTC = new Date();
      
      console.log(`Schedule ${schedule.id}:`);
      console.log(`  Start time (UTC): ${schedule.startTime.toISOString()}`);
      console.log(`  End time (UTC): ${schedule.endTime.toISOString()}`);
      console.log(`  Current time (UTC): ${currentTimeUTC.toISOString()}`);
      console.log(`  Current time (IST): ${currentTimeUTC.toLocaleString()}`);
      
      if (currentTimeUTC >= schedule.startTime && currentTimeUTC <= schedule.endTime) {
        console.log(`✅ Schedule ${schedule.id} is currently active`);
        currentSchedule = schedule;
        break;
      } else {
        console.log(`❌ Schedule ${schedule.id} is not active`);
      }
    }

    if (!currentSchedule) {
      console.log(`❌ No active schedule found for driver ${driverId}`);
      return res.status(400).json({
        message: "No active schedule found for driver",
      });
    }

    console.log(`✅ Found active schedule: Driver ${driverId}, Shuttle ${currentSchedule.shuttleId}`);

    // Check if there's already an active trip for this driver
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: TripStatus.ACTIVE,
      },
    });

    if (activeTrip) {
      return res.status(400).json({
        message:
          "Driver already has an active trip. Please end the current trip first.",
      });
    }

    // Get unassigned bookings for both directions
    const hotelId = (req as any).user.hotelId;
    const unassignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
        tripId: null,
        isCompleted: false,
        isCancelled: false,
        needsFrontdeskVerification: false, // Frontdesk has verified this booking
        guest: {
          hotelId: hotelId,
        },
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
      },
      orderBy: {
        preferredTime: "asc",
      },
    });

    if (unassignedBookings.length === 0) {
      return res.status(400).json({
        message: "No bookings found for round trip",
      });
    }

    // Create new round trip
    const newTrip = await prisma.trip.create({
      data: {
        scheduleId: currentSchedule.id,
        driverId,
        shuttleId: currentSchedule.shuttleId,
        direction: TripDirection.HOTEL_TO_AIRPORT, // Default direction for round trip
        status: TripStatus.ACTIVE,
        phase: TripPhase.OUTBOUND,
        startTime: new Date(),
      },
      include: {
        shuttle: true,
        driver: true,
      },
    });

    // Assign all bookings to this trip
    const bookingIds = unassignedBookings.map((booking) => booking.id);
    await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
      },
      data: {
        tripId: newTrip.id,
      },
    });

    // Get updated bookings with trip assignment
    const assignedBookings = await prisma.booking.findMany({
      where: {
        tripId: newTrip.id,
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
      },
      orderBy: {
        preferredTime: "asc",
      },
    });

    // Transform bookings to passenger format
    const passengers = assignedBookings.map((booking, index) => ({
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || "Hotel",
      dropoff: booking.dropoffLocation?.name || "Airport",
      paymentMethod: booking.paymentMethod,
      status: booking.isVerified
        ? "checked-in"
        : index === 0
        ? "next"
        : "pending",
      seatNumber: booking.isVerified ? `A${index + 1}` : null,
      phoneNumber: booking.guest.phoneNumber,
      preferredTime: booking.preferredTime,
      isVerified: booking.isVerified,
      verifiedAt: booking.verifiedAt,
      bookingType: booking.bookingType,
      // Include actual location coordinates
      pickupLocation: booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
            name: booking.pickupLocation.name,
          }
        : null,
      dropoffLocation: booking.dropoffLocation
        ? {
            latitude: booking.dropoffLocation.latitude,
            longitude: booking.dropoffLocation.longitude,
            name: booking.dropoffLocation.name,
          }
        : null,
    }));

    const totalPeople = assignedBookings.reduce(
      (sum, b) => sum + b.numberOfPersons,
      0
    );
    const checkedInPeople = assignedBookings
      .filter((b) => b.isVerified)
      .reduce((sum, b) => sum + b.numberOfPersons, 0);
    const totalBookings = assignedBookings.length;
    const checkedInBookings = assignedBookings.filter(
      (b) => b.isVerified
    ).length;
    const totalBags = assignedBookings.reduce(
      (sum, b) => sum + b.numberOfBags,
      0
    );

    const message = `Round trip started successfully with ${totalBookings} bookings for ${totalPeople} passengers`;

    // Send WebSocket notification to frontdesk about trip started
    try {
      const { sendToRoleInHotel } = await import("../ws/index");
      const { WsEvents } = await import("../ws/events");
      
      // Get hotel ID from the driver
      const driverWithHotel = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { hotelId: true }
      });

      if (driverWithHotel) {
        // Send to all frontdesk users of this hotel
        sendToRoleInHotel(Number(driverWithHotel.hotelId), "frontdesk", WsEvents.TRIP_STARTED, {
          title: "Trip Started",
          message: `Driver ${newTrip.driver.name} started a trip with ${totalBookings} bookings`,
          trip: {
            id: newTrip.id,
            driver: newTrip.driver,
            shuttle: newTrip.shuttle,
            direction: newTrip.direction,
            phase: newTrip.phase,
            startTime: newTrip.startTime,
            totalBookings,
            totalPeople,
          }
        });
      }
    } catch (wsError) {
      console.error("WebSocket notification error:", wsError);
      // Don't fail the request if WebSocket fails
    }

    res.json({
      trip: {
        ...newTrip,
        passengers,
        totalPeople,
        checkedInPeople,
        totalBookings,
        checkedInBookings,
        totalBags,
      },
      message,
    });
  } catch (error) {
    console.error("Start trip error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Transition trip to next phase (outbound -> return)
const transitionTripPhase = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { tripId } = req.params;
    const { phase } = req.body;

    // Verify trip belongs to driver and is active
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId,
        status: TripStatus.ACTIVE,
      },
      include: {
        bookings: {
          include: {
            guest: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({
        message: "Active trip not found",
      });
    }

    let updatedTrip;
    const now = new Date();

    if (phase === "RETURN" && trip.phase === TripPhase.OUTBOUND) {
      // Transition from outbound to return phase
      updatedTrip = await prisma.trip.update({
        where: { id: tripId },
        data: {
          phase: TripPhase.RETURN,
          outboundEndTime: now,
          returnStartTime: now,
        },
        include: {
          shuttle: true,
          driver: true,
        },
      });
    } else {
      return res.status(400).json({
        message: `Invalid phase transition from ${trip.phase} to ${phase}`,
      });
    }

    // Send WebSocket notification to frontdesk about trip update
    try {
      const { sendToRoleInHotel } = await import("../ws/index");
      const { WsEvents } = await import("../ws/events");
      
      // Get hotel ID from the driver
      const driverWithHotel = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { hotelId: true }
      });

      if (driverWithHotel) {
        // Send to all frontdesk users of this hotel
        sendToRoleInHotel(Number(driverWithHotel.hotelId), "frontdesk", WsEvents.TRIP_UPDATED, {
          title: "Trip Updated",
          message: `Trip ${tripId} transitioned to ${phase} phase`,
          trip: {
            id: tripId,
            phase: phase,
            direction: trip.direction,
            totalBookings: trip.bookings.length,
          }
        });
      }
    } catch (wsError) {
      console.error("WebSocket notification error:", wsError);
      // Don't fail the request if WebSocket fails
    }

    res.json({
      trip: updatedTrip,
      message: `Trip transitioned to ${phase} phase successfully`,
    });
  } catch (error) {
    console.error("Transition trip phase error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// End current trip (legacy function - now uses transitionTripPhase)
const endTrip = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { tripId } = req.params;

    // Verify trip belongs to driver
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId,
        status: TripStatus.ACTIVE,
      },
      include: {
        bookings: {
          include: {
            guest: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({
        message: "Active trip not found",
      });
    }

    // Complete the trip based on current phase
    const now = new Date();
    let updatedTrip;

    if (trip.phase === TripPhase.OUTBOUND) {
      // If still in outbound, complete the entire trip
      updatedTrip = await prisma.trip.update({
        where: { id: tripId },
        data: {
          phase: TripPhase.COMPLETED,
          status: TripStatus.COMPLETED,
          outboundEndTime: now,
          endTime: now,
        },
        include: {
          shuttle: true,
          driver: true,
        },
      });
    } else if (trip.phase === TripPhase.RETURN) {
      // If in return phase, complete the trip
      updatedTrip = await prisma.trip.update({
        where: { id: tripId },
        data: {
          phase: TripPhase.COMPLETED,
          status: TripStatus.COMPLETED,
          endTime: now,
        },
        include: {
          shuttle: true,
          driver: true,
        },
      });
    }

    // Mark verified bookings as completed
    await prisma.booking.updateMany({
      where: {
        tripId: tripId,
        isVerified: true,
      },
      data: {
        isCompleted: true,
      },
    });

    // Separate verified and unverified bookings
    const verifiedBookings = trip.bookings.filter(
      (booking) => booking.isVerified
    );
    const unverifiedBookings = trip.bookings.filter(
      (booking) => !booking.isVerified
    );

    // Notify guests about trip completion
      for (const booking of verifiedBookings) {
        await prisma.notification.create({
          data: {
            guestId: booking.guestId,
            title: "Trip Completed",
          message: `Your shuttle trip has been completed. Thank you for choosing our service!`,
          },
        });

        // Send WebSocket notification
        sendToUser(
          booking.guestId,
          "guest",
        "trip_completed",
        {
          title: "Trip Completed",
          message: "Your shuttle trip has been completed successfully.",
          booking: booking,
        }
      );
    }

    // Notify unverified guests about cancellation
    for (const booking of unverifiedBookings) {
      await prisma.notification.create({
        data: {
            guestId: booking.guestId,
          title: "Trip Cancelled",
          message: `Your shuttle trip has been cancelled as you were not checked in.`,
          },
        });

        // Send WebSocket notification
        sendToUser(
          booking.guestId,
          "guest",
        "trip_cancelled",
        {
          title: "Trip Cancelled",
          message: "Your shuttle trip has been cancelled as you were not checked in.",
          booking: booking,
        }
      );
    }

    res.json({
      trip: updatedTrip,
      message: "Trip completed successfully",
      verifiedBookings: verifiedBookings.length,
      unverifiedBookings: unverifiedBookings.length,
    });
  } catch (error) {
    console.error("End trip error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get current active trip
const getCurrentTrip = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;

    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: TripStatus.ACTIVE,
      },
      include: {
        shuttle: true,
        driver: true,
        bookings: {
          include: {
            guest: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            pickupLocation: true,
            dropoffLocation: true,
          },
          orderBy: {
            preferredTime: "asc",
          },
        },
      },
    });

    if (!activeTrip) {
      return res.json({
        currentTrip: null,
        message: "No active trip found",
      });
    }

    // Transform bookings to passenger format
    const passengers = activeTrip.bookings.map((booking, index) => ({
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || "Hotel",
      dropoff: booking.dropoffLocation?.name || "Airport",
      paymentMethod: booking.paymentMethod,
      status: booking.isVerified
        ? "checked-in"
        : index === 0
        ? "next"
        : "pending",
      seatNumber: booking.isVerified ? `A${index + 1}` : null,
      phoneNumber: booking.guest.phoneNumber,
      preferredTime: booking.preferredTime,
      isVerified: booking.isVerified,
      verifiedAt: booking.verifiedAt,
      // Include actual location coordinates
      pickupLocation: booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
            name: booking.pickupLocation.name,
          }
        : null,
      dropoffLocation: booking.dropoffLocation
        ? {
            latitude: booking.dropoffLocation.latitude,
            longitude: booking.dropoffLocation.longitude,
            name: booking.dropoffLocation.name,
          }
        : null,
    }));

    const totalPeople = activeTrip.bookings.reduce(
      (sum, booking) => sum + booking.numberOfPersons,
      0
    );
    const checkedInPeople = activeTrip.bookings
      .filter((booking) => booking.isVerified)
      .reduce((sum, booking) => sum + booking.numberOfPersons, 0);
    const totalBookings = activeTrip.bookings.length;
    const checkedInBookings = activeTrip.bookings.filter(
      (b) => b.isVerified
    ).length;
    const totalBags = activeTrip.bookings.reduce(
      (sum, booking) => sum + booking.numberOfBags,
      0
    );

    res.json({
      currentTrip: {
        ...activeTrip,
        passengers,
        totalPeople,
        checkedInPeople,
        totalBookings,
        checkedInBookings,
        totalBags,
      },
    });
  } catch (error) {
    console.error("Get current trip error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



// Get available trips (bookings that can be started)
const getAvailableTrips = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    console.log(`=== GET AVAILABLE TRIPS ===`);
    console.log(`Driver ID: ${driverId}, Hotel ID: ${hotelId}`);

    // Check if driver has an active schedule
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany({
      where: {
        driverId,
        scheduleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        shuttle: true,
      },
    });

    console.log(`Found ${schedules.length} schedules for driver ${driverId} today`);

    // Find the currently active schedule using UTC time comparison
    let currentSchedule = null;
    for (const schedule of schedules) {
      // Current time is already UTC-based in Node.js
      const currentTimeUTC = new Date();
      
      console.log(`Schedule ${schedule.id}:`);
      console.log(`  Start time (UTC): ${schedule.startTime.toISOString()}`);
      console.log(`  End time (UTC): ${schedule.endTime.toISOString()}`);
      console.log(`  Current time (UTC): ${currentTimeUTC.toISOString()}`);
      console.log(`  Current time (IST): ${currentTimeUTC.toLocaleString()}`);
      
      if (currentTimeUTC >= schedule.startTime && currentTimeUTC <= schedule.endTime) {
        console.log(`✅ Schedule ${schedule.id} is currently active`);
        currentSchedule = schedule;
        break;
      } else {
        console.log(`❌ Schedule ${schedule.id} is not active`);
      }
    }

    if (!currentSchedule) {
      console.log(`❌ No active schedule found for driver ${driverId}`);
      return res.json({
        availableTrips: [],
        message: "No active schedule found",
      });
    }

    console.log(`✅ Found active schedule: Driver ${driverId}, Shuttle ${currentSchedule.shuttleId}`);

    // Get unassigned bookings grouped by direction
    // Updated logic: Include bookings that are verified by frontdesk but not yet verified by driver
    const unassignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
        tripId: null,
        isCompleted: false,
        isCancelled: false,
        needsFrontdeskVerification: false, // Frontdesk has verified this booking
        // For frontdesk-created bookings, isVerified: true means frontdesk verified it
        // For guest bookings, isVerified: false means driver hasn't checked in yet
        // We want to include both cases - bookings ready for driver to start trip
        guest: {
          hotelId: hotelId,
        },
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
      },
      orderBy: {
        preferredTime: "asc",
      },
    });

    console.log(`Found ${unassignedBookings.length} unassigned bookings ready for trip`);

    // Group by booking type
    const hotelToAirport = unassignedBookings.filter(
      (b) => b.bookingType === "HOTEL_TO_AIRPORT"
    );
    const airportToHotel = unassignedBookings.filter(
      (b) => b.bookingType === "AIRPORT_TO_HOTEL"
    );

    console.log(`Hotel to Airport: ${hotelToAirport.length} bookings`);
    console.log(`Airport to Hotel: ${airportToHotel.length} bookings`);

    const availableTrips = [];

    if (hotelToAirport.length > 0) {
      availableTrips.push({
        direction: "HOTEL_TO_AIRPORT",
        bookingCount: hotelToAirport.length,
        totalPersons: hotelToAirport.reduce(
          (sum, b) => sum + b.numberOfPersons,
          0
        ),
        totalBags: hotelToAirport.reduce((sum, b) => sum + b.numberOfBags, 0),
        earliestTime: hotelToAirport[0]?.preferredTime,
        latestTime: hotelToAirport[hotelToAirport.length - 1]?.preferredTime,
      });
    }

    if (airportToHotel.length > 0) {
      availableTrips.push({
        direction: "AIRPORT_TO_HOTEL",
        bookingCount: airportToHotel.length,
        totalPersons: airportToHotel.reduce(
          (sum, b) => sum + b.numberOfPersons,
          0
        ),
        totalBags: airportToHotel.reduce((sum, b) => sum + b.numberOfBags, 0),
        earliestTime: airportToHotel[0]?.preferredTime,
        latestTime: airportToHotel[airportToHotel.length - 1]?.preferredTime,
      });
    }

    console.log(`Available trips: ${availableTrips.length}`);

    res.json({
      availableTrips,
      currentSchedule: {
        startTime: currentSchedule.startTime,
        endTime: currentSchedule.endTime,
        shuttle: currentSchedule.shuttle,
      },
    });
  } catch (error) {
    console.error("Get available trips error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get live bookings for current trip
const getCurrentTripBookings = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;

    // Get current active trip
    const currentTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: TripStatus.ACTIVE,
      },
    });

    if (!currentTrip) {
      return res.json({
        bookings: [],
        message: "No active trip found",
      });
    }

    // Get all bookings for this trip
    const bookings = await prisma.booking.findMany({
      where: {
        tripId: currentTrip.id,
        isCancelled: false,
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
      },
      orderBy: {
        preferredTime: "asc",
      },
    });

    // Transform bookings to live booking format
    const liveBookings = bookings.map((booking) => ({
      id: booking.id,
      guest: booking.guest,
      numberOfPersons: booking.numberOfPersons,
      numberOfBags: booking.numberOfBags,
      preferredTime: booking.preferredTime,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      bookingType: booking.bookingType,
      assignedAt: booking.updatedAt || booking.createdAt,
      isVerified: booking.isVerified,
      verifiedAt: booking.verifiedAt,
    }));

    res.json({
      bookings: liveBookings,
      tripId: currentTrip.id,
      direction: currentTrip.direction,
    });
  } catch (error) {
    console.error("Get current trip bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add booking to active trip
const addBookingToActiveTrip = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { bookingId } = req.params;

    // Verify trip belongs to driver and is active
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: TripStatus.ACTIVE,
      },
      include: {
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
          },
        },
      },
    });

    if (!activeTrip) {
      return res.status(404).json({
        message: "No active trip found",
      });
    }

    // Find the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        shuttleId: activeTrip.shuttleId,
        tripId: null, // Not already assigned to a trip
        isCompleted: false,
        isCancelled: false,
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found or already assigned to a trip",
      });
    }

    // Check if booking should be assigned to current trip based on direction and phase
    const shouldAssignToCurrentTrip = shouldAssignBookingToCurrentTrip(
      booking.bookingType,
      activeTrip.phase,
      activeTrip.direction
    );

    if (!shouldAssignToCurrentTrip) {
      return res.status(400).json({
        message: `Booking cannot be added to current trip (${activeTrip.phase} phase)`,
      });
    }

    // Assign booking to the active trip
    await prisma.booking.update({
      where: { id: bookingId },
      data: { tripId: activeTrip.id },
    });

    // Get updated trip with new booking
    const updatedTrip = await prisma.trip.findFirst({
      where: { id: activeTrip.id },
      include: {
        shuttle: true,
        driver: true,
        bookings: {
          include: {
            guest: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            pickupLocation: true,
            dropoffLocation: true,
          },
          orderBy: {
            preferredTime: "asc",
          },
        },
      },
    });

    // Transform bookings to passenger format
    const passengers = updatedTrip!.bookings.map((booking, index) => ({
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || "Hotel",
      dropoff: booking.dropoffLocation?.name || "Airport",
      paymentMethod: booking.paymentMethod,
      status: booking.isVerified
        ? "checked-in"
        : index === 0
        ? "next"
        : "pending",
      seatNumber: booking.isVerified ? `A${index + 1}` : null,
      phoneNumber: booking.guest.phoneNumber,
      preferredTime: booking.preferredTime,
      isVerified: booking.isVerified,
      verifiedAt: booking.verifiedAt,
      bookingType: booking.bookingType,
      pickupLocation: booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
            name: booking.pickupLocation.name,
          }
        : null,
      dropoffLocation: booking.dropoffLocation
        ? {
            latitude: booking.dropoffLocation.latitude,
            longitude: booking.dropoffLocation.longitude,
            name: booking.dropoffLocation.name,
          }
        : null,
    }));

    const totalPeople = updatedTrip!.bookings.reduce(
      (sum, b) => sum + b.numberOfPersons,
      0
    );
    const checkedInPeople = updatedTrip!.bookings
      .filter((b) => b.isVerified)
      .reduce((sum, b) => sum + b.numberOfPersons, 0);
    const totalBookings = updatedTrip!.bookings.length;
    const checkedInBookings = updatedTrip!.bookings.filter(
      (b) => b.isVerified
    ).length;
    const totalBags = updatedTrip!.bookings.reduce(
      (sum, b) => sum + b.numberOfBags,
      0
    );

    // Notify the guest that their booking has been added to the active trip
    await prisma.notification.create({
      data: {
        guestId: booking.guestId,
        title: "Booking Added to Trip",
        message: `Your booking has been added to the current active shuttle trip.`,
      },
    });

    // Send WebSocket notification to guest
    const { sendToUser } = await import("../ws/index");
    sendToUser(
      booking.guestId,
      "guest",
      "booking_added_to_trip",
      {
        title: "Booking Added to Trip",
        message: "Your booking has been added to the current active shuttle trip.",
        booking: booking,
        trip: updatedTrip,
      }
    );

    // Send WebSocket notification to frontdesk about booking assignment
    try {
      const { sendToRoleInHotel } = await import("../ws/index");
      const { WsEvents } = await import("../ws/events");
      
      // Get hotel ID from the driver
      const driverWithHotel = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { hotelId: true }
      });

      if (driverWithHotel) {
        // Send to all frontdesk users of this hotel
        sendToRoleInHotel(Number(driverWithHotel.hotelId), "frontdesk", WsEvents.BOOKING_ASSIGNED, {
          title: "Booking Assigned",
          message: `Booking ${bookingId} assigned to active trip ${activeTrip.id}`,
          booking: {
            id: booking.id,
            guest: booking.guest,
            numberOfPersons: booking.numberOfPersons,
            pickupLocation: booking.pickupLocation,
            dropoffLocation: booking.dropoffLocation,
          },
          tripId: activeTrip.id,
        });
      }
    } catch (wsError) {
      console.error("WebSocket notification error:", wsError);
      // Don't fail the request if WebSocket fails
    }

    res.json({
      trip: {
        ...updatedTrip,
        passengers,
        totalPeople,
        checkedInPeople,
        totalBookings,
        checkedInBookings,
        totalBags,
      },
      message: "Booking added to active trip successfully",
    });
  } catch (error) {
    console.error("Add booking to active trip error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to determine if booking should be assigned to current trip
const shouldAssignBookingToCurrentTrip = (
  bookingType: string,
  tripPhase: string,
  tripDirection: string
): boolean => {
  // If trip is in OUTBOUND phase (hotel to airport)
  if (tripPhase === "OUTBOUND") {
    // During outbound, assign airport-to-hotel bookings to current trip
    // These will be handled during the return phase
    return bookingType === "AIRPORT_TO_HOTEL";
  }
  
  // If trip is in RETURN phase (airport to hotel)
  if (tripPhase === "RETURN") {
    // During return, don't assign new airport-to-hotel bookings to current trip
    // They should go to a new trip
    return false;
  }
  
  // For any other phase, don't assign to current trip
  return false;
};

// Debug endpoint to check driver's available bookings
const debugDriverBookings = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    console.log(`=== DEBUG DRIVER BOOKINGS ===`);
    console.log(`Driver ID: ${driverId}, Hotel ID: ${hotelId}`);

    // Check if driver has an active schedule
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const currentSchedule = await prisma.schedule.findFirst({
      where: {
        driverId,
        scheduleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
      include: {
        shuttle: true,
      },
    });

    if (!currentSchedule) {
      return res.json({
        message: "No active schedule found",
        currentSchedule: null,
        allBookings: [],
        availableBookings: [],
      });
    }

    // Get ALL bookings for this shuttle
    const allBookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
        guest: {
          hotelId: hotelId,
        },
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get bookings that should be available for trips
    const availableBookings = allBookings.filter(booking => 
      !booking.isCompleted && 
      !booking.isCancelled && 
      !booking.needsFrontdeskVerification &&
      !booking.tripId
    );

    console.log(`Total bookings for shuttle: ${allBookings.length}`);
    console.log(`Available bookings for trips: ${availableBookings.length}`);

    res.json({
      currentSchedule: {
        id: currentSchedule.id,
        shuttleId: currentSchedule.shuttleId,
        shuttle: currentSchedule.shuttle,
        startTime: currentSchedule.startTime,
        endTime: currentSchedule.endTime,
      },
      allBookings: allBookings.map(b => ({
        id: b.id,
        numberOfPersons: b.numberOfPersons,
        bookingType: b.bookingType,
        isCompleted: b.isCompleted,
        isCancelled: b.isCancelled,
        needsFrontdeskVerification: b.needsFrontdeskVerification,
        isVerified: b.isVerified,
        tripId: b.tripId,
        shuttleId: b.shuttleId,
        guest: b.guest,
        createdAt: b.createdAt,
      })),
      availableBookings: availableBookings.map(b => ({
        id: b.id,
        numberOfPersons: b.numberOfPersons,
        bookingType: b.bookingType,
        isVerified: b.isVerified,
        guest: b.guest,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error("Debug driver bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Debug endpoint to check driver's schedule
const debugDriverSchedule = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    console.log(`=== DEBUG DRIVER SCHEDULE ===`);
    console.log(`Driver ID: ${driverId}, Hotel ID: ${hotelId}`);

    // Get current date in IST
    const { istTime, startOfDay, endOfDay } = getISTDateRange();
    
    console.log(`Current IST time: ${istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Date range (IST): ${startOfDay.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} to ${endOfDay.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    // Get all schedules for this driver today
    const allSchedules = await prisma.schedule.findMany({
      where: {
        driverId,
        scheduleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        shuttle: true,
        driver: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    console.log(`Found ${allSchedules.length} total schedules for today`);

    // Find active schedule using UTC time comparison
    let activeSchedule = null;
    for (const schedule of allSchedules) {
      // Current time is already UTC-based in Node.js
      const currentTimeUTC = new Date();
      
      console.log(`Schedule ${schedule.id}:`);
      console.log(`  Start time (UTC): ${schedule.startTime.toISOString()}`);
      console.log(`  End time (UTC): ${schedule.endTime.toISOString()}`);
      console.log(`  Current time (UTC): ${currentTimeUTC.toISOString()}`);
      console.log(`  Current time (IST): ${currentTimeUTC.toLocaleString()}`);
      
      if (currentTimeUTC >= schedule.startTime && currentTimeUTC <= schedule.endTime) {
        console.log(`✅ Schedule ${schedule.id} is currently active`);
        activeSchedule = schedule;
        break;
      } else {
        console.log(`❌ Schedule ${schedule.id} is not active`);
      }
    }

    console.log(`Active schedule: ${activeSchedule ? 'Found' : 'Not found'}`);

    // Get all shuttles for this hotel
    const hotelShuttles = await prisma.shuttle.findMany({
      where: {
        hotelId: hotelId,
      },
      include: {
        schedules: {
          where: {
            scheduleDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            driver: true,
          },
        },
      },
    });

    console.log(`Found ${hotelShuttles.length} shuttles for hotel`);

    res.json({
      driverId,
      hotelId,
      currentTime: {
        utc: new Date().toISOString(),
        ist: istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      },
      dateRange: {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
      },
      allSchedules: allSchedules.map(s => {
        // The schedule times are stored as UTC, so we need to compare with current UTC time
        const scheduleStartTime = new Date(s.startTime);
        const scheduleEndTime = new Date(s.endTime);
        const currentTime = new Date(); // Current time in server timezone (IST)
        
        // Convert current time to UTC for comparison
        const currentTimeUTC = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60 * 1000));
        
        const isActive = currentTimeUTC >= scheduleStartTime && currentTimeUTC <= scheduleEndTime;
        
        return {
          id: s.id,
          scheduleDate: s.scheduleDate,
          startTime: s.startTime,
          endTime: s.endTime,
          shuttleId: s.shuttleId,
          shuttle: s.shuttle,
          driver: s.driver,
          isActive: isActive,
        };
      }),
      activeSchedule: activeSchedule ? {
        id: activeSchedule.id,
        scheduleDate: activeSchedule.scheduleDate,
        startTime: activeSchedule.startTime,
        endTime: activeSchedule.endTime,
        shuttleId: activeSchedule.shuttleId,
        shuttle: activeSchedule.shuttle,
        driver: activeSchedule.driver,
      } : null,
      hotelShuttles: hotelShuttles.map(s => ({
        id: s.id,
        vehicleNumber: s.vehicleNumber,
        seats: s.seats,
        scheduleCount: s.schedules.length,
        schedules: s.schedules.map(sch => ({
          id: sch.id,
          scheduleDate: sch.scheduleDate,
          startTime: sch.startTime,
          endTime: sch.endTime,
          driverId: sch.driverId,
          driver: sch.driver,
        })),
      })),
    });
  } catch (error) {
    console.error("Debug driver schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Test endpoint to check current time calculation
const testCurrentTime = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const { istTime, startOfDay, endOfDay } = getISTDateRange();
    
    res.json({
      serverTime: {
        local: now.toLocaleString(),
        utc: now.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: now.getTimezoneOffset(),
      },
      istTime: {
        calculated: istTime.toLocaleString(),
        iso: istTime.toISOString(),
      },
      dateRange: {
        startOfDay: startOfDay.toLocaleString(),
        endOfDay: endOfDay.toLocaleString(),
      },
      message: "Server is running in IST timezone (Asia/Calcutta)",
    });
  } catch (error) {
    console.error("Test current time error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  startTrip,
  transitionTripPhase,
  endTrip,
  getCurrentTrip,
  getAvailableTrips,
  getCurrentTripBookings,
  addBookingToActiveTrip,
  debugDriverBookings,
  debugDriverSchedule,
  testCurrentTime,
};
