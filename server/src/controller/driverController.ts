import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { env } from "../config/env";
import { verifyQRCode, validateVerificationToken, markTokenAsUsed } from "../utils/qrCodeUtils";

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

    // Get current schedule for the driver
    const currentTime = new Date();
    const currentSchedule = await prisma.schedule.findFirst({
      where: {
        driverId,
        startTime: { lte: currentTime },
        endTime: { gte: currentTime },
      },
      include: {
        shuttle: true,
      },
    });

    if (!currentSchedule) {
      return res.json({ 
        currentTrip: null, 
        message: "No active trip found" 
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

export default {
  login,
  getProfile,
  getCurrentTrip,
  checkQRCode,
  confirmCheckIn,
  getNotifications,
  markNotificationAsRead,
};
