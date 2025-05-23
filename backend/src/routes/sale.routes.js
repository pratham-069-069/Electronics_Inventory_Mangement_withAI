// src/routes/sale.routes.js
import { Router } from 'express';
// Add getEligibleSalesItemsForReturn to imports
// import { getAllSales, addSale, getEligibleSalesItemsForReturn } from '../controllers/sale.controller.js';
import { getAllSales, addSale, getEligibleSalesItemsForReturn, updateSale } from '../controllers/sale.controller.js'; // Add updateSale

// ...

const router = Router();

router.get('/', getAllSales);
router.post('/', addSale);
router.put('/:salesId', updateSale);

// New route for fetching sales items eligible for return
router.get('/items-for-return', getEligibleSalesItemsForReturn); // Match the frontend URL, or adjust frontend

export default router;