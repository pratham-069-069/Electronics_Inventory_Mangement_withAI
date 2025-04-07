import { Router } from 'express';
import { getAllProducts, addProduct, deleteProduct } from '../controllers/product.controller.js';

const router = Router();

router.get('/', getAllProducts);
router.post('/', addProduct);
router.delete('/:id', deleteProduct);

// Add routes for GET /:id, PUT /:id if needed

export default router;