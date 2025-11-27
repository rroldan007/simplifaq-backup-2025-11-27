import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { User } from '@prisma/client';
import Stripe from 'stripe';
import { z } from 'zod';
import { SubscriptionService } from '../services/subscriptionService';

const prisma = new PrismaClient();

// Lazy initialization of Stripe - only when needed
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

// Validation schemas
const createSubscriptionSchema = z.object({
  planId: z.string().min(1, 'Plan ID requis'),
  paymentMethodId: z.string().optional(),
});

const upgradeSubscriptionSchema = z.object({
  planId: z.string().min(1, 'Plan ID requis'),
  prorated: z.boolean().optional().default(true),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().optional().default(false),
});



export class BillingController {
  // Create subscription
  static async createSubscription(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      const { plan, planId, paymentMethodId } = req.body;
      const selectedPlanId = plan || planId;

      if (!selectedPlanId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Plan ID requis',
          },
        });
      }

      const subscription = await SubscriptionService.createSubscription(
        req.user.id,
        selectedPlanId,
        paymentMethodId
      );

      return res.status(201).json({
        success: true,
        data: subscription,
        message: 'Abonnement créé avec succès',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données invalides',
            details: error.issues,
          },
        });
      }

      console.error('Create subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR',
          message: error instanceof Error ? error.message : 'Erreur lors de la création de l\'abonnement',
        },
      });
    }
  }

  // Upgrade subscription
  static async upgradeSubscription(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      const { planId, prorated } = upgradeSubscriptionSchema.parse(req.body);

      const subscription = await SubscriptionService.upgradeSubscription({
        userId: req.user.id,
        newPlanId: planId,
        prorated,
      });

      return res.json({
        success: true,
        data: subscription,
        message: 'Abonnement mis à jour avec succès',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données invalides',
            details: error.issues,
          },
        });
      }

      console.error('Upgrade subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR',
          message: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'abonnement',
        },
      });
    }
  }

  // Cancel subscription
  static async cancelSubscription(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      const { immediate } = cancelSubscriptionSchema.parse(req.body);

      const subscription = await SubscriptionService.cancelSubscription(req.user.id, immediate);

      return res.json({
        success: true,
        message: immediate ? 'Abonnement annulé immédiatement' : 'Abonnement annulé à la fin de la période',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données invalides',
            details: error.issues,
          },
        });
      }

      console.error('Cancel subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR',
          message: error instanceof Error ? error.message : 'Erreur lors de l\'annulation de l\'abonnement',
        },
      });
    }
  }

  // Get current subscription
  static async getCurrentSubscription(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      let subscription = await SubscriptionService.getSubscriptionWithUsage(req.user.id);

      // If no subscription found, return default free plan
      if (!subscription) {
        return res.json({
          success: true,
          data: {
            subscription: {
              id: 'default',
              plan: 'free',
              status: 'active',
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
            },
          },
        });
      }

      return res.json({
        success: true,
        data: {
          subscription,
        },
      });
    } catch (error) {
      console.error('Get current subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Get available plans
  static async getPlans(req: Request, res: Response): Promise<Response | void> {
    try {
      const plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });

      return res.json({
        success: true,
        data: plans,
      });
    } catch (error) {
      console.error('Get plans error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Get billing history
  static async getBillingHistory(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
      });

      // Return empty array if no subscription
      if (!subscription) {
        return res.json({
          success: true,
          data: {
            invoices: [],
          },
        });
      }

      const billingHistory = await prisma.billingLog.findMany({
        where: { subscriptionId: subscription.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Format for frontend
      const formattedInvoices = billingHistory.map((log: any) => ({
        id: log.id,
        amount: Number(log.amount || 0),
        currency: log.currency || 'CHF',
        status: log.status === 'success' ? 'paid' : log.status === 'failed' ? 'failed' : 'pending',
        date: log.createdAt.toISOString(),
        invoiceUrl: log.stripeInvoiceUrl || undefined,
      }));

      return res.json({
        success: true,
        data: {
          invoices: formattedInvoices,
        },
      });
    } catch (error) {
      console.error('Get billing history error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Create payment intent for subscription
  static async createPaymentIntent(req: Request, res: Response): Promise<Response | void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      const { planId } = req.body;

      // Get plan details
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PLAN_NOT_FOUND',
            message: 'Plan non trouvé',
          },
        });
      }

      // Create payment intent
      const paymentIntent = await getStripe().paymentIntents.create({
        amount: Math.round(Number(plan.price) * 100),
        currency: plan.currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: req.user.id,
          planId: plan.id,
          planName: plan.name,
        },
      });

      return res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          amount: Number(plan.price),
          currency: plan.currency,
          planName: plan.displayName,
        },
      });
    } catch (error) {
      console.error('Create payment intent error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_ERROR',
          message: 'Erreur lors de la création du paiement',
        },
      });
    }
  }

  // Stripe webhook handler
  static async handleStripeWebhook(req: Request, res: Response): Promise<Response | void> {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      return res.status(500).json({ error: 'Webhook handler failed' });
    }
  }

  // Handle successful invoice payment
  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription as string;
    
    if (!subscriptionId) return;

    // Find subscription by Stripe ID
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      console.error('Subscription not found for Stripe ID:', subscriptionId);
      return;
    }

    // Process billing cycle
    await SubscriptionService.processBillingCycle({
      subscriptionId: subscription.id,
      amount: (invoice as any).amount_paid / 100, // Convert from cents
      currency: (invoice as any).currency.toUpperCase(),
      status: 'success',
      stripeInvoiceId: invoice.id,
      stripePaymentId: (invoice as any).payment_intent as string,
    });
  }

  // Handle failed invoice payment
  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = (invoice as any).subscription as string;
    
    if (!subscriptionId) return;

    // Find subscription by Stripe ID
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      console.error('Subscription not found for Stripe ID:', subscriptionId);
      return;
    }

    // Process billing cycle
    await SubscriptionService.processBillingCycle({
      subscriptionId: subscription.id,
      amount: (invoice as any).amount_due / 100, // Convert from cents
      currency: (invoice as any).currency.toUpperCase(),
      status: 'failed',
      stripeInvoiceId: invoice.id,
      errorMessage: 'Payment failed',
    });
  }

  // Handle subscription updated
  private static async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      console.error('Subscription not found for Stripe ID:', stripeSubscription.id);
      return;
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: stripeSubscription.status === 'active' ? 'active' : 
               stripeSubscription.status === 'past_due' ? 'past_due' : 
               stripeSubscription.status === 'canceled' ? 'cancelled' : 'unpaid',
        currentPeriodStart: new Date(((stripeSubscription as any).current_period_start) * 1000),
        currentPeriodEnd: new Date(((stripeSubscription as any).current_period_end) * 1000),
        cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
      },
    });
  }

  // Handle subscription deleted
  private static async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      console.error('Subscription not found for Stripe ID:', stripeSubscription.id);
      return;
    }

    // Update subscription to cancelled
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        stripeSubscriptionId: null,
      },
    });

    // Update user to free plan
    const freePlan = await prisma.plan.findUnique({
      where: { name: 'free' },
    });

    if (freePlan) {
      await prisma.user.update({
        where: { id: subscription.userId },
        data: { subscriptionPlan: 'free' },
      });
    }
  }

  // Handle payment method attached
  private static async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
    // Update subscription payment method if needed
    if (paymentMethod.customer) {
      const subscription = await prisma.subscription.findFirst({
        where: { stripeCustomerId: paymentMethod.customer as string },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { paymentMethod: 'card' },
        });
      }
    }
  }
}