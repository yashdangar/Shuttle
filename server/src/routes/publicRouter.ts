import express from "express";
import controller from "../controller/publicController";

const router = express.Router();

// Public file access - no authentication required
router.get("/file", controller.getPublicFile as any);

export default router; 