import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const superAdminController = {
  // Login endpoint
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // For demo purposes, using hardcoded super admin credentials
      // In production, this should be stored securely in the database
      const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
      const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

      if (email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
        const token = jwt.sign(
          { id: "super-admin", email, role: "super-admin" },
          process.env.JWT_SECRET || "fallback-secret",
          { expiresIn: "24h" }
        );

        res.json({
          message: "Login successful",
          token,
        });
        return;
      } else {
        res.status(401).json({
          message: "Invalid credentials",
        });
        return;
      }
    } catch (error) {
      console.error("Super admin login error:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Get all hotels with basic info
  getHotels: async (req: Request, res: Response) => {
    try {
      const hotels = await prisma.hotel.findMany({
        include: {
          admins: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          frontDesks: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
            },
          },
          drivers: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
            },
          },
          shuttles: {
            select: {
              id: true,
              vehicleNumber: true,
              seats: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              admins: true,
              frontDesks: true,
              drivers: true,
              guests: true,
              shuttles: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const hotelsWithStatus = hotels.map((hotel) => ({
        ...hotel,
        status: "Active", // For now, all hotels are active. This can be dynamic based on business logic
      }));

      res.json(hotelsWithStatus);
      return;
    } catch (error) {
      console.error("Error fetching hotels:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Get detailed hotel information including all staff
  getHotelDetails: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const hotelId = parseInt(id);

      if (isNaN(hotelId)) {
        res.status(400).json({
          message: "Invalid hotel ID",
        });
        return;
      }

      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        include: {
          admins: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          frontDesks: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
            },
          },
          drivers: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
            },
          },
          shuttles: {
            select: {
              id: true,
              vehicleNumber: true,
              seats: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              guests: true,
            },
          },
        },
      });

      if (!hotel) {
        res.status(404).json({
          message: "Hotel not found",
        });
        return;
      }

      // Add status (this can be dynamic based on business logic)
      const hotelWithStatus = {
        ...hotel,
        status: "Active",
      };

      res.json(hotelWithStatus);
      return;
    } catch (error) {
      console.error("Error fetching hotel details:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Get current super admin info (for auth verification)
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      // This would normally fetch from database, but for super admin we'll return static info
      res.json({
        id: "super-admin",
        email: "superadmin@shuttle.com",
        role: "super-admin",
        name: "Super Administrator",
      });
      return;
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Get all admins
  getAdmins: async (req: Request, res: Response) => {
    try {
      const admins = await prisma.admin.findMany({
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(admins);
      return;
    } catch (error) {
      console.error("Error fetching admins:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Create new admin
  createAdmin: async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({
          message: "Name, email, and password are required",
        });
        return;
      }

      // Check if email already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { email },
      });

      if (existingAdmin) {
        res.status(400).json({
          message: "Email already exists",
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new admin (without hotel assignment by default)
      const admin = await prisma.admin.create({
        data: {
          name,
          email,
          password: hashedPassword,
          // hotelId is null by default as per your requirement
        },
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Admin created successfully",
        admin,
      });
      return;
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Update admin
  updateAdmin: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, email, password, hotelId } = req.body;
      const adminId = parseInt(id);

      if (isNaN(adminId)) {
        res.status(400).json({
          message: "Invalid admin ID",
        });
        return;
      }

      // Check if admin exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!existingAdmin) {
        res.status(404).json({
          message: "Admin not found",
        });
        return;
      }

      // Check if email is being changed and already exists
      if (email && email !== existingAdmin.email) {
        const emailExists = await prisma.admin.findUnique({
          where: { email },
        });

        if (emailExists) {
          res.status(400).json({
            message: "Email already exists",
          });
          return;
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      if (hotelId !== undefined)
        updateData.hotelId = hotelId === "" ? null : parseInt(hotelId);

      // Update admin
      const updatedAdmin = await prisma.admin.update({
        where: { id: adminId },
        data: updateData,
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        message: "Admin updated successfully",
        admin: updatedAdmin,
      });
      return;
    } catch (error) {
      console.error("Error updating admin:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Delete admin
  deleteAdmin: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = parseInt(id);

      if (isNaN(adminId)) {
        res.status(400).json({
          message: "Invalid admin ID",
        });
        return;
      }

      // Check if admin exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { id: adminId },
      });

      if (!existingAdmin) {
        res.status(404).json({
          message: "Admin not found",
        });
        return;
      }

      // Delete admin
      await prisma.admin.delete({
        where: { id: adminId },
      });

      res.json({
        message: "Admin deleted successfully",
      });
      return;
    } catch (error) {
      console.error("Error deleting admin:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Get all locations
  getLocations: async (req: Request, res: Response) => {
    try {
      const locations = await prisma.location.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(locations);
      return;
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Create new location
  createLocation: async (req: Request, res: Response) => {
    try {
      const { name, latitude, longitude } = req.body;

      if (!name || latitude === undefined || longitude === undefined) {
        res.status(400).json({
          message: "Name, latitude, and longitude are required",
        });
        return;
      }

      // Validate latitude and longitude
      if (latitude < -90 || latitude > 90) {
        res.status(400).json({
          message: "Latitude must be between -90 and 90",
        });
        return;
      }

      if (longitude < -180 || longitude > 180) {
        res.status(400).json({
          message: "Longitude must be between -180 and 180",
        });
        return;
      }

      // Create new location
      const location = await prisma.location.create({
        data: {
          name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
      });

      res.status(201).json({
        message: "Location created successfully",
        location,
      });
      return;
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Update location
  updateLocation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, latitude, longitude } = req.body;
      const locationId = parseInt(id);

      if (isNaN(locationId)) {
        res.status(400).json({
          message: "Invalid location ID",
        });
        return;
      }

      // Check if location exists
      const existingLocation = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!existingLocation) {
        res.status(404).json({
          message: "Location not found",
        });
        return;
      }

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (latitude !== undefined) {
        if (latitude < -90 || latitude > 90) {
          res.status(400).json({
            message: "Latitude must be between -90 and 90",
          });
          return;
        }
        updateData.latitude = parseFloat(latitude);
      }
      if (longitude !== undefined) {
        if (longitude < -180 || longitude > 180) {
          res.status(400).json({
            message: "Longitude must be between -180 and 180",
          });
          return;
        }
        updateData.longitude = parseFloat(longitude);
      }

      // Update location
      const updatedLocation = await prisma.location.update({
        where: { id: locationId },
        data: updateData,
      });

      res.json({
        message: "Location updated successfully",
        location: updatedLocation,
      });
      return;
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },

  // Delete location
  deleteLocation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const locationId = parseInt(id);

      if (isNaN(locationId)) {
        res.status(400).json({
          message: "Invalid location ID",
        });
        return;
      }

      // Check if location exists
      const existingLocation = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!existingLocation) {
        res.status(404).json({
          message: "Location not found",
        });
        return;
      }

      // Delete location
      await prisma.location.delete({
        where: { id: locationId },
      });

      res.json({
        message: "Location deleted successfully",
      });
      return;
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({
        message: "Internal server error",
      });
      return;
    }
  },
};

export default superAdminController;
