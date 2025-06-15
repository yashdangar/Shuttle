import { Request, Response } from "express";
import prisma from "../db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

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
        driver: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
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
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        startTime: true,
        endTime: true,
        shuttle: {
          select: {
            id: true,
            vehicleNumber: true,
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
};
