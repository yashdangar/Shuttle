import { Request, Response } from "express";
import prisma from "../db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { PaymentMethod, BookingType } from "@prisma/client";

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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({ booking });
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
};
