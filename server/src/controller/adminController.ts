import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { env } from "../config/env";
import { sendToUser } from "../ws/index";
import { WsEvents } from "../ws/events";

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
    const { name, latitude, longitude, address, phoneNumber, email } = req.body;
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
    const { name, latitude, longitude, address, phoneNumber, email } = req.body;
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

const getLocation = async (req: Request, res: Response) => {
  try {
    const location = await prisma.location.findMany();
    res.json({ location });
  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addLocation = async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude } = req.body;
    const location = await prisma.location.create({
      data: {
        name,
        latitude,
        longitude,
      },
    });
    res.json({ location });
  } catch (error) {
    console.error("Add location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const editLocation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, latitude, longitude } = req.body;
    const location = await prisma.location.update({
      where: { id: parseInt(id) },
      data: { name, latitude, longitude },
    });
    res.json({ location });
  } catch (error) {
    console.error("Edit location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteLocation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const location = await prisma.location.delete({
      where: { id: parseInt(id) },
    });
    res.json({ location });
  } catch (error) {
    console.error("Delete location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addSchedule = async (req: Request, res: Response) => {
  try {
    const { driverId, shuttleId, scheduleDate, startTime, endTime } = req.body;

    // Parse scheduleDate and set to start of day to ensure consistent date-only storage
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
        message: `Driver ${existingSchedule.driver.name} already has a schedule for ${dateOnly.toDateString()}. Please edit the existing schedule instead.`,
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
    if ((error as any).code === 'P2002') {
      return res.status(400).json({
        message: "A schedule already exists for this driver on the selected date.",
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

const editSchedule = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { driverId, shuttleId, scheduleDate, startTime, endTime } = req.body;

    // Parse scheduleDate and set to start of day to ensure consistent date-only storage
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
    const schedules = await prisma.schedule.findMany({
      where: {
        OR: [
          { driver: { hotel: { admins: { some: { id: parseInt(userId) } } } } },
          {
            shuttle: { hotel: { admins: { some: { id: parseInt(userId) } } } },
          },
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

    // Array of day keys in order (Monday = 0, Sunday = 6)
    const dayKeys = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

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
      const existingDates = existingSchedules.map(s => s.scheduleDate.toDateString()).join(', ');
      return res.status(400).json({
        message: `Driver ${existingSchedules[0].driver.name} already has schedules for the following dates: ${existingDates}. Please edit existing schedules or choose a different week.`,
        existingSchedules,
      });
    }

    for (let i = 0; i < 7; i++) {
      const dayKey = dayKeys[i];
      const dayData = weekSchedule[dayKey];

      if (dayData && dayData.enabled) {
        const scheduleDate = new Date(weekStart);
        scheduleDate.setDate(scheduleDate.getDate() + i);
        scheduleDate.setHours(0, 0, 0, 0); // Set to start of day

        // Create start and end times for this day
        const [startHour, startMinute] = dayData.startTime.split(":");
        const startDateTime = new Date(scheduleDate);
        startDateTime.setHours(
          parseInt(startHour),
          parseInt(startMinute),
          0,
          0
        );

        const [endHour, endMinute] = dayData.endTime.split(":");
        const endDateTime = new Date(scheduleDate);
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

        const schedule = await prisma.schedule.create({
          data: {
            driverId: parseInt(driverId),
            shuttleId: parseInt(shuttleId),
            scheduleDate: scheduleDate,
            startTime: startDateTime,
            endTime: endDateTime,
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
    if ((error as any).code === 'P2002') {
      return res.status(400).json({
        message: "One or more schedules already exist for this driver on the selected dates.",
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
                    id: parseInt(userId)
                  }
                }
              }
            }
          },
          dateFilter
        ]
      },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            isNonResident: true,
          }
        },
        pickupLocation: {
          select: {
            name: true,
          }
        },
        dropoffLocation: {
          select: {
            name: true,
          }
        },
        waiverUser: {
          select: {
            name: true,
          }
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
    
    const startDateFilter = startDate ? new Date(startDate as string) : firstDayOfMonth;
    const endDateFilter = endDate ? new Date(endDate as string) : today;
    
    // Get the admin's hotel ID
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(userId) },
      select: { hotelId: true }
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
        },
        hotelBookings: {},
        dateRange: {
          startDate: startDateFilter.toISOString(),
          endDate: endDateFilter.toISOString(),
        }
      });
    }
    
    // Get bookings filtered by admin's hotel with date range
    const bookings = await prisma.booking.findMany({
      where: {
        AND: [
          {
            guest: {
              hotelId: admin.hotelId
            }
          },
          {
            createdAt: {
              gte: startDateFilter,
              lte: endDateFilter,
            },
          }
        ]
      },
      include: {
        guest: {
          select: {
            hotel: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    });

    // Calculate live bookings (not completed, not cancelled)
    const liveBookings = bookings.filter(booking => 
      !booking.isCompleted && !booking.isCancelled
    );

    // Calculate revenue (assuming $50 per booking for now - you can adjust this based on your pricing)
    const completedBookings = bookings.filter(booking => booking.isCompleted);
    const revenue = completedBookings.length * 50; // $50 per booking

    // Calculate booking types
    const hotelToAirport = bookings.filter(booking => 
      booking.bookingType === 'HOTEL_TO_AIRPORT'
    ).length;
    
    const airportToHotel = bookings.filter(booking => 
      booking.bookingType === 'AIRPORT_TO_HOTEL'
    ).length;

    // Get hotel-wise booking counts
    const hotelBookings = bookings.reduce((acc, booking) => {
      const hotelName = booking.guest.hotel?.name || 'Unknown Hotel';
      acc[hotelName] = (acc[hotelName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get total hotels managed by this admin (should be 1 since admin is assigned to one hotel)
    const hotels = await prisma.hotel.findMany({
      where: {
        id: admin.hotelId
      }
    });

    // Get total drivers for this hotel
    const drivers = await prisma.driver.findMany({
      where: {
        hotelId: admin.hotelId
      }
    });

    // Get total shuttles for this hotel
    const shuttles = await prisma.shuttle.findMany({
      where: {
        hotelId: admin.hotelId
      }
    });

    // Get total frontdesk staff for this hotel
    const frontdeskStaff = await prisma.frontDesk.findMany({
      where: {
        hotelId: admin.hotelId
      }
    });

    // Get total guests for this hotel
    const guests = await prisma.guest.findMany({
      where: {
        hotelId: admin.hotelId
      }
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
        revenue: revenue,
        hotelToAirport: hotelToAirport,
        airportToHotel: airportToHotel,
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
  addLocation,
  editLocation,
  deleteLocation,
  getLocation,
  getBookings,
  getDashboardStats,
};
