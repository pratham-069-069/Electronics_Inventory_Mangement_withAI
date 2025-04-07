// src/routes/category.routes.js
import { Router } from 'express';
import { getAllCategories } from '../controllers/category.controller.js';

const router = Router();

// Define the route to get all categories
router.get('/', getAllCategories);

// Add other routes for categories here if needed (POST /, DELETE /:id, etc.)

export default router;