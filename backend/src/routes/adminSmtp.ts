import { Router } from 'express';
import {
  getSmtpConfig,
  createOrUpdateSmtpConfig,
  testSmtpConfig,
  deleteSmtpConfig,
  getSmtpLogs,
  getSmtpStats,
} from '../controllers/adminSmtpController';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

/**
 * SMTP Configuration Routes (Admin Only)
 * Base path: /api/admin/smtp
 */

// Apply admin authentication to all routes
router.use(adminAuth);

// Get current SMTP configuration
router.get('/config', getSmtpConfig);

// Create or update SMTP configuration
router.post('/config', createOrUpdateSmtpConfig);

// Test SMTP configuration
router.post('/config/test', testSmtpConfig);

// Delete SMTP configuration
router.delete('/config/:id', deleteSmtpConfig);

// Get SMTP logs with pagination
router.get('/logs', getSmtpLogs);

// Get SMTP statistics
router.get('/stats', getSmtpStats);

export default router;
