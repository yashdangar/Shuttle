import express from 'express';
import controller from '../controller/frontdeskController';

const router = express.Router();

router.get('/', controller.getFrontdesk);

export default router; 