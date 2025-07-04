import { Request, Response } from "express";
import prisma from "../db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { PaymentMethod, BookingType } from "@prisma/client";
import {
  generateEncryptionKey,
  generateQRCode,
  verifyQRCode,
} from "../utils/qrCodeUtils";
import { getSignedUrlFromPath } from "../utils/s3Utils";
import { sendToUser, sendToRoleInHotel } from "../ws/index";
import { WsEvents } from "../ws/events";
import { googleMapsService } from "../utils/googleMapsUtils";
import { getBookingDataForWebSocket } from "../utils/bookingUtils";
import {
  assignBookingToTrip,
  findAvailableShuttleWithCapacity,
  getISTDateRange,
} from "../utils/bookingUtils";

const getFrontdesk = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const frontdesk = await prisma.frontDesk.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        hotelId: true,
        createdAt: true,
      },
    });

    if (!frontdesk) {
      return res.status(404).json({ message: "Frontdesk not found" });
    }

    res.json({ frontdesk });
  } catch (error) {
    console.error("Get frontdesk error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const frontdesk = await prisma.frontDesk.findUnique({
      where: {
        email,
      },
    });
    if (!frontdesk) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isValidPassword = await bcrypt.compare(password, frontdesk.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: frontdesk.id, role: "frontdesk", hotelId: frontdesk.hotelId },
      env.jwt.secret,
      { expiresIn: "24h" }
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getShuttle = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;
    const shuttles = await prisma.shuttle.findMany({
      where: { hotelId: hotelId },
    });
    res.json({ shuttles });
  } catch (error) {
    console.error("Get shuttles error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getDriver = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;
    const drivers = await prisma.driver.findMany({
      where: { hotelId: hotelId },
    });
    res.json({ drivers });
  } catch (error) {
    console.error("Get drivers error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const frontdesk = await prisma.frontDesk.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        hotelId: true,
        createdAt: true,
      },
    });

    if (!frontdesk) {
      return res.status(404).json({ message: "Frontdesk user not found" });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: frontdesk.hotelId },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    res.json({ frontdesk, hotel });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Name and phone number are required" });
    }

    const frontdesk = await prisma.frontDesk.update({
      where: { id: parseInt(userId) },
      data: {
        name,
        phoneNumber,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        hotelId: true,
        createdAt: true,
      },
    });

    res.json({ frontdesk });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    const notifications = await prisma.notification.findMany({
      where: {
        frontDeskId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
    });

    res.json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    // Verify the notification belongs to the user's hotel
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        frontDeskId: userId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      select: {
        id: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
    });

    res.json({ notification: updatedNotification });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = (req as any).user.userId;
    const hotelId = (req as any).user.hotelId;

    // Verify the notification belongs to the user's hotel
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        frontDeskId: userId,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSchedule = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;

    const schedules = await prisma.schedule.findMany({
      where: {
        OR: [
          { driver: { hotelId: hotelId } },
          { shuttle: { hotelId: hotelId } },
        ],
      },
      include: {
        driver: true,
        shuttle: true,
      },
    });
    res.json({ schedules });
  } catch (error) {
    console.error("Get schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createBooking = async (req: Request, res: Response) => {
  try {
    console.log("=== CREATE BOOKING START ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const {
      numberOfPersons,
      numberOfBags,
      preferredTime,
      paymentMethod,
      tripType,
      pickupLocationId,
      dropoffLocationId,
      confirmationNum,
      isWaived,
      waiverReason,
      notes,
      isParkSleepFly,
    } = req.body;

    const hotelId = (req as any).user.hotelId;
    const frontdeskUserId = (req as any).user.userId;

    console.log(`Hotel ID: ${hotelId}`);
    console.log(`Frontdesk User ID: ${frontdeskUserId}`);
    console.log(`Number of persons: ${numberOfPersons}`);
    console.log(`Number of bags: ${numberOfBags}`);

    // Validate required fields
    if (
      !numberOfPersons ||
      !numberOfBags ||
      !preferredTime ||
      !paymentMethod ||
      !tripType
    ) {
      console.log("Missing required fields");
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // Validate number of persons
    if (numberOfPersons <= 0 || numberOfPersons > 50) {
      console.log(`Invalid number of persons: ${numberOfPersons}`);
      return res.status(400).json({
        message: "Number of persons must be between 1 and 50",
      });
    }

    // Validate number of bags
    if (numberOfBags < 0 || numberOfBags > 20) {
      console.log(`Invalid number of bags: ${numberOfBags}`);
      return res.status(400).json({
        message: "Number of bags must be between 0 and 20",
      });
    }

    // Validate payment method
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      console.log(`Invalid payment method: ${paymentMethod}`);
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    // Validate trip type
    if (!Object.values(BookingType).includes(tripType)) {
      console.log(`Invalid trip type: ${tripType}`);
      return res.status(400).json({
        message: "Invalid trip type",
      });
    }

    // Generate encryption key for QR code
    const encryptionKey = generateEncryptionKey();

    console.log("Generating encryption key:", encryptionKey);

    // Create booking data
    const bookingData: any = {
      numberOfPersons: numberOfPersons ? parseInt(numberOfPersons) : 1,
      numberOfBags: numberOfBags ? parseInt(numberOfBags) : 0,
      preferredTime: new Date(preferredTime),
      paymentMethod: paymentMethod as PaymentMethod,
      bookingType: (tripType === "HOTEL_TO_AIRPORT"
        ? "HOTEL_TO_AIRPORT"
        : "AIRPORT_TO_HOTEL") as BookingType,
      pickupLocationId: pickupLocationId ? parseInt(pickupLocationId) : null,
      dropoffLocationId: dropoffLocationId ? parseInt(dropoffLocationId) : null,
      guestId: 1, // Default guest ID for frontdesk bookings
      confirmationNum: confirmationNum || null,
      encryptionKey,
      needsFrontdeskVerification: false, // Frontdesk bookings don't need verification
      isVerified: true, // Mark as verified since frontdesk created it
      verifiedBy: frontdeskUserId,
      verifiedAt: new Date(),
      isPaid: paymentMethod === "FRONTDESK" ? true : false, // Mark as paid if frontdesk payment
      notes: notes || null, // Add notes field
      // TEMP: Use old field until schema migration is done
      isPaySleepFly: isParkSleepFly || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Booking data prepared:", JSON.stringify(bookingData, null, 2));

    // Add waiver data if booking is waived
    if (isWaived) {
      bookingData.isWaived = true;
      bookingData.waiverReason = waiverReason;
      bookingData.waivedBy = frontdeskUserId;
      bookingData.waivedAt = new Date();
      bookingData.isPaid = true; // Mark as paid since it's waived
      bookingData.paymentMethod = "FRONTDESK"; // Set payment method for waived bookings
      bookingData.needsFrontdeskVerification = false; // No admin verification needed for waived bookings
    }

    console.log("Final booking data:", JSON.stringify(bookingData, null, 2));

    // Create the booking
    console.log("Creating booking in database...");
    const booking = await prisma.booking.create({
      data: bookingData,
    });

    console.log("Booking created successfully:", booking.id);

    // Find an available shuttle for this hotel with capacity
    console.log(
      `Looking for available shuttle with capacity for ${numberOfPersons} passengers...`
    );
    const availableShuttle = await findAvailableShuttleWithCapacity(
      hotelId,
      numberOfPersons
    );

    console.log(
      "Available shuttle result:",
      availableShuttle
        ? {
            id: availableShuttle.id,
            vehicleNumber: availableShuttle.vehicleNumber,
            seats: availableShuttle.seats,
          }
        : "No shuttle found"
    );

    let assignmentResult = null;

    if (availableShuttle) {
      // Use intelligent booking assignment logic
      console.log(
        `Assigning booking ${booking.id} to shuttle ${availableShuttle.id}...`
      );
      assignmentResult = await assignBookingToTrip(
        booking.id,
        availableShuttle.id,
        hotelId
      );

      console.log("Assignment result:", assignmentResult);
    } else {
      console.log(
        `No available shuttle with capacity found for hotel ${hotelId}, booking ${booking.id} remains unassigned`
      );
    }

    // Generate QR code
    console.log("Generating QR code...");
    const qrCodeData = await generateQRCode({
      bookingId: booking.id,
      guestId: booking.guestId,
      preferredTime: booking.preferredTime?.toISOString() || "",
      encryptionKey: booking.encryptionKey!,
    });

    console.log("QR code generated successfully");

    // Update booking with QR code data
    console.log("Updating booking with QR code data...");
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { qrCodePath: qrCodeData },
      include: {
        guest: true,
        shuttle: true,
      },
    });

    console.log("Booking updated with QR code");

    console.log("=== CREATE BOOKING SUCCESS ===");
    console.log("Final booking:", {
      id: updatedBooking.id,
      numberOfPersons: updatedBooking.numberOfPersons,
      shuttleId: updatedBooking.shuttleId,
      assignmentResult: assignmentResult,
    });

    res.json({
      booking: updatedBooking,
      assignmentResult,
    });
  } catch (error) {
    console.error("=== CREATE BOOKING ERROR ===");
    console.error("Create booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getLocations = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;
    if (!hotelId) {
      return res.json({ locations: [] });
    }
    const hotelLocations = await prisma.hotelLocation.findMany({
      where: { hotelId },
      include: { location: true },
      orderBy: { id: "asc" },
    });
    // Map to only id and name from the joined location
    const locations = hotelLocations.map((hl) => ({
      id: hl.location.id,
      name: hl.location.name,
    }));
    res.json({ locations });
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add new endpoint for QR code verification
const verifyBookingQR = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;
    const hotelId = (req as any).user.hotelId;

    // Verify QR code data (now returns QRVerificationData with token)
    const verificationData = verifyQRCode(qrData);

    // Find the verification token in database
    const verificationToken = await prisma.qRVerificationToken.findUnique({
      where: { token: verificationData.token },
      include: {
        booking: {
          include: {
            guest: {
              include: {
                hotel: true,
              },
            },
            pickupLocation: true,
            dropoffLocation: true,
          },
        },
      },
    });

    if (!verificationToken) {
      return res.status(404).json({ message: "Invalid QR code" });
    }

    // Check if token has expired
    if (verificationToken.expiresAt < new Date()) {
      return res.status(400).json({ message: "QR code has expired" });
    }

    // Check if token has already been used
    if (verificationToken.isUsed) {
      return res.status(400).json({ message: "QR code has already been used" });
    }

    // Verify booking belongs to the hotel
    if (verificationToken.booking.guest.hotelId !== hotelId) {
      return res
        .status(403)
        .json({ message: "Not authorized to verify this booking" });
    }

    // Check if booking is valid
    if (verificationToken.booking.isCancelled) {
      return res.status(400).json({ message: "Booking is cancelled" });
    }

    if (verificationToken.booking.isCompleted) {
      return res.status(400).json({ message: "Booking is already completed" });
    }

    if (verificationToken.booking.isVerified) {
      return res.status(400).json({ message: "Booking is already verified" });
    }

    res.json({
      booking: verificationToken.booking,
      isValid: true,
      message: "QR code verified successfully",
    });
  } catch (error) {
    console.error("Verify QR code error:", error);
    res.status(500).json({ message: "Invalid QR code" });
  }
};

const getSignedUrl = async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    const hotelId = (req as any).user.hotelId;

    if (!path) {
      return res.status(400).json({ message: "Path is required" });
    }

    const bookingId = path.split("/")[1];
    if (!bookingId) {
      return res.status(400).json({ message: "Invalid path format" });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        guest: {
          hotelId: hotelId,
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const signedUrl = await getSignedUrlFromPath(path);
    res.json({ signedUrl });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookingQRUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hotelId = (req as any).user.hotelId;

    // Validate that booking ID is provided
    if (!id) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        guest: {
          hotelId: hotelId,
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!booking.qrCodePath) {
      return res.status(404).json({ message: "QR code not found" });
    }

    const signedUrl = await getSignedUrlFromPath(booking.qrCodePath);
    res.json({ signedUrl });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookingDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const hotelId = (req as any).user.hotelId;

  // Validate that booking ID is provided
  if (!id) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        id,
        guest: {
          hotelId: hotelId,
        },
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            isNonResident: true,
          },
        },
        pickupLocation: {
          select: {
            name: true,
          },
        },
        dropoffLocation: {
          select: {
            name: true,
          },
        },
        shuttle: {
          select: {
            id: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    let qrCodeUrl = null;
    if (booking.qrCodePath) {
      qrCodeUrl = await getSignedUrlFromPath(booking.qrCodePath);
    }

    res.json({ booking: { ...booking, qrCodeUrl } });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookings = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;

    const bookings = await prisma.booking.findMany({
      where: {
        guest: {
          hotelId: hotelId,
        },
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            isNonResident: true,
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: true,
      },
      orderBy: {
        preferredTime: "desc",
      },
    });

    res.json({ bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cancelBooking = async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const { reason } = req.body;
  const frontdeskId = (req as any).user.userId;

  // Validate that booking ID is provided
  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        trip: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isCancelled: true,
        cancelledBy: "FRONTDESK",
        cancellationReason: reason,
      },
    });

    const notificationPayload = {
      title: "Booking Cancelled by Front Desk",
      message: `Your booking #${booking.id.substring(
        0,
        8
      )} has been cancelled by the front desk.`,
      booking: updatedBooking,
    };

    // Notify the guest that their booking has been cancelled
    await prisma.notification.create({
      data: {
        guestId: booking.guestId,
        title: "Booking Cancelled by Front Desk",
        message: `Your booking #${booking.id.substring(
          0,
          8
        )} has been cancelled by the front desk.`,
      },
    });

    // Notify the guest via WebSocket
    const guestNotificationPayload = {
      title: "Booking Cancelled",
      message: `Your booking has been cancelled by the frontdesk.`,
      booking: updatedBooking,
    };
    sendToUser(
      booking.guestId,
      "guest",
      "booking_cancelled",
      guestNotificationPayload
    );

    // Notify the assigned driver, if any
    const driverId = booking.trip?.driverId;
    if (driverId) {
      sendToUser(
        driverId,
        "driver",
        WsEvents.BOOKING_CANCELLED,
        notificationPayload
      );
    }

    // Notify other frontdesk users about the booking update
    const bookingUpdatePayload = {
      title: "Booking Cancelled",
      message: `Booking #${booking.id.substring(
        0,
        8
      )} has been cancelled by frontdesk.`,
      booking: updatedBooking,
    };
    if (booking.guest.hotelId) {
      // Fetch the complete booking with guest information for the WebSocket event
      const completeBooking = await getBookingDataForWebSocket(
        updatedBooking.id,
        updatedBooking
      );

      const completeNotificationPayload = {
        title: "Booking Cancelled",
        message: `Booking #${booking.id.substring(
          0,
          8
        )} has been cancelled by frontdesk.`,
        booking: completeBooking,
      };

      sendToRoleInHotel(
        booking.guest.hotelId,
        "frontdesk",
        WsEvents.BOOKING_UPDATED,
        completeNotificationPayload
      );
    }

    res.json({
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const rescheduleBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { preferredTime } = req.body;
    const hotelId = (req as any).user.hotelId;

    // Validate that booking ID is provided
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    // Check if booking exists and belongs to the hotel
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        guest: {
          hotelId: hotelId,
        },
      },
      include: {
        guest: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if booking can be rescheduled (not completed, not cancelled)
    if (booking.isCompleted) {
      return res
        .status(400)
        .json({ error: "Cannot reschedule a completed booking" });
    }

    if (booking.isCancelled) {
      return res
        .status(400)
        .json({ error: "Cannot reschedule a cancelled booking" });
    }

    // Validate the new preferred time
    if (!preferredTime) {
      return res.status(400).json({ error: "Preferred time is required" });
    }

    const newPreferredTime = new Date(preferredTime);
    if (isNaN(newPreferredTime.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Check if the new time is in the future (allow 1 minute buffer)
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60000); // Add 1 minute
    if (newPreferredTime <= oneMinuteFromNow) {
      return res.status(400).json({
        error: "Preferred time must be at least 1 minute in the future",
        newTime: newPreferredTime.toISOString(),
        currentTime: now.toISOString(),
      });
    }

    // Update the booking with new preferred time
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        preferredTime: newPreferredTime,
        updatedAt: new Date(),
      },
    });

    // Notify other frontdesk users about the booking update
    const bookingUpdatePayload = {
      title: "Booking Rescheduled",
      message: `Booking #${booking.id.substring(
        0,
        8
      )} has been rescheduled to ${newPreferredTime.toLocaleString()}.`,
      booking: updatedBooking,
    };
    if (booking.guest.hotelId) {
      // Fetch the complete booking with guest information for the WebSocket event
      const completeBooking = await getBookingDataForWebSocket(
        updatedBooking.id,
        updatedBooking
      );

      const completeNotificationPayload = {
        title: "Booking Rescheduled",
        message: `Booking #${booking.id.substring(
          0,
          8
        )} has been rescheduled to ${newPreferredTime.toLocaleString()}.`,
        booking: completeBooking,
      };

      sendToRoleInHotel(
        booking.guest.hotelId,
        "frontdesk",
        WsEvents.BOOKING_UPDATED,
        completeNotificationPayload
      );
    }

    res.json({
      message: "Booking rescheduled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    res.status(500).json({ error: "Failed to reschedule booking" });
  }
};

const assignUnassignedBookings = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;

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
      // Find an available shuttle for this hotel with capacity
      const availableShuttle = await findAvailableShuttleWithCapacity(
        hotelId,
        booking.numberOfPersons
      );

      if (availableShuttle) {
        // Use intelligent booking assignment logic
        const assignmentResult = await assignBookingToTrip(
          booking.id,
          availableShuttle.id,
          hotelId
        );

        const result = {
          bookingId: booking.id,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          assignedTo: {
            shuttleId: availableShuttle.id,
            vehicleNumber: availableShuttle.vehicleNumber,
            driverName:
              availableShuttle.schedules[0]?.driver?.name || "Unknown",
          },
          status: assignmentResult.assigned
            ? "assigned_to_trip"
            : "assigned_to_shuttle",
          assignmentResult,
        };

        assignmentResults.push(result);
        console.log(
          `Booking ${booking.id} assignment result:`,
          assignmentResult
        );
      } else {
        assignmentResults.push({
          bookingId: booking.id,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          assignedTo: null,
          status: "no_available_shuttle_with_capacity",
        });
        console.log(
          `No available shuttle with capacity for booking ${booking.id}`
        );
      }
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

// Debug endpoint to check guests in database
const debugGuests = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;
    const { email } = req.query;

    let whereClause: any = { hotelId };
    if (email) {
      whereClause.email = email;
    }

    const guests = await prisma.guest.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        hotelId: true,
        isNonResident: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      hotelId,
      searchEmail: email,
      totalGuests: guests.length,
      guests,
    });
  } catch (error) {
    console.error("Debug guests error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Public debug endpoint (no auth required)
const publicDebugGuests = async (req: Request, res: Response) => {
  try {
    const { email, hotelId } = req.query;

    let whereClause: any = {};
    if (email) {
      whereClause.email = email;
    }
    if (hotelId) {
      whereClause.hotelId = parseInt(hotelId as string);
    }

    const guests = await prisma.guest.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        hotelId: true,
        isNonResident: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      searchEmail: email,
      searchHotelId: hotelId,
      totalGuests: guests.length,
      guests,
    });
  } catch (error) {
    console.error("Public debug guests error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getScheduleByWeek = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;
    const { weekOffset = 0 } = req.query; // 0 = current week, -1 = prev week, 1 = next week

    // Calculate the week start (Monday) using UTC
    const today = new Date();
    const currentWeekStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

    const day = currentWeekStart.getUTCDay();
    const diff = currentWeekStart.getUTCDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setUTCDate(diff);

    // Apply week offset
    const targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setUTCDate(
      targetWeekStart.getUTCDate() + parseInt(weekOffset as string) * 7
    );

    const targetWeekEnd = new Date(targetWeekStart);
    targetWeekEnd.setUTCDate(targetWeekEnd.getUTCDate() + 6);
    targetWeekEnd.setUTCHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany({
      where: {
        scheduleDate: {
          gte: targetWeekStart,
          lte: targetWeekEnd,
        },
        // Ensure schedules belong to the frontdesk's hotel
        OR: [
          { driver: { hotelId: hotelId } },
          { shuttle: { hotelId: hotelId } },
        ],
      },
      include: {
        driver: true,
        shuttle: true,
      },
      orderBy: {
        scheduleDate: "asc",
      },
    });

    res.json({
      schedules,
      weekInfo: {
        weekStart: targetWeekStart.toISOString(),
        weekEnd: targetWeekEnd.toISOString(),
        weekOffset: parseInt(weekOffset as string),
        isCurrentWeek: parseInt(weekOffset as string) === 0,
      },
    });
  } catch (error) {
    console.error("Get schedule by week error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addSchedule = async (req: Request, res: Response) => {
  try {
    const { driverId, shuttleId, scheduleDate, startTime, endTime } = req.body;
    const hotelId = (req as any).user.hotelId;

    // Security Check: Verify driver and shuttle belong to the hotel
    const driver = await prisma.driver.findFirst({
      where: { id: parseInt(driverId), hotelId },
    });
    const shuttle = await prisma.shuttle.findFirst({
      where: { id: parseInt(shuttleId), hotelId },
    });
    if (!driver || !shuttle) {
      return res
        .status(403)
        .json({ message: "Driver or shuttle does not belong to this hotel" });
    }

    const dateOnly = new Date(scheduleDate);
    dateOnly.setUTCHours(0, 0, 0, 0);

    // Check if a schedule already exists for this driver on this date
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        driverId: parseInt(driverId),
        scheduleDate: dateOnly,
      },
      include: {
        driver: true,
        shuttle: true,
      },
    });

    if (existingSchedule) {
      return res.status(400).json({
        message: `Driver ${
          existingSchedule.driver.name
        } already has a schedule for ${dateOnly.toDateString()}. Please edit the existing schedule instead.`,
        existingSchedule,
      });
    }

    const schedule = await prisma.schedule.create({
      data: {
        driverId: parseInt(driverId),
        shuttleId: parseInt(shuttleId),
        scheduleDate: dateOnly,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      include: { driver: true, shuttle: true },
    });
    res.json({ schedule });
  } catch (error) {
    console.error("Add schedule error:", error);

    // Handle Prisma unique constraint violation
    if ((error as any).code === "P2002") {
      return res.status(400).json({
        message:
          "A schedule already exists for this driver on the selected date.",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

const editSchedule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { driverId, shuttleId, scheduleDate, startTime, endTime } = req.body;
    const hotelId = (req as any).user.hotelId;

    // Security Check: Verify the schedule being edited belongs to the hotel
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: parseInt(id),
        OR: [{ driver: { hotelId } }, { shuttle: { hotelId } }],
      },
    });
    if (!existingSchedule) {
      return res.status(403).json({
        message: "Schedule not found or does not belong to this hotel",
      });
    }

    // Security Check: Verify new driver/shuttle belong to the hotel
    const driver = await prisma.driver.findFirst({
      where: { id: parseInt(driverId), hotelId },
    });
    const shuttle = await prisma.shuttle.findFirst({
      where: { id: parseInt(shuttleId), hotelId },
    });
    if (!driver || !shuttle) {
      return res.status(403).json({
        message: "New driver or shuttle does not belong to this hotel",
      });
    }

    const dateOnly = new Date(scheduleDate);
    dateOnly.setUTCHours(0, 0, 0, 0);

    const schedule = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: {
        driverId: parseInt(driverId),
        shuttleId: parseInt(shuttleId),
        scheduleDate: dateOnly,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      include: { driver: true, shuttle: true },
    });
    res.json({ schedule });
  } catch (error) {
    console.error("Edit schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const hotelId = (req as any).user.hotelId;

    // Security Check: Verify the schedule being deleted belongs to the hotel
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: parseInt(id),
        OR: [{ driver: { hotelId } }, { shuttle: { hotelId } }],
      },
    });
    if (!schedule) {
      return res.status(403).json({
        message: "Schedule not found or does not belong to this hotel",
      });
    }

    await prisma.schedule.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Delete schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { driverId, shuttleId, startDate, weekSchedule } = req.body;
    const hotelId = (req as any).user.hotelId;

    // Security Check: Verify driver and shuttle belong to the hotel
    const driver = await prisma.driver.findFirst({
      where: { id: parseInt(driverId), hotelId },
    });
    const shuttle = await prisma.shuttle.findFirst({
      where: { id: parseInt(shuttleId), hotelId },
    });
    if (!driver || !shuttle) {
      return res
        .status(403)
        .json({ message: "Driver or shuttle does not belong to this hotel" });
    }

    if (!weekSchedule) {
      return res
        .status(400)
        .json({ message: "Week schedule data is required" });
    }

    const schedules = [];
    const weekStart = new Date(startDate);
    weekStart.setUTCHours(0, 0, 0, 0);

    // Check for existing schedules for this driver in the week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const existingSchedules = await prisma.schedule.findMany({
      where: {
        driverId: parseInt(driverId),
        scheduleDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        driver: true,
      },
    });

    if (existingSchedules.length > 0) {
      const existingDates = existingSchedules
        .map((s) => s.scheduleDate.toDateString())
        .join(", ");
      return res.status(400).json({
        message: `Driver ${existingSchedules[0].driver.name} already has schedules for the following dates: ${existingDates}. Please edit existing schedules or choose a different week.`,
        existingSchedules,
      });
    }

    const dayKeys = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    // Expect weekSchedule[dayKey] to have startUtc and endUtc (UTC ISO strings)
    for (let i = 0; i < 7; i++) {
      const dayKey = dayKeys[i];
      const dayData = weekSchedule[dayKey];

      if (dayData && dayData.enabled) {
        // Use startUtc and endUtc directly from frontend
        const startTime = dayData.startUtc || dayData.startTime; // fallback for legacy
        const endTime = dayData.endUtc || dayData.endTime;
        if (!startTime || !endTime) continue;
        const scheduleDate = new Date(weekStart);
        scheduleDate.setUTCDate(scheduleDate.getUTCDate() + i);
        scheduleDate.setUTCHours(0, 0, 0, 0);
        const schedule = await prisma.schedule.create({
          data: {
            driverId: parseInt(driverId),
            shuttleId: parseInt(shuttleId),
            scheduleDate: scheduleDate,
            startTime: new Date(startTime), // UTC
            endTime: new Date(endTime), // UTC
          },
          include: { driver: true, shuttle: true },
        });
        schedules.push(schedule);
      }
    }

    res.json({
      schedules,
      message: `Created ${schedules.length} schedules for the week`,
    });
  } catch (error) {
    console.error("Add weekly schedule error:", error);

    // Handle Prisma unique constraint violation
    if ((error as any).code === "P2002") {
      return res.status(400).json({
        message:
          "One or more schedules already exist for this driver on the selected dates.",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify guest booking and assign to shuttle
const verifyGuestBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const hotelId = (req as any).user.hotelId;
    const frontdeskId = (req as any).user.userId;

    // Validate that booking ID is provided
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    // Find the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        guest: {
          hotelId: hotelId,
        },
        needsFrontdeskVerification: true,
        isCancelled: false,
      },
      include: {
        guest: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found or already verified/cancelled",
      });
    }

    // Find an available shuttle for this hotel with capacity
    const availableShuttle = await findAvailableShuttleWithCapacity(
      hotelId,
      booking.numberOfPersons
    );

    if (!availableShuttle) {
      return res.status(400).json({
        message: "No available shuttle with capacity found for this booking",
      });
    }

    // Use intelligent booking assignment logic
    const assignmentResult = await assignBookingToTrip(
      bookingId,
      availableShuttle.id,
      hotelId
    );

    // Update booking: verify it and mark as verified
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        needsFrontdeskVerification: false,
      },
      include: {
        guest: true,
        shuttle: {
          include: {
            schedules: {
              include: {
                driver: true,
              },
            },
          },
        },
      },
    });

    // Create notification message based on assignment result
    let notificationMessage = `Your booking has been verified by the frontdesk and assigned to shuttle ${availableShuttle.vehicleNumber}.`;
    if (assignmentResult.assigned) {
      notificationMessage += ` It has been added to the current active trip.`;
    } else if (assignmentResult.shuttleAssigned) {
      notificationMessage += ` It will be included in the next available trip.`;
    }

    // Notify the guest that their booking has been verified
    await prisma.notification.create({
      data: {
        guestId: booking.guestId,
        title: "Booking Verified",
        message: notificationMessage,
      },
    });

    // Notify the guest via WebSocket
    const guestNotificationPayload = {
      title: "Booking Verified",
      message: notificationMessage,
      booking: updatedBooking,
      assignmentResult,
    };
    sendToUser(
      booking.guestId,
      "guest",
      WsEvents.BOOKING_VERIFIED,
      guestNotificationPayload
    );

    // Notify other frontdesk users about the booking update
    const bookingUpdatePayload = {
      title: "Booking Verified",
      message: `Booking #${booking.id.substring(
        0,
        8
      )} has been verified and assigned to shuttle ${
        availableShuttle.vehicleNumber
      }.`,
      booking: updatedBooking,
      assignmentResult,
    };
    if (booking.guest.hotelId) {
      // Fetch the complete booking with guest information for the WebSocket event
      const completeBooking = await getBookingDataForWebSocket(
        updatedBooking.id,
        updatedBooking
      );

      const completeNotificationPayload = {
        title: "Booking Verified",
        message: `Booking #${booking.id.substring(
          0,
          8
        )} has been verified and assigned to shuttle ${
          availableShuttle.vehicleNumber
        }.`,
        booking: completeBooking,
        assignmentResult,
      };

      sendToRoleInHotel(
        booking.guest.hotelId,
        "frontdesk",
        WsEvents.BOOKING_UPDATED,
        completeNotificationPayload
      );
    }

    // Notify the assigned driver about the new booking
    const driverId = availableShuttle.schedules[0]?.driverId;
    if (driverId) {
      let driverMessage = `A new booking has been assigned to your shuttle ${availableShuttle.vehicleNumber}.`;
      if (assignmentResult.assigned) {
        driverMessage += ` It has been added to your current active trip.`;
      } else if (assignmentResult.shuttleAssigned) {
        driverMessage += ` It will be included in your next trip.`;
      }

      const driverNotificationPayload = {
        title: "New Booking Assigned",
        message: driverMessage,
        booking: updatedBooking,
        assignmentResult,
      };
      sendToUser(
        driverId,
        "driver",
        WsEvents.BOOKING_ASSIGNED,
        driverNotificationPayload
      );
    }

    res.json({
      message: "Booking verified and assigned to shuttle successfully",
      booking: updatedBooking,
      assignmentResult,
      assignedShuttle: {
        id: availableShuttle.id,
        vehicleNumber: availableShuttle.vehicleNumber,
        driverName: availableShuttle.schedules[0]?.driver?.name || "Unknown",
      },
    });
  } catch (error) {
    console.error("Verify guest booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reject guest booking
const rejectGuestBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const hotelId = (req as any).user.hotelId;
    const frontdeskId = (req as any).user.userId;

    // Validate that booking ID is provided
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    // Find the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        guest: {
          hotelId: hotelId,
        },
        needsFrontdeskVerification: true,
        isCancelled: false,
      },
      include: {
        guest: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found or already verified/cancelled",
      });
    }

    // Cancel the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isCancelled: true,
        cancelledBy: "FRONTDESK",
        cancellationReason: reason || "Rejected by frontdesk",
        needsFrontdeskVerification: false,
      },
    });

    // Notify the guest that their booking has been rejected
    await prisma.notification.create({
      data: {
        guestId: booking.guestId,
        title: "Booking Rejected",
        message: `Your booking has been rejected by the frontdesk. Reason: ${
          reason || "No reason provided."
        }`,
      },
    });

    // Notify the guest via WebSocket
    const guestNotificationPayload = {
      title: "Booking Rejected",
      message: `Your booking has been rejected by the frontdesk. Reason: ${
        reason || "No reason provided."
      }`,
      booking: updatedBooking,
    };
    sendToUser(
      booking.guestId,
      "guest",
      "booking_cancelled",
      guestNotificationPayload
    );

    // Notify other frontdesk users about the booking update
    const bookingUpdatePayload = {
      title: "Booking Rejected",
      message: `Booking #${booking.id.substring(
        0,
        8
      )} has been rejected by frontdesk.`,
      booking: updatedBooking,
    };
    if (booking.guest.hotelId) {
      // Fetch the complete booking with guest information for the WebSocket event
      const completeBooking = await getBookingDataForWebSocket(
        updatedBooking.id,
        updatedBooking
      );

      const completeNotificationPayload = {
        title: "Booking Rejected",
        message: `Booking #${booking.id.substring(
          0,
          8
        )} has been rejected by frontdesk.`,
        booking: completeBooking,
      };

      sendToRoleInHotel(
        booking.guest.hotelId,
        "frontdesk",
        WsEvents.BOOKING_UPDATED,
        completeNotificationPayload
      );
    }

    res.json({
      message: "Booking rejected successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Reject guest booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Test endpoint to check shuttle capacity
const getShuttleCapacityStatus = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;

    // Get current date in Indian Standard Time (IST)
    const { istTime, startOfDay, endOfDay } = getISTDateRange();

    console.log(
      `Capacity status check - Current IST time: ${istTime.toLocaleString(
        "en-IN",
        { timeZone: "Asia/Kolkata" }
      )}`
    );

    // Get all shuttles for this hotel with schedules for today
    const shuttles = await prisma.shuttle.findMany({
      where: {
        hotelId: hotelId,
        schedules: {
          some: {
            scheduleDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
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
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
            // Include all bookings assigned to this shuttle, whether they have a tripId or not
          },
        },
      },
    });

    const capacityStatus = shuttles.map((shuttle) => {
      // Check if any schedule is currently active
      let hasActiveSchedule = false;
      let activeDriver = null;

      for (const schedule of shuttle.schedules) {
        // The schedule times are stored as UTC, so we need to compare with current UTC time
        const scheduleStartTime = new Date(schedule.startTime);
        const scheduleEndTime = new Date(schedule.endTime);
        const currentTime = new Date(); // Current time in server timezone (IST)

        // Convert current time to UTC for comparison
        const currentTimeUTC = new Date(
          currentTime.getTime() - currentTime.getTimezoneOffset() * 60 * 1000
        );

        if (
          currentTimeUTC >= scheduleStartTime &&
          currentTimeUTC <= scheduleEndTime
        ) {
          hasActiveSchedule = true;
          activeDriver = schedule.driver;
          break;
        }
      }

      const currentPassengers = shuttle.bookings.reduce(
        (sum, booking) => sum + booking.numberOfPersons,
        0
      );

      return {
        shuttleId: shuttle.id,
        vehicleNumber: shuttle.vehicleNumber,
        totalSeats: shuttle.seats,
        currentPassengers,
        availableSeats: shuttle.seats - currentPassengers,
        utilization: Math.round((currentPassengers / shuttle.seats) * 100),
        driver: activeDriver?.name || "No active driver",
        isAvailable: hasActiveSchedule && shuttle.seats - currentPassengers > 0,
        hasActiveSchedule,
      };
    });

    res.json({
      shuttles: capacityStatus,
      totalShuttles: shuttles.length,
      availableShuttles: capacityStatus.filter((s) => s.isAvailable).length,
      activeSchedules: capacityStatus.filter((s) => s.hasActiveSchedule).length,
      currentTime: istTime.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    });
  } catch (error) {
    console.error("Get shuttle capacity status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Debug endpoint to show detailed booking information
const debugShuttleBookings = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;
    const { shuttleId } = req.params;

    const shuttle = await prisma.shuttle.findFirst({
      where: {
        id: parseInt(shuttleId),
        hotelId: hotelId,
      },
      include: {
        bookings: {
          where: {
            isCompleted: false,
            isCancelled: false,
          },
          include: {
            guest: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!shuttle) {
      return res.status(404).json({ message: "Shuttle not found" });
    }

    const currentPassengers = shuttle.bookings.reduce(
      (sum, booking) => sum + booking.numberOfPersons,
      0
    );

    const bookingDetails = shuttle.bookings.map((booking) => ({
      bookingId: booking.id,
      guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      numberOfPersons: booking.numberOfPersons,
      tripId: booking.tripId,
      isAssignedToTrip: booking.tripId !== null,
      createdAt: booking.createdAt,
    }));

    res.json({
      shuttle: {
        id: shuttle.id,
        vehicleNumber: shuttle.vehicleNumber,
        totalSeats: shuttle.seats,
        currentPassengers,
        availableSeats: shuttle.seats - currentPassengers,
        utilization: Math.round((currentPassengers / shuttle.seats) * 100),
      },
      bookings: bookingDetails,
      totalBookings: shuttle.bookings.length,
    });
  } catch (error) {
    console.error("Debug shuttle bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Debug endpoint to check schedule data
const debugSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const hotelId = (req as any).user.hotelId;

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: parseInt(scheduleId),
        OR: [{ driver: { hotelId } }, { shuttle: { hotelId } }],
      },
      include: {
        driver: true,
        shuttle: true,
      },
    });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json({
      schedule: {
        id: schedule.id,
        driverId: schedule.driverId,
        shuttleId: schedule.shuttleId,
        scheduleDate: schedule.scheduleDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        startTimeISO: schedule.startTime.toISOString(),
        endTimeISO: schedule.endTime.toISOString(),
        startTimeLocal: schedule.startTime.toLocaleString(),
        endTimeLocal: schedule.endTime.toLocaleString(),
        driver: schedule.driver,
        shuttle: schedule.shuttle,
      },
      rawData: {
        startTimeRaw: schedule.startTime,
        endTimeRaw: schedule.endTime,
        startTimeType: typeof schedule.startTime,
        endTimeType: typeof schedule.endTime,
      },
    });
  } catch (error) {
    console.error("Debug schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Debug endpoint to check all schedules for a shuttle
const debugShuttleSchedules = async (req: Request, res: Response) => {
  try {
    const { shuttleId } = req.params;
    const hotelId = (req as any).user.hotelId;

    // Get current date in IST
    const { istTime, startOfDay, endOfDay } = getISTDateRange();

    const shuttle = await prisma.shuttle.findFirst({
      where: {
        id: parseInt(shuttleId),
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

    if (!shuttle) {
      return res.status(404).json({ message: "Shuttle not found" });
    }

    // Check each schedule for active status
    const schedulesWithStatus = shuttle.schedules.map((schedule) => {
      const scheduleStartTime = new Date(schedule.startTime);
      const scheduleEndTime = new Date(schedule.endTime);
      const currentTime = new Date();
      const currentTimeUTC = new Date(
        currentTime.getTime() - currentTime.getTimezoneOffset() * 60 * 1000
      );

      const isActive =
        currentTimeUTC >= scheduleStartTime &&
        currentTimeUTC <= scheduleEndTime;

      return {
        id: schedule.id,
        scheduleDate: schedule.scheduleDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        startTimeUTC: scheduleStartTime.toISOString(),
        endTimeUTC: scheduleEndTime.toISOString(),
        currentTimeUTC: currentTimeUTC.toISOString(),
        isActive,
        driver: schedule.driver,
      };
    });

    const currentTime = new Date();
    const currentTimeUTC = new Date(
      currentTime.getTime() - currentTime.getTimezoneOffset() * 60 * 1000
    );

    res.json({
      shuttle: {
        id: shuttle.id,
        vehicleNumber: shuttle.vehicleNumber,
        hotelId: shuttle.hotelId,
      },
      currentTime: {
        ist: currentTime.toLocaleString(),
        utc: currentTimeUTC.toISOString(),
      },
      dateRange: {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
      },
      schedules: schedulesWithStatus,
      totalSchedules: shuttle.schedules.length,
      activeSchedules: schedulesWithStatus.filter((s) => s.isActive).length,
    });
  } catch (error) {
    console.error("Debug shuttle schedules error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get live shuttle data with current bookings and contact details
const getLiveShuttleData = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;

    // Get current date in IST
    const { istTime, startOfDay, endOfDay } = getISTDateRange();

    // Find active trips for today
    const activeTrips = await prisma.trip.findMany({
      where: {
        status: "ACTIVE",
        schedule: {
          scheduleDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          shuttle: {
            hotelId: hotelId,
          },
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
          },
        },
        shuttle: {
          select: {
            id: true,
            vehicleNumber: true,
            seats: true,
          },
        },
        bookings: {
          include: {
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
                isNonResident: true,
              },
            },
            pickupLocation: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
            dropoffLocation: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    // Format the response
    const liveShuttles = activeTrips.map((trip) => ({
      tripId: trip.id,
      shuttle: {
        id: trip.shuttle.id,
        vehicleNumber: trip.shuttle.vehicleNumber,
        totalSeats: trip.shuttle.seats,
        availableSeats: trip.shuttle.seats - trip.bookings.length,
        utilization: Math.round(
          (trip.bookings.length / trip.shuttle.seats) * 100
        ),
      },
      driver: {
        id: trip.driver.id,
        name: trip.driver.name,
        phoneNumber: trip.driver.phoneNumber,
        email: trip.driver.email,
      },
      direction: trip.direction,
      phase: trip.phase,
      startTime: trip.startTime,
      outboundEndTime: trip.outboundEndTime,
      returnStartTime: trip.returnStartTime,
      endTime: trip.endTime,
      bookings: trip.bookings.map((booking) => ({
        id: booking.id,
        guest: {
          id: booking.guest.id,
          name: `${booking.guest.firstName} ${booking.guest.lastName}`,
          email: booking.guest.email,
          phoneNumber: booking.guest.phoneNumber,
          isNonResident: booking.guest.isNonResident,
        },
        numberOfPersons: booking.numberOfPersons,
        numberOfBags: booking.numberOfBags,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        preferredTime: booking.preferredTime,
        isCompleted: booking.isCompleted,
        isVerified: booking.isVerified,
        eta: booking.eta,
        createdAt: booking.createdAt,
      })),
      totalBookings: trip.bookings.length,
    }));

    res.json({
      liveShuttles,
      totalLiveShuttles: liveShuttles.length,
      totalActiveBookings: liveShuttles.reduce(
        (sum, shuttle) => sum + shuttle.totalBookings,
        0
      ),
    });
  } catch (error) {
    console.error("Get live shuttle data error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get pending bookings from the last hour
const getPendingBookingsLastHour = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;

    // Calculate time 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const pendingBookings = await prisma.booking.findMany({
      where: {
        guest: {
          hotelId: hotelId,
        },
        isCancelled: false,
        isCompleted: false,
        tripId: null, // Not assigned to any trip yet
        createdAt: {
          gte: oneHourAgo,
        },
      },
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            isNonResident: true,
          },
        },
        pickupLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
        dropoffLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
        shuttle: {
          select: {
            id: true,
            vehicleNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format the response
    const formattedBookings = pendingBookings.map((booking) => ({
      id: booking.id,
      guest: {
        id: booking.guest.id,
        name: `${booking.guest.firstName} ${booking.guest.lastName}`,
        email: booking.guest.email,
        phoneNumber: booking.guest.phoneNumber,
        isNonResident: booking.guest.isNonResident,
      },
      numberOfPersons: booking.numberOfPersons,
      numberOfBags: booking.numberOfBags,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      preferredTime: booking.preferredTime,
      paymentMethod: booking.paymentMethod,
      bookingType: booking.bookingType,
      isPaid: booking.isPaid,
      isVerified: booking.isVerified,
      needsFrontdeskVerification: booking.needsFrontdeskVerification,
      eta: booking.eta,
      notes: booking.notes,
      createdAt: booking.createdAt,
      timeSinceCreated: Math.floor(
        (Date.now() - booking.createdAt.getTime()) / (1000 * 60)
      ), // minutes
    }));

    res.json({
      pendingBookings: formattedBookings,
      totalPendingBookings: formattedBookings.length,
      timeRange: {
        from: oneHourAgo.toISOString(),
        to: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get pending bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /frontdesk/get/schedule?start=...&end=...
const getSchedule21DayWindow = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;
    const { start, end } = req.query;
    let dateFilter = {};
    if (start && end) {
      dateFilter = {
        scheduleDate: {
          gte: new Date(start as string),
          lte: new Date(end as string),
        },
      };
    }
    const schedules = await prisma.schedule.findMany({
      where: {
        AND: [
          {
            OR: [{ driver: { hotelId } }, { shuttle: { hotelId } }],
          },
          dateFilter,
        ],
      },
      include: {
        driver: true,
        shuttle: true,
      },
      orderBy: {
        scheduleDate: "asc",
      },
    });
    res.json({ schedules });
  } catch (error) {
    console.error("Get schedule 21-day window error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  getFrontdesk,
  getShuttle,
  getDriver,
  login,
  getProfile,
  updateProfile,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  getSchedule: getSchedule21DayWindow,
  createBooking,
  getLocations,
  verifyBookingQR,
  getSignedUrl,
  getBookingQRUrl,
  getBookingDetails,
  getBookings,
  cancelBooking,
  rescheduleBooking,
  assignUnassignedBookings,
  verifyGuestBooking,
  rejectGuestBooking,
  debugGuests,
  publicDebugGuests,
  getScheduleByWeek,
  addSchedule,
  editSchedule,
  deleteSchedule,
  addWeeklySchedule,
  getShuttleCapacityStatus,
  debugShuttleBookings,
  debugSchedule,
  debugShuttleSchedules,
  getLiveShuttleData,
  getPendingBookingsLastHour,
};
