import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../services/analyticsService';
import { createTestUser, createTestClient, createTestProduct } from './test-utils';
import express from 'express';
import analyticsRoutes from '../routes/admin/analytics';

const prisma = new PrismaClient();

// Create a simple test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/analytics', analyticsRoutes);
  return app;
}

describe('Analytics Service', () => {
  let testUserId: string;
  let testClientId: string;

  beforeAll(async () => {
    // Create test user with data
    const user = await createTestUser({
      email: 'analytics-test@example.com',
    });
    testUserId = user.id;

    // Create test client
    const client = await createTestClient(testUserId, {
      email: 'client@test.com',
    });
    testClientId = client.id;

    // Create test subscription
    const plan = await prisma.plan.create({
      data: {
        name: 'test-plan',
        displayName: 'Test Plan',
        price: 29.99,
        currency: 'CHF',
      },
    });

    await prisma.subscription.create({
      data: {
        userId: testUserId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create test invoices
    for (let i = 0; i < 5; i++) {
      await prisma.invoice.create({
        data: {
          userId: testUserId,
          clientId: testClientId,
          invoiceNumber: `TEST-${i + 1}`,
          status: 'paid',
          subtotal: 100 + i * 10,
          tvaAmount: (100 + i * 10) * 0.081,
          total: (100 + i * 10) * 1.081,
          currency: 'CHF',
          dueDate: new Date(),
          paidDate: new Date(),
          items: {
            create: [
              {
                description: `Test Item ${i + 1}`,
                quantity: 1,
                unitPrice: 100 + i * 10,
                total: 100 + i * 10,
                tvaRate: 8.1,
                order: 0,
              },
            ],
          },
        },
      });
    }

    // Create additional test clients
    for (let i = 1; i < 3; i++) {
      await createTestClient(testUserId, {
        email: `client${i + 1}@test.com`,
      });
    }

    // Create test products
    for (let i = 0; i < 2; i++) {
      await createTestProduct(testUserId, {
        name: `Test Product ${i + 1}`,
        unitPrice: 50 + i * 25,
      });
    }

    // Create test sessions
    for (let i = 0; i < 10; i++) {
      await prisma.session.create({
        data: {
          userId: testUserId,
          token: `test-session-${i}`,
          refreshToken: `refresh-test-session-${i}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour sessions
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.session.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.client.deleteMany();
    await prisma.product.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('User Engagement Metrics', () => {
    it('should calculate user engagement metrics correctly', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
      };

      const metrics = await AnalyticsService.getUserEngagementMetrics(testUserId, timeRange);

      expect(metrics).toHaveProperty('loginFrequency');
      expect(metrics).toHaveProperty('featureUsage');
      expect(metrics).toHaveProperty('sessionDuration');
      expect(metrics).toHaveProperty('lastActiveDate');
      expect(metrics).toHaveProperty('engagementScore');
      expect(metrics).toHaveProperty('trendDirection');

      expect(metrics.featureUsage.invoicing).toBe(5);
      expect(metrics.featureUsage.client_management).toBe(3);
      expect(metrics.featureUsage.product_management).toBe(2);
      expect(metrics.engagementScore).toBeGreaterThan(0);
      expect(['up', 'down', 'stable']).toContain(metrics.trendDirection);
    });

    it('should handle invalid user ID', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      // Should not throw error, but return default values
      const metrics = await AnalyticsService.getUserEngagementMetrics('invalid-id', timeRange);
      expect(metrics.featureUsage.invoicing).toBe(0);
      expect(metrics.engagementScore).toBe(0);
    });
  });

  describe('Churn Prediction', () => {
    it('should calculate churn prediction for active user', async () => {
      const prediction = await AnalyticsService.getChurnPrediction(testUserId);

      expect(prediction).toHaveProperty('riskScore');
      expect(prediction).toHaveProperty('riskLevel');
      expect(prediction).toHaveProperty('factors');
      expect(prediction).toHaveProperty('recommendedActions');
      expect(prediction).toHaveProperty('confidenceLevel');

      expect(prediction.riskScore).toBeGreaterThanOrEqual(0);
      expect(prediction.riskScore).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);
      expect(Array.isArray(prediction.factors)).toBe(true);
      expect(Array.isArray(prediction.recommendedActions)).toBe(true);
      expect(prediction.confidenceLevel).toBeGreaterThan(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(AnalyticsService.getChurnPrediction('non-existent-id'))
        .rejects.toThrow('User not found');
    });
  });

  describe('Revenue Analytics', () => {
    it('should calculate revenue metrics correctly', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const metrics = await AnalyticsService.getRevenueAnalytics(timeRange);

      expect(metrics).toHaveProperty('totalRevenue');
      expect(metrics).toHaveProperty('monthlyRecurringRevenue');
      expect(metrics).toHaveProperty('averageRevenuePerUser');
      expect(metrics).toHaveProperty('revenueGrowthRate');
      expect(metrics).toHaveProperty('churnRate');
      expect(metrics).toHaveProperty('lifetimeValue');

      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.monthlyRecurringRevenue).toBeGreaterThan(0);
      expect(metrics.averageRevenuePerUser).toBeGreaterThan(0);
    });
  });

  describe('User Lifetime Value', () => {
    it('should calculate user lifetime value correctly', async () => {
      const ltv = await AnalyticsService.getUserLifetimeValue(testUserId);

      expect(ltv).toHaveProperty('value');
      expect(ltv).toHaveProperty('monthsActive');
      expect(ltv).toHaveProperty('totalSpent');
      expect(ltv).toHaveProperty('averageMonthlySpend');
      expect(ltv).toHaveProperty('predictedValue');

      expect(ltv.value).toBeGreaterThan(0);
      expect(ltv.monthsActive).toBeGreaterThan(0);
      expect(ltv.totalSpent).toBeGreaterThan(0);
      expect(ltv.predictedValue).toBeGreaterThan(ltv.value);
    });

    it('should throw error for non-existent user', async () => {
      await expect(AnalyticsService.getUserLifetimeValue('non-existent-id'))
        .rejects.toThrow('User not found');
    });
  });

  describe('Feature Usage Statistics', () => {
    it('should calculate invoicing feature usage', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const usage = await AnalyticsService.getFeatureUsageStats('invoicing', timeRange);

      expect(usage).toHaveProperty('feature');
      expect(usage).toHaveProperty('totalUsers');
      expect(usage).toHaveProperty('activeUsers');
      expect(usage).toHaveProperty('usageCount');
      expect(usage).toHaveProperty('adoptionRate');
      expect(usage).toHaveProperty('trendData');

      expect(usage.feature).toBe('invoicing');
      expect(usage.activeUsers).toBeGreaterThan(0);
      expect(usage.usageCount).toBe(5);
      expect(usage.adoptionRate).toBeGreaterThan(0);
    });

    it('should calculate client management feature usage', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const usage = await AnalyticsService.getFeatureUsageStats('client_management', timeRange);

      expect(usage.feature).toBe('client_management');
      expect(usage.activeUsers).toBeGreaterThan(0);
      expect(usage.usageCount).toBe(3);
    });

    it('should throw error for unsupported feature', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      await expect(AnalyticsService.getFeatureUsageStats('unsupported_feature', timeRange))
        .rejects.toThrow('Feature unsupported_feature not supported');
    });
  });

  describe('Cohort Analysis', () => {
    it('should perform monthly cohort analysis', async () => {
      const cohortParams = {
        cohortType: 'monthly' as const,
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      };

      const cohortData = await AnalyticsService.getCohortAnalysis(cohortParams);

      expect(Array.isArray(cohortData)).toBe(true);
      
      if (cohortData.length > 0) {
        const cohort = cohortData[0];
        expect(cohort).toHaveProperty('cohortMonth');
        expect(cohort).toHaveProperty('userCount');
        expect(cohort).toHaveProperty('retentionRates');
        expect(cohort).toHaveProperty('revenuePerUser');
        expect(cohort).toHaveProperty('churnRate');
        
        expect(Array.isArray(cohort.retentionRates)).toBe(true);
        expect(Array.isArray(cohort.revenuePerUser)).toBe(true);
      }
    });
  });
});

describe('Analytics API Endpoints', () => {
  let app: any;
  let testUserId: string;

  beforeAll(async () => {
    app = createTestApp();

    // Create test user
    const user = await createTestUser({
      email: 'api-test@example.com',
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'api-test@example.com' } });
    await prisma.$disconnect();
  });

  describe('Feature Adoption Report', () => {
    it('should generate feature adoption report', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await AnalyticsService.getFeatureAdoptionReport(timeRange);

      expect(report).toHaveProperty('features');
      expect(report).toHaveProperty('overallAdoption');
      expect(Array.isArray(report.features)).toBe(true);
      expect(typeof report.overallAdoption).toBe('number');

      if (report.features.length > 0) {
        const feature = report.features[0];
        expect(feature).toHaveProperty('name');
        expect(feature).toHaveProperty('displayName');
        expect(feature).toHaveProperty('adoptionRate');
        expect(feature).toHaveProperty('activeUsers');
        expect(feature).toHaveProperty('usageCount');
        expect(feature).toHaveProperty('trend');
        expect(['up', 'down', 'stable']).toContain(feature.trend);
      }
    });
  });

  describe('User Engagement Insights', () => {
    it('should provide user engagement insights', async () => {
      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const insights = await AnalyticsService.getUserEngagementInsights(testUserId, timeRange);

      expect(insights).toHaveProperty('metrics');
      expect(insights).toHaveProperty('insights');
      expect(insights).toHaveProperty('benchmarks');

      expect(Array.isArray(insights.insights)).toBe(true);
      expect(insights.benchmarks).toHaveProperty('industryAverage');
      expect(insights.benchmarks).toHaveProperty('topPercentile');
      expect(insights.benchmarks).toHaveProperty('userPercentile');

      if (insights.insights.length > 0) {
        const insight = insights.insights[0];
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('message');
        expect(['positive', 'warning', 'critical']).toContain(insight.type);
      }
    });
  });
});