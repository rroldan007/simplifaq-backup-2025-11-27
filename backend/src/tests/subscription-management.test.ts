import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { SubscriptionManagementService } from '../services/subscriptionManagementService';

const prisma = new PrismaClient();

describe('SubscriptionManagementService', () => {
  let testUserId: string;
  let testSubscriptionId: string;
  let testPlanId: string;
  let testNewPlanId: string;

  beforeAll(async () => {
    // Create test plans
    const [freePlan, premiumPlan] = await Promise.all([
      prisma.plan.create({
        data: {
          name: 'test_free',
          displayName: 'Test Free Plan',
          description: 'Test free plan',
          price: 0,
          currency: 'CHF',
          maxInvoicesPerMonth: 5,
          maxClientsTotal: 10,
          maxProductsTotal: 5,
        },
      }),
      prisma.plan.create({
        data: {
          name: 'test_premium',
          displayName: 'Test Premium Plan',
          description: 'Test premium plan',
          price: 29.99,
          currency: 'CHF',
          maxInvoicesPerMonth: 100,
          maxClientsTotal: 500,
          maxProductsTotal: 100,
        },
      }),
    ]);

    testPlanId = freePlan.id;
    testNewPlanId = premiumPlan.id;

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-subscription@example.com',
        password: 'hashedpassword',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
        street: 'Test Street 1',
        city: 'Test City',
        postalCode: '1000',
        country: 'Switzerland',
        subscriptionPlan: 'test_free',
      },
    });

    testUserId = testUser.id;

    // Create test subscription
    const testSubscription = await prisma.subscription.create({
      data: {
        userId: testUserId,
        planId: testPlanId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        billingEmail: testUser.email,
      },
    });

    testSubscriptionId = testSubscription.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.billingLog.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.usageRecord.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.$queryRaw`DELETE FROM billing_credits WHERE user_id = ${testUserId}`;
    await prisma.$queryRaw`DELETE FROM refunds WHERE user_id = ${testUserId}`;
    await prisma.subscription.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { email: 'test-subscription@example.com' },
    });
    await prisma.plan.deleteMany({
      where: { name: { in: ['test_free', 'test_premium'] } },
    });
    await prisma.systemConfig.deleteMany({
      where: { key: { startsWith: 'scheduled_' } },
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset subscription status before each test
    await prisma.subscription.update({
      where: { id: testSubscriptionId },
      data: {
        status: 'active',
        planId: testPlanId,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });
  });

  describe('Plan Changes', () => {
    it('should change user plan immediately', async () => {
      const result = await SubscriptionManagementService.changeUserPlan(
        testUserId,
        testNewPlanId,
        { immediate: true, prorated: true, reason: 'test_upgrade' }
      );

      expect(result.planId).toBe(testNewPlanId);
      expect(result.plan.name).toBe('test_premium');

      // Check billing log was created
      const billingLog = await prisma.billingLog.findFirst({
        where: {
          subscriptionId: testSubscriptionId,
          eventType: 'plan_changed',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(billingLog).toBeTruthy();
      expect(billingLog!.status).toBe('success');
    });

    it('should schedule plan change for future date', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const result = await SubscriptionManagementService.changeUserPlan(
        testUserId,
        testNewPlanId,
        { immediate: false, scheduledDate: futureDate, reason: 'test_scheduled' }
      );

      // Plan should not be changed yet
      expect(result.planId).toBe(testPlanId);

      // Check scheduled change was created
      const scheduledChange = await prisma.systemConfig.findFirst({
        where: { key: `scheduled_plan_change_${testSubscriptionId}` },
      });

      expect(scheduledChange).toBeTruthy();
      expect(scheduledChange!.value).toMatchObject({
        newPlanId: testNewPlanId,
        scheduledDate: futureDate.toISOString(),
      });
    });

    it('should throw error for non-existent plan', async () => {
      await expect(
        SubscriptionManagementService.changeUserPlan(
          testUserId,
          'non-existent-plan-id',
          { immediate: true }
        )
      ).rejects.toThrow('Plan not found');
    });
  });

  describe('Billing Credits', () => {
    it('should add billing credits to subscription', async () => {
      const credit = await SubscriptionManagementService.addCredits(
        testSubscriptionId,
        50.00,
        'Test credit for customer satisfaction',
        'admin@test.com'
      );

      expect(credit.amount).toBe(50.00);
      expect(credit.reason).toBe('Test credit for customer satisfaction');
      expect(credit.isActive).toBe(true);
      expect(credit.createdBy).toBe('admin@test.com');

      // Check billing log was created
      const billingLog = await prisma.billingLog.findFirst({
        where: {
          subscriptionId: testSubscriptionId,
          eventType: 'credit_added',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(billingLog).toBeTruthy();
      expect(billingLog!.amount).toBe(50.00);
    });

    it('should add credits with expiration date', async () => {
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const credit = await SubscriptionManagementService.addCredits(
        testSubscriptionId,
        25.00,
        'Promotional credit',
        'admin@test.com',
        expiryDate
      );

      expect(credit.expiresAt).toEqual(expiryDate);
    });

    it('should apply credits correctly', async () => {
      // Add some credits first
      await SubscriptionManagementService.addCredits(
        testSubscriptionId,
        30.00,
        'Test credit 1',
        'admin@test.com'
      );
      await SubscriptionManagementService.addCredits(
        testSubscriptionId,
        20.00,
        'Test credit 2',
        'admin@test.com'
      );

      // Apply credits
      const appliedAmount = await SubscriptionManagementService.applyCredits(
        testSubscriptionId,
        40.00
      );

      expect(appliedAmount).toBe(40.00);

      // Check billing logs for credit applications
      const creditLogs = await prisma.billingLog.findMany({
        where: {
          subscriptionId: testSubscriptionId,
          eventType: 'credit_applied',
        },
      });

      expect(creditLogs).toHaveLength(2);
      expect(creditLogs[0].amount).toBe(30.00);
      expect(creditLogs[1].amount).toBe(10.00);
    });
  });

  describe('Refund Processing', () => {
    it('should process partial refund', async () => {
      const refund = await SubscriptionManagementService.processRefund({
        subscriptionId: testSubscriptionId,
        amount: 15.00,
        reason: 'Customer dissatisfaction',
        refundType: 'partial',
        processedBy: 'admin@test.com',
      });

      expect(refund.amount).toBe(15.00);
      expect(refund.refund.refund_type).toBe('partial');

      // Check billing log was created
      const billingLog = await prisma.billingLog.findFirst({
        where: {
          subscriptionId: testSubscriptionId,
          eventType: 'refund_processed',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(billingLog).toBeTruthy();
      expect(billingLog!.amount).toBe(15.00);
    });

    it('should process full refund', async () => {
      // First upgrade to premium plan to have a price to refund
      await SubscriptionManagementService.changeUserPlan(
        testUserId,
        testNewPlanId,
        { immediate: true }
      );

      const refund = await SubscriptionManagementService.processRefund({
        subscriptionId: testSubscriptionId,
        amount: 0, // Will be calculated as full refund
        reason: 'Service not as expected',
        refundType: 'full',
        processedBy: 'admin@test.com',
      });

      expect(refund.amount).toBe(29.99); // Premium plan price
      expect(refund.refund.refund_type).toBe('full');
    });
  });

  describe('Usage Tracking', () => {
    it('should get usage metrics', async () => {
      // Create some usage records first
      const currentPeriod = new Date().toISOString().slice(0, 7);
      
      await prisma.usageRecord.createMany({
        data: [
          {
            subscriptionId: testSubscriptionId,
            userId: testUserId,
            resourceType: 'invoices',
            quantity: 3,
            period: currentPeriod,
          },
          {
            subscriptionId: testSubscriptionId,
            userId: testUserId,
            resourceType: 'clients',
            quantity: 5,
            period: currentPeriod,
          },
        ],
      });

      const usage = await SubscriptionManagementService.getUsageMetrics(testSubscriptionId);

      expect(usage.invoices).toBe(3);
      expect(usage.clients).toBe(5);
      expect(usage.products).toBe(0);
      expect(usage.period).toBe(currentPeriod);
    });

    it('should reset usage limits', async () => {
      // Create usage records first
      const currentPeriod = new Date().toISOString().slice(0, 7);
      
      await prisma.usageRecord.create({
        data: {
          subscriptionId: testSubscriptionId,
          userId: testUserId,
          resourceType: 'invoices',
          quantity: 10,
          period: currentPeriod,
        },
      });

      // Reset specific resource type
      await SubscriptionManagementService.resetUsageLimits(
        testSubscriptionId,
        'invoices'
      );

      // Check usage was reset
      const usage = await SubscriptionManagementService.getUsageMetrics(testSubscriptionId);
      expect(usage.invoices).toBe(0);

      // Check billing log was created
      const billingLog = await prisma.billingLog.findFirst({
        where: {
          subscriptionId: testSubscriptionId,
          eventType: 'usage_reset',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(billingLog).toBeTruthy();
    });
  });

  describe('Subscription Pause/Resume', () => {
    it('should pause subscription', async () => {
      const pausedSubscription = await SubscriptionManagementService.pauseSubscription(
        testSubscriptionId
      );

      expect(pausedSubscription.status).toBe('paused');

      // Check billing log was created
      const billingLog = await prisma.billingLog.findFirst({
        where: {
          subscriptionId: testSubscriptionId,
          eventType: 'subscription_paused',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(billingLog).toBeTruthy();
    });

    it('should pause subscription with scheduled resume', async () => {
      const resumeDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

      const pausedSubscription = await SubscriptionManagementService.pauseSubscription(
        testSubscriptionId,
        resumeDate
      );

      expect(pausedSubscription.status).toBe('paused');

      // Check scheduled resume was created
      const scheduledResume = await prisma.systemConfig.findFirst({
        where: { key: `scheduled_resume_${testSubscriptionId}` },
      });

      expect(scheduledResume).toBeTruthy();
      expect(scheduledResume!.value).toMatchObject({
        resumeDate: resumeDate.toISOString(),
      });
    });

    it('should resume paused subscription', async () => {
      // First pause the subscription
      await SubscriptionManagementService.pauseSubscription(testSubscriptionId);

      // Then resume it
      const resumedSubscription = await SubscriptionManagementService.resumeSubscription(
        testSubscriptionId
      );

      expect(resumedSubscription.status).toBe('active');

      // Check billing log was created
      const billingLog = await prisma.billingLog.findFirst({
        where: {
          subscriptionId: testSubscriptionId,
          eventType: 'subscription_resumed',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(billingLog).toBeTruthy();
    });

    it('should throw error when trying to pause already paused subscription', async () => {
      // First pause the subscription
      await SubscriptionManagementService.pauseSubscription(testSubscriptionId);

      // Try to pause again
      await expect(
        SubscriptionManagementService.pauseSubscription(testSubscriptionId)
      ).rejects.toThrow('Subscription is already paused');
    });

    it('should throw error when trying to resume non-paused subscription', async () => {
      await expect(
        SubscriptionManagementService.resumeSubscription(testSubscriptionId)
      ).rejects.toThrow('Subscription is not paused');
    });
  });

  describe('Subscription Details', () => {
    it('should get comprehensive subscription details', async () => {
      // Add some test data
      await SubscriptionManagementService.addCredits(
        testSubscriptionId,
        25.00,
        'Test credit',
        'admin@test.com'
      );

      const details = await SubscriptionManagementService.getSubscriptionDetails(
        testSubscriptionId
      );

      expect(details.id).toBe(testSubscriptionId);
      expect(details.user).toBeTruthy();
      expect(details.plan).toBeTruthy();
      expect(details.credits).toHaveLength(1);
      expect(details.credits[0].amount).toBe(25.00);
      expect(details.nextBillingAmount).toBeDefined();
      expect(details.paymentMethods).toBeDefined();
    });

    it('should get billing history with pagination', async () => {
      // Create some billing logs
      await prisma.billingLog.createMany({
        data: [
          {
            subscriptionId: testSubscriptionId,
            userId: testUserId,
            eventType: 'payment_succeeded',
            amount: 29.99,
            currency: 'CHF',
            status: 'success',
          },
          {
            subscriptionId: testSubscriptionId,
            userId: testUserId,
            eventType: 'subscription_created',
            amount: 0,
            currency: 'CHF',
            status: 'success',
          },
        ],
      });

      const billingHistory = await SubscriptionManagementService.getBillingHistory(
        testSubscriptionId,
        { page: 1, limit: 10 }
      );

      expect(billingHistory.billingLogs.length).toBeGreaterThan(0);
      expect(billingHistory.pagination).toBeTruthy();
      expect(billingHistory.pagination.currentPage).toBe(1);
      expect(billingHistory.pagination.limit).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent subscription', async () => {
      await expect(
        SubscriptionManagementService.getSubscriptionDetails('non-existent-id')
      ).rejects.toThrow('Subscription not found');
    });

    it('should throw error when changing to same plan', async () => {
      await expect(
        SubscriptionManagementService.changeUserPlan(testUserId, testPlanId)
      ).rejects.toThrow('User is already on this plan');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        SubscriptionManagementService.changeUserPlan('non-existent-user', testNewPlanId)
      ).rejects.toThrow('Subscription not found');
    });
  });
});