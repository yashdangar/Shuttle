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
    const {
      numberOfPersons,
      numberOfBags,
      preferredTime,
      paymentMethod,
      tripType,
      pickupLocation,
      dropoffLocation,
      // Non-resident fields
      email,
      firstName,
      lastName,
      phoneNumber,
      isNonResident,
      // Waiver fields
      isWaived,
      waiverReason,
    } = req.body;

    const hotelId = (req as any).user.hotelId;
    const frontdeskUserId = (req as any).user.userId;

    console.log(`Creating booking for hotelId: ${hotelId}`);
    console.log(`Request body:`, req.body);

    let guestId: number;

    if (isNonResident) {
      // First check if a guest with this email already exists (regardless of isNonResident status)
      const existingGuest = await prisma.guest.findFirst({
        where: {
          email,
          hotelId,
        },
      });

      if (existingGuest) {
        // Use existing guest
        guestId = existingGuest.id;
        console.log(
          `Using existing guest for non-resident booking: ${existingGuest.email}`
        );
      } else {
        // Create a new guest for non-resident
        const guest = await prisma.guest.create({
          data: {
            email,
            firstName,
            lastName,
            phoneNumber,
            isNonResident: true,
            hotelId,
          },
        });
        guestId = guest.id;
        console.log(
          `Created new guest for non-resident booking: ${guest.email}`
        );
      }
    } else {
      // Find existing guest by email
      console.log(
        `Looking for guest with email: ${email} and hotelId: ${hotelId}`
      );

      const guest = await prisma.guest.findFirst({
        where: {
          email,
          hotelId,
          // Don't filter by isNonResident - just find any guest with this email at this hotel
        },
      });

      console.log(`Found guest:`, guest);

      if (!guest) {
        // Let's also check what guests exist with this email
        const allGuestsWithEmail = await prisma.guest.findMany({
          where: { email },
          select: {
            id: true,
            email: true,
            hotelId: true,
            isNonResident: true,
            firstName: true,
            lastName: true,
          },
        });
        console.log(`All guests with email ${email}:`, allGuestsWithEmail);

        return res.status(404).json({ message: "Hotel resident not found" });
      }
      guestId = guest.id;
    }

    // Generate encryption key
    const encryptionKey = generateEncryptionKey();

    // Prepare booking data
    const bookingData: any = {
      numberOfPersons: parseInt(numberOfPersons),
      numberOfBags: parseInt(numberOfBags),
      preferredTime: new Date(preferredTime),
      paymentMethod: paymentMethod as PaymentMethod,
      bookingType:
        tripType === "hotel-to-airport"
          ? "HOTEL_TO_AIRPORT"
          : "AIRPORT_TO_HOTEL",
      pickupLocationId: pickupLocation ? parseInt(pickupLocation) : null,
      dropoffLocationId: dropoffLocation ? parseInt(dropoffLocation) : null,
      guestId,
      encryptionKey,
      needsFrontdeskVerification: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

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

    // Create the booking
    const booking = await prisma.booking.create({
      data: bookingData,
    });

    // Find an available shuttle for this hotel and assign the booking
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const availableShuttle = await prisma.shuttle.findFirst({
      where: {
        hotelId: hotelId,
        schedules: {
          some: {
            scheduleDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            startTime: { lte: new Date() },
            endTime: { gte: new Date() },
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
            startTime: { lte: new Date() },
            endTime: { gte: new Date() },
          },
          include: {
            driver: true,
          },
        },
      },
    });

    if (availableShuttle) {
      // Assign booking to the available shuttle
      await prisma.booking.update({
        where: { id: booking.id },
        data: { shuttleId: availableShuttle.id },
      });

      console.log(
        `Booking ${booking.id} assigned to shuttle ${availableShuttle.vehicleNumber} with driver ${availableShuttle.schedules[0]?.driver?.name}`
      );
    } else {
      console.log(
        `No available shuttle found for hotel ${hotelId}, booking ${booking.id} remains unassigned`
      );
    }

    // Generate QR code
    const qrCodeData = await generateQRCode({
      bookingId: booking.id,
      guestId: booking.guestId,
      preferredTime: booking.preferredTime?.toISOString() || "",
      encryptionKey: booking.encryptionKey!,
    });

    // Update booking with QR code data
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { qrCodePath: qrCodeData },
    });

    res.json({ booking: updatedBooking });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getLocations = async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
      },
    });
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
    const bookingId = req.params.id;
    const hotelId = (req as any).user.hotelId;

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

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.guest.hotelId !== (req as any).user.hotelId) {
      return res
        .status(403)
        .json({ error: "Forbidden: Booking does not belong to this hotel." });
    }

    if (booking.isCancelled) {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isCancelled: true,
        cancelledBy: "FRONTDESK",
        cancellationReason: reason || "Cancelled by Frontdesk",
      },
    });

    // Notify the guest
    await prisma.notification.create({
      data: {
        guestId: booking.guestId,
        title: "Booking Cancelled by Frontdesk",
        message: `Your booking has been cancelled by the frontdesk. Reason: ${
          reason || "No reason provided."
        }`,
      },
    });

    res.json({
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
};

const rescheduleBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { preferredTime } = req.body;
    const hotelId = (req as any).user.hotelId;

    // Check if booking exists and belongs to the hotel
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        guest: {
          hotelId: hotelId,
        },
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
      // Find an available shuttle for this hotel
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const availableShuttle = await prisma.shuttle.findFirst({
        where: {
          hotelId: hotelId,
          schedules: {
            some: {
              scheduleDate: {
                gte: startOfDay,
                lte: endOfDay,
              },
              startTime: { lte: new Date() },
              endTime: { gte: new Date() },
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
              startTime: { lte: new Date() },
              endTime: { gte: new Date() },
            },
            include: {
              driver: true,
            },
          },
        },
      });

      if (availableShuttle) {
        // Assign booking to the available shuttle
        await prisma.booking.update({
          where: { id: booking.id },
          data: { shuttleId: availableShuttle.id },
        });

        const result = {
          bookingId: booking.id,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          assignedTo: {
            shuttleId: availableShuttle.id,
            vehicleNumber: availableShuttle.vehicleNumber,
            driverName:
              availableShuttle.schedules[0]?.driver?.name || "Unknown",
          },
          status: "assigned",
        };

        assignmentResults.push(result);
        console.log(
          `Booking ${booking.id} assigned to shuttle ${availableShuttle.vehicleNumber}`
        );
      } else {
        assignmentResults.push({
          bookingId: booking.id,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          assignedTo: null,
          status: "no_available_shuttle",
        });
        console.log(`No available shuttle for booking ${booking.id}`);
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

    const dayKeys = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    for (let i = 0; i < 7; i++) {
      const dayKey = dayKeys[i];
      const dayData = weekSchedule[dayKey];

      if (dayData && dayData.enabled) {
        const scheduleDate = new Date(weekStart);
        scheduleDate.setUTCDate(scheduleDate.getUTCDate() + i);

        const [startHour, startMinute] = dayData.startTime.split(":");
        const startDateTime = new Date(scheduleDate);
        startDateTime.setUTCHours(
          parseInt(startHour),
          parseInt(startMinute),
          0,
          0
        );

        const [endHour, endMinute] = dayData.endTime.split(":");
        const endDateTime = new Date(scheduleDate);
        endDateTime.setUTCHours(parseInt(endHour), parseInt(endMinute), 0, 0);

        const schedule = await prisma.schedule.create({
          data: {
            driverId: parseInt(driverId),
            shuttleId: parseInt(shuttleId),
            scheduleDate: scheduleDate,
            startTime: startDateTime,
            endTime: endDateTime,
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
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify guest booking and assign to shuttle
const verifyGuestBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const hotelId = (req as any).user.hotelId;
    const frontdeskId = (req as any).user.userId;

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
        message: "Booking not found or already verified/cancelled" 
      });
    }

    // Find an available shuttle for this hotel
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const availableShuttle = await prisma.shuttle.findFirst({
      where: {
        hotelId: hotelId,
        schedules: {
          some: {
            scheduleDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            startTime: { lte: new Date() },
            endTime: { gte: new Date() },
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
            startTime: { lte: new Date() },
            endTime: { gte: new Date() },
          },
          include: {
            driver: true,
          },
        },
      },
    });

    if (!availableShuttle) {
      return res.status(400).json({ 
        message: "No available shuttle found for this booking" 
      });
    }

    // Update booking: verify it, assign shuttle, and mark as verified
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        needsFrontdeskVerification: false,
        shuttleId: availableShuttle.id,
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

    // Notify the guest that their booking has been verified
    await prisma.notification.create({
      data: {
        guestId: booking.guestId,
        title: "Booking Verified",
        message: `Your booking has been verified by the frontdesk and assigned to shuttle ${availableShuttle.vehicleNumber}.`,
      },
    });

    res.json({
      message: "Booking verified and assigned to shuttle successfully",
      booking: updatedBooking,
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
        message: "Booking not found or already verified/cancelled" 
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
        message: `Your booking has been rejected by the frontdesk. Reason: ${reason || "No reason provided."}`,
      },
    });

    res.json({
      message: "Booking rejected successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Reject guest booking error:", error);
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
  getSchedule,
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
};
