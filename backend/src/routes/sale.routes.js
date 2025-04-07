import { Router } from 'express';
import { getAllSales, addSale } from '../controllers/sale.controller.js';

const router = Router();

router.get('/', getAllSales);
router.post('/', addSale);

// Add routes for GET /:id, etc. if needed

export default router;