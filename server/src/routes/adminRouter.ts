import express, { RequestHandler } from 'express';
import controller from '../controller/adminController';
import { adminAuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/signup', controller.signup as RequestHandler);
router.post('/login', controller.login as RequestHandler);

// Protected routes
router.get('/', adminAuthMiddleware as RequestHandler, controller.getAdmin as RequestHandler);


//hotel routes
router.post('/create/hotel', adminAuthMiddleware as RequestHandler, controller.createHotel as RequestHandler);
router.put('/edit/hotel/:id', adminAuthMiddleware as RequestHandler, controller.editHotel as RequestHandler);
router.delete('/delete/hotel/:id', adminAuthMiddleware as RequestHandler, controller.deleteHotel as RequestHandler);
router.get('/get/hotel', adminAuthMiddleware as RequestHandler, controller.getHotel as RequestHandler);

//frontdesk routes
router.post('/add/frontdesk', adminAuthMiddleware as RequestHandler, controller.addFrontdesk as RequestHandler);
router.put('/edit/frontdesk/:id', adminAuthMiddleware as RequestHandler, controller.editFrontdesk as RequestHandler);
router.delete('/delete/frontdesk/:id', adminAuthMiddleware as RequestHandler, controller.deleteFrontdesk as RequestHandler);
router.get('/get/frontdesk', adminAuthMiddleware as RequestHandler, controller.getFrontdesk as RequestHandler);



export default router;  