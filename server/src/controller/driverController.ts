import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { env } from "../config/env";
import { verifyQRCode, validateVerificationToken, markTokenAsUsed } from "../utils/qrCodeUtils";
import { googleMapsService, type Location } from '../utils/googleMapsUtils';

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const driver = await prisma.driver.findUnique({
      where: { email },
    });

    if (!driver) {
      console.log("No driver found");
      return res.status(401).json({ message: "Driver not found" });
    }

    const isValidPassword = await bcrypt.compare(password, driver.password);
    if (!isValidPassword) {
      console.log("Invalid password");
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: driver.id, role: "driver", hotelId: driver.hotelId },
      env.jwt.secret,
      {
        expiresIn: "24h",
      }
    );

    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const driver = await prisma.driver.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        hotelId: true,
        createdAt: true,
        hotel: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({ driver });
  } catch (error) {
    console.error("Get driver profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCurrentTrip = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    console.log('Getting current trip for driver:', driverId, 'hotel:', hotelId);

    // Get current schedule for the driver
    const currentSchedule = await prisma.schedule.findFirst({
      where: {
        driverId,
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
      include: {
        shuttle: true,
        driver: true,
      },
    });

    console.log('Current schedule found:', currentSchedule);

    // If no current schedule, try to find any active bookings for this driver
    if (!currentSchedule) {
      console.log('No current schedule found, looking for active bookings...');
      
      // Get any active bookings for this hotel that could be assigned to this driver
      const activeBookings = await prisma.booking.findMany({
        where: {
          isCompleted: false,
          isCancelled: false,
          guest: {
            hotelId: hotelId,
          },
          // Check if there's a shuttle assigned
          shuttleId: {
            not: null,
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
          shuttle: {
            include: {
              schedules: {
                where: {
                  driverId: driverId,
                },
              },
            },
          },
        },
        orderBy: {
          preferredTime: 'asc',
        },
      });

      console.log('Active bookings found:', activeBookings.length);

      // Filter bookings that have this driver assigned
      const driverBookings = activeBookings.filter(booking => 
        booking.shuttle?.schedules && booking.shuttle.schedules.length > 0
      );

      console.log('Driver bookings found:', driverBookings.length);

      if (driverBookings.length > 0) {
        // Transform bookings to passenger format
        const passengers = driverBookings.map((booking, index) => ({
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
        }));

        const firstBooking = driverBookings[0];
        
        res.json({
          currentTrip: {
            schedule: null, // No current schedule
            shuttle: firstBooking.shuttle,
            passengers,
            totalPassengers: passengers.length,
            checkedInCount: passengers.filter(p => p.isVerified).length,
            message: "Active bookings found (no current schedule)",
          },
        });
        return;
      }

      return res.json({ 
        currentTrip: null, 
        message: "No active trip found - no schedule or bookings" 
      });
    }

    // Get bookings for the current shuttle that are not completed
    const bookings = await prisma.booking.findMany({
      where: {
        shuttleId: currentSchedule.shuttleId,
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

    console.log('Bookings found for current schedule:', bookings.length);

    // Transform bookings to passenger format
    const passengers = bookings.map((booking, index) => ({
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
    }));

    res.json({
      currentTrip: {
        schedule: currentSchedule,
        shuttle: currentSchedule.shuttle,
        passengers,
        totalPassengers: passengers.length,
        checkedInCount: passengers.filter(p => p.isVerified).length,
      },
    });
  } catch (error) {
    console.error("Get current trip error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkQRCode = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;
    const driverId = (req as any).user.userId;
    console.log("QR data:", qrData);
    
    if (!qrData) {
      return res.status(400).json({ message: "QR data is required" });
    }

    // Parse and validate QR code data
    const verificationData = verifyQRCode(qrData);
    
    // Validate the verification token (but don't mark as used yet)
    const validationResult = await validateVerificationToken(verificationData.token, driverId);
    
    // Return passenger information for confirmation
    const booking = validationResult.booking;
    const passenger = {
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || 'Hotel',
      dropoff: booking.dropoffLocation?.name || 'Airport',
      paymentMethod: booking.paymentMethod,
      phoneNumber: booking.guest.phoneNumber,
      preferredTime: booking.preferredTime,
      seatNumber: `A${Math.floor(Math.random() * 12) + 1}`, // Assign random seat
      isVerified: false, // Not verified yet
      token: verificationData.token, // Include token for confirmation
    };

    res.json({
      success: true,
      message: "QR code is valid",
      passenger,
    });
  } catch (error) {
    console.error("QR check error:", error);
    res.status(400).json({ 
      success: false,
      message: (error as Error).message || "QR code validation failed" 
    });
  }
};

const confirmCheckIn = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const driverId = (req as any).user.userId;
    
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Validate the verification token again
    const validationResult = await validateVerificationToken(token, driverId);
    
    // Mark token as used and update booking
    await markTokenAsUsed(token, driverId, true, "QR code verified and check-in confirmed");

    // Return updated passenger information
    const booking = validationResult.booking;
    const passenger = {
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || 'Hotel',
      dropoff: booking.dropoffLocation?.name || 'Airport',
      paymentMethod: booking.paymentMethod,
      phoneNumber: booking.guest.phoneNumber,
      preferredTime: booking.preferredTime,
      seatNumber: `A${Math.floor(Math.random() * 12) + 1}`, // Assign random seat
      isVerified: true,
      verifiedAt: new Date(),
    };

    res.json({
      success: true,
      message: "Check-in confirmed successfully",
      passenger,
    });
  } catch (error) {
    console.error("Confirm check-in error:", error);
    res.status(400).json({ 
      success: false,
      message: (error as Error).message || "Check-in confirmation failed" 
    });
  }
};

const getNotifications = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    
    const notifications = await prisma.notification.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const driverId = (req as any).user.userId;

    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(notificationId),
        driverId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id: parseInt(notificationId) },
      data: { isRead: true },
    });

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateLocation = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    // Update or create current location
    const currentLocation = await prisma.driverLocation.upsert({
      where: { driverId },
      update: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
        timestamp: new Date(),
      },
      create: {
        driverId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
      },
    });

    // Add to location history
    await prisma.locationHistory.create({
      data: {
        driverId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        speed: speed ? parseFloat(speed) : null,
        heading: heading ? parseFloat(heading) : null,
      },
    });

    // Update driver's last location update time
    await prisma.driver.update({
      where: { id: driverId },
      data: { lastLocationUpdate: new Date() },
    });

    // Update ETA for all active bookings for this driver
    await updateETAForDriverBookings(driverId, { latitude: parseFloat(latitude), longitude: parseFloat(longitude) });

    res.json({ 
      success: true, 
      message: "Location updated successfully",
      location: currentLocation 
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    
    const location = await prisma.driverLocation.findUnique({
      where: { driverId: parseInt(driverId) },
    });

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.json({ location });
  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCurrentDriverLocation = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    
    const location = await prisma.driverLocation.findUnique({
      where: { driverId },
    });

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    res.json({ location });
  } catch (error) {
    console.error("Get current driver location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getHotelLocation = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    
    // Validate hotelId parameter
    if (!hotelId || hotelId === 'undefined' || hotelId === 'null') {
      return res.status(400).json({ message: "Hotel ID is required" });
    }

    const hotelIdNumber = parseInt(hotelId);
    if (isNaN(hotelIdNumber)) {
      return res.status(400).json({ message: "Invalid hotel ID format" });
    }
    
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelIdNumber },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
      },
    });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    if (!hotel.latitude || !hotel.longitude) {
      return res.status(400).json({ message: "Hotel location not available" });
    }

    res.json({ hotel });
  } catch (error) {
    console.error("Get hotel location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getLocationHistory = async (req: Request, res: Response) => {
  try {
    const driverId = parseInt(req.params.driverId);
    const requestingUserId = (req as any).user.userId;
    const requestingUserRole = (req as any).user.role;

    // Check if the requesting user has permission to view this driver's location history
    if (requestingUserRole === 'driver' && requestingUserId !== driverId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { hours = 24 } = req.query;
    const hoursAgo = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);

    const locationHistory = await prisma.locationHistory.findMany({
      where: {
        driverId,
        timestamp: {
          gte: hoursAgo,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    res.json({ locationHistory });
  } catch (error) {
    console.error("Get location history error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookingETA = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: {
          include: {
            schedules: {
              include: {
                driver: {
                  include: {
                    currentLocation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user has permission to view this booking's ETA
    if (userRole === 'guest' && booking.guestId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (userRole === 'driver') {
      const driverSchedule = booking.shuttle?.schedules.find(s => s.driverId === userId);
      if (!driverSchedule) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Get driver's current location
    const driverLocation = booking.shuttle?.schedules[0]?.driver?.currentLocation;
    
    if (!driverLocation) {
      return res.json({ 
        eta: "Driver location not available",
        distance: "Unknown",
        driverLocation: null,
        destination: null,
      });
    }

    // Determine destination based on booking type
    let destination: Location | null = null;
    
    if (booking.bookingType === 'HOTEL_TO_AIRPORT') {
      destination = booking.dropoffLocation ? {
        latitude: booking.dropoffLocation.latitude,
        longitude: booking.dropoffLocation.longitude,
      } : null;
    } else {
      destination = booking.pickupLocation ? {
        latitude: booking.pickupLocation.latitude,
        longitude: booking.pickupLocation.longitude,
      } : null;
    }

    if (!destination) {
      return res.json({ 
        eta: "Destination not available",
        distance: "Unknown",
        driverLocation,
        destination: null,
      });
    }

    // Calculate ETA
    const origin: Location = {
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    };

    const etaResult = await googleMapsService.calculateETA(origin, destination);

    // Update booking with new ETA
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        eta: etaResult.duration,
        lastEtaUpdate: new Date(),
      },
    });

    res.json({
      eta: etaResult.duration,
      distance: etaResult.distance,
      driverLocation,
      destination,
      lastUpdate: new Date(),
    });
  } catch (error) {
    console.error("Get booking ETA error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookingTracking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: {
          include: {
            schedules: {
              include: {
                driver: {
                  include: {
                    currentLocation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Check if user has permission to view this booking's tracking
    if (userRole === 'guest' && booking.guestId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const driverLocation = booking.shuttle?.schedules[0]?.driver?.currentLocation;
    
    if (!driverLocation) {
      return res.json({ 
        tracking: {
          driverLocation: null,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          eta: booking.eta || "Not available",
          status: "Driver location not available",
        }
      });
    }

    // Get directions if Google Maps is available
    let directions = null;
    let destination: Location | null = null;
    
    if (booking.bookingType === 'HOTEL_TO_AIRPORT') {
      destination = booking.dropoffLocation ? {
        latitude: booking.dropoffLocation.latitude,
        longitude: booking.dropoffLocation.longitude,
      } : null;
    } else {
      destination = booking.pickupLocation ? {
        latitude: booking.pickupLocation.latitude,
        longitude: booking.pickupLocation.longitude,
      } : null;
    }

    if (destination) {
      const origin: Location = {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      };
      
      directions = await googleMapsService.getDirections(origin, destination);
    }

    res.json({
      tracking: {
        driverLocation,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        eta: booking.eta || "Calculating...",
        directions,
        status: "Active",
        lastUpdate: driverLocation.timestamp,
      }
    });
  } catch (error) {
    console.error("Get booking tracking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to update ETA for all active bookings for a driver
const updateETAForDriverBookings = async (driverId: number, driverLocation: Location) => {
  try {
    // Get all active bookings for this driver
    const activeBookings = await prisma.booking.findMany({
      where: {
        shuttle: {
          schedules: {
            some: {
              driverId,
            },
          },
        },
        isCompleted: false,
        isCancelled: false,
        trackingEnabled: true,
      },
      include: {
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    // Update ETA for each booking
    for (const booking of activeBookings) {
      let destination: Location | null = null;
      
      if (booking.bookingType === 'HOTEL_TO_AIRPORT') {
        destination = booking.dropoffLocation ? {
          latitude: booking.dropoffLocation.latitude,
          longitude: booking.dropoffLocation.longitude,
        } : null;
      } else {
        destination = booking.pickupLocation ? {
          latitude: booking.pickupLocation.latitude,
          longitude: booking.pickupLocation.longitude,
        } : null;
      }

      if (destination) {
        const etaResult = await googleMapsService.calculateETA(driverLocation, destination);
        
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            eta: etaResult.duration,
            lastEtaUpdate: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error updating ETA for driver bookings:", error);
  }
};

const getDebugInfo = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    // Get all schedules for this driver
    const schedules = await prisma.schedule.findMany({
      where: { driverId },
      include: { shuttle: true },
    });

    // Get all active bookings for this hotel
    const activeBookings = await prisma.booking.findMany({
      where: {
        isCompleted: false,
        isCancelled: false,
        guest: { hotelId },
      },
      include: {
        guest: true,
        shuttle: true,
      },
    });

    // Get driver info
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { hotel: true },
    });

    res.json({
      driver,
      schedules,
      activeBookings,
      currentTime: new Date(),
    });
  } catch (error) {
    console.error("Debug info error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const assignUnassignedBookings = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    // Get current schedule for the driver
    const currentSchedule = await prisma.schedule.findFirst({
      where: {
        driverId,
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
      include: {
        shuttle: true,
        driver: true,
      },
    });

    if (!currentSchedule) {
      return res.status(400).json({ 
        message: "No active schedule found for driver" 
      });
    }

    // Find unassigned bookings for this hotel
    const unassignedBookings = await prisma.booking.findMany({
      where: {
        shuttleId: null,
        isCompleted: false,
        isCancelled: false,
        guest: {
          hotelId: hotelId,
        },
      },
      include: {
        guest: true,
      },
      orderBy: {
        preferredTime: 'asc',
      },
    });

    console.log(`Found ${unassignedBookings.length} unassigned bookings for hotel ${hotelId}`);

    const assignmentResults = [];

    for (const booking of unassignedBookings) {
      // Assign booking to the driver's current shuttle
      await prisma.booking.update({
        where: { id: booking.id },
        data: { shuttleId: currentSchedule.shuttleId },
      });
      
      const result = {
        bookingId: booking.id,
        guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        assignedTo: {
          shuttleId: currentSchedule.shuttleId,
          vehicleNumber: currentSchedule.shuttle.vehicleNumber,
          driverName: currentSchedule.driver?.name || 'Unknown',
        },
        status: 'assigned',
      };
      
      assignmentResults.push(result);
      console.log(`Booking ${booking.id} assigned to shuttle ${currentSchedule.shuttle.vehicleNumber}`);
    }

    res.json({
      message: `Assigned ${unassignedBookings.length} bookings to your shuttle`,
      results: assignmentResults,
    });
  } catch (error) {
    console.error("Assign unassigned bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  login,
  getProfile,
  getCurrentTrip,
  checkQRCode,
  confirmCheckIn,
  getNotifications,
  markNotificationAsRead,
  updateLocation,
  getLocation,
  getLocationHistory,
  getBookingETA,
  getBookingTracking,
  getDebugInfo,
  assignUnassignedBookings,
  getCurrentDriverLocation,
  getHotelLocation,
};
