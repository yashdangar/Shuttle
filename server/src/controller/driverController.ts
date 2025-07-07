import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import prisma from "../db/prisma";
import { env } from "../config/env";
import {
  verifyQRCode,
  validateVerificationToken,
  markTokenAsUsed,
  generateEncryptionKey,
  generateQRCode,
} from "../utils/qrCodeUtils";
import { googleMapsService, type Location } from "../utils/googleMapsUtils";
import { getSignedUrlFromPath } from "../utils/s3Utils";
import { sendToUser } from "../ws/index";
import { WsEvents } from "../ws/events";
import { PaymentMethod, BookingType } from "@prisma/client";

import {
  assignBookingToTrip,
  findAvailableShuttleWithCapacity,
  checkShuttleCapacity,
  getISTDateRange,
} from "../utils/bookingUtils";

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

    // Send a welcome notification
    sendToUser(driver.id, "driver", WsEvents.WELCOME, {
      message: `Welcome back, ${driver.name}!`,
    });

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

    console.log("Getting current trip for driver:", driverId);

    // Get current active trip using the new trip system
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: "ACTIVE" as any,
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

    console.log("Active trip found:", activeTrip);

    if (!activeTrip) {
      console.log("No active trip found");
      return res.json({
        currentTrip: null,
        message: "No active trip found",
      });
    }

    // Transform bookings to passenger format
    const passengers = activeTrip.bookings.map(
      (booking: any, index: number) => ({
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
      })
    );

    console.log("Passengers found:", passengers.length);

    res.json({
      currentTrip: {
        ...activeTrip,
        passengers,
        totalPassengers: passengers.length,
        checkedInCount: passengers.filter((p: any) => p.isVerified).length,
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
    const validationResult = await validateVerificationToken(
      verificationData.token,
      driverId
    );

    // Return passenger information for confirmation
    const booking = validationResult.booking;
    const passenger = {
      id: booking.id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      persons: booking.numberOfPersons,
      bags: booking.numberOfBags,
      pickup: booking.pickupLocation?.name || "Hotel",
      dropoff: booking.dropoffLocation?.name || "Airport",
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
      message: (error as Error).message || "QR code validation failed",
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
    await markTokenAsUsed(
      token,
      driverId,
      true,
      "QR code verified and check-in confirmed"
    );

    // Get the updated booking with guest information
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: validationResult.booking.id },
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
        trip: {
          include: {
            driver: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Create notification for the guest
    await prisma.notification.create({
      data: {
        guestId: updatedBooking!.guestId,
        title: "Check-in Confirmed",
        message: `You have been successfully checked in by driver ${
          updatedBooking!.trip?.driver?.name || "the driver"
        }. Your shuttle is ready to depart.`,
      },
    });

    // Send WebSocket notification to the guest
    const guestNotificationPayload = {
      title: "✅ Check-in Confirmed!",
      message: `You have been successfully checked in by driver ${
        updatedBooking!.trip?.driver?.name || "the driver"
      }. Your shuttle is ready to depart.`,
      booking: updatedBooking,
    };

    sendToUser(
      updatedBooking!.guestId,
      "guest",
      WsEvents.DRIVER_CHECK_IN,
      guestNotificationPayload
    );

    // Return updated passenger information
    const passenger = {
      id: updatedBooking!.id,
      name: `${updatedBooking!.guest.firstName} ${
        updatedBooking!.guest.lastName
      }`,
      persons: updatedBooking!.numberOfPersons,
      bags: updatedBooking!.numberOfBags,
      pickup: updatedBooking!.pickupLocation?.name || "Hotel",
      dropoff: updatedBooking!.dropoffLocation?.name || "Airport",
      paymentMethod: updatedBooking!.paymentMethod,
      phoneNumber: updatedBooking!.guest.phoneNumber,
      preferredTime: updatedBooking!.preferredTime,
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
      message: (error as Error).message || "Check-in confirmation failed",
    });
  }
};

const getNotifications = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;

    const notifications = await prisma.notification.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
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

const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;

    // Update all unread notifications for this driver
    const result = await prisma.notification.updateMany({
      where: {
        driverId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      message: "All notifications marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateLocation = async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).user.userId;
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
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
    await updateETAForDriverBookings(driverId, {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    });

    res.json({
      success: true,
      message: "Location updated successfully",
      location: currentLocation,
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
    if (!hotelId || hotelId === "undefined" || hotelId === "null") {
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
    if (requestingUserRole === "driver" && requestingUserId !== driverId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { hours = 24 } = req.query;
    const hoursAgo = new Date(
      Date.now() - parseInt(hours as string) * 60 * 60 * 1000
    );

    const locationHistory = await prisma.locationHistory.findMany({
      where: {
        driverId,
        timestamp: {
          gte: hoursAgo,
        },
      },
      orderBy: {
        timestamp: "desc",
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
    if (userRole === "guest" && booking.guestId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (userRole === "driver") {
      const driverSchedule = booking.shuttle?.schedules.find(
        (s) => s.driverId === userId
      );
      if (!driverSchedule) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Get driver's current location
    const driverLocation =
      booking.shuttle?.schedules[0]?.driver?.currentLocation;

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

    // Always calculate ETA to pickup location (where driver will pick up the guest)
    if (booking.bookingType === "HOTEL_TO_AIRPORT") {
      destination = booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        : null;
    } else {
      destination = booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        : null;
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
    if (userRole === "guest" && booking.guestId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const driverLocation =
      booking.shuttle?.schedules[0]?.driver?.currentLocation;

    if (!driverLocation) {
      return res.json({
        tracking: {
          driverLocation: null,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          eta: booking.eta || "Not available",
          status: "Driver location not available",
        },
      });
    }

    // Get directions if Google Maps is available
    let directions = null;
    let destination: Location | null = null;

    if (booking.bookingType === "HOTEL_TO_AIRPORT") {
      destination = booking.dropoffLocation
        ? {
            latitude: booking.dropoffLocation.latitude,
            longitude: booking.dropoffLocation.longitude,
          }
        : null;
    } else {
      destination = booking.pickupLocation
        ? {
            latitude: booking.pickupLocation.latitude,
            longitude: booking.pickupLocation.longitude,
          }
        : null;
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
      },
    });
  } catch (error) {
    console.error("Get booking tracking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to update ETA for all active bookings for a driver
const updateETAForDriverBookings = async (
  driverId: number,
  driverLocation: Location
) => {
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

      // Always calculate ETA to pickup location (where driver will pick up the guest)
      if (booking.bookingType === "HOTEL_TO_AIRPORT") {
        destination = booking.pickupLocation
          ? {
              latitude: booking.pickupLocation.latitude,
              longitude: booking.pickupLocation.longitude,
            }
          : null;
      } else {
        destination = booking.pickupLocation
          ? {
              latitude: booking.pickupLocation.latitude,
              longitude: booking.pickupLocation.longitude,
            }
          : null;
      }

      if (destination) {
        const etaResult = await googleMapsService.calculateETA(
          driverLocation,
          destination
        );

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

    // Get current date in Indian Standard Time (IST)
    const { istTime, startOfDay, endOfDay } = getISTDateRange();

    console.log(
      `Driver assignment - Current IST time: ${istTime.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })}`
    );

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
        driver: true,
      },
    });

    console.log(`Found ${schedules.length} schedules for driver today`);

    // Find the currently active schedule
    let currentSchedule = null;
    for (const schedule of schedules) {
      // The schedule times are stored as UTC, so we need to compare with current UTC time
      const scheduleStartTime = new Date(schedule.startTime);
      const scheduleEndTime = new Date(schedule.endTime);
      const currentTime = new Date(); // Current time in server timezone (IST)

      // Convert current time to UTC for comparison
      const currentTimeUTC = new Date(
        currentTime.getTime() - currentTime.getTimezoneOffset() * 60 * 1000
      );

      console.log(`Schedule ${schedule.id}:`);
      console.log(`  Start time (UTC): ${scheduleStartTime.toISOString()}`);
      console.log(`  End time (UTC): ${scheduleEndTime.toISOString()}`);
      console.log(`  Current time (UTC): ${currentTimeUTC.toISOString()}`);
      console.log(`  Current time (IST): ${currentTime.toLocaleString()}`);

      if (
        currentTimeUTC >= scheduleStartTime &&
        currentTimeUTC <= scheduleEndTime
      ) {
        console.log(`✅ Schedule ${schedule.id} is currently active`);
        currentSchedule = schedule;
        break;
      } else {
        console.log(`❌ Schedule ${schedule.id} is not active`);
      }
    }

    if (!currentSchedule) {
      return res.status(400).json({
        message: "No active schedule found for driver",
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
        preferredTime: "asc",
      },
    });

    console.log(
      `Found ${unassignedBookings.length} unassigned bookings for hotel ${hotelId}`
    );

    const assignmentResults = [];

    for (const booking of unassignedBookings) {
      // Check if current shuttle has capacity, otherwise find another available shuttle
      const currentShuttleHasCapacity = await checkShuttleCapacity(
        currentSchedule.shuttleId,
        booking.numberOfPersons
      );

      let targetShuttleId = currentSchedule.shuttleId;

      if (!currentShuttleHasCapacity) {
        // Current shuttle is full, find another available shuttle
        const alternativeShuttle = await findAvailableShuttleWithCapacity(
          hotelId,
          booking.numberOfPersons
        );
        if (alternativeShuttle) {
          targetShuttleId = alternativeShuttle.id;
        } else {
          // No shuttle with capacity available
          assignmentResults.push({
            bookingId: booking.id,
            guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
            assignedTo: null,
            status: "no_available_shuttle_with_capacity",
          });
          console.log(
            `No available shuttle with capacity for booking ${booking.id}`
          );
          continue;
        }
      }

      // Use intelligent booking assignment logic
      const assignmentResult = await assignBookingToTrip(
        booking.id,
        targetShuttleId,
        hotelId
      );

      const result = {
        bookingId: booking.id,
        guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        assignedTo: {
          shuttleId: targetShuttleId,
          vehicleNumber:
            targetShuttleId === currentSchedule.shuttleId
              ? currentSchedule.shuttle.vehicleNumber
              : "Alternative Shuttle",
          driverName: currentSchedule.driver?.name || "Unknown",
        },
        status: assignmentResult.assigned
          ? "assigned_to_trip"
          : "assigned_to_shuttle",
        assignmentResult,
      };

      assignmentResults.push(result);
      console.log(`Booking ${booking.id} assignment result:`, assignmentResult);
    }

    res.json({
      message: `Processed ${unassignedBookings.length} unassigned bookings`,
      results: assignmentResults,
    });
  } catch (error) {
    console.error("Assign unassigned bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change password for driver
const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required" });
    }

    // Get driver from DB
    const driver = await prisma.driver.findUnique({
      where: { id: parseInt(userId) },
    });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, driver.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await prisma.driver.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword, updatedAt: new Date() },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Forgot password for driver
const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { email },
    });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Generate OTP
    const otpCode = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    // Always set attempts to 0 for a new OTP
    await prisma.otp.create({
      data: { email, code: otpCode, expiresAt, attempts: 0 },
    });

    // TODO: Implement sendEmail function to actually send the OTP
    // await sendEmail(email, `Your OTP is: ${otpCode}`);

    res.json({ message: "OTP sent to email (if registered)." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify OTP for driver
const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Get latest OTP for this email
    const latestOtp = await prisma.otp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!latestOtp) {
      return res
        .status(400)
        .json({ message: "No OTP found. Please request a new one." });
    }

    if (latestOtp.isUsed) {
      return res.status(400).json({ message: "OTP already used" });
    }

    if (latestOtp.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (latestOtp.code !== otp) {
      await prisma.otp.update({
        where: { id: latestOtp.id },
        data: { attempts: latestOtp.attempts + 1 },
      });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark as used and successful
    await prisma.otp.update({
      where: { id: latestOtp.id },
      data: { isUsed: true, attempts: latestOtp.attempts + 1 },
    });

    res.json({ message: "OTP verified" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reset password for driver
const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }

    // Get latest OTP for this email
    const latestOtp = await prisma.otp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!latestOtp || !latestOtp.isUsed || latestOtp.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP not verified or expired" });
    }

    // Update password for driver (if exists)
    const driver = await prisma.driver.findUnique({ where: { email } });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.driver.update({
      where: { email },
      data: { password: hashedPassword, updatedAt: new Date() },
    });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update driver profile
const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Name and phone number are required" });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Update driver profile in DB
    const updatedDriver = await prisma.driver.update({
      where: { id: parseInt(userId) },
      data: {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        updatedAt: new Date(),
      },
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

    res.json({ driver: updatedDriver });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Chat functions
const getChats = async (req: Request, res: Response) => {
  const { hotelId } = req.params;
  const userId = (req as any).user.userId;

  try {
    // Verify the driver is associated with this hotel
    const driver = await prisma.driver.findUnique({
      where: { id: userId },
      select: { hotelId: true },
    });

    if (!driver || driver.hotelId !== parseInt(hotelId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all chats for this driver in the specified hotel
    const chats = await prisma.chat.findMany({
      where: {
        driverId: userId,
        hotelId: parseInt(hotelId),
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        booking: {
          select: {
            id: true,
            numberOfPersons: true,
            numberOfBags: true,
            preferredTime: true,
            pickupLocation: {
              select: { name: true },
            },
            dropoffLocation: {
              select: { name: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the latest message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ chats });
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
};

const getChatMessages = async (req: Request, res: Response) => {
  const { hotelId, chatId } = req.params;
  const { page = 1, limit = 100 } = req.query;
  const userId = (req as any).user.userId;

  try {
    // Verify the chat belongs to this driver and hotel
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        driverId: userId,
        hotelId: parseInt(hotelId),
      },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
    });

    // Get total count for pagination
    const totalMessages = await prisma.message.count({
      where: { chatId },
    });

    res.json({
      messages: messages.reverse(), // Reverse to get chronological order
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMessages,
        totalPages: Math.ceil(totalMessages / limitNum),
      },
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

const sendMessage = async (req: Request, res: Response) => {
  const { hotelId, chatId } = req.params;
  const { content } = req.body;
  const userId = (req as any).user.userId;

  try {
    // Verify the chat belongs to this driver and hotel
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        driverId: userId,
        hotelId: parseInt(hotelId),
      },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        chatId,
        senderType: "DRIVER",
        senderId: userId,
        content: content.trim(),
      },
      include: {
        chat: {
          include: {
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Broadcast the message via WebSocket
    const { sendToChat } = await import("../ws/index");
    const { WsEvents } = await import("../ws/events");

    sendToChat(chatId, WsEvents.NEW_MESSAGE, {
      chatId,
      message: {
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        senderId: message.senderId,
        createdAt: message.createdAt.toISOString(),
      },
    });

    res.json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
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
  markAllNotificationsAsRead,
  updateLocation,
  getLocation,
  getLocationHistory,
  getBookingETA,
  getBookingTracking,
  getDebugInfo,
  assignUnassignedBookings,
  getCurrentDriverLocation,
  getHotelLocation,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updateProfile,
  getChats,
  getChatMessages,
  sendMessage,
};
