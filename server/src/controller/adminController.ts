import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { env } from "../config/env";
import { sendToUser } from "../ws/index";
import { WsEvents } from "../ws/events";
import { randomInt } from "crypto";
import {
  generatePresignedPutUrl,
  getSignedUrlFromPath,
} from "../utils/s3Utils";

const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name, token: secretToken } = req.body;

    if (secretToken !== process.env.ADMIN_SECRET_TOKEN) {
      return res.status(400).json({ message: "Invalid token" });
    }

    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "Email, password and name are required" });
    }

    // Check if email already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const token = jwt.sign(
      { userId: admin.id, role: "admin" },
      env.jwt.secret,
      {
        expiresIn: "24h",
      }
    );

    res.status(201).json({
      message: "Admin created successfully",
      token: token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      console.log("No admin found");
      return res.status(401).json({ message: "Admin not found" });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      console.log("Invalid password");
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: admin.id, role: "admin", hotelId: admin.hotelId },
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

const addFrontdesk = async (req: Request, res: Response) => {
  try {
    const { name, email, password, hotelId, phoneNumber } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const frontdesk = await prisma.frontDesk.create({
      data: {
        name,
        phoneNumber: phoneNumber,
        email,
        password: hashedPassword,
        hotelId: parseInt(hotelId),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    res.json({ frontdesk });
  } catch (error) {
    console.error("Add frontdesk error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editFrontdesk = async (req: Request, res: Response) => {
  try {
    const { name, email, hotelId, phoneNumber } = req.body;
    const id = req.params.id;
    const frontdesk = await prisma.frontDesk.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phoneNumber: phoneNumber,
        email,
        hotelId: parseInt(hotelId),
        updatedAt: new Date(),
      },
    });
    res.json({ frontdesk });
  } catch (error) {
    console.error("Edit frontdesk error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteFrontdesk = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const frontdesk = await prisma.frontDesk.delete({
      where: { id: parseInt(id) },
    });
    res.json({ frontdesk });
  } catch (error) {
    console.error("Delete frontdesk error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getFrontdesk = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const frontdesk = await prisma.frontDesk.findMany({
      where: { hotel: { admins: { some: { id: parseInt(userId) } } } },
    });
    res.json({ frontdesk });
  } catch (error) {
    console.error("Get frontdesk error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAdmin = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, env.jwt.secret) as { userId: string };
    const userId = decoded.userId;

    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        hotelId: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ admin });
  } catch (error) {
    console.error("Get admin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        hotelId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Get hotel information if admin has a hotel
    let hotelData = null;
    if (admin.hotelId) {
      hotelData = await prisma.hotel.findUnique({
        where: { id: admin.hotelId },
        select: {
          id: true,
          name: true,
          address: true,
          phoneNumber: true,
          email: true,
          latitude: true,
          longitude: true,
        },
      });
    }

    res.json({ admin, hotel: hotelData });
  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateAdminProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const admin = await prisma.admin.update({
      where: { id: parseInt(userId) },
      data: {
        name,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        hotelId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ admin });
  } catch (error) {
    console.error("Update admin profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createHotel = async (req: Request, res: Response) => {
  try {
    const {
      name,
      latitude,
      longitude,
      address,
      phoneNumber,
      email,
      imagePath,
    } = req.body;
    const adminId = (req as any).user.userId;

    if (!name || !address || !phoneNumber || !email) {
      return res.status(400).json({
        message: "Name, address, phone number, and email are required",
      });
    }

    // Check if admin already has a hotel
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: parseInt(adminId) },
      include: { hotel: true },
    });

    if (!existingAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (existingAdmin.hotelId) {
      return res.status(400).json({ message: "Admin already has a hotel" });
    }

    const hotel = await prisma.hotel.create({
      data: {
        name,
        latitude,
        longitude,
        address,
        phoneNumber,
        email,
        imagePath,
        admins: { connect: { id: parseInt(adminId) } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    res.json({ hotel });
  } catch (error) {
    console.error("Create hotel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const editHotel = async (req: Request, res: Response) => {
  try {
    const hotelId = req.params.id;
    const {
      name,
      latitude,
      longitude,
      address,
      phoneNumber,
      email,
      imagePath,
    } = req.body;
    const adminId = (req as any).user.userId;

    if (!name || !address || !phoneNumber || !email) {
      return res.status(400).json({
        message: "Name, address, phone number, and email are required",
      });
    }

    const existingHotel = await prisma.hotel.findUnique({
      where: { id: parseInt(hotelId) },
    });
    if (!existingHotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(adminId) },
      include: { hotel: true },
    });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    if (admin.hotelId !== parseInt(hotelId)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this hotel" });
    }
    const hotel = await prisma.hotel.update({
      where: { id: parseInt(hotelId) },
      data: {
        name,
        latitude,
        longitude,
        address,
        phoneNumber,
        email,
        imagePath,
        updatedAt: new Date(),
      },
    });
    res.json({ hotel });
  } catch (error) {
    console.error("Edit hotel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteHotel = async (req: Request, res: Response) => {
  try {
    const hotelId = req.params.id;
    await prisma.hotel.delete({
      where: { id: parseInt(hotelId) },
    });
    res.json({ message: "Hotel deleted successfully" });
  } catch (error) {
    console.error("Delete hotel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteHotelWithConfirmation = async (req: Request, res: Response) => {
  try {
    const hotelId = req.params.id;
    const { adminPassword, confirmDelete } = req.body;
    const adminId = (req as any).user.userId;

    // Validate required fields
    if (!adminPassword || confirmDelete === null) {
      return res.status(400).json({
        message: "Admin password and confirmation are required",
      });
    }

    // Validate confirmation flag
    if (confirmDelete !== true) {
      return res.status(400).json({
        message: "Deletion confirmation is required",
      });
    }

    // Get admin and verify password
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(adminId) },
      include: { hotel: true },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Verify admin password
    const isValidPassword = await bcrypt.compare(adminPassword, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid admin password" });
    }

    // Verify admin owns this hotel
    if (!admin.hotelId || admin.hotelId !== parseInt(hotelId)) {
      return res.status(403).json({
        message: "You are not authorized to delete this hotel",
      });
    }

    // Delete the hotel (cascading will handle all related data)
    await prisma.hotel.delete({
      where: { id: parseInt(hotelId) },
    });

    res.json({
      message: "Hotel and all related data deleted successfully",
      redirectToLogin: true,
    });
  } catch (error) {
    console.error("Delete hotel with confirmation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getHotel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      include: {
        hotel: {
          include: {
            admins: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            frontDesks: true,
          },
        },
      },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (!admin.hotelId) {
      return res.status(404).json({ message: "No hotel found for this admin" });
    }

    res.json({ hotel: admin.hotel });
  } catch (error) {
    console.error("Get hotel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addDriver = async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, email, password, hotelId } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const driver = await prisma.driver.create({
      data: {
        name,
        phoneNumber,
        email,
        password: hashedPassword,
        hotelId: parseInt(hotelId),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    res.json({ driver });
  } catch (error) {
    console.error("Add driver error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editDriver = async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, email, hotelId } = req.body;
    const id = req.params.id;
    const driver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phoneNumber,
        email,
        hotelId: parseInt(hotelId),
        updatedAt: new Date(),
      },
    });
    res.json({ driver });
  } catch (error) {
    console.error("Edit driver error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const driver = await prisma.driver.delete({
      where: { id: parseInt(id) },
    });
    res.json({ driver });
  } catch (error) {
    console.error("Delete driver error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getDriver = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const drivers = await prisma.driver.findMany({
      where: { hotel: { admins: { some: { id: parseInt(userId) } } } },
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

const addShuttle = async (req: Request, res: Response) => {
  try {
    const { vehicleNumber, hotelId, seats } = req.body;
    const shuttle = await prisma.shuttle.create({
      data: {
        vehicleNumber,
        hotelId: parseInt(hotelId),
        seats: parseInt(seats),
        createdAt: new Date(),
      },
    });
    res.json({ shuttle });
  } catch (error) {
    console.error("Add shuttle error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editShuttle = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { vehicleNumber, hotelId, seats } = req.body;
    const shuttle = await prisma.shuttle.update({
      where: { id: parseInt(id) },
      data: {
        vehicleNumber,
        hotelId: parseInt(hotelId),
        seats: parseInt(seats),
      },
    });
    res.json({ shuttle });
  } catch (error) {
    console.error("Edit shuttle error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const deleteShuttle = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const shuttle = await prisma.shuttle.delete({
      where: { id: parseInt(id) },
    });
    res.json({ shuttle });
  } catch (error) {
    console.error("Delete shuttle error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getShuttle = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const shuttles = await prisma.shuttle.findMany({
      where: { hotel: { admins: { some: { id: parseInt(userId) } } } },
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

const addSchedule = async (req: Request, res: Response) => {
  try {
    const { driverId, shuttleId, scheduleDate, startTime, endTime } = req.body;

    // scheduleDate is used for uniqueness, set to start of day UTC
    const dateOnly = new Date(scheduleDate);
    dateOnly.setUTCHours(0, 0, 0, 0);

    // All times from frontend are expected as UTC ISO strings
    // Store directly as Date objects (which are UTC by default)
    const schedule = await prisma.schedule.create({
      data: {
        driverId: parseInt(driverId),
        shuttleId: parseInt(shuttleId),
        scheduleDate: dateOnly,
        startTime: new Date(startTime), // UTC
        endTime: new Date(endTime), // UTC
      },
      include: {
        driver: true,
        shuttle: true,
      },
    });

    // Notify the assigned driver
    sendToUser(schedule.driverId, "driver", WsEvents.NEW_SCHEDULE, {
      title: "New Schedule Assigned",
      message: `You have a new schedule for ${schedule.scheduleDate.toDateString()}.`,
      schedule,
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

    const dateOnly = new Date(scheduleDate);
    dateOnly.setUTCHours(0, 0, 0, 0);

    // All times from frontend are expected as UTC ISO strings
    const schedule = await prisma.schedule.update({
      where: { id: parseInt(id) },
      data: {
        driverId: parseInt(driverId),
        shuttleId: parseInt(shuttleId),
        scheduleDate: dateOnly,
        startTime: new Date(startTime), // UTC
        endTime: new Date(endTime), // UTC
      },
      include: {
        driver: true,
        shuttle: true,
      },
    });

    // Notify the assigned driver
    sendToUser(schedule.driverId, "driver", WsEvents.UPDATED_SCHEDULE, {
      title: "Schedule Updated",
      message: `Your schedule for ${schedule.scheduleDate.toDateString()} has been updated.`,
      schedule,
    });

    res.json({ schedule });
  } catch (error) {
    console.error("Edit schedule error:", error);

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

const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const schedule = await prisma.schedule.delete({
      where: { id: parseInt(id) },
    });

    // Notify the assigned driver
    sendToUser(schedule.driverId, "driver", WsEvents.DELETED_SCHEDULE, {
      title: "Schedule Canceled",
      message: `Your schedule for ${schedule.scheduleDate.toDateString()} has been canceled.`,
      schedule,
    });

    res.json({ schedule });
  } catch (error) {
    console.error("Delete schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSchedule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
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
            OR: [
              {
                driver: {
                  hotel: { admins: { some: { id: parseInt(userId) } } },
                },
              },
              {
                shuttle: {
                  hotel: { admins: { some: { id: parseInt(userId) } } },
                },
              },
            ],
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
    console.error("Get schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addWeeklySchedule = async (req: Request, res: Response) => {
  try {
    const { driverId, shuttleId, startDate, weekSchedule } = req.body;
    if (!driverId || !shuttleId || !startDate || !weekSchedule) {
      return res.status(400).json({
        message:
          "Driver ID, shuttle ID, start date, and week schedule are required",
      });
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
        scheduleDate.setUTCHours(0, 0, 0, 0);
        // All times from frontend are expected as UTC ISO strings
        // For weekly, you may want to accept startTime/endTime as UTC ISO, or as "HH:mm" and convert here
        // But for consistency, expect UTC ISO from frontend
        const startTime = dayData.startUtc || dayData.startTime; // prefer startUtc if provided
        const endTime = dayData.endUtc || dayData.endTime;
        const schedule = await prisma.schedule.create({
          data: {
            driverId: parseInt(driverId),
            shuttleId: parseInt(shuttleId),
            scheduleDate: scheduleDate,
            startTime: new Date(startTime), // UTC
            endTime: new Date(endTime), // UTC
          },
          include: {
            driver: true,
            shuttle: true,
          },
        });
        schedules.push(schedule);
      }
    }
    // Notify the assigned driver about the new weekly schedule
    if (schedules.length > 0) {
      sendToUser(parseInt(driverId), "driver", WsEvents.NEW_SCHEDULE, {
        title: "New Weekly Schedule Assigned",
        message: `You have been assigned a new weekly schedule starting from ${weekStart.toDateString()}.`,
        schedules,
      });
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

const getScheduleByWeek = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { weekOffset = 0 } = req.query; // 0 = current week, -1 = prev week, 1 = next week

    // Calculate the week start (Monday)
    const today = new Date();
    const currentWeekStart = new Date(today);
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Apply week offset
    const targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setDate(
      targetWeekStart.getDate() + parseInt(weekOffset as string) * 7
    );

    const targetWeekEnd = new Date(targetWeekStart);
    targetWeekEnd.setDate(targetWeekEnd.getDate() + 6);
    targetWeekEnd.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                driver: {
                  hotel: { admins: { some: { id: parseInt(userId) } } },
                },
              },
              {
                shuttle: {
                  hotel: { admins: { some: { id: parseInt(userId) } } },
                },
              },
            ],
          },
          {
            scheduleDate: {
              gte: targetWeekStart,
              lte: targetWeekEnd,
            },
          },
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

const getScheduleBy21Days = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { centerDate } = req.query; // ISO string, optional
    let center = centerDate ? new Date(centerDate as string) : new Date();
    center.setHours(0, 0, 0, 0);
    // 7 days before, 13 days after (21 days total, inclusive)
    const start = new Date(center);
    start.setDate(center.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(center);
    end.setDate(center.getDate() + 13);
    end.setHours(23, 59, 59, 999);
    const schedules = await prisma.schedule.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                driver: {
                  hotel: { admins: { some: { id: parseInt(userId) } } },
                },
              },
              {
                shuttle: {
                  hotel: { admins: { some: { id: parseInt(userId) } } },
                },
              },
            ],
          },
          {
            scheduleDate: {
              gte: start,
              lte: end,
            },
          },
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
      rangeInfo: {
        start: start.toISOString(),
        end: end.toISOString(),
        center: center.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get schedule by 21 days error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      };
    }

    // Get all bookings for hotels that this admin manages
    const bookings = await prisma.booking.findMany({
      where: {
        AND: [
          {
            guest: {
              hotel: {
                admins: {
                  some: {
                    id: parseInt(userId),
                  },
                },
              },
            },
          },
          dateFilter,
        ],
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
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
        waiverUser: {
          select: {
            name: true,
          },
        },
        shuttle: {
          select: {
            id: true,
            vehicleNumber: true,
            seats: true,
            createdAt: true,
            schedules: {
              include: {
                driver: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        trip: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { startDate, endDate } = req.query;

    // Set default date range (1st of current month to today)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startDateFilter = startDate
      ? new Date(startDate as string)
      : firstDayOfMonth;
    const endDateFilter = endDate ? new Date(endDate as string) : today;

    // Get the admin's hotel ID
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: { hotelId: true },
    });

    if (!admin?.hotelId) {
      return res.json({
        stats: {
          totalHotels: 0,
          totalFrontdeskStaff: 0,
          totalDrivers: 0,
          totalShuttles: 0,
          totalGuests: 0,
        },
        bookings: {
          liveBookings: 0,
          totalBookings: 0,
          completedBookings: 0,
          revenue: 0,
          hotelToAirport: 0,
          airportToHotel: 0,
          hotelToAirportRevenue: 0,
          airportToHotelRevenue: 0,
        },
        hotelBookings: {},
        dateRange: {
          startDate: startDateFilter.toISOString(),
          endDate: endDateFilter.toISOString(),
        },
      });
    }

    // Get bookings filtered by admin's hotel with date range
    const bookings = await prisma.booking.findMany({
      where: {
        AND: [
          {
            guest: {
              hotelId: admin.hotelId,
            },
          },
          {
            createdAt: {
              gte: startDateFilter,
              lte: endDateFilter,
            },
          },
        ],
      },
      include: {
        guest: {
          select: {
            hotel: {
              select: {
                name: true,
              },
            },
          },
        },
        pickupLocation: true,
        dropoffLocation: true,
      },
    });

    // Calculate live bookings (not completed, not cancelled)
    const liveBookings = bookings.filter(
      (booking) => !booking.isCompleted && !booking.isCancelled
    );

    // Calculate revenue breakdown by trip type
    const completedBookings = bookings.filter((booking) => booking.isCompleted);

    // Calculate actual revenue based on hotel location prices and number of persons
    let totalRevenue = 0;
    let hotelToAirportRevenue = 0;
    let airportToHotelRevenue = 0;

    for (const booking of completedBookings) {
      let bookingRevenue = 0;

      // Determine which location to use for pricing based on booking type
      let pricingLocationId = null;

      if (booking.bookingType === "HOTEL_TO_AIRPORT") {
        // For hotel to airport, use dropoff location (airport) for pricing
        pricingLocationId = booking.dropoffLocationId;
      } else if (booking.bookingType === "AIRPORT_TO_HOTEL") {
        // For airport to hotel, use pickup location (airport) for pricing
        pricingLocationId = booking.pickupLocationId;
      }

      if (pricingLocationId) {
        // Get the hotel location price for this location
        const hotelLocation = await prisma.hotelLocation.findUnique({
          where: {
            hotelId_locationId: {
              hotelId: admin.hotelId,
              locationId: pricingLocationId,
            },
          },
        });

        if (hotelLocation) {
          // Calculate revenue: price per person * number of persons
          bookingRevenue = hotelLocation.price * booking.numberOfPersons;
        }
      }

      totalRevenue += bookingRevenue;

      // Add to specific trip type revenue
      if (booking.bookingType === "HOTEL_TO_AIRPORT") {
        hotelToAirportRevenue += bookingRevenue;
      } else if (booking.bookingType === "AIRPORT_TO_HOTEL") {
        airportToHotelRevenue += bookingRevenue;
      }
    }

    // Calculate booking types (all bookings, not just completed)
    const hotelToAirport = bookings.filter(
      (booking) => booking.bookingType === "HOTEL_TO_AIRPORT"
    ).length;

    const airportToHotel = bookings.filter(
      (booking) => booking.bookingType === "AIRPORT_TO_HOTEL"
    ).length;

    // Get hotel-wise booking counts
    const hotelBookings = bookings.reduce(
      (acc, booking) => {
        const hotelName = booking.guest.hotel?.name || "Unknown Hotel";
        acc[hotelName] = (acc[hotelName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get total hotels managed by this admin (should be 1 since admin is assigned to one hotel)
    const hotels = await prisma.hotel.findMany({
      where: {
        id: admin.hotelId,
      },
    });

    // Get total drivers for this hotel
    const drivers = await prisma.driver.findMany({
      where: {
        hotelId: admin.hotelId,
      },
    });

    // Get total shuttles for this hotel
    const shuttles = await prisma.shuttle.findMany({
      where: {
        hotelId: admin.hotelId,
      },
    });

    // Get total frontdesk staff for this hotel
    const frontdeskStaff = await prisma.frontDesk.findMany({
      where: {
        hotelId: admin.hotelId,
      },
    });

    // Get total guests for this hotel
    const guests = await prisma.guest.findMany({
      where: {
        hotelId: admin.hotelId,
      },
    });

    res.json({
      stats: {
        totalHotels: hotels.length,
        totalFrontdeskStaff: frontdeskStaff.length,
        totalDrivers: drivers.length,
        totalShuttles: shuttles.length,
        totalGuests: guests.length,
      },
      bookings: {
        liveBookings: liveBookings.length,
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        revenue: totalRevenue,
        hotelToAirport: hotelToAirport,
        airportToHotel: airportToHotel,
        hotelToAirportRevenue: hotelToAirportRevenue,
        airportToHotelRevenue: airportToHotelRevenue,
      },
      hotelBookings,
      dateRange: {
        startDate: startDateFilter.toISOString(),
        endDate: endDateFilter.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all global locations (for dropdown)
const getGlobalLocations = async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ locations });
  } catch (error) {
    console.error("Get global locations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all locations for the admin's hotel (with price)
const getHotelLocations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: { hotelId: true },
    });
    if (!admin?.hotelId) {
      return res.json({ locations: [] });
    }
    const hotelLocations = await prisma.hotelLocation.findMany({
      where: { hotelId: admin.hotelId },
      include: { location: true },
      orderBy: { id: "asc" },
    });
    res.json({ locations: hotelLocations });
  } catch (error) {
    console.error("Get hotel locations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add a location to the admin's hotel (with price)
const addHotelLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { locationId, price } = req.body;
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: { hotelId: true },
    });
    if (!admin?.hotelId) {
      return res.status(400).json({ message: "Admin does not have a hotel" });
    }
    // Prevent duplicate
    const exists = await prisma.hotelLocation.findUnique({
      where: { hotelId_locationId: { hotelId: admin.hotelId, locationId } },
    });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Location already added to hotel" });
    }
    const hotelLocation = await prisma.hotelLocation.create({
      data: {
        hotelId: admin.hotelId,
        locationId,
        price,
      },
      include: { location: true },
    });
    res.json({ hotelLocation });
  } catch (error) {
    console.error("Add hotel location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Edit price for a hotel-location
const editHotelLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const id = parseInt(req.params.id);
    const { price } = req.body;
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: { hotelId: true },
    });
    if (!admin?.hotelId) {
      return res.status(400).json({ message: "Admin does not have a hotel" });
    }
    // Only allow editing if this hotel owns the hotelLocation
    const hotelLocation = await prisma.hotelLocation.findUnique({
      where: { id },
    });
    if (!hotelLocation || hotelLocation.hotelId !== admin.hotelId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const updated = await prisma.hotelLocation.update({
      where: { id },
      data: { price },
      include: { location: true },
    });
    res.json({ hotelLocation: updated });
  } catch (error) {
    console.error("Edit hotel location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Remove a location from the admin's hotel
const deleteHotelLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const id = parseInt(req.params.id);
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: { hotelId: true },
    });
    if (!admin?.hotelId) {
      return res.status(400).json({ message: "Admin does not have a hotel" });
    }
    // Only allow deleting if this hotel owns the hotelLocation
    const hotelLocation = await prisma.hotelLocation.findUnique({
      where: { id },
    });
    if (!hotelLocation || hotelLocation.hotelId !== admin.hotelId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await prisma.hotelLocation.delete({ where: { id } });
    res.json({ message: "Location removed from hotel" });
  } catch (error) {
    console.error("Delete hotel location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change admin password
const changeAdminPassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required" });
    }

    // Get admin from DB
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
    });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await prisma.admin.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword, updatedAt: new Date() },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change admin password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
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
    // Update password for admin (if exists)
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { email },
      data: { password: hashedPassword, updatedAt: new Date() },
    });
    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const generatePresignedUrl = async (req: Request, res: Response) => {
  try {
    const { fileName, contentType, folder, hotelId } = req.body;
    const adminId = (req as any).user.userId;

    if (!fileName) {
      return res.status(400).json({ message: "fileName is required" });
    }

    if (!hotelId) {
      return res.status(400).json({ message: "hotelId is required" });
    }

    // Get admin's hotel to verify ownership
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(adminId) },
      include: { hotel: true },
    });

    if (!admin || !admin.hotel || admin.hotel.id !== parseInt(hotelId)) {
      return res
        .status(403)
        .json({ message: "You can only upload images for your own hotel" });
    }

    // Validate folder - only allow public for hotel images
    const allowedFolders = ["public/hotel-images"];
    const targetFolder = folder || "public/hotel-images";

    if (!allowedFolders.includes(targetFolder)) {
      return res.status(400).json({ message: "Invalid folder specified" });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const fullPath = `${targetFolder}/${hotelId}/${uniqueFileName}`;

    const presignedUrl = await generatePresignedPutUrl(
      fullPath,
      contentType || "image/jpeg"
    );

    res.json({
      presignedUrl,
      imagePath: fullPath,
      fileName: uniqueFileName,
    });
  } catch (error) {
    console.error("Generate presigned URL error:", error);
    res.status(500).json({ message: "Failed to generate presigned URL" });
  }
};

export default {
  getAdmin,
  getAdminProfile,
  updateAdminProfile,
  login,
  signup,
  createHotel,
  editHotel,
  deleteHotel,
  deleteHotelWithConfirmation,
  getHotel,
  addFrontdesk,
  editFrontdesk,
  deleteFrontdesk,
  getFrontdesk,
  addDriver,
  editDriver,
  deleteDriver,
  getDriver,
  addShuttle,
  editShuttle,
  deleteShuttle,
  getShuttle,
  addSchedule,
  editSchedule,
  deleteSchedule,
  getSchedule,
  addWeeklySchedule,
  getScheduleByWeek,
  addHotelLocation,
  editHotelLocation,
  deleteHotelLocation,
  getGlobalLocations,
  getHotelLocations,
  getBookings,
  getDashboardStats,
  getScheduleBy21Days,
  changeAdminPassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  generatePresignedUrl,
};
