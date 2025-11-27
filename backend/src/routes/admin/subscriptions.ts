import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { adminAuth, requirePermission, auditLog } from '../../middleware/adminAuth';
import { SubscriptionManagementService } from '../../services/subscriptionManagementService';

const router = Router();
const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(adminAuth);

interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: any;
  };
}

// Validation schemas
const subscriptionUpdateSchema = z.object({
  planId: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'past_due', 'unpaid', 'paused']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
});

const planChangeSchema = z.object({
  planId: z.string(),
  immediate: z.boolean().optional().default(true),
  scheduledDate: z.string().datetime().optional(),
  prorated: z.boolean().optional().default(true),
  reason: z.string().optional().default('admin_change'),
});

const billingCreditSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
});

const refundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1),
  refundType: z.enum(['full', 'partial', 'prorated']),
});

const paymentMethodSchema = z.object({
  paymentMethodId: z.string(),
});

const usageResetSchema = z.object({
  resourceType: z.enum(['invoices', 'clients', 'products', 'storage', 'api_calls']).optional(),
});

const pauseResumeSchema = z.object({
  resumeDate: z.string().datetime().optional(),
});

const subscriptionSearchSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  status: z.enum(['active', 'cancelled', 'past_due', 'unpaid', 'all']).optional().default('all'),
  planName: z.string().optional(),
  sortBy: z.enum(['createdAt', 'currentPeriodEnd', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// GET /api/admin/subscriptions - List subscriptions
router.get('/', requirePermission('subscriptions', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const {
      page,
      limit,
      status,
      planName,
      sortBy,
      sortOrder,
    } = subscriptionSearchSchema.parse(req.query);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (planName) {
      where.plan = {
        name: planName,
      };
    }

    // Get subscriptions with pagination
    const [subscriptions, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
          plan: {
            select: {
              id: true,
              name: true,
              displayName: true,
              price: true,
              currency: true,
            },
          },
          usageRecords: {
            where: {
              period: new Date().toISOString().slice(0, 7), // Current month
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.json({
      success: true,
      data: {
        subscriptions: subscriptions.map(sub => ({
          ...sub,
          currentUsage: sub.usageRecords.reduce((acc, record) => {
            acc[record.resourceType] = record.quantity;
            return acc;
          }, {} as Record<string, number>),
          usageRecords: undefined, // Remove from response
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Paramètres invalides',
          details: error.issues,
        },
      });
    }

    console.error('Get subscriptions error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/subscriptions/:id - Get subscription details
router.get('/:id', requirePermission('subscriptions', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            companyName: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
        plan: true,
        usageRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 50,
        },
        billingLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'Abonnement non trouvé',
        },
      });
    }

    return res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get subscription details error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// PUT /api/admin/subscriptions/:id - Update subscription
router.put('/:id', 
  requirePermission('subscriptions', 'write'), 
  auditLog('subscription_updated', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const updateData = subscriptionUpdateSchema.parse(req.body);

      // Check if subscription exists
      const existingSubscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          user: {
            select: { email: true },
          },
          plan: {
            select: { name: true, displayName: true },
          },
        },
      });

      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Abonnement non trouvé',
          },
        });
      }

      // Prepare update data
      const updatePayload: any = {};

      if (updateData.planId) {
        // Validate plan exists
        const plan = await prisma.plan.findUnique({
          where: { id: updateData.planId },
        });

        if (!plan) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'PLAN_NOT_FOUND',
              message: 'Plan non trouvé',
            },
          });
        }

        updatePayload.planId = updateData.planId;
      }

      if (updateData.status) {
        updatePayload.status = updateData.status;
        
        if (updateData.status === 'cancelled' && !existingSubscription.cancelledAt) {
          updatePayload.cancelledAt = new Date();
        }
      }

      if (updateData.cancelAtPeriodEnd !== undefined) {
        updatePayload.cancelAtPeriodEnd = updateData.cancelAtPeriodEnd;
      }

      if (updateData.currentPeriodEnd) {
        updatePayload.currentPeriodEnd = new Date(updateData.currentPeriodEnd);
      }

      // Update subscription
      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: updatePayload,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              displayName: true,
              price: true,
            },
          },
        },
      });

      // Log billing event
      await prisma.billingLog.create({
        data: {
          subscriptionId: id,
          userId: updatedSubscription.userId,
          eventType: 'subscription_updated',
          status: 'success',
          metadata: {
            updatedBy: req.admin!.email,
            changes: updatePayload,
            previousPlan: existingSubscription.plan.name,
            newPlan: updatedSubscription.plan.name,
          },
        },
      });

      return res.json({
        success: true,
        data: updatedSubscription,
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

      console.error('Update subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }
);

// POST /api/admin/subscriptions/users/:userId/change-plan - Change plan by user
router.post('/users/:userId/change-plan',
  requirePermission('subscriptions', 'write'),
  auditLog('subscription_plan_changed', 'subscription', (req) => req.params.userId),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { userId } = req.params;
      const planChangeData = planChangeSchema.parse(req.body);

      const updatedSubscription = await SubscriptionManagementService.changeUserPlan(
        userId,
        planChangeData.planId,
        {
          immediate: planChangeData.immediate,
          scheduledDate: planChangeData.scheduledDate ? new Date(planChangeData.scheduledDate) : undefined,
          prorated: planChangeData.prorated,
          reason: planChangeData.reason,
        }
      );

      return res.json({
        success: true,
        data: updatedSubscription,
        message: planChangeData.immediate
          ? 'Plan changé avec succès'
          : 'Changement de plan programmé',
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

      console.error('Change user plan error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// POST /api/admin/subscriptions/:id/cancel - Cancel subscription
router.post('/:id/cancel', 
  requirePermission('subscriptions', 'write'), 
  auditLog('subscription_cancelled', 'subscription'),
  async (req: AdminRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { immediate = false } = req.body;

      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          user: {
            select: { email: true, companyName: true },
          },
          plan: {
            select: { name: true, displayName: true },
          },
        },
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Abonnement non trouvé',
          },
        });
      }

      if (subscription.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_CANCELLED',
            message: 'Abonnement déjà annulé',
          },
        });
      }

      // Cancel subscription
      const updateData: any = {
        cancelledAt: new Date(),
      };

      if (immediate) {
        updateData.status = 'cancelled';
        updateData.currentPeriodEnd = new Date();
      } else {
        updateData.cancelAtPeriodEnd = true;
      }

      const cancelledSubscription = await prisma.subscription.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
          plan: {
            select: {
              name: true,
              displayName: true,
            },
          },
        },
      });

      // Log cancellation
      await prisma.billingLog.create({
        data: {
          subscriptionId: id,
          userId: subscription.userId,
          eventType: 'subscription_cancelled',
          status: 'success',
          metadata: {
            cancelledBy: req.admin!.email,
            immediate,
            reason: 'admin_cancellation',
          },
        },
      });

      return res.json({
        success: true,
        data: cancelledSubscription,
        message: immediate 
          ? 'Abonnement annulé immédiatement' 
          : 'Abonnement programmé pour annulation à la fin de la période',
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }
);

// GET /api/admin/subscriptions/stats/overview - Get subscription statistics
router.get('/stats/overview', requirePermission('subscriptions', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      subscriptionsByPlan,
      monthlyRevenue,
      churnRate,
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.groupBy({
        by: ['planId'],
        _count: { id: true },
      }),
      // Calculate monthly recurring revenue
      prisma.subscription.findMany({
        where: { status: 'active' },
        include: {
          plan: {
            select: { price: true },
          },
        },
      }).then(subs => 
        subs.reduce((total, sub) => total + Number(sub.plan.price), 0)
      ),
      // Calculate churn rate (cancelled this month / active at start of month)
      Promise.all([
        prisma.subscription.count({
          where: {
            status: 'cancelled',
            cancelledAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        prisma.subscription.count({
          where: {
            createdAt: {
              lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
            status: { in: ['active', 'cancelled'] },
          },
        }),
      ]).then(([cancelled, totalAtStart]) => 
        totalAtStart > 0 ? (cancelled / totalAtStart) * 100 : 0
      ),
    ]);

    // Process plan statistics
    const planStats = await Promise.all(
      subscriptionsByPlan.map(async (item) => {
        const plan = await prisma.plan.findUnique({
          where: { id: item.planId },
          select: { name: true, displayName: true, price: true },
        });
        return {
          planName: plan?.name || 'Unknown',
          displayName: plan?.displayName || 'Unknown',
          count: item._count.id,
          revenue: Number(plan?.price || 0) * item._count.id,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        monthlyRevenue,
        churnRate: Math.round(churnRate * 100) / 100,
        planDistribution: planStats,
      },
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// POST /api/admin/subscriptions/:id/change-plan - Change subscription plan
router.post('/:id/change-plan', 
  requirePermission('subscriptions', 'write'), 
  auditLog('subscription_plan_changed', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const planChangeData = planChangeSchema.parse(req.body);

      // Get subscription to get userId
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Abonnement non trouvé',
          },
        });
      }

      const updatedSubscription = await SubscriptionManagementService.changeUserPlan(
        subscription.userId,
        planChangeData.planId,
        {
          immediate: planChangeData.immediate,
          scheduledDate: planChangeData.scheduledDate ? new Date(planChangeData.scheduledDate) : undefined,
          prorated: planChangeData.prorated,
          reason: planChangeData.reason,
        }
      );

      return res.json({
        success: true,
        data: updatedSubscription,
        message: planChangeData.immediate 
          ? 'Plan changé avec succès' 
          : 'Changement de plan programmé',
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

      console.error('Change plan error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// POST /api/admin/subscriptions/:id/credits - Add billing credits
router.post('/:id/credits', 
  requirePermission('subscriptions', 'write'), 
  auditLog('billing_credit_added', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const creditData = billingCreditSchema.parse(req.body);

      const credit = await SubscriptionManagementService.addCredits(
        id,
        creditData.amount,
        creditData.reason,
        req.admin!.email,
        creditData.expiresAt ? new Date(creditData.expiresAt) : undefined
      );

      return res.json({
        success: true,
        data: credit,
        message: 'Crédit ajouté avec succès',
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

      console.error('Add credits error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// POST /api/admin/subscriptions/:id/refund - Process refund
router.post('/:id/refund', 
  requirePermission('subscriptions', 'write'), 
  auditLog('refund_processed', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const refundData = refundSchema.parse(req.body);

      const refund = await SubscriptionManagementService.processRefund({
        subscriptionId: id,
        amount: refundData.amount,
        reason: refundData.reason,
        refundType: refundData.refundType,
        processedBy: req.admin!.email,
      });

      return res.json({
        success: true,
        data: refund,
        message: 'Remboursement traité avec succès',
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

      console.error('Process refund error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// GET /api/admin/subscriptions/:id/usage - Get usage metrics
router.get('/:id/usage', 
  requirePermission('subscriptions', 'read'), 
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { period } = req.query;

      const usage = await SubscriptionManagementService.getUsageMetrics(
        id, 
        period as string
      );

      return res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      console.error('Get usage metrics error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// POST /api/admin/subscriptions/:id/reset-usage - Reset usage limits
router.post('/:id/reset-usage', 
  requirePermission('subscriptions', 'write'), 
  auditLog('usage_reset', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const resetData = usageResetSchema.parse(req.body);

      await SubscriptionManagementService.resetUsageLimits(
        id,
        resetData.resourceType
      );

      return res.json({
        success: true,
        message: resetData.resourceType 
          ? `Limite d'utilisation réinitialisée pour ${resetData.resourceType}`
          : 'Toutes les limites d\'utilisation réinitialisées',
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

      console.error('Reset usage error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// GET /api/admin/subscriptions/:id/payment-methods - Get payment methods
router.get('/:id/payment-methods', 
  requirePermission('subscriptions', 'read'), 
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const paymentMethods = await SubscriptionManagementService.getPaymentMethods(id);

      return res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      console.error('Get payment methods error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// PUT /api/admin/subscriptions/:id/payment-method - Update payment method
router.put('/:id/payment-method', 
  requirePermission('subscriptions', 'write'), 
  auditLog('payment_method_updated', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const paymentData = paymentMethodSchema.parse(req.body);

      await SubscriptionManagementService.updatePaymentMethod(
        id,
        paymentData.paymentMethodId
      );

      return res.json({
        success: true,
        message: 'Méthode de paiement mise à jour avec succès',
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

      console.error('Update payment method error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// POST /api/admin/subscriptions/:id/pause - Pause subscription
router.post('/:id/pause', 
  requirePermission('subscriptions', 'write'), 
  auditLog('subscription_paused', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const pauseData = pauseResumeSchema.parse(req.body);

      const pausedSubscription = await SubscriptionManagementService.pauseSubscription(
        id,
        pauseData.resumeDate ? new Date(pauseData.resumeDate) : undefined
      );

      return res.json({
        success: true,
        data: pausedSubscription,
        message: pauseData.resumeDate 
          ? 'Abonnement mis en pause avec reprise programmée'
          : 'Abonnement mis en pause',
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

      console.error('Pause subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// POST /api/admin/subscriptions/:id/resume - Resume subscription
router.post('/:id/resume', 
  requirePermission('subscriptions', 'write'), 
  auditLog('subscription_resumed', 'subscription'),
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const resumedSubscription = await SubscriptionManagementService.resumeSubscription(id);

      return res.json({
        success: true,
        data: resumedSubscription,
        message: 'Abonnement repris avec succès',
      });
    } catch (error) {
      console.error('Resume subscription error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// GET /api/admin/subscriptions/:id/billing-history - Get billing history
router.get('/:id/billing-history', 
  requirePermission('subscriptions', 'read'), 
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const billingHistory = await SubscriptionManagementService.getBillingHistory(
        id,
        { page, limit }
      );

      return res.json({
        success: true,
        data: billingHistory,
      });
    } catch (error) {
      console.error('Get billing history error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

// GET /api/admin/subscriptions/:id/details - Get comprehensive subscription details
router.get('/:id/details', 
  requirePermission('subscriptions', 'read'), 
  async (req: AdminRequest, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const subscriptionDetails = await SubscriptionManagementService.getSubscriptionDetails(id);

      return res.json({
        success: true,
        data: subscriptionDetails,
      });
    } catch (error) {
      console.error('Get subscription details error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne du serveur',
        },
      });
    }
  }
);

export default router;