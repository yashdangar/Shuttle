import express, { RequestHandler } from 'express';
import { frontdeskAuthMiddleware } from '../middleware/authMiddleware';
import controller from '../controller/frontdeskController';

const router = express.Router();

// Public routes
router.post('/login', controller.login as RequestHandler);

// Protected routes
router.get('/', frontdeskAuthMiddleware as RequestHandler,  controller.getFrontdesk as RequestHandler);

// Shuttle routes 
router.get("/shuttle", frontdeskAuthMiddleware as RequestHandler, controller.getShuttle as RequestHandler);

// Driver routes 
router.get("/driver", frontdeskAuthMiddleware as RequestHandler, controller.getDriver as RequestHandler);


export default router; 