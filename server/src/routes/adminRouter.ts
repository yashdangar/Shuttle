import express from 'express';
import controller from '../controller/adminController';

const router = express.Router();

router.get('/', controller.getAdmin);

export default router; 