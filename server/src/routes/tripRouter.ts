import express, { RequestHandler } from "express";
import { driverAuthMiddleware } from "../middleware/authMiddleware";
import {
  startTrip,
  transitionTripPhase,
  endTrip,
  getCurrentTrip,
  getAvailableTrips,
  getCurrentTripBookings,
  addBookingToActiveTrip,
  prepareNextTrip,
  checkAndCleanupOverlappingTrips,
  debugDriverBookings,
  debugDriverSchedule,
  testCurrentTime,
  debugStartTripBookings,
  debugShuttleCapacity,
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

router.post(
  "/prepare-next",
  driverAuthMiddleware as RequestHandler,
  (async (req: any, res: any) => {
    try {
      const driverId = req.user.userId;
      const { currentTripId } = req.body;
      
      const result = await prepareNextTrip(driverId, currentTripId);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          currentTrip: result.currentTrip,
          nextTrip: result.nextTrip,
          assignedBookings: result.assignedBookings,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Prepare next trip error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }) as RequestHandler
);

router.post(
  "/cleanup-overlapping",
  driverAuthMiddleware as RequestHandler,
  (async (req: any, res: any) => {
    try {
      const driverId = req.user.userId;
      
      const result = await checkAndCleanupOverlappingTrips(driverId);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          cleanedTrips: result.cleanedTrips,
          remainingTrip: result.remainingTrip,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Cleanup overlapping trips error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }) as RequestHandler
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

router.get(
  "/debug/start-trip-bookings",
  driverAuthMiddleware as RequestHandler,
  debugStartTripBookings as RequestHandler
);

router.get(
  "/debug/shuttle-capacity/:shuttleId",
  driverAuthMiddleware as RequestHandler,
  (async (req: any, res: any) => {
    try {
      const shuttleId = parseInt(req.params.shuttleId);
      
      if (isNaN(shuttleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid shuttle ID",
        });
      }
      
      const result = await debugShuttleCapacity(shuttleId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Debug shuttle capacity error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }) as RequestHandler
);

export default router; 