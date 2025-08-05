import { Request, Response } from "express";
import prisma from "../db/prisma";
import { TripDirection, TripStatus, TripPhase } from "@prisma/client";
import { sendToUser } from "../ws/index";
import { WsEvents } from "../ws/events";
import { getISTDateRange } from "../utils/bookingUtils";
import { resetSeatCapacityForNewBookings } from "../utils/shuttleSeatUtils";

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
        startTime: {
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

      if (
        currentTimeUTC >= schedule.startTime &&
        currentTimeUTC <= schedule.endTime
      ) {
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

    console.log(
      `✅ Found active schedule: Driver ${driverId}, Shuttle ${currentSchedule.shuttleId}`
    );

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

    // Check for and cleanup any overlapping trips
    console.log(`Checking for overlapping trips before starting new trip`);
    const cleanupResult = await checkAndCleanupOverlappingTrips(driverId);
    if (!cleanupResult.success) {
      console.error(`Failed to cleanup overlapping trips: ${cleanupResult.message}`);
      return res.status(500).json({
        message: "Failed to cleanup overlapping trips. Please try again.",
      });
    }
    
    if (cleanupResult.cleanedTrips && cleanupResult.cleanedTrips.length > 0) {
      console.log(`Cleaned up ${cleanupResult.cleanedTrips.length} overlapping trips`);
    }

    // Get unassigned bookings for both directions (excluding held bookings)
    const hotelId = (req as any).user.hotelId;
    const unassignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
        tripId: null,
        isCompleted: false,
        isCancelled: false,
        needsFrontdeskVerification: false, // Frontdesk has verified this booking
        // Hide held bookings from drivers until confirmed
        seatsConfirmed: true, // Only show confirmed bookings to drivers
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

    // Reset seat capacity for new bookings for both directions
    // This ensures that new bookings can use the full capacity regardless of seats used in the current trip
    await resetSeatCapacityForNewBookings(currentSchedule.shuttleId, 'HOTEL_TO_AIRPORT');
    await resetSeatCapacityForNewBookings(currentSchedule.shuttleId, 'AIRPORT_TO_HOTEL');

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
        select: { hotelId: true },
      });

      if (driverWithHotel) {
        // Send to all frontdesk users of this hotel
        sendToRoleInHotel(
          Number(driverWithHotel.hotelId),
          "frontdesk",
          WsEvents.TRIP_STARTED,
          {
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
            },
          }
        );
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
    let newAirportToHotelBookings: any[] = [];

    if (phase === "RETURN" && trip.phase === TripPhase.OUTBOUND) {
      // Find new Airport to Hotel bookings that should be assigned to this trip
      const hotelId = (req as any).user.hotelId;
      newAirportToHotelBookings = await prisma.booking.findMany({
        where: {
          shuttleId: trip.shuttleId,
          tripId: null, // Not already assigned to a trip
          bookingType: "AIRPORT_TO_HOTEL",
          isCompleted: false,
          isCancelled: false,
          needsFrontdeskVerification: false, // Frontdesk has verified this booking
          seatsConfirmed: true, // Only confirmed bookings
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

      console.log(`Found ${newAirportToHotelBookings.length} new Airport to Hotel bookings to assign to return trip`);

      // Assign new bookings to the trip
      if (newAirportToHotelBookings.length > 0) {
        const bookingIds = newAirportToHotelBookings.map((booking) => booking.id);
        await prisma.booking.updateMany({
          where: {
            id: { in: bookingIds },
          },
          data: {
            tripId: tripId,
          },
        });
        console.log(`Assigned ${bookingIds.length} new bookings to trip ${tripId}`);
      }

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
        select: { hotelId: true },
      });

      if (driverWithHotel) {
        // Send to all frontdesk users of this hotel
        sendToRoleInHotel(
          Number(driverWithHotel.hotelId),
          "frontdesk",
          WsEvents.TRIP_UPDATED,
          {
            title: "Trip Updated",
            message: `Trip ${tripId} transitioned to ${phase} phase with ${newAirportToHotelBookings.length} new bookings`,
            trip: {
              id: tripId,
              phase: phase,
              direction: trip.direction,
              totalBookings: trip.bookings.length + newAirportToHotelBookings.length,
            },
          }
        );
      }
    } catch (wsError) {
      console.error("WebSocket notification error:", wsError);
      // Don't fail the request if WebSocket fails
    }

    res.json({
      trip: updatedTrip,
      message: `Trip transitioned to ${phase} phase successfully with ${newAirportToHotelBookings.length} new bookings assigned`,
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
        shuttle: true,
        driver: true,
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

    // Reset shuttle capacity after trip completion
    // This ensures the shuttle is ready for the next trip
    console.log(`=== RESETTING SHUTTLE CAPACITY AFTER TRIP COMPLETION ===`);
    console.log(`Trip ID: ${tripId}, Shuttle ID: ${trip.shuttleId}`);
    
    try {
      // Reset capacity for both directions to ensure clean state for next trip
      await resetSeatCapacityForNewBookings(trip.shuttleId, 'HOTEL_TO_AIRPORT');
      await resetSeatCapacityForNewBookings(trip.shuttleId, 'AIRPORT_TO_HOTEL');
      console.log(`✅ Successfully reset shuttle capacity for next trip`);
    } catch (resetError) {
      console.error(`❌ Error resetting shuttle capacity:`, resetError);
      // Don't fail the trip completion if reset fails
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
      sendToUser(booking.guestId, "guest", "trip_completed", {
        title: "Trip Completed",
        message: "Your shuttle trip has been completed successfully.",
        booking: booking,
      });
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
      sendToUser(booking.guestId, "guest", "trip_cancelled", {
        title: "Trip Cancelled",
        message:
          "Your shuttle trip has been cancelled as you were not checked in.",
        booking: booking,
      });
    }

    // Send WebSocket notification to frontdesk about trip completion
    try {
      const { sendToRoleInHotel } = await import("../ws/index");
      const { WsEvents } = await import("../ws/events");

      // Get hotel ID from the driver
      const driverWithHotel = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { hotelId: true },
      });

      if (driverWithHotel) {
        // Send to all frontdesk users of this hotel
        sendToRoleInHotel(
          Number(driverWithHotel.hotelId),
          "frontdesk",
          WsEvents.TRIP_COMPLETED,
          {
            title: "Trip Completed",
            message: `Trip ${tripId} has been completed successfully`,
            trip: {
              id: tripId,
              driver: trip.driver,
              shuttle: trip.shuttle,
              verifiedBookings: verifiedBookings.length,
              unverifiedBookings: unverifiedBookings.length,
            },
          }
        );
      }
    } catch (wsError) {
      console.error("WebSocket notification error:", wsError);
      // Don't fail the request if WebSocket fails
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
          where: {
            // Hide held bookings from drivers until confirmed
            seatsConfirmed: true, // Only show confirmed bookings to drivers
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
        },
      },
    });

    if (!activeTrip) {
      return res.json({
        currentTrip: null,
        message: "No active trip found",
      });
    }

    // Filter bookings based on trip phase
    let relevantBookings = activeTrip.bookings;
    if (activeTrip.phase === TripPhase.OUTBOUND) {
      // During outbound phase, only show Hotel to Airport bookings
      relevantBookings = activeTrip.bookings.filter(
        (booking) => booking.bookingType === "HOTEL_TO_AIRPORT"
      );
    } else if (activeTrip.phase === TripPhase.RETURN) {
      // During return phase, only show Airport to Hotel bookings
      relevantBookings = activeTrip.bookings.filter(
        (booking) => booking.bookingType === "AIRPORT_TO_HOTEL"
      );
    }

    console.log(`Trip phase: ${activeTrip.phase}, Total bookings: ${activeTrip.bookings.length}, Relevant bookings: ${relevantBookings.length}`);

    // Transform bookings to passenger format
    const passengers = relevantBookings.map((booking, index) => ({
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

    const totalPeople = relevantBookings.reduce(
      (sum, booking) => sum + booking.numberOfPersons,
      0
    );
    const checkedInPeople = relevantBookings
      .filter((booking) => booking.isVerified)
      .reduce((sum, booking) => sum + booking.numberOfPersons, 0);
    const totalBookings = relevantBookings.length;
    const checkedInBookings = relevantBookings.filter(
      (b) => b.isVerified
    ).length;
    const totalBags = relevantBookings.reduce(
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
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        shuttle: true,
      },
    });

    console.log(
      `Found ${schedules.length} schedules for driver ${driverId} today`
    );

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

      if (
        currentTimeUTC >= schedule.startTime &&
        currentTimeUTC <= schedule.endTime
      ) {
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

    console.log(
      `✅ Found active schedule: Driver ${driverId}, Shuttle ${currentSchedule.shuttleId}`
    );

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

    console.log(
      `Found ${unassignedBookings.length} unassigned bookings ready for trip`
    );

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

    // Get all bookings for this trip (excluding held bookings)
    const allBookings = await prisma.booking.findMany({
      where: {
        tripId: currentTrip.id,
        isCancelled: false,
        // Hide held bookings from drivers until confirmed
        seatsConfirmed: true, // Only show confirmed bookings to drivers
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

    // Filter bookings based on trip phase
    let relevantBookings = allBookings;
    if (currentTrip.phase === TripPhase.OUTBOUND) {
      // During outbound phase, only show Hotel to Airport bookings
      relevantBookings = allBookings.filter(
        (booking) => booking.bookingType === "HOTEL_TO_AIRPORT"
      );
    } else if (currentTrip.phase === TripPhase.RETURN) {
      // During return phase, only show Airport to Hotel bookings
      relevantBookings = allBookings.filter(
        (booking) => booking.bookingType === "AIRPORT_TO_HOTEL"
      );
    }

    console.log(`Trip phase: ${currentTrip.phase}, Total bookings: ${allBookings.length}, Relevant bookings: ${relevantBookings.length}`);

    // Transform bookings to live booking format
    const liveBookings = relevantBookings.map((booking) => ({
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
      phase: currentTrip.phase,
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
            // Hide held bookings from drivers until confirmed
            seatsConfirmed: true, // Only show confirmed bookings to drivers
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
    sendToUser(booking.guestId, "guest", "booking_added_to_trip", {
      title: "Booking Added to Trip",
      message:
        "Your booking has been added to the current active shuttle trip.",
      booking: booking,
      trip: updatedTrip,
    });

    // Send WebSocket notification to frontdesk about booking assignment
    try {
      const { sendToRoleInHotel } = await import("../ws/index");
      const { WsEvents } = await import("../ws/events");

      // Get hotel ID from the driver
      const driverWithHotel = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { hotelId: true },
      });

      if (driverWithHotel) {
        // Send to all frontdesk users of this hotel
        sendToRoleInHotel(
          Number(driverWithHotel.hotelId),
          "frontdesk",
          WsEvents.BOOKING_ASSIGNED,
          {
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
          }
        );
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

/**
 * Prepare next trip and transition from current trip
 * This function ensures proper separation between current and next trips
 * @param driverId - The driver ID
 * @param currentTripId - The current trip ID to complete
 * @returns Promise<object> - Information about the transition
 */
const prepareNextTrip = async (driverId: number, currentTripId?: string) => {
  try {
    console.log(`=== PREPARING NEXT TRIP ===`);
    console.log(`Driver ID: ${driverId}, Current Trip ID: ${currentTripId || 'None'}`);

    // Get current active trip if not provided
    let currentTrip = null;
    if (currentTripId) {
      currentTrip = await prisma.trip.findFirst({
        where: {
          id: currentTripId,
          driverId,
          status: TripStatus.ACTIVE,
        },
        include: {
          shuttle: true,
          driver: true,
        },
      });
    } else {
      currentTrip = await prisma.trip.findFirst({
        where: {
          driverId,
          status: TripStatus.ACTIVE,
        },
        include: {
          shuttle: true,
          driver: true,
        },
      });
    }

    // If there's a current trip, complete it first
    if (currentTrip) {
      console.log(`Completing current trip ${currentTrip.id}`);
      
      const now = new Date();
      
      // Complete the current trip
      await prisma.trip.update({
        where: { id: currentTrip.id },
        data: {
          phase: TripPhase.COMPLETED,
          status: TripStatus.COMPLETED,
          endTime: now,
        },
      });

      // Reset shuttle capacity for the next trip
      console.log(`Resetting shuttle capacity for next trip`);
      await resetSeatCapacityForNewBookings(currentTrip.shuttleId, 'HOTEL_TO_AIRPORT');
      await resetSeatCapacityForNewBookings(currentTrip.shuttleId, 'AIRPORT_TO_HOTEL');

      // Mark verified bookings as completed
      await prisma.booking.updateMany({
        where: {
          tripId: currentTrip.id,
          isVerified: true,
        },
        data: {
          isCompleted: true,
        },
      });
    }

    // Get the driver's active schedule for the next trip
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany({
      where: {
        driverId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        shuttle: true,
      },
    });

    // Find the currently active schedule
    let currentSchedule = null;
    for (const schedule of schedules) {
      const currentTimeUTC = new Date();
      if (
        currentTimeUTC >= schedule.startTime &&
        currentTimeUTC <= schedule.endTime
      ) {
        currentSchedule = schedule;
        break;
      }
    }

    if (!currentSchedule) {
      console.log(`No active schedule found for driver ${driverId}`);
      return {
        success: false,
        message: "No active schedule found",
        currentTrip: currentTrip,
        nextTrip: null,
      };
    }

    // Get unassigned bookings for the next trip
    const hotelId = currentTrip?.driver?.hotelId || (await prisma.driver.findUnique({
      where: { id: driverId },
      select: { hotelId: true },
    }))?.hotelId;

    if (!hotelId) {
      console.log(`No hotel ID found for driver ${driverId}`);
      return {
        success: false,
        message: "No hotel ID found for driver",
        currentTrip: currentTrip,
        nextTrip: null,
      };
    }

    const unassignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
        tripId: null,
        isCompleted: false,
        isCancelled: false,
        needsFrontdeskVerification: false,
        seatsConfirmed: true,
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
      console.log(`No unassigned bookings found for next trip`);
      return {
        success: true,
        message: "Current trip completed, no bookings available for next trip",
        currentTrip: currentTrip,
        nextTrip: null,
      };
    }

    // Create new trip for the next round
    const nextTrip = await prisma.trip.create({
      data: {
        scheduleId: currentSchedule.id,
        driverId,
        shuttleId: currentSchedule.shuttleId,
        direction: TripDirection.HOTEL_TO_AIRPORT,
        status: TripStatus.ACTIVE,
        phase: TripPhase.OUTBOUND,
        startTime: new Date(),
      },
      include: {
        shuttle: true,
        driver: true,
      },
    });

    // Assign bookings to the new trip
    const bookingIds = unassignedBookings.map((booking) => booking.id);
    await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
      },
      data: {
        tripId: nextTrip.id,
      },
    });

    console.log(`✅ Successfully prepared next trip ${nextTrip.id} with ${unassignedBookings.length} bookings`);

    return {
      success: true,
      message: "Successfully transitioned to next trip",
      currentTrip: currentTrip,
      nextTrip: nextTrip,
      assignedBookings: unassignedBookings.length,
    };
  } catch (error) {
    console.error("Error preparing next trip:", error);
    return {
      success: false,
      message: "Error preparing next trip",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Check for and clean up overlapping trips
 * This function ensures only one active trip per driver at a time
 * @param driverId - The driver ID
 * @returns Promise<object> - Information about the cleanup
 */
const checkAndCleanupOverlappingTrips = async (driverId: number) => {
  try {
    console.log(`=== CHECKING FOR OVERLAPPING TRIPS ===`);
    console.log(`Driver ID: ${driverId}`);

    // Get all active trips for this driver
    const activeTrips = await prisma.trip.findMany({
      where: {
        driverId,
        status: TripStatus.ACTIVE,
      },
      include: {
        shuttle: true,
        driver: true,
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    console.log(`Found ${activeTrips.length} active trips for driver ${driverId}`);

    if (activeTrips.length <= 1) {
      console.log(`No overlapping trips found`);
      return {
        success: true,
        message: "No overlapping trips found",
        cleanedTrips: [],
        remainingTrip: activeTrips[0] || null,
      };
    }

    // If there are multiple active trips, keep only the most recent one
    const tripsToCleanup = activeTrips.slice(1); // All except the first (most recent)
    const keepTrip = activeTrips[0]; // Keep the most recent trip

    console.log(`Found ${tripsToCleanup.length} overlapping trips to cleanup`);
    console.log(`Keeping trip ${keepTrip.id} (most recent)`);

    const cleanedTrips = [];

    for (const trip of tripsToCleanup) {
      console.log(`Cleaning up overlapping trip ${trip.id}`);

      // Complete the overlapping trip
      await prisma.trip.update({
        where: { id: trip.id },
        data: {
          phase: TripPhase.COMPLETED,
          status: TripStatus.COMPLETED,
          endTime: new Date(),
        },
      });

      // Reset shuttle capacity for this trip
      await resetSeatCapacityForNewBookings(trip.shuttleId, 'HOTEL_TO_AIRPORT');
      await resetSeatCapacityForNewBookings(trip.shuttleId, 'AIRPORT_TO_HOTEL');

      // Mark verified bookings as completed
      await prisma.booking.updateMany({
        where: {
          tripId: trip.id,
          isVerified: true,
        },
        data: {
          isCompleted: true,
        },
      });

      // Unassign unverified bookings from this trip
      await prisma.booking.updateMany({
        where: {
          tripId: trip.id,
          isVerified: false,
        },
        data: {
          tripId: null, // Make them available for the current trip
        },
      });

      cleanedTrips.push({
        id: trip.id,
        startTime: trip.startTime,
        endTime: new Date(),
        bookingsCount: trip.bookings.length,
      });

      console.log(`✅ Cleaned up overlapping trip ${trip.id}`);
    }

    console.log(`=== END OVERLAPPING TRIPS CLEANUP ===`);

    return {
      success: true,
      message: `Cleaned up ${cleanedTrips.length} overlapping trips`,
      cleanedTrips,
      remainingTrip: keepTrip,
    };
  } catch (error) {
    console.error("Error checking and cleaning up overlapping trips:", error);
    return {
      success: false,
      message: "Error cleaning up overlapping trips",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Debug function to check shuttle capacity state
 * @param shuttleId - The shuttle ID to check
 * @returns Promise<object> - Shuttle capacity information
 */
const debugShuttleCapacity = async (shuttleId: number) => {
  try {
    console.log(`=== DEBUG SHUTTLE CAPACITY ===`);
    console.log(`Shuttle ID: ${shuttleId}`);

    const shuttle = await prisma.shuttle.findUnique({
      where: { id: shuttleId },
      select: {
        id: true,
        vehicleNumber: true,
        seats: true,
        seatsHeld: true,
        seatsConfirmed: true,
        airportToHotelSeatsHeld: true,
        airportToHotelSeatsConfirmed: true,
        hotelToAirportSeatsHeld: true,
        hotelToAirportSeatsConfirmed: true,
        airportToHotelCapacity: true,
        hotelToAirportCapacity: true,
      },
    });

    if (!shuttle) {
      return {
        success: false,
        message: "Shuttle not found",
      };
    }

    // Get active trips for this shuttle
    const activeTrips = await prisma.trip.findMany({
      where: {
        shuttleId,
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

    // Get bookings assigned to this shuttle
    const assignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId,
        tripId: {
          not: null,
        },
        isCompleted: false,
        isCancelled: false,
      },
      include: {
        trip: {
          select: {
            id: true,
            status: true,
            phase: true,
          },
        },
      },
    });

    const capacityInfo = {
      shuttleId: shuttle.id,
      vehicleNumber: shuttle.vehicleNumber,
      totalSeats: shuttle.seats,
      generalCapacity: {
        seatsHeld: shuttle.seatsHeld,
        seatsConfirmed: shuttle.seatsConfirmed,
        available: shuttle.seats - shuttle.seatsHeld - shuttle.seatsConfirmed,
      },
      airportToHotelCapacity: {
        capacity: shuttle.airportToHotelCapacity || shuttle.seats,
        seatsHeld: shuttle.airportToHotelSeatsHeld,
        seatsConfirmed: shuttle.airportToHotelSeatsConfirmed,
        available: (shuttle.airportToHotelCapacity || shuttle.seats) - shuttle.airportToHotelSeatsHeld - shuttle.airportToHotelSeatsConfirmed,
      },
      hotelToAirportCapacity: {
        capacity: shuttle.hotelToAirportCapacity || shuttle.seats,
        seatsHeld: shuttle.hotelToAirportSeatsHeld,
        seatsConfirmed: shuttle.hotelToAirportSeatsConfirmed,
        available: (shuttle.hotelToAirportCapacity || shuttle.seats) - shuttle.hotelToAirportSeatsHeld - shuttle.hotelToAirportSeatsConfirmed,
      },
      activeTrips: activeTrips.map(trip => ({
        id: trip.id,
        status: trip.status,
        phase: trip.phase,
        bookingsCount: trip.bookings.length,
      })),
      assignedBookings: assignedBookings.map(booking => ({
        id: booking.id,
        bookingType: booking.bookingType,
        numberOfPersons: booking.numberOfPersons,
        isVerified: booking.isVerified,
        tripId: booking.tripId,
        tripStatus: booking.trip?.status,
        tripPhase: booking.trip?.phase,
      })),
    };

    console.log(`Shuttle capacity info:`, capacityInfo);
    console.log(`=== END SHUTTLE CAPACITY DEBUG ===`);

    return {
      success: true,
      message: "Shuttle capacity information retrieved",
      capacityInfo,
    };
  } catch (error) {
    console.error("Error debugging shuttle capacity:", error);
    return {
      success: false,
      message: "Error debugging shuttle capacity",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
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
    const availableBookings = allBookings.filter(
      (booking) =>
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
      allBookings: allBookings.map((b) => ({
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
      availableBookings: availableBookings.map((b) => ({
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

    console.log(
      `Current IST time: ${istTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
    );
    console.log(
      `Date range (IST): ${startOfDay.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} to ${endOfDay.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
    );

    // Get all schedules for this driver today
    const allSchedules = await prisma.schedule.findMany({
      where: {
        driverId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        shuttle: true,
        driver: true,
      },
      orderBy: {
        startTime: "asc",
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

      if (
        currentTimeUTC >= schedule.startTime &&
        currentTimeUTC <= schedule.endTime
      ) {
        console.log(`✅ Schedule ${schedule.id} is currently active`);
        activeSchedule = schedule;
        break;
      } else {
        console.log(`❌ Schedule ${schedule.id} is not active`);
      }
    }

    console.log(`Active schedule: ${activeSchedule ? "Found" : "Not found"}`);

    // Get all shuttles for this hotel
    const hotelShuttles = await prisma.shuttle.findMany({
      where: {
        hotelId: hotelId,
      },
      include: {
        schedules: {
          where: {
            startTime: {
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
        ist: istTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      },
      dateRange: {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
      },
      allSchedules: allSchedules.map((s) => {
        // The schedule times are stored as UTC, so we need to compare with current UTC time
        const scheduleStartTime = new Date(s.startTime);
        const scheduleEndTime = new Date(s.endTime);
        const currentTime = new Date(); // Current time in server timezone (IST)

        // Convert current time to UTC for comparison
        const currentTimeUTC = new Date(
          currentTime.getTime() - currentTime.getTimezoneOffset() * 60 * 1000
        );

        const isActive =
          currentTimeUTC >= scheduleStartTime &&
          currentTimeUTC <= scheduleEndTime;

        return {
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          shuttleId: s.shuttleId,
          shuttle: s.shuttle,
          driver: s.driver,
          isActive: isActive,
        };
      }),
      activeSchedule: activeSchedule
        ? {
            id: activeSchedule.id,
            startTime: activeSchedule.startTime,
            endTime: activeSchedule.endTime,
            shuttleId: activeSchedule.shuttleId,
            shuttle: activeSchedule.shuttle,
            driver: activeSchedule.driver,
          }
        : null,
      hotelShuttles: hotelShuttles.map((s) => ({
        id: s.id,
        vehicleNumber: s.vehicleNumber,
        seats: s.seats,
        scheduleCount: s.schedules.length,
        schedules: s.schedules.map((sch) => ({
          id: sch.id,
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

// Debug endpoint to check why no bookings are found for starting trip
const debugStartTripBookings = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    console.log(`=== DEBUG START TRIP BOOKINGS ===`);
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
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        shuttle: true,
      },
    });

    console.log(`Found ${schedules.length} schedules for driver today`);

    // Find the currently active schedule
    let currentSchedule = null;
    for (const schedule of schedules) {
      const currentTimeUTC = new Date();
      if (
        currentTimeUTC >= schedule.startTime &&
        currentTimeUTC <= schedule.endTime
      ) {
        console.log(`✅ Schedule ${schedule.id} is currently active`);
        currentSchedule = schedule;
        break;
      } else {
        console.log(`❌ Schedule ${schedule.id} is not active`);
      }
    }

    if (!currentSchedule) {
      return res.json({
        message: "No active schedule found",
        currentSchedule: null,
        allBookings: [],
        filteredBookings: [],
      });
    }

    console.log(`✅ Found active schedule: Driver ${driverId}, Shuttle ${currentSchedule.shuttleId}`);

    // Get ALL bookings for this shuttle and hotel
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

    console.log(`Total bookings for shuttle ${currentSchedule.shuttleId}: ${allBookings.length}`);

    // Check each filter criteria step by step
    const step1 = allBookings.filter(b => b.tripId === null);
    console.log(`Step 1 - Not assigned to trip: ${step1.length} bookings`);

    const step2 = step1.filter(b => !b.isCompleted);
    console.log(`Step 2 - Not completed: ${step2.length} bookings`);

    const step3 = step2.filter(b => !b.isCancelled);
    console.log(`Step 3 - Not cancelled: ${step3.length} bookings`);

    const step4 = step3.filter(b => !b.needsFrontdeskVerification);
    console.log(`Step 4 - Frontdesk verified: ${step4.length} bookings`);

    const step5 = step4.filter(b => b.seatsConfirmed);
    console.log(`Step 5 - Seats confirmed: ${step5.length} bookings`);

    // This should be the final result
    const finalBookings = step5;
    console.log(`Final result - All criteria met: ${finalBookings.length} bookings`);

    // Show details of bookings that failed each step
    const failedStep1 = allBookings.filter(b => b.tripId !== null);
    const failedStep2 = step1.filter(b => b.isCompleted);
    const failedStep3 = step2.filter(b => b.isCancelled);
    const failedStep4 = step3.filter(b => b.needsFrontdeskVerification);
    const failedStep5 = step4.filter(b => !b.seatsConfirmed);

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
        seatsConfirmed: b.seatsConfirmed,
        tripId: b.tripId,
        shuttleId: b.shuttleId,
        guest: b.guest,
        createdAt: b.createdAt,
      })),
      stepResults: {
        total: allBookings.length,
        step1: step1.length,
        step2: step2.length,
        step3: step3.length,
        step4: step4.length,
        step5: step5.length,
      },
      failedBookings: {
        step1: failedStep1.map(b => ({ id: b.id, reason: "Already assigned to trip", tripId: b.tripId })),
        step2: failedStep2.map(b => ({ id: b.id, reason: "Already completed" })),
        step3: failedStep3.map(b => ({ id: b.id, reason: "Already cancelled" })),
        step4: failedStep4.map(b => ({ id: b.id, reason: "Needs frontdesk verification" })),
        step5: failedStep5.map(b => ({ id: b.id, reason: "Seats not confirmed" })),
      },
      finalBookings: finalBookings.map(b => ({
        id: b.id,
        numberOfPersons: b.numberOfPersons,
        bookingType: b.bookingType,
        guest: b.guest,
        pickupLocation: b.pickupLocation,
        dropoffLocation: b.dropoffLocation,
      })),
    });
  } catch (error) {
    console.error("Debug start trip bookings error:", error);
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
  prepareNextTrip,
  debugDriverBookings,
  debugDriverSchedule,
  testCurrentTime,
  debugStartTripBookings,
  checkAndCleanupOverlappingTrips,
  debugShuttleCapacity,
};
