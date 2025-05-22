// src/routes/sale.routes.js
import { Router } from 'express';
// Add getEligibleSalesItemsForReturn to imports
import { getAllSales, addSale, getEligibleSalesItemsForReturn } from '../controllers/sale.controller.js';

const router = Router();

router.get('/', getAllSales);
router.post('/', addSale);

// New route for fetching sales items eligible for return
router.get('/items-for-return', getEligibleSalesItemsForReturn); // Match the frontend URL, or adjust frontend

export default router;