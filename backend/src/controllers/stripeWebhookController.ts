import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Stripe
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe not configured: missing STRIPE_SECRET_KEY');
  }
  return new Stripe(key);
}

/**
 * Main webhook handler for Stripe events
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Received Stripe event: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle checkout.session.completed
 * Triggered when a user completes the checkout process
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    console.error('Missing userId or planId in checkout session metadata');
    return;
  }

  console.log(`Processing checkout for user ${userId}, plan ${planId}`);

  // Check if already processed (idempotency)
  const existingLog = await prisma.billingLog.findFirst({
    where: { stripeEventId: session.id },
  });

  if (existingLog) {
    console.log('Checkout session already processed');
    return;
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    console.error(`Plan ${planId} not found`);
    return;
  }

  // Calculate period end (30 days from now)
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

  // Update or create subscription
  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      planId,
      status: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      currentPeriodStart: new Date(),
      currentPeriodEnd,
      paymentMethod: 'card',
      billingEmail: session.customer_details?.email || undefined,
    },
    update: {
      planId,
      status: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      currentPeriodStart: new Date(),
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
  });

  // Update user's subscription plan
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionPlan: plan.name },
  });

  // Create billing log
  await prisma.billingLog.create({
    data: {
      subscriptionId: subscription.id,
      userId,
      eventType: 'checkout_completed',
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency?.toUpperCase() || 'CHF',
      status: 'success',
      stripeEventId: session.id,
      stripePaymentId: session.payment_intent as string,
      metadata: {
        planName: plan.name,
        sessionId: session.id,
      },
    },
  });

  console.log(`✅ Checkout completed for user ${userId}`);
}

/**
 * Handle customer.subscription.created/updated
 */
async function handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription) {
  const customerId = stripeSubscription.customer as string;

  // Find subscription by Stripe customer ID
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) {
    console.log(`No subscription found for Stripe customer ${customerId}`);
    return;
  }

  // Update subscription details
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: stripeSubscription.status,
      stripeSubscriptionId: stripeSubscription.id,
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
    },
  });

  // Log the update
  await prisma.billingLog.create({
    data: {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      eventType: 'subscription_updated',
      status: 'success',
      stripeEventId: stripeSubscription.id,
      metadata: {
        stripeStatus: stripeSubscription.status,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    },
  });

  console.log(`✅ Subscription updated for ${subscription.id}`);
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const customerId = stripeSubscription.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!subscription) {
    console.log(`No subscription found for Stripe customer ${customerId}`);
    return;
  }

  // Find free plan
  const freePlan = await prisma.plan.findFirst({
    where: { name: 'free' },
  });

  if (!freePlan) {
    console.error('Free plan not found in database');
    return;
  }

  // Downgrade to free plan
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      planId: freePlan.id,
      status: 'cancelled',
      cancelledAt: new Date(),
      stripeSubscriptionId: null,
    },
  });

  // Update user
  await prisma.user.update({
    where: { id: subscription.userId },
    data: { subscriptionPlan: 'free' },
  });

  // Log cancellation
  await prisma.billingLog.create({
    data: {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      eventType: 'subscription_cancelled',
      status: 'success',
      stripeEventId: stripeSubscription.id,
      metadata: {
        reason: 'stripe_subscription_deleted',
        downgradedToFree: true,
      },
    },
  });

  console.log(`✅ Subscription cancelled and downgraded to free for user ${subscription.userId}`);
}

/**
 * Handle invoice.payment_succeeded
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { plan: true },
  });

  if (!subscription) {
    console.log(`No subscription found for Stripe customer ${customerId}`);
    return;
  }

  // Check if already processed
  const existingLog = await prisma.billingLog.findFirst({
    where: { stripeInvoiceId: invoice.id },
  });

  if (existingLog) {
    console.log('Invoice payment already processed');
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'active',
      currentPeriodEnd: new Date(invoice.period_end * 1000),
    },
  });

  // Create billing log
  await prisma.billingLog.create({
    data: {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      eventType: 'payment_succeeded',
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'success',
      stripeEventId: invoice.id,
      stripeInvoiceId: invoice.id,
      stripePaymentId: (invoice as any).payment_intent as string,
      metadata: {
        planName: subscription.plan.name,
        invoiceNumber: invoice.number,
        periodStart: new Date(invoice.period_start * 1000).toISOString(),
        periodEnd: new Date(invoice.period_end * 1000).toISOString(),
      },
    },
  });

  console.log(`✅ Payment succeeded for subscription ${subscription.id}`);
}

/**
 * Handle invoice.payment_failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { plan: true },
  });

  if (!subscription) {
    console.log(`No subscription found for Stripe customer ${customerId}`);
    return;
  }

  // Update subscription status to past_due
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'past_due' },
  });

  // Create billing log
  await prisma.billingLog.create({
    data: {
      subscriptionId: subscription.id,
      userId: subscription.userId,
      eventType: 'payment_failed',
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      stripeEventId: invoice.id,
      stripeInvoiceId: invoice.id,
      errorMessage: 'Payment failed',
      metadata: {
        planName: subscription.plan.name,
        invoiceNumber: invoice.number,
        attemptCount: invoice.attempt_count,
      },
    },
  });

  console.log(`⚠️  Payment failed for subscription ${subscription.id}`);
}

/**
 * Handle customer.updated
 */
async function handleCustomerUpdated(customer: Stripe.Customer) {
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customer.id },
  });

  if (!subscription) {
    console.log(`No subscription found for Stripe customer ${customer.id}`);
    return;
  }

  // Update billing email if changed
  if (customer.email) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { billingEmail: customer.email },
    });
  }

  console.log(`✅ Customer updated for subscription ${subscription.id}`);
}
