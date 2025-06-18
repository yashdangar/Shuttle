import express, { RequestHandler } from "express";
import { frontdeskAuthMiddleware } from "../middleware/authMiddleware";
import controller from "../controller/frontdeskController";
import frontdeskController from "../controller/frontdeskController";

const router = express.Router();

// Public routes
router.post("/login", controller.login as RequestHandler);

// Protected routes

router.get(
  "/profile",
  frontdeskAuthMiddleware as RequestHandler,
  controller.getProfile as RequestHandler
);
router.put(
  "/profile",
  frontdeskAuthMiddleware as RequestHandler,
  controller.updateProfile as RequestHandler
);
router.get("/", controller.getFrontdesk as RequestHandler);

// Shuttle routes
router.get(
  "/shuttle",
  frontdeskAuthMiddleware as RequestHandler,
  controller.getShuttle as RequestHandler
);

// Driver routes
router.get(
  "/driver",
  frontdeskAuthMiddleware as RequestHandler,
  controller.getDriver as RequestHandler
);

// Notification routes
router.get(
  "/notifications",
  frontdeskAuthMiddleware as RequestHandler,
  controller.getNotifications as RequestHandler
);
router.put(
  "/notifications/:id/read",
  frontdeskAuthMiddleware as RequestHandler,
  controller.markNotificationAsRead as RequestHandler
);
router.delete(
  "/notifications/:id",
  frontdeskAuthMiddleware as RequestHandler,
  controller.deleteNotification as RequestHandler
);

// Schedule routes
router.get(
  "/schedule",
  frontdeskAuthMiddleware as RequestHandler,
  controller.getSchedule as RequestHandler
);

// Booking routes
router.get(
  "/bookings",
  frontdeskAuthMiddleware as RequestHandler,
  controller.getBookings as RequestHandler
);
router.post(
  "/bookings",
  frontdeskAuthMiddleware as RequestHandler,
  controller.createBooking as RequestHandler
);

// Location routes
router.get(
  "/locations",
  frontdeskAuthMiddleware as RequestHandler,
  controller.getLocations as RequestHandler
);

router.get("/bookings/:id", frontdeskAuthMiddleware as RequestHandler, controller.getBookingDetails as RequestHandler);
router.get("/bookings/:id/qr-url", frontdeskAuthMiddleware as RequestHandler, controller.getBookingQRUrl as RequestHandler);
router.post("/signed-url", frontdeskAuthMiddleware as RequestHandler, controller.getSignedUrl as RequestHandler);
router.post("/verify-qr", frontdeskAuthMiddleware as RequestHandler, controller.verifyBookingQR as RequestHandler);

export default router;
