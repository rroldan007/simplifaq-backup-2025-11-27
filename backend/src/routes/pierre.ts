/**
 * Pierre Routes - API routes for Pierre AI Assistant
 */

import { Router } from 'express';
import { PierreController } from '../controllers/pierreController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Status route (public)
router.get('/status', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Pierre assistant routes are loaded and working',
    version: '1.0.0'
  });
});

// Test Ollama connection (public for diagnostics)
router.get('/test', PierreController.testConnection);

// Protected routes
router.post('/chat', authenticateToken, PierreController.chat);
router.post('/confirm', authenticateToken, PierreController.confirmAction);
router.delete('/conversation/:conversationId', authenticateToken, PierreController.clearConversation);

export default router;
