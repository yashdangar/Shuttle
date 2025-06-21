import { Request, Response } from "express";
import prisma from "../db/prisma";
import { TripDirection, TripStatus } from "@prisma/client";

// Start a new trip
const startTrip = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { direction } = req.body;

    if (!direction || !Object.values(TripDirection).includes(direction)) {
      return res.status(400).json({ 
        message: "Valid direction (HOTEL_TO_AIRPORT or AIRPORT_TO_HOTEL) is required" 
      });
    }

    // Check if driver has an active schedule
    const currentSchedule = await prisma.schedule.findFirst({
      where: {
        driverId,
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
      include: {
        shuttle: true,
      },
    });

    if (!currentSchedule) {
      return res.status(400).json({ 
        message: "No active schedule found for driver" 
      });
    }

    // Check if there's already an active trip for this driver
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: TripStatus.ACTIVE,
      },
    });

    if (activeTrip) {
      return res.status(400).json({ 
        message: "Driver already has an active trip. Please end the current trip first." 
      });
    }

    // Get unassigned bookings for this direction and hotel
    const hotelId = (req as any).user.hotelId;
    const unassignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
        tripId: null,
        bookingType: direction,
        isCompleted: false,
        isCancelled: false,
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
        preferredTime: 'asc',
      },
    });

    if (unassignedBookings.length === 0) {
      return res.status(400).json({ 
        message: `No bookings found for ${direction} direction` 
      });
    }

    // Create new trip
    const newTrip = await prisma.trip.create({
      data: {
        scheduleId: currentSchedule.id,
        driverId,
        shuttleId: currentSchedule.shuttleId,
        direction: direction as TripDirection,
        status: TripStatus.ACTIVE,
        startTime: new Date(),
      },
      include: {
        shuttle: true,
        driver: true,
      },
    });

    // Assign bookings to this trip
    const bookingIds = unassignedBookings.map(booking => booking.id);
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
        preferredTime: 'asc',
      },
    });

    // Transform bookings to passenger format
    const passengers = assignedBookings.map((booking, index) => ({
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || 'Hotel',
      dropoff: booking.dropoffLocation?.name || 'Airport',
      paymentMethod: booking.paymentMethod,
      status: booking.isVerified ? 'checked-in' : index === 0 ? 'next' : 'pending',
      seatNumber: booking.isVerified ? `A${index + 1}` : null,
      phoneNumber: booking.guest.phoneNumber,
      preferredTime: booking.preferredTime,
      isVerified: booking.isVerified,
      verifiedAt: booking.verifiedAt,
      // Include actual location coordinates
      pickupLocation: booking.pickupLocation ? {
        latitude: booking.pickupLocation.latitude,
        longitude: booking.pickupLocation.longitude,
        name: booking.pickupLocation.name
      } : null,
      dropoffLocation: booking.dropoffLocation ? {
        latitude: booking.dropoffLocation.latitude,
        longitude: booking.dropoffLocation.longitude,
        name: booking.dropoffLocation.name
      } : null,
    }));

    const totalPeople = assignedBookings.reduce((sum, b) => sum + b.numberOfPersons, 0);
    const checkedInPeople = assignedBookings.filter(b => b.isVerified).reduce((sum, b) => sum + b.numberOfPersons, 0);
    const totalBookings = assignedBookings.length;
    const checkedInBookings = assignedBookings.filter(b => b.isVerified).length;
    const totalBags = assignedBookings.reduce((sum, b) => sum + b.numberOfBags, 0);

    const message = `Trip started successfully with ${totalBookings} bookings for ${totalPeople} passengers`;

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

// End current trip
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
        message: "Active trip not found" 
      });
    }

    // Separate verified and unverified bookings
    const verifiedBookings = trip.bookings.filter(booking => booking.isVerified);
    const unverifiedBookings = trip.bookings.filter(booking => !booking.isVerified);

    // Update trip status
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETED,
        endTime: new Date(),
      },
      include: {
        shuttle: true,
        driver: true,
      },
    });

    // Mark verified bookings as completed
    if (verifiedBookings.length > 0) {
      await prisma.booking.updateMany({
        where: {
          id: { in: verifiedBookings.map(b => b.id) },
        },
        data: {
          isCompleted: true,
        },
      });
    }

    // Mark unverified bookings as cancelled (abandoned)
    if (unverifiedBookings.length > 0) {
      await prisma.booking.updateMany({
        where: {
          id: { in: unverifiedBookings.map(b => b.id) },
        },
        data: {
          isCancelled: true,
          cancelledBy: 'SYSTEM',
          cancellationReason: 'Driver marked as no-show at end of trip',
          tripId: null,
        },
      });
    }

    // Create notifications for cancelled bookings
    if (unverifiedBookings.length > 0) {
      const notifications = unverifiedBookings.map(booking => ({
        title: "Booking Cancelled",
        message: `Your shuttle booking has been cancelled as you were not present for pickup.`,
        guestId: booking.guestId,
        createdAt: new Date(),
      }));

      await prisma.notification.createMany({
        data: notifications,
      });
    }

    const message = unverifiedBookings.length > 0 
      ? `Trip completed. ${verifiedBookings.length} passengers served, ${unverifiedBookings.length} bookings cancelled due to no-show.`
      : `Trip completed successfully. ${verifiedBookings.length} passengers served.`;

    res.json({
      trip: updatedTrip,
      message,
      summary: {
        totalBookings: trip.bookings.length,
        completedBookings: verifiedBookings.length,
        cancelledBookings: unverifiedBookings.length,
      },
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
            preferredTime: 'asc',
          },
        },
      },
    });

    if (!activeTrip) {
      return res.json({ 
        currentTrip: null, 
        message: "No active trip found" 
      });
    }

    // Transform bookings to passenger format
    const passengers = activeTrip.bookings.map((booking, index) => ({
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || 'Hotel',
      dropoff: booking.dropoffLocation?.name || 'Airport',
      paymentMethod: booking.paymentMethod,
      status: booking.isVerified ? 'checked-in' : index === 0 ? 'next' : 'pending',
      seatNumber: booking.isVerified ? `A${index + 1}` : null,
      phoneNumber: booking.guest.phoneNumber,
      preferredTime: booking.preferredTime,
      isVerified: booking.isVerified,
      verifiedAt: booking.verifiedAt,
      // Include actual location coordinates
      pickupLocation: booking.pickupLocation ? {
        latitude: booking.pickupLocation.latitude,
        longitude: booking.pickupLocation.longitude,
        name: booking.pickupLocation.name
      } : null,
      dropoffLocation: booking.dropoffLocation ? {
        latitude: booking.dropoffLocation.latitude,
        longitude: booking.dropoffLocation.longitude,
        name: booking.dropoffLocation.name
      } : null,
    }));

    const totalPeople = activeTrip.bookings.reduce((sum, booking) => sum + booking.numberOfPersons, 0);
    const checkedInPeople = activeTrip.bookings
        .filter(booking => booking.isVerified)
        .reduce((sum, booking) => sum + booking.numberOfPersons, 0);
    const totalBookings = activeTrip.bookings.length;
    const checkedInBookings = activeTrip.bookings.filter(b => b.isVerified).length;
    const totalBags = activeTrip.bookings.reduce((sum, booking) => sum + booking.numberOfBags, 0);

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

// Get trip history
const getTripHistory = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { page = 1, limit = 10 } = req.query;

    console.log('Getting trip history for driver:', driverId);
    console.log('Query params:', { page, limit });

    const skip = (Number(page) - 1) * Number(limit);

    const trips = await prisma.trip.findMany({
      where: {
        driverId,
        status: TripStatus.COMPLETED,
      },
      include: {
        shuttle: true,
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
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: Number(limit),
    });

    console.log('Found trips:', trips.length);

    const totalTrips = await prisma.trip.count({
      where: {
        driverId,
        status: TripStatus.COMPLETED,
      },
    });

    console.log('Total completed trips:', totalTrips);

    const tripHistory = trips.map(trip => ({
      ...trip,
      passengerCount: trip.bookings.length,
      totalPersons: trip.bookings.reduce((sum, booking) => sum + booking.numberOfPersons, 0),
      totalBags: trip.bookings.reduce((sum, booking) => sum + booking.numberOfBags, 0),
      duration: trip.startTime && trip.endTime 
        ? Math.round((trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60)) // minutes
        : null,
    }));

    console.log('Processed trip history:', tripHistory.length);

    res.json({
      trips: tripHistory,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalTrips,
        pages: Math.ceil(totalTrips / Number(limit)),
      },
    });

  } catch (error) {
    console.error("Get trip history error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get available trips (bookings that can be started)
const getAvailableTrips = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    // Check if driver has an active schedule
    const currentSchedule = await prisma.schedule.findFirst({
      where: {
        driverId,
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
      include: {
        shuttle: true,
      },
    });

    if (!currentSchedule) {
      return res.json({
        availableTrips: [],
        message: "No active schedule found",
      });
    }

    // Get unassigned bookings grouped by direction
    const unassignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
        tripId: null,
        isCompleted: false,
        isCancelled: false,
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
        preferredTime: 'asc',
      },
    });

    // Group by booking type
    const hotelToAirport = unassignedBookings.filter(b => b.bookingType === 'HOTEL_TO_AIRPORT');
    const airportToHotel = unassignedBookings.filter(b => b.bookingType === 'AIRPORT_TO_HOTEL');

    const availableTrips = [];

    if (hotelToAirport.length > 0) {
      availableTrips.push({
        direction: 'HOTEL_TO_AIRPORT',
        bookingCount: hotelToAirport.length,
        totalPersons: hotelToAirport.reduce((sum, b) => sum + b.numberOfPersons, 0),
        totalBags: hotelToAirport.reduce((sum, b) => sum + b.numberOfBags, 0),
        earliestTime: hotelToAirport[0]?.preferredTime,
        latestTime: hotelToAirport[hotelToAirport.length - 1]?.preferredTime,
      });
    }

    if (airportToHotel.length > 0) {
      availableTrips.push({
        direction: 'AIRPORT_TO_HOTEL',
        bookingCount: airportToHotel.length,
        totalPersons: airportToHotel.reduce((sum, b) => sum + b.numberOfPersons, 0),
        totalBags: airportToHotel.reduce((sum, b) => sum + b.numberOfBags, 0),
        earliestTime: airportToHotel[0]?.preferredTime,
        latestTime: airportToHotel[airportToHotel.length - 1]?.preferredTime,
      });
    }

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

export {
  startTrip,
  endTrip,
  getCurrentTrip,
  getTripHistory,
  getAvailableTrips,
}; 