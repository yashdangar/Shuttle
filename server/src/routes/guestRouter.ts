import express from "express";
import controller from "../controller/guestController";
import { guestAuthMiddleware } from "../middleware/authMiddleware";
import { RequestHandler } from "express";

const router = express.Router();

router.get("/", controller.getGuest);
router.get(
  "/hotels",
  guestAuthMiddleware as RequestHandler,
  controller.getHotels
);
router.post(
  "/set-hotel",
  guestAuthMiddleware as RequestHandler,
  controller.setHotel as RequestHandler
);
router.get(
  "/get-hotel/:id",
  guestAuthMiddleware as RequestHandler,
  controller.getHotel as RequestHandler
);

//location routes
router.get(
  "/get-locations",
  guestAuthMiddleware as RequestHandler,
  controller.getLocations as RequestHandler
);

//trip routes
router.post(
  "/create-trip",
  guestAuthMiddleware as RequestHandler,
  controller.createTrip as RequestHandler
);
router.get(
  "/get-trips",
  guestAuthMiddleware as RequestHandler,
  controller.getTrips as RequestHandler
);
router.get(
  "/get-trip/:id",
  guestAuthMiddleware as RequestHandler,
  controller.getTrip as RequestHandler
);

// QR code routes
router.get(
  "/trips/:id/qr-url",
  guestAuthMiddleware as RequestHandler,
  controller.getTripQRUrl as RequestHandler
);
router.post(
  "/signed-url",
  guestAuthMiddleware as RequestHandler,
  controller.getSignedUrl as RequestHandler
);

// Profile route
router.get(
  "/profile",
  guestAuthMiddleware as RequestHandler,
  controller.getProfile as RequestHandler
);

// Booking management routes
router.put(
  "/bookings/:bookingId/cancel",
  guestAuthMiddleware as RequestHandler,
  controller.cancelBooking as RequestHandler
);

router.put(
  "/bookings/:bookingId/reschedule",
  guestAuthMiddleware as RequestHandler,
  controller.rescheduleBooking as RequestHandler
);

export default router;
