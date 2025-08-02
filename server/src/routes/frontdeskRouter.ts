import express, { RequestHandler } from "express";
import { frontdeskAuthMiddleware } from "../middleware/authMiddleware";
import frontdeskController from "../controller/frontdeskController";

const router = express.Router();

// Public routes
router.post("/login", frontdeskController.login as RequestHandler);

// Protected routes

router.get(
  "/profile",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getProfile as RequestHandler
);
router.put(
  "/profile",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.updateProfile as RequestHandler
);
router.get("/", frontdeskController.getFrontdesk as RequestHandler);

// Shuttle routes
router.get(
  "/get/shuttle",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getShuttle as RequestHandler
);

// Shuttle capacity status route
router.get(
  "/shuttle-capacity-status",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getShuttleCapacityStatus as RequestHandler
);

// Shuttle availability route
router.get(
  "/shuttle-availability",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getShuttleAvailabilityInfo as RequestHandler
);

// Debug shuttle bookings route
router.get(
  "/debug/shuttle/:shuttleId/bookings",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.debugShuttleBookings as RequestHandler
);

// Driver routes
router.get(
  "/get/driver",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getDriver as RequestHandler
);

// Notification routes
router.get(
  "/notifications",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getNotifications as RequestHandler
);
router.put(
  "/notifications/:id/read",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.markNotificationAsRead as RequestHandler
);
router.put(
  "/notifications/mark-all-read",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.markAllNotificationsAsRead as RequestHandler
);
router.delete(
  "/notifications/:id",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.deleteNotification as RequestHandler
);

// Schedule routes
router.get(
  "/schedule",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getSchedule as RequestHandler
);

// Booking routes
router.get(
  "/bookings",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getBookings as RequestHandler
);
router.post(
  "/bookings",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.createBooking as RequestHandler
);

// Location routes
router.get(
  "/locations",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getLocations as RequestHandler
);

router.get(
  "/bookings/:id",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getBookingDetails as RequestHandler
);
router.get(
  "/bookings/:id/qr-url",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getBookingQRUrl as RequestHandler
);
router.post(
  "/signed-url",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getSignedUrl as RequestHandler
);
router.post(
  "/verify-qr",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.verifyBookingQR as RequestHandler
);

// Booking management routes
router.post(
  "/bookings/:bookingId/cancel",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.cancelBooking as RequestHandler
);

router.post(
  "/bookings/:bookingId/reschedule",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.rescheduleBooking as RequestHandler
);

// Guest booking verification routes
router.post(
  "/bookings/:bookingId/verify",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.verifyGuestBooking as RequestHandler
);

router.post(
  "/bookings/:bookingId/reject",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.rejectGuestBooking as RequestHandler
);

// Assignment routes
router.post(
  "/assign-unassigned-bookings",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.assignUnassignedBookings as RequestHandler
);

// Debug routes
router.get(
  "/debug-guests",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.debugGuests as RequestHandler
);

// Debug schedule route
router.get(
  "/debug/schedule/:scheduleId",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.debugSchedule as RequestHandler
);

// Debug shuttle schedules route
router.get(
  "/debug/shuttle/:shuttleId/schedules",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.debugShuttleSchedules as RequestHandler
);

// Public debug route (no auth required)
router.get(
  "/public-debug-guests",
  frontdeskController.publicDebugGuests as RequestHandler
);

// New Schedule Management Routes
router.get(
  "/get/schedule/week",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getScheduleByWeek as RequestHandler
);
router.post(
  "/add/schedule",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.addSchedule as RequestHandler
);
router.put(
  "/edit/schedule/:id",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.editSchedule as RequestHandler
);
router.delete(
  "/delete/schedule/:id",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.deleteSchedule as RequestHandler
);
router.post(
  "/add/weekly-schedule",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.addWeeklySchedule as RequestHandler
);

// Dashboard specific routes
router.get(
  "/dashboard/live-shuttles",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getLiveShuttleData as RequestHandler
);

router.get(
  "/dashboard/pending-bookings",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getPendingBookingsLastHour as RequestHandler
);

// TODO: Remove this in production
router.get("/debug/guests", frontdeskController.debugGuests);

// Change password route
router.put(
  "/change-password",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.changePassword as RequestHandler
);

// Forgot password routes
router.post(
  "/forgot-password",
  frontdeskController.forgotPassword as RequestHandler
);
router.post("/verify-otp", frontdeskController.verifyOtp as RequestHandler);
router.post(
  "/reset-password",
  frontdeskController.resetPassword as RequestHandler
);

// Chat routes
router.get(
  "/hotels/:hotelId/chats",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getChats as RequestHandler
);

router.get(
  "/hotels/:hotelId/chats/:chatId/messages",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.getChatMessages as RequestHandler
);

router.post(
  "/hotels/:hotelId/chats/:chatId/messages",
  frontdeskAuthMiddleware as RequestHandler,
  frontdeskController.sendMessage as RequestHandler
);

export default router;
