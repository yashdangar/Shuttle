import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../db/prisma";
import { env } from "../config/env";

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

export default { login };
