import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface JWTPayload {
  userId: string;
  role: string;
}

const superAdminAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    // console.log("Auth header:", authHeader);

    const token = authHeader?.split(" ")[1];
    // console.log("Extracted token:", token);

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JWTPayload;

    if (decoded.role !== "super-admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin role required." });
    }
    // Add user info to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
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
    console.log(error);
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

export {
  adminAuthMiddleware,
  frontdeskAuthMiddleware,
  guestAuthMiddleware,
  driverAuthMiddleware,
  superAdminAuthMiddleware,
};
