import express from 'express';
import controller from '../controller/guestController';

const router = express.Router();

router.get('/', controller.getGuest);

export default router; 