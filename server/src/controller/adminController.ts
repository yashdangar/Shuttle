import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

    const token = jwt.sign({ userId: admin.id, role: "admin" }, JWT_SECRET, {
      expiresIn: "24h",
    });

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
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: admin.id, role: "admin" }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addFrontdesk = async (req: Request, res: Response) => {
  try {
    const { name, email, password, hotelId, phoneNumber } = req.body;
    const frontdesk = await prisma.frontDesk.create({
      data: {
        name,
        phoneNumber: phoneNumber,
        email,
        password,
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
    const { name, email, password, hotelId, phoneNumber } = req.body;
    const id = req.params.id;
    const frontdesk = await prisma.frontDesk.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phoneNumber: phoneNumber,
        email,
        password,
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

// model FrontDesk {
//     id          Int      @id @default(autoincrement())
//     name        String
//     phoneNumber String
//     email       String   @unique
//     password    String
//     hotelId     Int
//     hotel       Hotel    @relation(fields: [hotelId], references: [id])
//     createdAt   DateTime @default(now())
//     updatedAt   DateTime @updatedAt
//     notifications Notification[]
//   }

const getAdmin = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
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

const createHotel = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const adminId = (req as any).user.userId;

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
        admins: { connect: { id: parseInt(adminId) } },
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
    const { name } = req.body;
    const adminId = (req as any).user.userId;

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
      data: { name, updatedAt: new Date() },
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
    const hotel = await prisma.hotel.delete({
      where: { id: parseInt(hotelId) },
    });
    res.json({ hotel });
  } catch (error) {
    console.error("Delete hotel error:", error);
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

export default {
  getAdmin,
  login,
  signup,
  createHotel,
  editHotel,
  deleteHotel,
  getHotel,
  addFrontdesk,
  editFrontdesk,
  deleteFrontdesk,
  getFrontdesk,
};
