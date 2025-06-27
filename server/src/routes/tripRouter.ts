import express, { RequestHandler } from "express";
import { driverAuthMiddleware } from "../middleware/authMiddleware";
import {
  startTrip,
  transitionTripPhase,
  endTrip,
  getCurrentTrip,
  getTripHistory,
  getAvailableTrips,
  getCurrentTripBookings,
  addBookingToActiveTrip,
  debugDriverBookings,
  debugDriverSchedule,
  testCurrentTime,
} from "../controller/tripController";

const router = express.Router();

// Trip management routes
router.post(
  "/start",
  driverAuthMiddleware as RequestHandler,
  startTrip as RequestHandler
);

router.post(
  "/:tripId/transition",
  driverAuthMiddleware as RequestHandler,
  transitionTripPhase as RequestHandler
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
  "/current/bookings",
  driverAuthMiddleware as RequestHandler,
  getCurrentTripBookings as RequestHandler
);

router.post(
  "/current/bookings/:bookingId/add",
  driverAuthMiddleware as RequestHandler,
  addBookingToActiveTrip as RequestHandler
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

// Debug routes
router.get(
  "/debug/bookings",
  driverAuthMiddleware as RequestHandler,
  debugDriverBookings as RequestHandler
);

router.get(
  "/debug/schedule",
  driverAuthMiddleware as RequestHandler,
  debugDriverSchedule as RequestHandler
);

router.get(
  "/debug/time",
  driverAuthMiddleware as RequestHandler,
  testCurrentTime as RequestHandler
);

export default router; 