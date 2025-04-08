// src/routes/return.routes.js
import { Router } from 'express';
// Import controller functions
import { getAllReturns, addReturn } from '../controllers/return.controller.js';

const router = Router();

// Route to get all returns
router.get('/', getAllReturns);

// Route to add a new return (Implementation in controller is basic for now)
router.post('/', addReturn);

export default router;