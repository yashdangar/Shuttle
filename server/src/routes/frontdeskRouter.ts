import express, { RequestHandler } from 'express';
import controller from '../controller/frontdeskController';
import { frontdeskAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Protected routes
router.get('/', frontdeskAuthMiddleware as RequestHandler, controller.getFrontdesk as RequestHandler);

export default router; 