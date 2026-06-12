import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';

const router = Router();

router.get('/v1/models', chatController.getModels);
router.post('/api/chat/stream', chatController.streamChat);

export default router;