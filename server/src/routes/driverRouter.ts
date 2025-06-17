import express, { RequestHandler } from "express";
import controller from "../controller/driverController";
import { driverAuthMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post(
  "/login",
  controller.login as RequestHandler
);

export default router;
