import { Router } from 'express';
import {
  createFeedback,
  getAllFeedbacks,
  deleteFeedbackByEmail,
  getFeedbackStats
} from '../controllers/feedbackController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/adminAuth';

const router = Router();

/**
 * Public route - Create feedback (no auth required)
 * POST /api/feedback
 */
router.post('/', createFeedback);

/**
 * Admin routes - Require authentication and admin permissions
 */
router.get('/', authenticateToken, requirePermission('users', 'read'), getAllFeedbacks);
router.get('/stats', authenticateToken, requirePermission('users', 'read'), getFeedbackStats);
router.delete('/:email', authenticateToken, requirePermission('users', 'delete'), deleteFeedbackByEmail);

export default router;
