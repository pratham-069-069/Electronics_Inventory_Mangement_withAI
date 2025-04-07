import { Router } from 'express';
// --- 👇 Import the new deleteAlert function ---
import { getInventoryAlerts, deleteAlert } from '../controllers/inventoryAlert.controller.js';

const router = Router();

// Existing GET route
router.get('/', getInventoryAlerts);

// --- 👇 Add the new DELETE route ---
router.delete('/:id', deleteAlert); // Handles DELETE /api/inventory-alerts/:id

// Add POST/PUT for managing alert thresholds if needed

export default router;