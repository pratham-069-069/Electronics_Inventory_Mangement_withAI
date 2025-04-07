// src/routes/user.routes.js
import { Router } from 'express';
// --- 👇 Import the new deleteUser function ---
import { getAllUsers, addUser, loginUser, deleteUser } from '../controllers/user.controller.js';

const router = Router();

// Existing routes
router.get('/', getAllUsers);
router.post('/', addUser);
router.post('/login', loginUser);

// --- 👇 Add the new DELETE route ---
router.delete('/:id', deleteUser); // Handles DELETE /api/users/:id

// Add routes for GET /:id, PUT /:id if needed for updating users later

export default router;