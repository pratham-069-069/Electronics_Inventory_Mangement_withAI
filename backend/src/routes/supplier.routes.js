// src/routes/supplier.routes.js
import { Router } from 'express';
// Add updateSupplier to imports
import { getAllSuppliers, addSupplier, deleteSupplier, updateSupplier } from '../controllers/supplier.controller.js';

const router = Router();

router.get('/', getAllSuppliers);
router.post('/', addSupplier);
router.delete('/:id', deleteSupplier);
router.put('/:id', updateSupplier); // New route for updating

export default router;