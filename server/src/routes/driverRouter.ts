import express, { RequestHandler } from "express";
import controller from "../controller/driverController";
import { driverAuthMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post(
  "/login",
  controller.login as RequestHandler
);

router.get(
  "/profile",
  driverAuthMiddleware as RequestHandler,
  controller.getProfile as RequestHandler
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

export default router;
