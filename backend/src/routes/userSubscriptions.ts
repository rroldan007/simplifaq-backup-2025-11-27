import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getMySubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  getAvailablePlans,
} from '../controllers/userSubscriptionController';

const router = Router();

// Protected routes - require authentication
router.get('/me', authenticateToken, getMySubscription);
router.post('/checkout', authenticateToken, createCheckoutSession);
router.post('/portal', authenticateToken, createPortalSession);
router.post('/cancel', authenticateToken, cancelSubscription);
router.post('/reactivate', authenticateToken, reactivateSubscription);

export default router;
