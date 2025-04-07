import { Router } from 'express';
import { getAllSuppliers, addSupplier, deleteSupplier } from '../controllers/supplier.controller.js';

const router = Router();

router.get('/', getAllSuppliers);
router.post('/', addSupplier);
router.delete('/:id', deleteSupplier);

// Add routes for GET /:id, PUT /:id if needed

export default router;