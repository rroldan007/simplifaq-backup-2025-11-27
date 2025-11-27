import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Stripe
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

// Types and Interfaces
export interface PlanChangeOptions {
  immediate?: boolean;
  scheduledDate?: Date;
  prorated?: boolean;
  reason?: string;
}

export interface BillingCredit {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  reason: string;
  appliedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface RefundRequest {
  subscriptionId: string;
  amount: number;
  reason: string;
  refundType: 'full' | 'partial' | 'prorated';
  processedBy: string;
}

export interface UsageMetrics {
  subscriptionId: string;
  period: string;
  invoices: number;
  clients: number;
  products: number;
  storage: number;
  apiCalls: number;
  lastUpdated: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'sepa_debit';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  stripePaymentMethodId?: string;
}

export interface SubscriptionDetails {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentMethod?: string;
  billingEmail?: string;
  invoicesThisMonth: number;
  storageUsed: number;
  createdAt: Date;
  updatedAt: Date;
  plan: any;
  user: any;
  usageRecords: any[];
  billingLogs: any[];
  credits: BillingCredit[];
  paymentMethods: PaymentMethod[];
  nextBillingAmount?: number;
  prorationAmount?: number;
}

export class SubscriptionManagementService {
  // ===== SUBSCRIPTION PLAN CHANGES =====

  /**
   * Change user subscription plan with immediate or scheduled activation
   */
  static async changeUserPlan(
    userId: string, 
    planId: string, 
    options: PlanChangeOptions = {}
  ): Promise<SubscriptionDetails> {
    try {
      const { immediate = true, scheduledDate, prorated = true, reason = 'admin_change' } = options;

      // Get current subscription and new plan
      const [currentSubscription, newPlan] = await Promise.all([
        prisma.subscription.findUnique({
          where: { userId },
          include: { 
            plan: true, 
            user: true,
            usageRecords: {
              where: { period: new Date().toISOString().slice(0, 7) }
            }
          },
        }),
        prisma.plan.findUnique({ where: { id: planId } }),
      ]);

      if (!currentSubscription) {
        throw new Error('Subscription not found');
      }

      if (!newPlan) {
        throw new Error('Plan not found');
      }

      if (currentSubscription.planId === planId) {
        throw new Error('User is already on this plan');
      }

      const oldPlan = currentSubscription.plan;
      let updateData: any = {};
      let stripeSubscriptionId = currentSubscription.stripeSubscriptionId;

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

      if (immediate) {
        // Handle immediate plan change
        updateData.planId = planId;
        updateData.updatedAt = new Date();

        // Handle Stripe subscription update for paid plans
        if (Number(newPlan.price) > 0 && currentSubscription.stripeCustomerId) {
          if (stripeSubscriptionId) {
            // Update existing Stripe subscription
            const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
            const firstItemId = subscription.items.data[0].id;
            
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
                changedBy: 'admin',
                reason,
              },
            });
          } else {
            // Create new Stripe subscription
            const stripeSubscription = await getStripe().subscriptions.create({
              customer: currentSubscription.stripeCustomerId!,
              items: [{ price: (newPlan as any).stripePriceId }],
              metadata: {
                userId,
                planId: newPlan.id,
                changedBy: 'admin',
                reason,
              },
            });
            stripeSubscriptionId = stripeSubscription.id;
            updateData.stripeSubscriptionId = stripeSubscriptionId;
          }
        } else if (stripeSubscriptionId && Number(newPlan.price) === 0) {
          // Cancel Stripe subscription for downgrade to free plan
          await getStripe().subscriptions.cancel(stripeSubscriptionId);
          updateData.stripeSubscriptionId = null;
        }
      } else if (scheduledDate) {
        // Schedule plan change for future date
        await prisma.systemConfig.create({
          data: {
            key: `scheduled_plan_change_${currentSubscription.id}`,
            value: {
              subscriptionId: currentSubscription.id,
              userId,
              newPlanId: planId,
              scheduledDate: scheduledDate.toISOString(),
              prorated,
              reason,
              prorationAmount,
            },
            description: `Scheduled plan change from ${oldPlan.name} to ${newPlan.name}`,
          },
        });

        // Log the scheduled change
        await prisma.billingLog.create({
          data: {
            subscriptionId: currentSubscription.id,
            userId,
            eventType: 'plan_change_scheduled',
            amount: prorationAmount,
            currency: newPlan.currency,
            status: 'pending',
            metadata: {
              oldPlan: oldPlan.name,
              newPlan: newPlan.name,
              scheduledDate: scheduledDate.toISOString(),
              prorated,
              reason,
            },
          },
        });

        return this.getSubscriptionDetails(currentSubscription.id);
      }

      // Update subscription in database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: updateData,
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
          usageRecords: {
            where: { period: new Date().toISOString().slice(0, 7) }
          },
          billingLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
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
            reason,
            immediate,
          },
        },
      });

      // Update user subscription plan
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionPlan: newPlan.name },
      });

      return this.getSubscriptionDetails(updatedSubscription.id);
    } catch (error) {
      console.error('Change user plan error:', error);
      throw error;
    }
  }

  // ===== BILLING CREDITS SYSTEM =====

  /**
   * Add billing credits to a subscription
   */
  static async addCredits(
    subscriptionId: string,
    amount: number,
    reason: string,
    createdBy: string,
    expiresAt?: Date
  ): Promise<BillingCredit> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true, plan: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Create billing credit record
      const credit = await prisma.$queryRaw`
        INSERT INTO billing_credits (
          id, subscription_id, user_id, amount, currency, reason, 
          expires_at, is_active, created_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${subscriptionId}, ${subscription.userId}, 
          ${amount}, ${subscription.plan.currency}, ${reason},
          ${expiresAt || null}, true, ${createdBy}, NOW(), NOW()
        ) RETURNING *
      ` as any[];

      const billingCredit = credit[0];

      // Log billing event
      await prisma.billingLog.create({
        data: {
          subscriptionId,
          userId: subscription.userId,
          eventType: 'credit_added',
          amount,
          currency: subscription.plan.currency,
          status: 'success',
          metadata: {
            reason,
            createdBy,
            expiresAt: expiresAt?.toISOString(),
            creditId: billingCredit.id,
          },
        },
      });

      return {
        id: billingCredit.id,
        subscriptionId,
        userId: subscription.userId,
        amount,
        currency: subscription.plan.currency,
        reason,
        appliedAt: undefined,
        expiresAt,
        isActive: true,
        createdBy,
        createdAt: billingCredit.created_at,
      };
    } catch (error) {
      console.error('Add credits error:', error);
      throw error;
    }
  }

  /**
   * Apply available credits to a subscription
   */
  static async applyCredits(subscriptionId: string, amount: number): Promise<number> {
    try {
      // Get available credits
      const availableCredits = await prisma.$queryRaw`
        SELECT * FROM billing_credits 
        WHERE subscription_id = ${subscriptionId} 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
        AND applied_at IS NULL
        ORDER BY created_at ASC
      ` as any[];

      let remainingAmount = amount;
      let totalApplied = 0;

      for (const credit of availableCredits) {
        if (remainingAmount <= 0) break;

        const creditAmount = Math.min(credit.amount, remainingAmount);
        
        // Apply credit
        await prisma.$queryRaw`
          UPDATE billing_credits 
          SET applied_at = NOW(), updated_at = NOW()
          WHERE id = ${credit.id}
        `;

        totalApplied += creditAmount;
        remainingAmount -= creditAmount;

        // Log credit application
        await prisma.billingLog.create({
          data: {
            subscriptionId,
            userId: credit.user_id,
            eventType: 'credit_applied',
            amount: creditAmount,
            currency: credit.currency,
            status: 'success',
            metadata: {
              creditId: credit.id,
              originalCreditAmount: credit.amount,
              appliedAmount: creditAmount,
            },
          },
        });
      }

      return totalApplied;
    } catch (error) {
      console.error('Apply credits error:', error);
      throw error;
    }
  }

  // ===== REFUND PROCESSING =====

  /**
   * Process refund for a subscription
   */
  static async processRefund(refundRequest: RefundRequest): Promise<any> {
    try {
      const { subscriptionId, amount, reason, refundType, processedBy } = refundRequest;

      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { 
          user: true, 
          plan: true,
          billingLogs: {
            where: { eventType: 'payment_succeeded' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      let stripeRefund = null;
      let refundAmount = amount;

      // Calculate refund amount based on type
      if (refundType === 'full') {
        refundAmount = Number(subscription.plan.price);
      } else if (refundType === 'prorated') {
        const daysRemaining = Math.ceil(
          (subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysInMonth = 30;
        refundAmount = (Number(subscription.plan.price) / daysInMonth) * daysRemaining;
      }

      // Process Stripe refund if applicable
      if (subscription.stripeSubscriptionId && subscription.billingLogs.length > 0) {
        const lastPayment = subscription.billingLogs[0];
        if (lastPayment.stripePaymentId) {
          stripeRefund = await getStripe().refunds.create({
            payment_intent: lastPayment.stripePaymentId,
            amount: Math.round(refundAmount * 100), // Convert to cents
            reason: 'requested_by_customer',
            metadata: {
              subscriptionId,
              refundType,
              processedBy,
              originalReason: reason,
            },
          });
        }
      }

      // Create refund record
      const refund = await prisma.$queryRaw`
        INSERT INTO refunds (
          id, subscription_id, user_id, amount, currency, reason, 
          refund_type, stripe_refund_id, status, processed_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${subscriptionId}, ${subscription.userId}, 
          ${refundAmount}, ${subscription.plan.currency}, ${reason},
          ${refundType}, ${stripeRefund?.id || null}, 'processed', 
          ${processedBy}, NOW(), NOW()
        ) RETURNING *
      ` as any[];

      // Log billing event
      await prisma.billingLog.create({
        data: {
          subscriptionId,
          userId: subscription.userId,
          eventType: 'refund_processed',
          amount: refundAmount,
          currency: subscription.plan.currency,
          status: 'success',
          metadata: {
            reason,
            refundType,
            processedBy,
            stripeRefundId: stripeRefund?.id,
            refundId: refund[0].id,
          },
        },
      });

      return {
        refund: refund[0],
        stripeRefund,
        amount: refundAmount,
      };
    } catch (error) {
      console.error('Process refund error:', error);
      throw error;
    }
  }

  // ===== USAGE TRACKING AND LIMITS =====

  /**
   * Get comprehensive usage metrics for a subscription
   */
  static async getUsageMetrics(subscriptionId: string, period?: string): Promise<UsageMetrics> {
    try {
      const currentPeriod = period || new Date().toISOString().slice(0, 7);

      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          plan: true,
          usageRecords: {
            where: { period: currentPeriod },
          },
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Aggregate usage data
      const usage = subscription.usageRecords.reduce((acc, record) => {
        acc[record.resourceType] = record.quantity;
        return acc;
      }, {} as Record<string, number>);

      return {
        subscriptionId,
        period: currentPeriod,
        invoices: usage.invoices || 0,
        clients: usage.clients || 0,
        products: usage.products || 0,
        storage: usage.storage || 0,
        apiCalls: usage.api_calls || 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Get usage metrics error:', error);
      throw error;
    }
  }

  /**
   * Reset usage limits for a subscription
   */
  static async resetUsageLimits(subscriptionId: string, resourceType?: string): Promise<void> {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7);

      if (resourceType) {
        // Reset specific resource type
        await prisma.usageRecord.updateMany({
          where: {
            subscriptionId,
            resourceType,
            period: currentPeriod,
          },
          data: {
            quantity: 0,
            recordedAt: new Date(),
          },
        });
      } else {
        // Reset all usage for the subscription
        await prisma.usageRecord.updateMany({
          where: {
            subscriptionId,
            period: currentPeriod,
          },
          data: {
            quantity: 0,
            recordedAt: new Date(),
          },
        });

        // Reset subscription counters
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            invoicesThisMonth: 0,
            storageUsed: 0,
          },
        });
      }

      // Log the reset
      await prisma.billingLog.create({
        data: {
          subscriptionId,
          userId: (await prisma.subscription.findUnique({ where: { id: subscriptionId } }))!.userId,
          eventType: 'usage_reset',
          status: 'success',
          metadata: {
            resourceType: resourceType || 'all',
            period: currentPeriod,
            resetAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Reset usage limits error:', error);
      throw error;
    }
  }

  // ===== PAYMENT METHOD MANAGEMENT =====

  /**
   * Get payment methods for a subscription
   */
  static async getPaymentMethods(subscriptionId: string): Promise<PaymentMethod[]> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription || !subscription.stripeCustomerId) {
        return [];
      }

      const stripePaymentMethods = await getStripe().paymentMethods.list({
        customer: subscription.stripeCustomerId,
        type: 'card',
      });

      return stripePaymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type as 'card',
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: pm.id === subscription.paymentMethod,
        stripePaymentMethodId: pm.id,
      }));
    } catch (error) {
      console.error('Get payment methods error:', error);
      throw error;
    }
  }

  /**
   * Update default payment method
   */
  static async updatePaymentMethod(subscriptionId: string, paymentMethodId: string): Promise<void> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription || !subscription.stripeCustomerId) {
        throw new Error('Subscription or Stripe customer not found');
      }

      // Update default payment method in Stripe
      await getStripe().customers.update(subscription.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Update subscription record
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          paymentMethod: paymentMethodId,
          updatedAt: new Date(),
        },
      });

      // Log the change
      await prisma.billingLog.create({
        data: {
          subscriptionId,
          userId: subscription.userId,
          eventType: 'payment_method_updated',
          status: 'success',
          metadata: {
            newPaymentMethodId: paymentMethodId,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Update payment method error:', error);
      throw error;
    }
  }

  // ===== SUBSCRIPTION PAUSE/RESUME =====

  /**
   * Pause a subscription
   */
  static async pauseSubscription(subscriptionId: string, resumeDate?: Date): Promise<SubscriptionDetails> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true, plan: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'paused') {
        throw new Error('Subscription is already paused');
      }

      // Pause Stripe subscription if exists
      if (subscription.stripeSubscriptionId) {
        await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'void',
            resumes_at: resumeDate ? Math.floor(resumeDate.getTime() / 1000) : undefined,
          },
          metadata: {
            pausedAt: new Date().toISOString(),
            resumeDate: resumeDate?.toISOString() || 'manual',
          },
        });
      }

      // Update subscription status
      const updateData: any = {
        status: 'paused',
        updatedAt: new Date(),
      };

      if (resumeDate) {
        // Store resume date in system config for scheduled resume
        await prisma.systemConfig.create({
          data: {
            key: `scheduled_resume_${subscriptionId}`,
            value: {
              subscriptionId,
              resumeDate: resumeDate.toISOString(),
              pausedAt: new Date().toISOString(),
            },
            description: `Scheduled resume for subscription ${subscriptionId}`,
          },
        });
      }

      const pausedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
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
          usageRecords: {
            where: { period: new Date().toISOString().slice(0, 7) }
          },
          billingLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      // Log the pause
      await prisma.billingLog.create({
        data: {
          subscriptionId,
          userId: subscription.userId,
          eventType: 'subscription_paused',
          status: 'success',
          metadata: {
            pausedAt: new Date().toISOString(),
            resumeDate: resumeDate?.toISOString(),
            reason: 'admin_action',
          },
        },
      });

      return this.getSubscriptionDetails(subscriptionId);
    } catch (error) {
      console.error('Pause subscription error:', error);
      throw error;
    }
  }

  /**
   * Resume a paused subscription
   */
  static async resumeSubscription(subscriptionId: string): Promise<SubscriptionDetails> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { user: true, plan: true },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'paused') {
        throw new Error('Subscription is not paused');
      }

      // Resume Stripe subscription if exists
      if (subscription.stripeSubscriptionId) {
        await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: null,
          metadata: {
            resumedAt: new Date().toISOString(),
          },
        });
      }

      // Update subscription status
      const resumedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
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
          usageRecords: {
            where: { period: new Date().toISOString().slice(0, 7) }
          },
          billingLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });

      // Remove scheduled resume if exists
      await prisma.systemConfig.deleteMany({
        where: {
          key: `scheduled_resume_${subscriptionId}`,
        },
      });

      // Log the resume
      await prisma.billingLog.create({
        data: {
          subscriptionId,
          userId: subscription.userId,
          eventType: 'subscription_resumed',
          status: 'success',
          metadata: {
            resumedAt: new Date().toISOString(),
            reason: 'admin_action',
          },
        },
      });

      return this.getSubscriptionDetails(subscriptionId);
    } catch (error) {
      console.error('Resume subscription error:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Get comprehensive subscription details
   */
  static async getSubscriptionDetails(subscriptionId: string): Promise<SubscriptionDetails> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
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
          usageRecords: {
            where: { period: new Date().toISOString().slice(0, 7) }
          },
          billingLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get billing credits
      const credits = await prisma.$queryRaw`
        SELECT * FROM billing_credits 
        WHERE subscription_id = ${subscriptionId} 
        AND is_active = true
        ORDER BY created_at DESC
      ` as any[];

      // Get payment methods
      const paymentMethods = await this.getPaymentMethods(subscriptionId);

      // Calculate next billing amount
      let nextBillingAmount = Number(subscription.plan.price);
      
      // Apply available credits
      const availableCredits = credits.filter(c => !c.applied_at && (!c.expires_at || new Date(c.expires_at) > new Date()));
      const totalCredits = availableCredits.reduce((sum, credit) => sum + credit.amount, 0);
      nextBillingAmount = Math.max(0, nextBillingAmount - totalCredits);

      return {
        ...subscription,
        cancelledAt: subscription.cancelledAt || undefined,
        trialStart: subscription.trialStart || undefined,
        trialEnd: subscription.trialEnd || undefined,
        stripeCustomerId: subscription.stripeCustomerId || undefined,
        stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
        paymentMethod: subscription.paymentMethod || undefined,
        billingEmail: subscription.billingEmail || undefined,
        credits: credits.map(c => ({
          id: c.id,
          subscriptionId: c.subscription_id,
          userId: c.user_id,
          amount: c.amount,
          currency: c.currency,
          reason: c.reason,
          appliedAt: c.applied_at || undefined,
          expiresAt: c.expires_at || undefined,
          isActive: c.is_active,
          createdBy: c.created_by,
          createdAt: c.created_at,
        })),
        paymentMethods,
        nextBillingAmount,
        prorationAmount: 0, // Calculate if needed
      };
    } catch (error) {
      console.error('Get subscription details error:', error);
      throw error;
    }
  }

  /**
   * Get billing history for a subscription
   */
  static async getBillingHistory(subscriptionId: string, pagination: { page: number; limit: number }) {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const [billingLogs, totalCount] = await Promise.all([
        prisma.billingLog.findMany({
          where: { subscriptionId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.billingLog.count({ where: { subscriptionId } }),
      ]);

      return {
        billingLogs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
          limit,
        },
      };
    } catch (error) {
      console.error('Get billing history error:', error);
      throw error;
    }
  }
}