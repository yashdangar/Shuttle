import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";


interface JWTPayload {
  userId: string;
  role: string;
}

const adminAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JWTPayload;

    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admin role required." });
    }
    // Add user info to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const guestAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JWTPayload;
    // Add user info to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const frontdeskAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JWTPayload;

    if (decoded.role !== "frontdesk") {
      return res
        .status(403)
        .json({ message: "Access denied. Frontdesk role required." });
    }
    // Add user info to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const driverAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JWTPayload;

    if (decoded.role !== "driver") {
      return res
        .status(403)
        .json({ message: "Access denied. Driver role required." });
    }
    // Add user info to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export { adminAuthMiddleware, frontdeskAuthMiddleware, guestAuthMiddleware, driverAuthMiddleware };
