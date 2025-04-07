import { Router } from 'express';
import {
    getAllPurchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder
} from '../controllers/purchaseOrder.controller.js';

const router = Router();

router.get('/', getAllPurchaseOrders);
router.post('/', addPurchaseOrder);
router.put('/:id', updatePurchaseOrder);
router.delete('/:id', deletePurchaseOrder);

// Add routes for GET /:id if needed

export default router;