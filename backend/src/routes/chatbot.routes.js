import { Router } from 'express';
import { handleChat } from '../controllers/chatbot.controller.js';

const router = Router();

router.post('/', handleChat); // Endpoint: /api/chatbot

export default router;