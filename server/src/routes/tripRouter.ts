import express, { RequestHandler } from "express";
import { driverAuthMiddleware } from "../middleware/authMiddleware";
import {
  startTrip,
  endTrip,
  getCurrentTrip,
  getTripHistory,
  getAvailableTrips,
} from "../controller/tripController";

const router = express.Router();

// Trip management routes
router.post(
  "/start",
  driverAuthMiddleware as RequestHandler,
  startTrip as RequestHandler
);

router.post(
  "/:tripId/end",
  driverAuthMiddleware as RequestHandler,
  endTrip as RequestHandler
);

router.get(
  "/current",
  driverAuthMiddleware as RequestHandler,
  getCurrentTrip as RequestHandler
);

router.get(
  "/history",
  driverAuthMiddleware as RequestHandler,
  getTripHistory as RequestHandler
);

router.get(
  "/available",
  driverAuthMiddleware as RequestHandler,
  getAvailableTrips as RequestHandler
);

export default router; 