import { Router } from 'express';
import {
  getUserSmtpConfig,
  updateUserSmtpConfig,
  testUserSmtpConfig,
  getUserSmtpStats,
  getUserSmtpLogs,
  deleteUserSmtpConfig,
  getSmtpPresets,
} from '../controllers/userSmtpController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/user/smtp/config
 * @desc    Get user's SMTP configuration
 * @access  Private
 */
router.get('/config', getUserSmtpConfig);

/**
 * @route   PATCH /api/user/smtp/config
 * @desc    Create or update user's SMTP configuration
 * @access  Private
 */
router.patch('/config', updateUserSmtpConfig);

/**
 * @route   DELETE /api/user/smtp/config
 * @desc    Delete user's SMTP configuration
 * @access  Private
 */
router.delete('/config', deleteUserSmtpConfig);

/**
 * @route   POST /api/user/smtp/test
 * @desc    Test user's SMTP configuration by sending a test email
 * @access  Private
 */
router.post('/test', testUserSmtpConfig);

/**
 * @route   GET /api/user/smtp/stats
 * @desc    Get user's email statistics
 * @access  Private
 */
router.get('/stats', getUserSmtpStats);

/**
 * @route   GET /api/user/smtp/logs
 * @desc    Get user's email logs with pagination
 * @access  Private
 */
router.get('/logs', getUserSmtpLogs);

/**
 * @route   GET /api/user/smtp/presets
 * @desc    Get SMTP presets for common providers
 * @access  Private
 */
router.get('/presets', getSmtpPresets);

export default router;
