import { Router } from "express";
import superAdminController from "../controller/superAdminController";
import { superAdminAuthMiddleware } from "../middleware/authMiddleware";
import { RequestHandler } from "express";
const router = Router();

// Public routes (no auth required)
router.post("/login", superAdminController.login);

// Protected routes (require super admin auth)
router.get(
  "/",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.getCurrentUser
);
router.get(
  "/hotels",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.getHotels
);
router.get(
  "/hotels/:id",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.getHotelDetails as RequestHandler
);

// Admin management routes
router.get(
  "/admins",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.getAdmins
);
router.post(
  "/admins",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.createAdmin
);
router.put(
  "/admins/:id",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.updateAdmin
);
router.delete(
  "/admins/:id",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.deleteAdmin
);

// Location management routes
router.get(
  "/locations",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.getLocations
);
router.post(
  "/locations",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.createLocation
);
router.put(
  "/locations/:id",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.updateLocation
);
router.delete(
  "/locations/:id",
  superAdminAuthMiddleware as RequestHandler,
  superAdminController.deleteLocation
);

export default router;
