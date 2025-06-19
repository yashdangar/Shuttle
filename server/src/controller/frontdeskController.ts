import { Request, Response } from "express";
import prisma from "../db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { PaymentMethod, BookingType } from "@prisma/client";
import { generateEncryptionKey, generateQRCode, verifyQRCode } from "../utils/qrCodeUtils";
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
      where: {
        hotelId: hotelId,
      },
      include: {
        schedules: {
          include: {
            driver: true,
          },
        },
      },
    });
    res.json({ shuttles });
  } catch (error) {
    console.error("Get shuttle error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getDriver = async (req: Request, res: Response) => {
  try {
    const hotelId = (req as any).user.hotelId;

    const drivers = await prisma.driver.findMany({
      where: {
        hotelId: hotelId,
      },
      include: {
        schedules: {
          include: {
            shuttle: true,
          },
        },
      },
    });
    res.json({ drivers });
  } catch (error) {
    console.error("Get driver error:", error);
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
    } = req.body;

    const hotelId = (req as any).user.hotelId;

    let guestId: number;

    if (isNonResident) {
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
    } else {
      // Find existing guest by email
      const guest = await prisma.guest.findFirst({
        where: { 
          email,
          hotelId,
          isNonResident: false,
        },
      });

      if (!guest) {
        return res.status(404).json({ message: "Hotel resident not found" });
      }
      guestId = guest.id;
    }

    // Generate encryption key
    const encryptionKey = generateEncryptionKey();

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        numberOfPersons: parseInt(numberOfPersons),
        numberOfBags: parseInt(numberOfBags),
        preferredTime: new Date(preferredTime),
        paymentMethod: paymentMethod as PaymentMethod,
        bookingType: tripType === "hotel-to-airport" ? "HOTEL_TO_AIRPORT" : "AIRPORT_TO_HOTEL",
        pickupLocationId: pickupLocation ? parseInt(pickupLocation) : null,
        dropoffLocationId: dropoffLocation ? parseInt(dropoffLocation) : null,
        guestId,
        encryptionKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Generate QR code
    const qrCodeData = await generateQRCode({
      bookingId: booking.id,
      guestId: booking.guestId,
      preferredTime: booking.preferredTime?.toISOString() || '',
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
      return res.status(403).json({ message: "Not authorized to verify this booking" });
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
      message: "QR code verified successfully" 
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

    const bookingId = path.split('/')[1];
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
      include: {
        guest: true,
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Get fresh signed URL for QR code if it exists
    let qrCodeUrl = null;
    if (booking.qrCodePath) {
      qrCodeUrl = await getSignedUrlFromPath(booking.qrCodePath);
    }

    res.json({
      booking: {
        ...booking,
        qrCodeUrl,
      },
    });
  } catch (error) {
    console.error("Get booking details error:", error);
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
        guest: true,
        pickupLocation: true,
        dropoffLocation: true,
        shuttle: true,
      },
      orderBy: {
        preferredTime: 'desc',
      },
    });

    res.json({ bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
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

    // Check if booking can be cancelled (not completed, not already cancelled)
    if (booking.isCompleted) {
      return res.status(400).json({ error: "Cannot cancel a completed booking" });
    }

    if (booking.isCancelled) {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    // Cancel the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        isCancelled: true,
        updatedAt: new Date()
      },
    });

    res.json({ 
      message: "Booking cancelled successfully",
      booking: updatedBooking 
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
      return res.status(400).json({ error: "Cannot reschedule a completed booking" });
    }

    if (booking.isCancelled) {
      return res.status(400).json({ error: "Cannot reschedule a cancelled booking" });
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
        currentTime: now.toISOString()
      });
    }

    // Update the booking with new preferred time
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        preferredTime: newPreferredTime,
        updatedAt: new Date()
      },
    });

    res.json({ 
      message: "Booking rescheduled successfully",
      booking: updatedBooking 
    });
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    res.status(500).json({ error: "Failed to reschedule booking" });
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
};
