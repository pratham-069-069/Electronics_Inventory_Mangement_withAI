// src/routes/billing.routes.js
import { Router } from 'express';
import { getInvoiceDetails } from '../controllers/billing.controller.js';

const router = Router();

// Route to get details for a specific invoice
router.get('/invoice/:salesId', getInvoiceDetails);

// Add other billing-related routes here if needed later (e.g., generating PDFs)

export default router;