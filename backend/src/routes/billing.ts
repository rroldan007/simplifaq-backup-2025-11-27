import { Router } from 'express';
import { BillingController } from '../controllers/billingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/plans', BillingController.getPlans);

// Stripe webhook (must be before auth middleware)
router.post('/webhook/stripe', BillingController.handleStripeWebhook);

// Protected routes
router.use(authenticateToken);

// Subscription management
router.post('/subscription', BillingController.createSubscription);
router.get('/subscription', BillingController.getCurrentSubscription);
router.put('/subscription/upgrade', BillingController.upgradeSubscription);
router.post('/subscription/cancel', BillingController.cancelSubscription);
router.post('/cancel', BillingController.cancelSubscription); // Alias for frontend
router.post('/subscribe', BillingController.createSubscription); // Alias for frontend

// Payment
router.post('/payment-intent', authenticateToken, BillingController.createPaymentIntent);

// Billing history
router.get('/history', BillingController.getBillingHistory);
router.get('/invoices', BillingController.getBillingHistory); // Alias for frontend

export default router;