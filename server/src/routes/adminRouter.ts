import express, { RequestHandler } from "express";
import controller from "../controller/adminController";
import { adminAuthMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// Public routes
router.post("/signup", controller.signup as RequestHandler);
router.post("/login", controller.login as RequestHandler);

// Protected routes
router.get(
  "/",
  adminAuthMiddleware as RequestHandler,
  controller.getAdmin as RequestHandler
);

// Profile routes
router.get(
  "/profile",
  adminAuthMiddleware as RequestHandler,
  controller.getAdminProfile as RequestHandler
);
router.put(
  "/profile",
  adminAuthMiddleware as RequestHandler,
  controller.updateAdminProfile as RequestHandler
);

//hotel routes
router.post(
  "/add/hotel",
  adminAuthMiddleware as RequestHandler,
  controller.createHotel as RequestHandler
);
router.put(
  "/edit/hotel/:id",
  adminAuthMiddleware as RequestHandler,
  controller.editHotel as RequestHandler
);
router.delete(
  "/delete/hotel/:id",
  adminAuthMiddleware as RequestHandler,
  controller.deleteHotel as RequestHandler
);
router.delete(
  "/delete/hotel/:id/confirm",
  adminAuthMiddleware as RequestHandler,
  controller.deleteHotelWithConfirmation as RequestHandler
);
router.get(
  "/get/hotel",
  adminAuthMiddleware as RequestHandler,
  controller.getHotel as RequestHandler
);

//frontdesk routes
router.post(
  "/add/frontdesk",
  adminAuthMiddleware as RequestHandler,
  controller.addFrontdesk as RequestHandler
);
router.put(
  "/edit/frontdesk/:id",
  adminAuthMiddleware as RequestHandler,
  controller.editFrontdesk as RequestHandler
);
router.delete(
  "/delete/frontdesk/:id",
  adminAuthMiddleware as RequestHandler,
  controller.deleteFrontdesk as RequestHandler
);
router.get(
  "/get/frontdesk",
  adminAuthMiddleware as RequestHandler,
  controller.getFrontdesk as RequestHandler
);

//driver routes
router.post(
  "/add/driver",
  adminAuthMiddleware as RequestHandler,
  controller.addDriver as RequestHandler
);
router.put(
  "/edit/driver/:id",
  adminAuthMiddleware as RequestHandler,
  controller.editDriver as RequestHandler
);
router.delete(
  "/delete/driver/:id",
  adminAuthMiddleware as RequestHandler,
  controller.deleteDriver as RequestHandler
);
router.get(
  "/get/driver",
  adminAuthMiddleware as RequestHandler,
  controller.getDriver as RequestHandler
);

//shuttle routes
router.post(
  "/add/shuttle",
  adminAuthMiddleware as RequestHandler,
  controller.addShuttle as RequestHandler
);
router.put(
  "/edit/shuttle/:id",
  adminAuthMiddleware as RequestHandler,
  controller.editShuttle as RequestHandler
);
router.delete(
  "/delete/shuttle/:id",
  adminAuthMiddleware as RequestHandler,
  controller.deleteShuttle as RequestHandler
);
router.get(
  "/get/shuttle",
  adminAuthMiddleware as RequestHandler,
  controller.getShuttle as RequestHandler
);

//schedule routes
router.post(
  "/add/schedule",
  adminAuthMiddleware as RequestHandler,
  controller.addSchedule as RequestHandler
);
router.post(
  "/add/weekly-schedule",
  adminAuthMiddleware as RequestHandler,
  controller.addWeeklySchedule as RequestHandler
);
router.put(
  "/edit/schedule/:id",
  adminAuthMiddleware as RequestHandler,
  controller.editSchedule as RequestHandler
);
router.delete(
  "/delete/schedule/:id",
  adminAuthMiddleware as RequestHandler,
  controller.deleteSchedule as RequestHandler
);
router.get(
  "/get/schedule",
  adminAuthMiddleware as RequestHandler,
  controller.getSchedule as RequestHandler
);
router.get(
  "/get/schedule/week",
  adminAuthMiddleware as RequestHandler,
  controller.getScheduleByWeek as RequestHandler
);

//location routes
router.post(
  "/add/location",
  adminAuthMiddleware as RequestHandler,
  controller.addLocation as RequestHandler
);
router.put(
  "/edit/location/:id",
  adminAuthMiddleware as RequestHandler,
  controller.editLocation as RequestHandler
);
router.delete(
  "/delete/location/:id",
  adminAuthMiddleware as RequestHandler,
  controller.deleteLocation as RequestHandler
);
router.get(
  "/get/locations",
  adminAuthMiddleware as RequestHandler,
  controller.getLocation as RequestHandler
);

//booking routes
router.get(
  "/bookings",
  adminAuthMiddleware as RequestHandler,
  controller.getBookings as RequestHandler
);

//dashboard routes
router.get(
  "/dashboard/stats",
  adminAuthMiddleware as RequestHandler,
  controller.getDashboardStats as RequestHandler
);

export default router;
