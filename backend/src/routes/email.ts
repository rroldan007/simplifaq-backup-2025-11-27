import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  testEmailConfiguration,
  getEmailServiceStatus,
} from '../controllers/emailController';

const router = Router();

// All email routes require authentication
router.use(authenticateToken);

// POST /api/email/test - Test email configuration
router.post('/test', testEmailConfiguration);

// GET /api/email/status - Get email service status
router.get('/status', getEmailServiceStatus);

export default router;