import express, { RequestHandler } from "express";
import controller from "../controller/driverController";
import { driverAuthMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/login", controller.login as RequestHandler);

router.get(
  "/profile",
  driverAuthMiddleware as RequestHandler,
  controller.getProfile as RequestHandler
);

router.put(
  "/profile",
  driverAuthMiddleware as RequestHandler,
  controller.updateProfile as RequestHandler
);

router.get(
  "/current-trip",
  driverAuthMiddleware as RequestHandler,
  controller.getCurrentTrip as RequestHandler
);

router.get(
  "/notifications",
  driverAuthMiddleware as RequestHandler,
  controller.getNotifications as RequestHandler
);

router.put(
  "/notifications/:notificationId/read",
  driverAuthMiddleware as RequestHandler,
  controller.markNotificationAsRead as RequestHandler
);

router.put(
  "/notifications/mark-all-read",
  driverAuthMiddleware as RequestHandler,
  controller.markAllNotificationsAsRead as RequestHandler
);

router.post(
  "/check-qr",
  driverAuthMiddleware as RequestHandler,
  controller.checkQRCode as RequestHandler
);

router.post(
  "/confirm-checkin",
  driverAuthMiddleware as RequestHandler,
  controller.confirmCheckIn as RequestHandler
);

// Location tracking routes
router.post(
  "/update-location",
  driverAuthMiddleware as RequestHandler,
  controller.updateLocation as RequestHandler
);

router.get(
  "/location/:driverId",
  driverAuthMiddleware as RequestHandler,
  controller.getLocation as RequestHandler
);

router.get(
  "/current-location",
  driverAuthMiddleware as RequestHandler,
  controller.getCurrentDriverLocation as RequestHandler
);

router.get(
  "/hotel-location/:hotelId",
  driverAuthMiddleware as RequestHandler,
  controller.getHotelLocation as RequestHandler
);

router.get(
  "/location-history/:driverId",
  driverAuthMiddleware as RequestHandler,
  controller.getLocationHistory as RequestHandler
);

// ETA and tracking routes
router.get(
  "/booking/:bookingId/eta",
  driverAuthMiddleware as RequestHandler,
  controller.getBookingETA as RequestHandler
);

router.get(
  "/booking/:bookingId/tracking",
  driverAuthMiddleware as RequestHandler,
  controller.getBookingTracking as RequestHandler
);

// Debug route
router.get(
  "/debug",
  driverAuthMiddleware as RequestHandler,
  controller.getDebugInfo as RequestHandler
);

// Assignment route
router.post(
  "/assign-bookings",
  driverAuthMiddleware as RequestHandler,
  controller.assignUnassignedBookings as RequestHandler
);

// Change password route
router.put(
  "/change-password",
  driverAuthMiddleware as RequestHandler,
  controller.changePassword as RequestHandler
);

<<<<<<< HEAD
// Forgot password routes
router.post("/forgot-password", controller.forgotPassword as RequestHandler);
router.post("/verify-otp", controller.verifyOtp as RequestHandler);
router.post("/reset-password", controller.resetPassword as RequestHandler);
=======

>>>>>>> 7ba5b7ed6c0487df1f860574ab072270f2310ade

export default router;
