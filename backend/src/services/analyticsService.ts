import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Types and interfaces
export interface TimeRange {
  start: Date;
  end: Date;
}

export interface EngagementMetrics {
  loginFrequency: number;
  featureUsage: Record<string, number>;
  sessionDuration: number;
  lastActiveDate: Date;
  engagementScore: number;
  trendDirection: 'up' | 'down' | 'stable';
}

export interface CohortParams {
  cohortType: 'monthly' | 'weekly';
  startDate: Date;
  endDate: Date;
}

export interface CohortData {
  cohortMonth: string;
  userCount: number;
  retentionRates: number[];
  revenuePerUser: number[];
  churnRate: number;
}

export interface ChurnPrediction {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: ChurnFactor[];
  recommendedActions: string[];
  confidenceLevel: number;
}

export interface ChurnFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  revenueGrowthRate: number;
  churnRate: number;
  lifetimeValue: number;
}

export interface LifetimeValue {
  value: number;
  monthsActive: number;
  totalSpent: number;
  averageMonthlySpend: number;
  predictedValue: number;
}

export interface FeatureUsage {
  feature: string;
  totalUsers: number;
  activeUsers: number;
  usageCount: number;
  adoptionRate: number;
  trendData: Array<{ date: Date; count: number }>;
}

// Validation schemas
const timeRangeSchema = z.object({
  start: z.date(),
  end: z.date(),
});

const cohortParamsSchema = z.object({
  cohortType: z.enum(['monthly', 'weekly']),
  startDate: z.date(),
  endDate: z.date(),
});

export class AnalyticsService {
  /**
   * Get user engagement metrics
   */
  static async getUserEngagementMetrics(userId: string, timeRange: TimeRange): Promise<EngagementMetrics> {
    const validatedTimeRange = timeRangeSchema.parse(timeRange);

    // Get user activity data
    const [invoiceActivity, clientActivity, productActivity, sessionData] = await Promise.all([
      prisma.invoice.count({
        where: {
          userId,
          createdAt: {
            gte: validatedTimeRange.start,
            lte: validatedTimeRange.end,
          },
        },
      }),
      prisma.client.count({
        where: {
          userId,
          createdAt: {
            gte: validatedTimeRange.start,
            lte: validatedTimeRange.end,
          },
        },
      }),
      prisma.product.count({
        where: {
          userId,
          createdAt: {
            gte: validatedTimeRange.start,
            lte: validatedTimeRange.end,
          },
        },
      }),
      prisma.session.findMany({
        where: {
          userId,
          createdAt: {
            gte: validatedTimeRange.start.toISOString(),
            lte: validatedTimeRange.end.toISOString(),
          },
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Calculate feature usage
    const featureUsage = {
      invoicing: invoiceActivity,
      client_management: clientActivity,
      product_management: productActivity,
      sessions: sessionData.length,
    };

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(featureUsage);

    // Get last active date
    const lastActiveDate = await this.getLastActiveDate(userId);

    // Calculate login frequency (sessions per day)
    const daysDiff = Math.max(1, Math.ceil((validatedTimeRange.end.getTime() - validatedTimeRange.start.getTime()) / (1000 * 60 * 60 * 24)));
    const loginFrequency = sessionData.length / daysDiff;

    // Calculate average session duration (simplified)
    const avgSessionDuration = sessionData.length > 0 
      ? sessionData.reduce((acc, session) => {
          const updatedAt = new Date(session.updatedAt);
          const createdAt = new Date(session.createdAt);
          const duration = updatedAt.getTime() - createdAt.getTime();
          return acc + duration;
        }, 0) / sessionData.length / (1000 * 60) // Convert to minutes
      : 0;

    // Determine trend direction (simplified)
    const trendDirection = await this.calculateTrendDirection(userId, validatedTimeRange);

    return {
      loginFrequency,
      featureUsage,
      sessionDuration: avgSessionDuration,
      lastActiveDate,
      engagementScore,
      trendDirection,
    };
  }

  /**
   * Get cohort analysis data
   */
  static async getCohortAnalysis(cohortParams: CohortParams): Promise<CohortData[]> {
    const validatedParams = cohortParamsSchema.parse(cohortParams);

    // Get users grouped by registration month
    const userCohorts = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: validatedParams.startDate,
          lte: validatedParams.endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Process cohort data (simplified implementation)
    const cohortData: CohortData[] = [];
    
    for (const cohort of userCohorts) {
      const cohortMonth = cohort.createdAt.toISOString().slice(0, 7);
      
      // Calculate retention rates (simplified)
      const retentionRates = await this.calculateRetentionRates(cohort.createdAt);
      
      // Calculate revenue per user for this cohort
      const revenuePerUser = await this.calculateCohortRevenue(cohort.createdAt);
      
      // Calculate churn rate
      const churnRate = await this.calculateCohortChurnRate(cohort.createdAt);

      cohortData.push({
        cohortMonth,
        userCount: cohort._count.id,
        retentionRates,
        revenuePerUser,
        churnRate,
      });
    }

    return cohortData;
  }

  /**
   * Get churn prediction for a user
   */
  static async getChurnPrediction(userId: string): Promise<ChurnPrediction> {
    // Get user data for churn analysis
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            invoices: true,
            clients: true,
            products: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate churn factors
    const factors: ChurnFactor[] = [];
    let riskScore = 0;

    // Factor 1: Recent activity
    const lastInvoiceDate = user.invoices[0]?.createdAt;
    const daysSinceLastInvoice = lastInvoiceDate 
      ? Math.floor((Date.now() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastInvoice > 30) {
      const impact = Math.min(daysSinceLastInvoice / 10, 30);
      riskScore += impact;
      factors.push({
        factor: 'inactivity',
        impact,
        description: `No invoices created in ${daysSinceLastInvoice} days`,
      });
    }

    // Factor 2: Low usage
    if (user._count.invoices < 5) {
      const impact = 20;
      riskScore += impact;
      factors.push({
        factor: 'low_usage',
        impact,
        description: `Only ${user._count.invoices} invoices created`,
      });
    }

    // Factor 3: No subscription
    if (!user.subscription) {
      const impact = 25;
      riskScore += impact;
      factors.push({
        factor: 'no_subscription',
        impact,
        description: 'User has no active subscription',
      });
    }

    // Factor 4: Subscription status
    if (user.subscription?.status === 'past_due' || user.subscription?.status === 'unpaid') {
      const impact = 35;
      riskScore += impact;
      factors.push({
        factor: 'payment_issues',
        impact,
        description: `Subscription status: ${user.subscription.status}`,
      });
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore < 30) riskLevel = 'low';
    else if (riskScore < 60) riskLevel = 'medium';
    else riskLevel = 'high';

    // Generate recommended actions
    const recommendedActions = this.generateChurnRecommendations(factors, riskLevel);

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      factors,
      recommendedActions,
      confidenceLevel: 0.75, // Simplified confidence level
    };
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(timeRange: TimeRange): Promise<RevenueMetrics> {
    const validatedTimeRange = timeRangeSchema.parse(timeRange);

    // Get total revenue
    const totalRevenueResult = await prisma.invoice.aggregate({
      where: {
        status: 'paid',
        paidDate: {
          gte: validatedTimeRange.start,
          lte: validatedTimeRange.end,
        },
      },
      _sum: {
        total: true,
      },
    });

    const totalRevenue = Number(totalRevenueResult._sum.total || 0);

    // Get subscription revenue (MRR)
    const subscriptionRevenue = await prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodStart: {
          lte: validatedTimeRange.end,
        },
        currentPeriodEnd: {
          gte: validatedTimeRange.start,
        },
      },
      include: {
        plan: {
          select: {
            price: true,
          },
        },
      },
    });

    const monthlyRecurringRevenue = subscriptionRevenue.reduce((acc, sub) => {
      return acc + Number(sub.plan.price);
    }, 0);

    // Get active users count
    const activeUsersCount = await prisma.user.count({
      where: {
        isActive: true,
        subscription: {
          status: 'active',
        },
      },
    });

    const averageRevenuePerUser = activeUsersCount > 0 ? monthlyRecurringRevenue / activeUsersCount : 0;

    // Calculate growth rate (simplified - comparing to previous period)
    const previousPeriodStart = new Date(validatedTimeRange.start.getTime() - (validatedTimeRange.end.getTime() - validatedTimeRange.start.getTime()));
    const previousPeriodEnd = validatedTimeRange.start;

    const previousRevenueResult = await prisma.invoice.aggregate({
      where: {
        status: 'paid',
        paidDate: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
      },
      _sum: {
        total: true,
      },
    });

    const previousRevenue = Number(previousRevenueResult._sum.total || 0);
    const revenueGrowthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Calculate churn rate (simplified)
    const churnRate = await this.calculateOverallChurnRate(validatedTimeRange);

    // Calculate average lifetime value
    const lifetimeValue = await this.calculateAverageLifetimeValue();

    return {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      revenueGrowthRate,
      churnRate,
      lifetimeValue,
    };
  }

  /**
   * Get user lifetime value
   */
  static async getUserLifetimeValue(userId: string): Promise<LifetimeValue> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        invoices: {
          where: {
            status: 'paid',
          },
          select: {
            total: true,
            paidDate: true,
          },
        },
        subscription: {
          include: {
            plan: {
              select: {
                price: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate total spent
    const totalSpent = user.invoices.reduce((acc, invoice) => {
      return acc + Number(invoice.total);
    }, 0);

    // Calculate months active
    const firstInvoiceDate = user.invoices.length > 0 
      ? user.invoices.reduce((earliest, invoice) => {
          return invoice.paidDate && (!earliest || invoice.paidDate < earliest) ? invoice.paidDate : earliest;
        }, null as Date | null)
      : null;

    const monthsActive = firstInvoiceDate 
      ? Math.max(1, Math.ceil((Date.now() - firstInvoiceDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 1;

    const averageMonthlySpend = totalSpent / monthsActive;

    // Predict future value (simplified)
    const monthlySubscriptionValue = user.subscription ? Number(user.subscription.plan.price) : 0;
    const predictedMonthsRemaining = 12; // Assume 12 months average
    const predictedValue = totalSpent + (monthlySubscriptionValue * predictedMonthsRemaining);

    return {
      value: totalSpent,
      monthsActive,
      totalSpent,
      averageMonthlySpend,
      predictedValue,
    };
  }

  /**
   * Get feature usage statistics
   */
  static async getFeatureUsageStats(feature: string, timeRange: TimeRange): Promise<FeatureUsage> {
    const validatedTimeRange = timeRangeSchema.parse(timeRange);

    let totalUsers = 0;
    let activeUsers = 0;
    let usageCount = 0;
    let trendData: Array<{ date: Date; count: number }> = [];

    switch (feature) {
      case 'invoicing':
        // Get invoice usage stats
        const invoiceStats = await prisma.invoice.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: validatedTimeRange.start,
              lte: validatedTimeRange.end,
            },
          },
          _count: {
            id: true,
          },
        });

        activeUsers = invoiceStats.length;
        usageCount = invoiceStats.reduce((acc, stat) => acc + stat._count.id, 0);

        // Get trend data (daily counts)
        const dailyInvoices = await prisma.invoice.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: validatedTimeRange.start,
              lte: validatedTimeRange.end,
            },
          },
          _count: {
            id: true,
          },
        });

        trendData = dailyInvoices.map(item => ({
          date: item.createdAt,
          count: item._count.id,
        }));
        break;

      case 'client_management':
        // Similar logic for clients
        const clientStats = await prisma.client.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: validatedTimeRange.start,
              lte: validatedTimeRange.end,
            },
          },
          _count: {
            id: true,
          },
        });

        activeUsers = clientStats.length;
        usageCount = clientStats.reduce((acc, stat) => acc + stat._count.id, 0);
        break;

      case 'product_management':
        // Product usage stats
        const productStats = await prisma.product.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: validatedTimeRange.start,
              lte: validatedTimeRange.end,
            },
          },
          _count: {
            id: true,
          },
        });

        activeUsers = productStats.length;
        usageCount = productStats.reduce((acc, stat) => acc + stat._count.id, 0);
        break;

      case 'qr_bills':
        // QR Bill usage stats
        const qrBillStats = await prisma.invoice.groupBy({
          by: ['userId'],
          where: {
            qrReference: { not: null },
            createdAt: {
              gte: validatedTimeRange.start,
              lte: validatedTimeRange.end,
            },
          },
          _count: {
            id: true,
          },
        });

        activeUsers = qrBillStats.length;
        usageCount = qrBillStats.reduce((acc, stat) => acc + stat._count.id, 0);
        break;

      case 'email_sending':
        // Email sending stats (based on sent invoices)
        const emailStats = await prisma.invoice.groupBy({
          by: ['userId'],
          where: {
            sentAt: {
              gte: validatedTimeRange.start,
              lte: validatedTimeRange.end,
              not: null,
            },
          },
          _count: {
            id: true,
          },
        });

        activeUsers = emailStats.length;
        usageCount = emailStats.reduce((acc: number, stat: any) => acc + stat._count.id, 0);
        break;

      case 'pdf_generation':
        // PDF generation stats (based on invoice downloads/views)
        const pdfStats = await prisma.invoice.groupBy({
          by: ['userId'],
          where: {
            status: { in: ['sent', 'paid'] },
            createdAt: {
              gte: validatedTimeRange.start,
              lte: validatedTimeRange.end,
            },
          },
          _count: {
            id: true,
          },
        });

        activeUsers = pdfStats.length;
        usageCount = pdfStats.reduce((acc, stat) => acc + stat._count.id, 0);
        break;

      default:
        throw new Error(`Feature ${feature} not supported`);
    }

    // Get total users for adoption rate calculation
    totalUsers = await prisma.user.count({
      where: {
        isActive: true,
        createdAt: {
          lte: validatedTimeRange.end,
        },
      },
    });

    const adoptionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    return {
      feature,
      totalUsers,
      activeUsers,
      usageCount,
      adoptionRate,
      trendData,
    };
  }

  /**
   * Get comprehensive feature adoption report
   */
  static async getFeatureAdoptionReport(timeRange: TimeRange): Promise<{
    features: Array<{
      name: string;
      displayName: string;
      adoptionRate: number;
      activeUsers: number;
      usageCount: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    overallAdoption: number;
  }> {
    const features = [
      { name: 'invoicing', displayName: 'Invoice Creation' },
      { name: 'client_management', displayName: 'Client Management' },
      { name: 'product_management', displayName: 'Product Management' },
      { name: 'qr_bills', displayName: 'QR Bill Generation' },
      { name: 'pdf_generation', displayName: 'PDF Generation' },
    ];

    const featureStats = await Promise.all(
      features.map(async (feature) => {
        const stats = await this.getFeatureUsageStats(feature.name, timeRange);
        
        // Calculate trend (simplified)
        const previousPeriodStart = new Date(timeRange.start.getTime() - (timeRange.end.getTime() - timeRange.start.getTime()));
        const previousStats = await this.getFeatureUsageStats(feature.name, {
          start: previousPeriodStart,
          end: timeRange.start,
        });

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (stats.usageCount > previousStats.usageCount * 1.1) trend = 'up';
        else if (stats.usageCount < previousStats.usageCount * 0.9) trend = 'down';

        return {
          name: feature.name,
          displayName: feature.displayName,
          adoptionRate: stats.adoptionRate,
          activeUsers: stats.activeUsers,
          usageCount: stats.usageCount,
          trend,
        };
      })
    );

    // Calculate overall adoption (average of all features)
    const overallAdoption = featureStats.reduce((acc, stat) => acc + stat.adoptionRate, 0) / featureStats.length;

    return {
      features: featureStats,
      overallAdoption,
    };
  }

  /**
   * Get user engagement insights with recommendations
   */
  static async getUserEngagementInsights(userId: string, timeRange: TimeRange): Promise<{
    metrics: EngagementMetrics;
    insights: Array<{
      type: 'positive' | 'warning' | 'critical';
      message: string;
      recommendation?: string;
    }>;
    benchmarks: {
      industryAverage: number;
      topPercentile: number;
      userPercentile: number;
    };
  }> {
    const metrics = await this.getUserEngagementMetrics(userId, timeRange);
    const insights: Array<{
      type: 'positive' | 'warning' | 'critical';
      message: string;
      recommendation?: string;
    }> = [];

    // Analyze engagement patterns
    if (metrics.engagementScore >= 80) {
      insights.push({
        type: 'positive',
        message: 'User shows excellent engagement with the platform',
      });
    } else if (metrics.engagementScore >= 50) {
      insights.push({
        type: 'warning',
        message: 'User engagement is moderate',
        recommendation: 'Consider providing feature tutorials or personalized onboarding',
      });
    } else {
      insights.push({
        type: 'critical',
        message: 'User engagement is low',
        recommendation: 'Immediate intervention needed - consider re-engagement campaign',
      });
    }

    // Analyze login frequency
    if (metrics.loginFrequency < 0.1) { // Less than once per 10 days
      insights.push({
        type: 'critical',
        message: 'Very low login frequency detected',
        recommendation: 'Send re-engagement emails and check for user issues',
      });
    }

    // Analyze feature usage
    const totalFeatureUsage = Object.values(metrics.featureUsage).reduce((acc, val) => acc + val, 0);
    if (totalFeatureUsage === 0) {
      insights.push({
        type: 'critical',
        message: 'No feature usage detected in the selected period',
        recommendation: 'User may need onboarding assistance or account review',
      });
    }

    // Analyze trend
    if (metrics.trendDirection === 'down') {
      insights.push({
        type: 'warning',
        message: 'Declining activity trend detected',
        recommendation: 'Monitor closely and consider proactive outreach',
      });
    } else if (metrics.trendDirection === 'up') {
      insights.push({
        type: 'positive',
        message: 'Increasing activity trend - user is becoming more engaged',
      });
    }

    // Calculate benchmarks (simplified)
    const benchmarks = {
      industryAverage: 65,
      topPercentile: 85,
      userPercentile: Math.min(100, Math.max(0, (metrics.engagementScore / 85) * 100)),
    };

    return {
      metrics,
      insights,
      benchmarks,
    };
  }

  // Helper methods
  private static calculateEngagementScore(featureUsage: Record<string, number>): number {
    let score = 0;
    
    // Weight different features
    score += Math.min(featureUsage.invoicing * 10, 40);
    score += Math.min(featureUsage.client_management * 5, 20);
    score += Math.min(featureUsage.product_management * 5, 20);
    score += Math.min(featureUsage.sessions * 2, 20);
    
    return Math.min(score, 100);
  }

  private static async getLastActiveDate(userId: string): Promise<Date> {
    const lastSession = await prisma.session.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return lastSession?.updatedAt ? new Date(lastSession.updatedAt) : new Date(0);
  }

  private static async calculateTrendDirection(userId: string, timeRange: TimeRange): Promise<'up' | 'down' | 'stable'> {
    // Simplified trend calculation
    const midPoint = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2);
    
    const [firstHalfActivity, secondHalfActivity] = await Promise.all([
      prisma.invoice.count({
        where: {
          userId,
          createdAt: {
            gte: timeRange.start,
            lt: midPoint,
          },
        },
      }),
      prisma.invoice.count({
        where: {
          userId,
          createdAt: {
            gte: midPoint,
            lte: timeRange.end,
          },
        },
      }),
    ]);

    if (secondHalfActivity > firstHalfActivity * 1.1) return 'up';
    if (secondHalfActivity < firstHalfActivity * 0.9) return 'down';
    return 'stable';
  }

  private static async calculateRetentionRates(cohortDate: Date): Promise<number[]> {
    // Simplified retention calculation - would need more complex logic in real implementation
    return [100, 85, 70, 60, 55, 50, 45, 42, 40, 38, 36, 35];
  }

  private static async calculateCohortRevenue(cohortDate: Date): Promise<number[]> {
    // Simplified revenue calculation per month for cohort
    return [0, 25, 45, 60, 70, 75, 80, 82, 85, 87, 88, 90];
  }

  private static async calculateCohortChurnRate(cohortDate: Date): Promise<number> {
    // Simplified churn rate calculation
    return 15; // 15% churn rate
  }

  private static generateChurnRecommendations(factors: ChurnFactor[], riskLevel: 'low' | 'medium' | 'high'): string[] {
    const recommendations: string[] = [];

    factors.forEach(factor => {
      switch (factor.factor) {
        case 'inactivity':
          recommendations.push('Send re-engagement email campaign');
          recommendations.push('Offer personalized onboarding session');
          break;
        case 'low_usage':
          recommendations.push('Provide feature tutorials and guides');
          recommendations.push('Schedule product demo call');
          break;
        case 'no_subscription':
          recommendations.push('Offer limited-time subscription discount');
          recommendations.push('Highlight premium features benefits');
          break;
        case 'payment_issues':
          recommendations.push('Contact user about payment method update');
          recommendations.push('Offer payment plan options');
          break;
      }
    });

    if (riskLevel === 'high') {
      recommendations.push('Assign dedicated customer success manager');
      recommendations.push('Offer retention incentive');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private static async calculateOverallChurnRate(timeRange: TimeRange): Promise<number> {
    // Simplified churn rate calculation
    const startOfPeriod = await prisma.user.count({
      where: {
        createdAt: {
          lt: timeRange.start,
        },
        isActive: true,
      },
    });

    const churned = await prisma.user.count({
      where: {
        updatedAt: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
        isActive: false,
      },
    });

    return startOfPeriod > 0 ? (churned / startOfPeriod) * 100 : 0;
  }

  private static async calculateAverageLifetimeValue(): Promise<number> {
    // Simplified LTV calculation
    const avgRevenue = await prisma.invoice.aggregate({
      where: {
        status: 'paid',
      },
      _avg: {
        total: true,
      },
    });

    return Number(avgRevenue._avg.total || 0) * 12; // Assume 12 month average lifetime
  }
}