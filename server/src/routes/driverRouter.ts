import express from 'express';
import controller from '../controller/driverController';

const router = express.Router();

router.get('/', controller.getDriver);

export default router;