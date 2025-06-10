import express, { RequestHandler } from 'express';
import controller from '../controller/adminController';
import { adminAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/signup', controller.signup as RequestHandler);
router.post('/login', controller.login as RequestHandler);
router.post("/add/frontdesk", controller.addFrontdesk as RequestHandler);

// Protected routes
router.get('/', adminAuthMiddleware as RequestHandler, controller.getAdmin as RequestHandler);


//hotel routes
router.post('/create/hotel', controller.createHotel as RequestHandler);
router.put('/edit/hotel/:id',  controller.editHotel as RequestHandler);
router.delete('/delete/hotel/:id', controller.deleteHotel as RequestHandler);
router.get('/get/hotel/:token', controller.getHotel as RequestHandler);

export default router;  