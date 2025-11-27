import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/stripeWebhookController';

const router = Router();

/**
 * Stripe webhook endpoint
 * IMPORTANT: Must use raw body for signature verification
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;
