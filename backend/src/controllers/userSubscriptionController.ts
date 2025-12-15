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

// Use any to avoid TypeScript conflicts with existing auth middleware
type AuthRequest = any;

/**
 * GET /api/subscriptions/me
 * Get current user's subscription details
 */
export async function getMySubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
        usageRecords: {
          where: { period: new Date().toISOString().slice(0, 7) },
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({ 
        success: false,
        error: 'Subscription not found' 
      });
    }

    // Calculate current usage
    const usage = subscription.usageRecords.reduce((acc, record) => {
      acc[record.resourceType] = record.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Format usage with limits
    const usageFormatted = {
      invoices: {
        current: usage.invoices || 0,
        limit: subscription.plan.maxInvoicesPerMonth,
        percentage: subscription.plan.maxInvoicesPerMonth > 0 
          ? Math.round(((usage.invoices || 0) / subscription.plan.maxInvoicesPerMonth) * 100)
          : 0,
      },
      clients: {
        current: usage.clients || 0,
        limit: subscription.plan.maxClientsTotal,
        percentage: subscription.plan.maxClientsTotal > 0
          ? Math.round(((usage.clients || 0) / subscription.plan.maxClientsTotal) * 100)
          : 0,
      },
      products: {
        current: usage.products || 0,
        limit: subscription.plan.maxProductsTotal,
        percentage: subscription.plan.maxProductsTotal > 0
          ? Math.round(((usage.products || 0) / subscription.plan.maxProductsTotal) * 100)
          : 0,
      },
      storage: {
        current: subscription.storageUsed || 0,
        limit: subscription.plan.storageLimit,
        percentage: Math.round(((subscription.storageUsed || 0) / subscription.plan.storageLimit) * 100),
      },
    };

    res.json({
      success: true,
      data: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          displayName: subscription.plan.displayName,
          description: subscription.plan.description,
          price: subscription.plan.price,
          currency: subscription.plan.currency,
          features: {
            maxInvoicesPerMonth: subscription.plan.maxInvoicesPerMonth,
            maxClientsTotal: subscription.plan.maxClientsTotal,
            maxProductsTotal: subscription.plan.maxProductsTotal,
            hasEmailSupport: subscription.plan.hasEmailSupport,
            hasPrioritySupport: subscription.plan.hasPrioritySupport,
            hasAdvancedReports: subscription.plan.hasAdvancedReports,
            hasApiAccess: subscription.plan.hasApiAccess,
            hasCustomBranding: subscription.plan.hasCustomBranding,
            storageLimit: subscription.plan.storageLimit,
            hasSwissQRBill: subscription.plan.hasSwissQRBill,
            hasMultiCurrency: subscription.plan.hasMultiCurrency,
            hasMultiLanguage: subscription.plan.hasMultiLanguage,
          },
        },
        usage: usageFormatted,
      },
    });
  } catch (error) {
    console.error('Get my subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/subscriptions/checkout
 * Create Stripe checkout session for plan upgrade
 */
export async function createCheckoutSession(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
    }

    // Get user and plan
    const [user, plan, currentSubscription] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
      prisma.subscription.findUnique({ where: { userId } }),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    // Validate plan has Stripe price ID
    if (!(plan as any).stripePriceId) {
      return res.status(400).json({
        success: false,
        error: 'This plan cannot be purchased online',
      });
    }

    // Check if user is already on this plan
    if (currentSubscription?.planId === planId && currentSubscription?.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'You are already on this plan',
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId = currentSubscription?.stripeCustomerId || null;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user.id,
          companyName: user.companyName,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: (plan as any).stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?checkout=cancelled`,
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
      },
    });

    res.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout session',
    });
  }
}

/**
 * POST /api/subscriptions/portal
 * Create Stripe billing portal session
 */
export async function createPortalSession(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer found. Please subscribe to a plan first.',
      });
    }

    // Create billing portal session
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({
      success: true,
      data: {
        portalUrl: session.url,
      },
    });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create portal session',
    });
  }
}

/**
 * POST /api/subscriptions/cancel
 * Cancel current subscription (at period end)
 */
export async function cancelSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { immediate = false } = req.body;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Subscription is already cancelled',
      });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No active paid subscription to cancel',
      });
    }

    // Cancel in Stripe
    if (immediate) {
      await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Update in database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: !immediate,
        ...(immediate && {
          status: 'cancelled',
          cancelledAt: new Date(),
        }),
      },
    });

    // Log cancellation
    await prisma.billingLog.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        eventType: 'subscription_cancelled',
        status: 'success',
        metadata: {
          immediate,
          reason: 'user_requested',
          planName: subscription.plan.name,
        },
      },
    });

    res.json({
      success: true,
      data: {
        cancelAtPeriodEnd: !immediate,
        cancelledImmediately: immediate,
        message: immediate
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at the end of the current period',
      },
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel subscription',
    });
  }
}

/**
 * POST /api/subscriptions/reactivate
 * Reactivate a cancelled subscription
 */
export async function reactivateSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        error: 'Subscription is not scheduled for cancellation',
      });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe subscription found',
      });
    }

    // Reactivate in Stripe
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update in database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        status: 'active',
      },
    });

    // Log reactivation
    await prisma.billingLog.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        eventType: 'subscription_reactivated',
        status: 'success',
        metadata: {
          reason: 'user_requested',
        },
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Subscription reactivated successfully',
      },
    });
  } catch (error: any) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reactivate subscription',
    });
  }
}

/**
 * GET /api/subscriptions/current
 * Get current user's subscription with full plan details (simplified version)
 */
export async function getCurrentSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Aucun abonnement trouvé',
        },
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération de l\'abonnement',
      },
    });
  }
}

/**
 * GET /api/subscriptions/usage
 * Get current user's usage statistics
 */
export async function getUsageStats(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    // Get subscription to know limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Aucun abonnement trouvé',
        },
      });
    }

    // Count current month's invoices
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const invoicesThisMonth = await prisma.invoice.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Count total clients
    const clientsTotal = await prisma.client.count({
      where: { userId },
    });

    // Count total products
    const productsTotal = await prisma.product.count({
      where: { userId },
    });

    // Calculate storage used
    const storageUsed = subscription.storageUsed || 0;

    res.json({
      success: true,
      data: {
        invoicesThisMonth,
        invoicesLimit: subscription.plan.maxInvoicesPerMonth,
        clientsTotal,
        clientsLimit: subscription.plan.maxClientsTotal,
        productsTotal,
        productsLimit: subscription.plan.maxProductsTotal,
        storageUsed,
        storageLimit: subscription.plan.storageLimit,
      },
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération de l\'utilisation',
      },
    });
  }
}

/**
 * POST /api/subscriptions/change-plan
 * Change the user's subscription plan (without Stripe for now)
 */
export async function changePlan(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'L\'ID du plan est requis',
        },
      });
    }

    // Verify plan exists and is active
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_PLAN',
          message: 'Plan invalide ou inactif',
        },
      });
    }

    // Get or create subscription
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription) {
      // Update existing subscription
      subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          planId,
          status: 'active',
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      });
    } else {
      // Create new subscription
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      subscription = await prisma.subscription.create({
        data: {
          userId,
          planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
        },
      });
    }

    res.json({
      success: true,
      data: subscription,
      message: 'Plan changé avec succès',
    });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors du changement de plan',
      },
    });
  }
}

/**
 * GET /api/plans
 * Get all available plans (public endpoint)
 */
export async function getAvailablePlans(req: Request, res: Response) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        price: true,
        currency: true,
        maxInvoicesPerMonth: true,
        maxClientsTotal: true,
        maxProductsTotal: true,
        hasEmailSupport: true,
        hasPrioritySupport: true,
        hasAdvancedReports: true,
        hasApiAccess: true,
        hasCustomBranding: true,
        storageLimit: true,
        hasSwissQRBill: true,
        hasMultiCurrency: true,
        hasMultiLanguage: true,
      },
    });

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error('Get available plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans',
    });
  }
}
