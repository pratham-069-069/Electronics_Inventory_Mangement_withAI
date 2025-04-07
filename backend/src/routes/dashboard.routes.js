import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/stats', getDashboardStats); // Endpoint: /api/dashboard/stats

export default router;