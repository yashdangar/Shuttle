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

// Current booking routes - with hotel filtering
router.get(
  "/current-booking",
  guestAuthMiddleware as RequestHandler,
  controller.getCurrentBookings as RequestHandler
);
router.get(
  "/current-booking/:hotelId",
  guestAuthMiddleware as RequestHandler,
  controller.getCurrentBookingsByHotel as RequestHandler
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
  "/bookings/:id/cancel",
  guestAuthMiddleware as RequestHandler,
  controller.cancelBooking as RequestHandler
);

// Reschedule removed for guest

// ETA and tracking routes
router.get(
  "/booking/:bookingId/eta",
  guestAuthMiddleware as RequestHandler,
  controller.getBookingETA as RequestHandler
);

router.get(
  "/booking/:bookingId/tracking",
  guestAuthMiddleware as RequestHandler,
  controller.getBookingTracking as RequestHandler
);

// Notification routes
router.get(
  "/notifications",
  guestAuthMiddleware as RequestHandler,
  controller.getNotifications as RequestHandler
);

router.put(
  "/notifications/:notificationId/read",
  guestAuthMiddleware as RequestHandler,
  controller.markNotificationAsRead as RequestHandler
);

router.put(
  "/notifications/read-all",
  guestAuthMiddleware as RequestHandler,
  controller.markAllNotificationsAsRead as RequestHandler
);

router.delete(
  "/notifications/:notificationId",
  guestAuthMiddleware as RequestHandler,
  controller.deleteNotification as RequestHandler
);

// Chat routes
router.get(
  "/hotels/:hotelId/chats",
  guestAuthMiddleware as RequestHandler,
  controller.getChats as RequestHandler
);

router.get(
  "/hotels/:hotelId/chats/:chatId/messages",
  guestAuthMiddleware as RequestHandler,
  controller.getChatMessages as RequestHandler
);

router.post(
  "/hotels/:hotelId/chats/:chatId/messages",
  guestAuthMiddleware as RequestHandler,
  controller.sendMessage as RequestHandler
);

// Seat hold status route
router.get(
  "/bookings/:bookingId/seat-hold-status",
  guestAuthMiddleware as RequestHandler,
  controller.getSeatHoldStatusForBooking as RequestHandler
);

export default router;
