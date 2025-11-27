import express from 'express';
import { AIController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All AI routes require authentication
router.use(authenticateToken);

// Debug endpoint to test AI service directly
router.get('/debug', AIController.debugAI);

// Test AI connection
router.get('/test', AIController.testConnection);

// Ask a general question
router.post('/ask', AIController.askQuestion);

// Execute a confirmed action
router.post('/execute', AIController.executeAction);

// Invoice-specific AI features
router.post('/invoice/suggestions', AIController.getInvoiceSuggestions);
router.post('/invoice/analyze', AIController.analyzeInvoice);

// Product/service descriptions
router.post('/generate/description', AIController.generateDescription);

// Client suggestions
router.post('/suggest/client', AIController.suggestClientInfo);

export default router;
