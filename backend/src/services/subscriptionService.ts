import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe not configured: missing STRIPE_SECRET_KEY');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

export interface SubscriptionUpgradeData {
  userId: string;
  newPlanId: string;
  prorated?: boolean;
}

export interface UsageTrackingData {
  userId: string;
  resourceType: 'invoices' | 'clients' | 'products' | 'storage' | 'api_calls' | 'quotes';
  quantity: number;
  period?: string;
}

export interface BillingCycleData {
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  stripeInvoiceId?: string;
  stripePaymentId?: string;
  errorMessage?: string;
}

export class SubscriptionService {
  // Create new subscription
  static async createSubscription(userId: string, planId: string, paymentMethodId?: string) {
    try {
      // Get user and plan details
      const [user, plan] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.plan.findUnique({ where: { id: planId } }),
      ]);

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (!plan) {
        throw new Error('Plan non trouvé');
      }

      // Check if user already has a subscription
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription) {
        throw new Error('L\'utilisateur a déjà un abonnement');
      }

      let stripeCustomerId = null;
      let stripeSubscriptionId = null;

      // Create Stripe customer and subscription for paid plans
      if (Number(plan.price) > 0) {
        if (!paymentMethodId) {
          throw new Error('Méthode de paiement requise pour les plans payants');
        }

        // Create Stripe customer
        const stripeCustomer = await getStripe().customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id,
            companyName: user.companyName,
          },
        });

        stripeCustomerId = stripeCustomer.id;

        // Attach payment method to customer
        await getStripe().paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomerId,
        });

        // Set as default payment method
        await getStripe().customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // Create Stripe subscription using a configured Price ID
        if (!('stripePriceId' in plan) || !(plan as any).stripePriceId) {
          throw new Error('stripePriceId manquant dans le plan. Configurez un Price en Stripe.');
        }
        const stripeSubscription = await getStripe().subscriptions.create({
          customer: stripeCustomerId,
          items: [
            {
              price: (plan as any).stripePriceId,
            },
          ],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            userId: user.id,
            planId: plan.id,
          },
        });

        stripeSubscriptionId = stripeSubscription.id;
      }

      // Calculate subscription period
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      // Create subscription in database
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId,
          status: Number(plan.price) > 0 ? 'active' : 'active',
          currentPeriodStart,
          currentPeriodEnd,
          stripeCustomerId,
          stripeSubscriptionId,
          paymentMethod: paymentMethodId ? 'card' : undefined,
          billingEmail: user.email,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyName: true,
              firstName: true,
              lastName: true,
            },
          },
          plan: true,
        },
      });

      // Log billing event
      await prisma.billingLog.create({
        data: {
          subscriptionId: subscription.id,
          userId,
          eventType: 'subscription_created',
          amount: plan.price,
          currency: plan.currency,
          status: 'success',
          metadata: {
            planName: plan.name,
            stripeSubscriptionId,
            paymentMethod: paymentMethodId ? 'card' : 'free',
          },
        },
      });

      // Update user subscription plan
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionPlan: plan.name },
      });

      return subscription;
    } catch (error) {
      console.error('Create subscription error:', error);
      throw error;
    }
  }

  // Upgrade/downgrade subscription
  static async upgradeSubscription(data: SubscriptionUpgradeData) {
    try {
      const { userId, newPlanId, prorated = true } = data;

      // Get current subscription and new plan
      const [currentSubscription, newPlan] = await Promise.all([
        prisma.subscription.findUnique({
          where: { userId },
          include: { plan: true, user: true },
        }),
        prisma.plan.findUnique({ where: { id: newPlanId } }),
      ]);

      if (!currentSubscription) {
        throw new Error('Abonnement actuel non trouvé');
      }

      if (!newPlan) {
        throw new Error('Nouveau plan non trouvé');
      }

      if (currentSubscription.planId === newPlanId) {
        throw new Error('L\'utilisateur est déjà sur ce plan');
      }

      const oldPlan = currentSubscription.plan;
      let stripeSubscriptionId = currentSubscription.stripeSubscriptionId;

      // Handle Stripe subscription update for paid plans
      if (Number(newPlan.price) > 0) {
        if (!currentSubscription.stripeCustomerId) {
          throw new Error('Client Stripe requis pour les plans payants');
        }

        if (stripeSubscriptionId) {
          // Update existing Stripe subscription
          const firstItemId = (await getStripe().subscriptions.retrieve(stripeSubscriptionId)).items.data[0].id;
          if (!('stripePriceId' in newPlan) || !(newPlan as any).stripePriceId) {
            throw new Error('stripePriceId manquant dans le nouveau plan.');
          }
          await getStripe().subscriptions.update(stripeSubscriptionId, {
            items: [
              {
                id: firstItemId,
                price: (newPlan as any).stripePriceId,
              },
            ],
            proration_behavior: prorated ? 'create_prorations' : 'none',
            metadata: {
              userId,
              planId: newPlan.id,
            },
          });
        } else {
          // Create new Stripe subscription
          if (!('stripePriceId' in newPlan) || !(newPlan as any).stripePriceId) {
            throw new Error('stripePriceId manquant dans le nouveau plan.');
          }
          const stripeSubscription = await getStripe().subscriptions.create({
            customer: currentSubscription.stripeCustomerId!,
            items: [
              {
                price: (newPlan as any).stripePriceId,
              },
            ],
            metadata: {
              userId,
              planId: newPlan.id,
            },
          });

          stripeSubscriptionId = stripeSubscription.id;
        }
      } else if (stripeSubscriptionId) {
        // Cancel Stripe subscription for downgrade to free plan
        await getStripe().subscriptions.cancel(stripeSubscriptionId);
        stripeSubscriptionId = null;
      }

      // Calculate proration amount
      let prorationAmount = 0;
      if (prorated && Number(oldPlan.price) !== Number(newPlan.price)) {
        const daysRemaining = Math.ceil(
          (currentSubscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysInMonth = 30;
        const oldPlanDailyRate = Number(oldPlan.price) / daysInMonth;
        const newPlanDailyRate = Number(newPlan.price) / daysInMonth;
        
        prorationAmount = (newPlanDailyRate - oldPlanDailyRate) * daysRemaining;
      }

      // Update subscription in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          planId: newPlanId,
          stripeSubscriptionId,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          plan: true,
        },
      });

      // Log billing event
      await prisma.billingLog.create({
        data: {
          subscriptionId: currentSubscription.id,
          userId,
          eventType: 'plan_changed',
          amount: prorationAmount,
          currency: newPlan.currency,
          status: 'success',
          metadata: {
            oldPlan: oldPlan.name,
            newPlan: newPlan.name,
            prorated,
            prorationAmount,
            stripeSubscriptionId,
          },
        },
      });

      // Update user subscription plan
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionPlan: newPlan.name },
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: string, immediate = false) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true, user: true },
      });

      if (!subscription) {
        throw new Error('Abonnement non trouvé');
      }

      if (subscription.status === 'cancelled') {
        throw new Error('Abonnement déjà annulé');
      }

      // Cancel Stripe subscription if exists
      if (subscription.stripeSubscriptionId) {
        await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: !immediate,
        });

        if (immediate) {
          await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
        }
      }

      // Update subscription in database
      const updateData: any = {
        cancelledAt: new Date(),
        updatedAt: new Date(),
      };

      if (immediate) {
        updateData.status = 'cancelled';
        updateData.currentPeriodEnd = new Date();
      } else {
        updateData.cancelAtPeriodEnd = true;
      }

      const cancelledSubscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          plan: true,
        },
      });

      // Log billing event
      await prisma.billingLog.create({
        data: {
          subscriptionId: subscription.id,
          userId,
          eventType: 'subscription_cancelled',
          status: 'success',
          metadata: {
            immediate,
            reason: 'user_cancellation',
          },
        },
      });

      // Update user to free plan if immediate cancellation
      if (immediate) {
        const freePlan = await prisma.plan.findUnique({
          where: { name: 'free' },
        });

        if (freePlan) {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionPlan: 'free' },
          });
        }
      }

      return cancelledSubscription;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  // Track usage
  static async trackUsage(data: UsageTrackingData) {
    try {
      const { userId, resourceType, quantity, period } = data;
      const currentPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM

      // Get user subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      if (!subscription) {
        throw new Error('Abonnement non trouvé');
      }

      // Update or create usage record
      const usageRecord = await prisma.usageRecord.upsert({
        where: {
          subscriptionId_resourceType_period: {
            subscriptionId: subscription.id,
            resourceType,
            period: currentPeriod,
          },
        },
        update: {
          quantity,
          recordedAt: new Date(),
        },
        create: {
          subscriptionId: subscription.id,
          userId,
          resourceType,
          quantity,
          period: currentPeriod,
        },
      });

      // Update subscription usage counters
      if (resourceType === 'invoices') {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { invoicesThisMonth: quantity },
        });
      } else if (resourceType === 'storage') {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { storageUsed: quantity },
        });
      }

      // Check usage limits
      const limits = this.getUsageLimits(subscription.plan);
      const isOverLimit = this.checkUsageLimit(resourceType, quantity, limits);

      return {
        usageRecord,
        isOverLimit,
        limits,
      };
    } catch (error) {
      console.error('Track usage error:', error);
      throw error;
    }
  }

  // Get usage limits for a plan
  private static getUsageLimits(plan: any): Record<'invoices' | 'clients' | 'products' | 'storage' | 'api_calls' | 'quotes', number> {
    return {
      invoices: Number(plan.maxInvoicesPerMonth) || 0,
      clients: Number(plan.maxClientsTotal) || 0,
      quotes: Number(plan.maxInvoicesPerMonth) || 0, // Same limit as invoices for now
      products: Number(plan.maxProductsTotal) || 0,
      storage: Number(plan.storageLimit) || 0,
      api_calls: plan.hasApiAccess ? 10000 : 0,
    };
  }

  // Check if usage exceeds limits
  private static checkUsageLimit(
    resourceType: UsageTrackingData['resourceType'],
    quantity: number,
    limits: Record<'invoices' | 'clients' | 'products' | 'storage' | 'api_calls' | 'quotes', number>
  ) {
    const limit = limits[resourceType];
    return limit > 0 && quantity >= limit;
  }

  // Process billing cycle
  static async processBillingCycle(data: BillingCycleData) {
    try {
      const { subscriptionId, amount, currency, status, stripeInvoiceId, stripePaymentId, errorMessage } = data;

      // Get subscription
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true, plan: true },
      });

      if (!subscription) {
        throw new Error('Abonnement non trouvé');
      }

      // Log billing event
      const billingLog = await prisma.billingLog.create({
        data: {
          subscriptionId,
          userId: subscription.userId,
          eventType: status === 'success' ? 'payment_succeeded' : 'payment_failed',
          amount,
          currency,
          status,
          stripeInvoiceId,
          stripePaymentId,
          errorMessage,
          metadata: {
            planName: subscription.plan.name,
            billingCycle: 'monthly',
          },
        },
      });

      // Update subscription based on payment status
      if (status === 'success') {
        // Extend subscription period
        const newPeriodEnd = new Date(subscription.currentPeriodEnd);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            currentPeriodStart: subscription.currentPeriodEnd,
            currentPeriodEnd: newPeriodEnd,
            status: 'active',
            invoicesThisMonth: 0, // Reset monthly counters
          },
        });
      } else {
        // Handle failed payment
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'past_due',
          },
        });
      }

      return billingLog;
    } catch (error) {
      console.error('Process billing cycle error:', error);
      throw error;
    }
  }

  // Get subscription with usage details
  static async getSubscriptionWithUsage(userId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: {
          plan: true,
          usageRecords: {
            where: {
              period: new Date().toISOString().slice(0, 7), // Current month
            },
          },
          billingLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      if (!subscription) {
        return null;
      }

      // Calculate usage percentages
      const currentUsage = subscription.usageRecords.reduce((acc, record) => {
        acc[record.resourceType] = record.quantity;
        return acc;
      }, {} as Record<string, number>);

      const limits = this.getUsageLimits(subscription.plan);
      const usagePercentages = (Object.keys(limits) as Array<keyof typeof limits>).reduce(
        (acc, resource) => {
          const used = currentUsage[resource as string] || 0;
          const limit = limits[resource];
          acc[resource] = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
          return acc;
        },
        {} as Record<keyof typeof limits, number>
      );

      return {
        ...subscription,
        currentUsage,
        limits,
        usagePercentages,
      };
    } catch (error) {
      console.error('Get subscription with usage error:', error);
      throw error;
    }
  }
}