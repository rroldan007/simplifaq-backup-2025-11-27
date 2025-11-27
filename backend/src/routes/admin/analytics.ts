import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { adminAuth, requirePermission } from '../../middleware/adminAuth';
import { AnalyticsService } from '../../services/analyticsService';

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
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
});

// Helper function to get date range
const getDateRange = (period: string, startDate?: string, endDate?: string) => {
  const end = endDate ? new Date(endDate) : new Date();
  let start: Date;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  return { start, end };
};

// GET /api/admin/analytics/dashboard - Main dashboard metrics
router.get('/dashboard', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { period } = dateRangeSchema.parse(req.query);
    const { start, end } = getDateRange(period);

    // Get comprehensive dashboard metrics
    const [
      // User metrics
      totalUsers,
      activeUsers,
      newUsersInPeriod,
      
      // Subscription metrics
      totalSubscriptions,
      activeSubscriptions,
      mrr, // Monthly Recurring Revenue
      
      // Invoice metrics
      totalInvoices,
      invoicesInPeriod,
      totalRevenue,
      revenueInPeriod,
      
      // System metrics
      systemHealth,
      
      // Growth metrics
      userGrowthData,
      revenueGrowthData,
    ] = await Promise.all([
      // User metrics
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      }),
      
      // Subscription metrics
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.findMany({
        where: { status: 'active' },
        include: { plan: { select: { price: true } } },
      }).then(subs => 
        subs.reduce((total, sub) => total + Number(sub.plan.price), 0)
      ),
      
      // Invoice metrics
      prisma.invoice.count(),
      prisma.invoice.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.billingLog.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['succeeded', 'paid'] },
          eventType: { in: ['charge_success', 'invoice.payment_succeeded', 'subscription_charge'] },
        },
      }).then(result => Number(result._sum.amount || 0)),
      prisma.billingLog.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['succeeded', 'paid'] },
          eventType: { in: ['charge_success', 'invoice.payment_succeeded', 'subscription_charge'] },
          createdAt: { gte: start, lte: end },
        },
      }).then(result => Number(result._sum.amount || 0)),
      
      // System health (simplified)
      Promise.resolve({
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
      }),
      
      // User growth data (last 12 months)
      Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - (11 - i));
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          
          return prisma.user.count({
            where: {
              createdAt: { gte: monthStart, lt: monthEnd },
            },
          }).then(count => ({
            month: monthStart.toISOString().slice(0, 7),
            users: count,
          }));
        })
      ),
      
      // Revenue growth data (last 12 months)
      Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - (11 - i));
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          
          return prisma.billingLog.aggregate({
            _sum: { amount: true },
            where: {
              status: { in: ['succeeded', 'paid'] },
              eventType: { in: ['charge_success', 'invoice.payment_succeeded', 'subscription_charge'] },
              createdAt: { gte: monthStart, lt: monthEnd },
            },
          }).then(result => ({
            month: monthStart.toISOString().slice(0, 7),
            revenue: Number(result._sum.amount || 0),
          }));
        })
      ),
    ]);

    // Calculate growth rates
    const previousPeriodStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const previousPeriodUsers = await prisma.user.count({
      where: {
        createdAt: { gte: previousPeriodStart, lt: start },
      },
    });
    const previousPeriodRevenue = await prisma.billingLog.aggregate({
      _sum: { amount: true },
      where: {
        status: { in: ['succeeded', 'paid'] },
        eventType: { in: ['charge_success', 'invoice.payment_succeeded', 'subscription_charge'] },
        createdAt: { gte: previousPeriodStart, lt: start },
      },
    }).then(result => Number(result._sum.amount || 0));

    const userGrowthRate = previousPeriodUsers > 0 
      ? ((newUsersInPeriod - previousPeriodUsers) / previousPeriodUsers) * 100 
      : 0;
    
    const revenueGrowthRate = previousPeriodRevenue > 0 
      ? ((revenueInPeriod - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : 0;

    return res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          newUsersInPeriod,
          userGrowthRate: Math.round(userGrowthRate * 100) / 100,
          
          totalSubscriptions,
          activeSubscriptions,
          monthlyRecurringRevenue: mrr,
          
          totalInvoices,
          invoicesInPeriod,
          totalRevenue,
          revenueInPeriod,
          revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
        },
        
        systemHealth,
        
        charts: {
          userGrowth: userGrowthData,
          revenueGrowth: revenueGrowthData,
        },
        
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: period,
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

    console.error('Get dashboard analytics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/usage - Usage statistics
router.get('/usage', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { period } = dateRangeSchema.parse(req.query);
    const { start, end } = getDateRange(period);

    // Get usage statistics
    const [
      invoiceUsage,
      clientUsage,
      productUsage,
      storageUsage,
      planUsage,
    ] = await Promise.all([
      // Invoice usage by period
      prisma.usageRecord.groupBy({
        by: ['period'],
        where: {
          resourceType: 'invoices',
          recordedAt: { gte: start, lte: end },
        },
        _sum: { quantity: true },
        orderBy: { period: 'asc' },
      }),
      
      // Client usage
      prisma.usageRecord.groupBy({
        by: ['period'],
        where: {
          resourceType: 'clients',
          recordedAt: { gte: start, lte: end },
        },
        _sum: { quantity: true },
        orderBy: { period: 'asc' },
      }),
      
      // Product usage
      prisma.usageRecord.groupBy({
        by: ['period'],
        where: {
          resourceType: 'products',
          recordedAt: { gte: start, lte: end },
        },
        _sum: { quantity: true },
        orderBy: { period: 'asc' },
      }),
      
      // Storage usage
      prisma.usageRecord.groupBy({
        by: ['period'],
        where: {
          resourceType: 'storage',
          recordedAt: { gte: start, lte: end },
        },
        _sum: { quantity: true },
        orderBy: { period: 'asc' },
      }),
      
      // Usage by plan
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'active' },
        _count: { id: true },
        _sum: { invoicesThisMonth: true, storageUsed: true },
      }),
    ]);

    // Get plan details for usage by plan
    const planUsageWithDetails = await Promise.all(
      planUsage.map(async (usage) => {
        const plan = await prisma.plan.findUnique({
          where: { id: usage.planId },
          select: { name: true, displayName: true },
        });
        return {
          planName: plan?.name || 'Unknown',
          displayName: plan?.displayName || 'Unknown',
          userCount: usage._count.id,
          totalInvoices: usage._sum.invoicesThisMonth || 0,
          totalStorage: usage._sum.storageUsed || 0,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        resourceUsage: {
          invoices: invoiceUsage.map(item => ({
            period: item.period,
            count: item._sum.quantity || 0,
          })),
          clients: clientUsage.map(item => ({
            period: item.period,
            count: item._sum.quantity || 0,
          })),
          products: productUsage.map(item => ({
            period: item.period,
            count: item._sum.quantity || 0,
          })),
          storage: storageUsage.map(item => ({
            period: item.period,
            size: item._sum.quantity || 0,
          })),
        },
        planUsage: planUsageWithDetails,
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

    console.error('Get usage analytics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/revenue - Revenue analytics
router.get('/revenue', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { period } = dateRangeSchema.parse(req.query);
    const { start, end } = getDateRange(period);

    // Get revenue analytics
    const [
      totalRevenue,
      revenueByPeriod,
      revenueByPlan,
      averageRevenuePerUser,
      churnImpact,
    ] = await Promise.all([
      // Total revenue
      prisma.billingLog.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['succeeded', 'paid'] },
          eventType: { in: ['charge_success', 'invoice.payment_succeeded', 'subscription_charge'] },
          createdAt: { gte: start, lte: end },
        },
      }).then(result => Number(result._sum.amount || 0)),
      
      // Revenue by month
      Promise.all(
        Array.from({ length: 12 }, (_, i) => {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - (11 - i));
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          
          return prisma.billingLog.aggregate({
            _sum: { amount: true },
            _count: { id: true },
            where: {
              status: { in: ['succeeded', 'paid'] },
              eventType: { in: ['charge_success', 'invoice.payment_succeeded', 'subscription_charge'] },
              createdAt: { gte: monthStart, lt: monthEnd },
            },
          }).then(result => ({
            month: monthStart.toISOString().slice(0, 7),
            revenue: Number(result._sum.amount || 0),
            invoiceCount: result._count.id,
          }));
        })
      ),
      
      // Revenue by plan
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'active' },
        _count: { id: true },
      }).then(async (planGroups) => {
        return Promise.all(
          planGroups.map(async (group) => {
            const plan = await prisma.plan.findUnique({
              where: { id: group.planId },
              select: { name: true, displayName: true, price: true },
            });
            return {
              planName: plan?.name || 'Unknown',
              displayName: plan?.displayName || 'Unknown',
              userCount: group._count.id,
              monthlyRevenue: Number(plan?.price || 0) * group._count.id,
            };
          })
        );
      }),
      
      // Average Revenue Per User (ARPU)
      Promise.all([
        prisma.subscription.count({ where: { status: 'active' } }),
        prisma.subscription.findMany({
          where: { status: 'active' },
          include: { plan: { select: { price: true } } },
        }).then(subs => 
          subs.reduce((total, sub) => total + Number(sub.plan.price), 0)
        ),
      ]).then(([userCount, totalMRR]) => 
        userCount > 0 ? totalMRR / userCount : 0
      ),
      
      // Churn impact (revenue lost from cancellations)
      prisma.subscription.findMany({
        where: {
          status: 'cancelled',
          cancelledAt: { gte: start, lte: end },
        },
        include: { plan: { select: { price: true } } },
      }).then(cancelledSubs => 
        cancelledSubs.reduce((total, sub) => total + Number(sub.plan.price), 0)
      ),
    ]);

    return res.json({
      success: true,
      data: {
        totalRevenue,
        averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
        churnImpact,
        revenueByPeriod,
        revenueByPlan,
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

    console.error('Get revenue analytics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/swiss-compliance - Swiss-specific analytics
router.get('/swiss-compliance', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { period } = dateRangeSchema.parse(req.query);
    const { start, end } = getDateRange(period);

    // Swiss-specific analytics
    const [
      qrBillUsage,
      currencyDistribution,
      languageDistribution,
      cantonDistribution,
      tvaCompliance,
    ] = await Promise.all([
      // QR Bill generation statistics
      prisma.invoice.count({
        where: {
          qrReference: { not: null },
          createdAt: { gte: start, lte: end },
        },
      }),
      
      // Currency usage
      prisma.invoice.groupBy({
        by: ['currency'],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
      
      // Language distribution
      prisma.user.groupBy({
        by: ['language'],
        _count: { id: true },
      }),
      
      // Canton distribution
      prisma.user.groupBy({
        by: ['canton'],
        where: { canton: { not: null } },
        _count: { id: true },
      }),
      
      // TVA compliance (invoices with proper TVA rates)
      prisma.invoiceItem.groupBy({
        by: ['tvaRate'],
        where: {
          invoice: {
            createdAt: { gte: start, lte: end },
          },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        qrBillUsage: {
          totalInvoices: await prisma.invoice.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
          qrBillInvoices: qrBillUsage,
          adoptionRate: qrBillUsage > 0 ? 
            (qrBillUsage / await prisma.invoice.count({
              where: { createdAt: { gte: start, lte: end } },
            })) * 100 : 0,
        },
        
        currencyDistribution: currencyDistribution.map(item => ({
          currency: item.currency,
          invoiceCount: item._count.id,
          totalAmount: Number(item._sum.total || 0),
        })),
        
        languageDistribution: languageDistribution.map(item => ({
          language: item.language,
          userCount: item._count.id,
        })),
        
        cantonDistribution: cantonDistribution.map(item => ({
          canton: item.canton,
          userCount: item._count.id,
        })),
        
        tvaCompliance: tvaCompliance.map(item => ({
          tvaRate: Number(item.tvaRate),
          itemCount: item._count.id,
          totalAmount: Number(item._sum.total || 0),
        })),
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

    console.error('Get Swiss compliance analytics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/cohort-analysis - Cohort analysis
router.get('/cohort-analysis', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const cohortParams = z.object({
      cohortType: z.enum(['monthly', 'weekly']).default('monthly'),
      startDate: z.string().transform(val => new Date(val)),
      endDate: z.string().transform(val => new Date(val)),
    }).parse(req.query);

    const cohortData = await AnalyticsService.getCohortAnalysis(cohortParams);

    return res.json({
      success: true,
      data: cohortData,
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

    console.error('Get cohort analysis error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/revenue-metrics - Advanced revenue metrics
router.get('/revenue-metrics', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const timeRange = z.object({
      start: z.string().transform(val => new Date(val)),
      end: z.string().transform(val => new Date(val)),
    }).parse(req.query);

    const revenueMetrics = await AnalyticsService.getRevenueAnalytics(timeRange);

    return res.json({
      success: true,
      data: revenueMetrics,
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

    console.error('Get revenue metrics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/feature-usage/:feature - Feature usage statistics
router.get('/feature-usage/:feature', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { feature } = req.params;
    const timeRange = z.object({
      start: z.string().transform(val => new Date(val)),
      end: z.string().transform(val => new Date(val)),
    }).parse(req.query);

    const featureUsage = await AnalyticsService.getFeatureUsageStats(feature, timeRange);

    return res.json({
      success: true,
      data: featureUsage,
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

    if (error instanceof Error && error.message?.includes('not supported')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_FEATURE',
          message: 'Feature non supportée',
        },
      });
    }

    console.error('Get feature usage error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/user/:userId/engagement - User engagement metrics
router.get('/user/:userId/engagement', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;
    const timeRange = z.object({
      start: z.string().transform(val => new Date(val)),
      end: z.string().transform(val => new Date(val)),
    }).parse(req.query);

    const engagementMetrics = await AnalyticsService.getUserEngagementMetrics(userId, timeRange);

    return res.json({
      success: true,
      data: engagementMetrics,
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

    console.error('Get user engagement metrics error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/user/:userId/churn-prediction - User churn prediction
router.get('/user/:userId/churn-prediction', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;

    const churnPrediction = await AnalyticsService.getChurnPrediction(userId);

    return res.json({
      success: true,
      data: churnPrediction,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    console.error('Get churn prediction error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/user/:userId/lifetime-value - User lifetime value
router.get('/user/:userId/lifetime-value', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;

    const lifetimeValue = await AnalyticsService.getUserLifetimeValue(userId);

    return res.json({
      success: true,
      data: lifetimeValue,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
      });
    }

    console.error('Get user lifetime value error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/churn-risk - Users at risk of churning
router.get('/churn-risk', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { riskLevel, limit = '50' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get users with high churn risk
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            invoices: true,
            clients: true,
            products: true,
          },
        },
      },
      take: limitNum,
    });

    // Calculate churn predictions for each user
    const usersWithChurnRisk = await Promise.all(
      users.map(async (user) => {
        try {
          const churnPrediction = await AnalyticsService.getChurnPrediction(user.id);
          
          // Filter by risk level if specified
          if (riskLevel && churnPrediction.riskLevel !== riskLevel) {
            return null;
          }

          return {
            user: {
              id: user.id,
              email: user.email,
              companyName: user.companyName,
              firstName: user.firstName,
              lastName: user.lastName,
              createdAt: user.createdAt,
              subscription: user.subscription,
              invoiceCount: user._count.invoices,
              clientCount: user._count.clients,
              productCount: user._count.products,
            },
            churnPrediction,
          };
        } catch (error) {
          console.error(`Error calculating churn for user ${user.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null results and sort by risk score
    const filteredUsers = usersWithChurnRisk
      .filter(Boolean)
      .sort((a, b) => b!.churnPrediction.riskScore - a!.churnPrediction.riskScore);

    return res.json({
      success: true,
      data: {
        users: filteredUsers,
        totalCount: filteredUsers.length,
        riskLevelFilter: riskLevel || 'all',
      },
    });
  } catch (error) {
    console.error('Get churn risk users error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/feature-adoption - Feature adoption report
router.get('/feature-adoption', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const timeRange = z.object({
      start: z.string().transform(val => new Date(val)),
      end: z.string().transform(val => new Date(val)),
    }).parse(req.query);

    const adoptionReport = await AnalyticsService.getFeatureAdoptionReport(timeRange);

    return res.json({
      success: true,
      data: adoptionReport,
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

    console.error('Get feature adoption report error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

// GET /api/admin/analytics/user/:userId/insights - User engagement insights
router.get('/user/:userId/insights', requirePermission('analytics', 'read'), async (req: AdminRequest, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;
    const timeRange = z.object({
      start: z.string().transform(val => new Date(val)),
      end: z.string().transform(val => new Date(val)),
    }).parse(req.query);

    const insights = await AnalyticsService.getUserEngagementInsights(userId, timeRange);

    return res.json({
      success: true,
      data: insights,
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

    console.error('Get user engagement insights error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
});

export default router;