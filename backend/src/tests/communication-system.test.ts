import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { CommunicationService } from '../services/communicationService';
import { setupTestDatabase, cleanupTestDatabase, createTestAdmin, createTestUser } from './test-utils';

const prisma = new PrismaClient();

describe('Communication System', () => {
  let testAdmin: any;
  let testUser: any;
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    testAdmin = await createTestAdmin();
    testUser = await createTestUser();
    
    // Create admin session token (simplified for testing)
    adminToken = 'test-admin-token';
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.emailSend.deleteMany({});
    await prisma.emailCampaign.deleteMany({});
    await prisma.userSegment.deleteMany({});
    await prisma.supportTicket.deleteMany({});
    await prisma.emailTemplate.deleteMany({});
  });

  describe('Email Template Management', () => {
    it('should create email template with variable substitution', async () => {
      const templateData = {
        name: 'welcome_email',
        subject: 'Bienvenue {{user_first_name}}!',
        htmlContent: '<h1>Bonjour {{user_first_name}} {{user_last_name}}</h1><p>Bienvenue chez {{user_company}}!</p>',
        textContent: 'Bonjour {{user_first_name}} {{user_last_name}}, bienvenue chez {{user_company}}!',
        language: 'fr',
        variables: {
          user_first_name: 'string',
          user_last_name: 'string',
          user_company: 'string',
        },
      };

      const template = await CommunicationService.createEmailTemplate(templateData);

      expect(template).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.subject).toBe(templateData.subject);
      expect(template.htmlContent).toBe(templateData.htmlContent);
      expect(template.isActive).toBe(true);
    });

    it('should process template variables correctly', async () => {
      const template = await CommunicationService.createEmailTemplate({
        name: 'test_template',
        subject: 'Hello {{user_first_name}}!',
        htmlContent: '<p>Welcome {{user_first_name}} from {{user_company}}</p>',
        language: 'fr',
      });

      const result = await CommunicationService.sendEmail(testUser.id, template.id, {
        custom_var: 'test_value',
      });

      expect(result.status).toBe('sent');
      expect(result.messageId).toBeDefined();
    });

    it('should get email templates with filtering', async () => {
      await CommunicationService.createEmailTemplate({
        name: 'welcome_template',
        subject: 'Welcome',
        htmlContent: '<p>Welcome</p>',
        language: 'fr',
      });

      await CommunicationService.createEmailTemplate({
        name: 'billing_template',
        subject: 'Billing',
        htmlContent: '<p>Billing</p>',
        language: 'fr',
      });

      const allTemplates = await CommunicationService.getEmailTemplates();
      expect(allTemplates).toHaveLength(2);

      const welcomeTemplates = await CommunicationService.getEmailTemplates('welcome');
      expect(welcomeTemplates).toHaveLength(1);
      expect(welcomeTemplates[0].name).toBe('welcome_template');
    });

    it('should update email template', async () => {
      const template = await CommunicationService.createEmailTemplate({
        name: 'test_template',
        subject: 'Original Subject',
        htmlContent: '<p>Original Content</p>',
        language: 'fr',
      });

      const updatedTemplate = await CommunicationService.updateEmailTemplate(template.id, {
        subject: 'Updated Subject',
        htmlContent: '<p>Updated Content</p>',
      });

      expect(updatedTemplate.subject).toBe('Updated Subject');
      expect(updatedTemplate.htmlContent).toBe('<p>Updated Content</p>');
    });

    it('should soft delete email template', async () => {
      const template = await CommunicationService.createEmailTemplate({
        name: 'test_template',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        language: 'fr',
      });

      await CommunicationService.deleteEmailTemplate(template.id);

      const templates = await CommunicationService.getEmailTemplates();
      expect(templates).toHaveLength(0);
    });
  });

  describe('User Segmentation', () => {
    it('should create user segment with criteria', async () => {
      const segmentData = {
        name: 'Premium Users',
        description: 'Users with premium subscription',
        criteria: {
          plans: ['premium'],
          registrationDateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31'),
          },
        },
        createdBy: testAdmin.id,
      };

      const segment = await CommunicationService.createUserSegment(segmentData);

      expect(segment).toBeDefined();
      expect(segment.name).toBe(segmentData.name);
      expect(segment.criteria).toEqual(segmentData.criteria);
      expect(segment.isDynamic).toBe(true);
    });

    it('should calculate segment user count', async () => {
      // Create additional test users with different plans
      const premiumUser = await prisma.user.create({
        data: {
          email: 'premium@test.com',
          password: 'hashedpassword',
          companyName: 'Premium Corp',
          firstName: 'Premium',
          lastName: 'User',
          subscriptionPlan: 'premium',
          street: '123 Test St',
          city: 'Test City',
          postalCode: '12345',
        },
      });

      const segment = await CommunicationService.createUserSegment({
        name: 'Premium Users',
        criteria: {
          plans: ['premium'],
        },
        createdBy: testAdmin.id,
      });

      expect(segment.userCount).toBe(1);
    });

    it('should get users in segment with pagination', async () => {
      const segment = await CommunicationService.createUserSegment({
        name: 'All Users',
        criteria: {},
        createdBy: testAdmin.id,
      });

      const result = await CommunicationService.getUsersInSegment(segment.id, {
        skip: 0,
        take: 10,
      });

      expect(result.users).toBeDefined();
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.users[0]).toHaveProperty('email');
      expect(result.users[0]).toHaveProperty('firstName');
    });

    it('should update user segment', async () => {
      const segment = await CommunicationService.createUserSegment({
        name: 'Original Name',
        criteria: { plans: ['free'] },
        createdBy: testAdmin.id,
      });

      const updatedSegment = await CommunicationService.updateUserSegment(segment.id, {
        name: 'Updated Name',
        criteria: { plans: ['premium'] },
      });

      expect(updatedSegment.name).toBe('Updated Name');
    });

    it('should delete user segment', async () => {
      const segment = await CommunicationService.createUserSegment({
        name: 'Test Segment',
        criteria: {},
        createdBy: testAdmin.id,
      });

      await CommunicationService.deleteUserSegment(segment.id);

      const segments = await CommunicationService.getUserSegments();
      expect(segments.find(s => s.id === segment.id)).toBeUndefined();
    });
  });

  describe('Email Campaigns', () => {
    let emailTemplate: any;

    beforeEach(async () => {
      emailTemplate = await CommunicationService.createEmailTemplate({
        name: 'campaign_template',
        subject: 'Campaign Subject {{user_first_name}}',
        htmlContent: '<p>Hello {{user_first_name}}!</p>',
        language: 'fr',
      });
    });

    it('should create email campaign', async () => {
      const campaignData = {
        name: 'Welcome Campaign',
        subject: 'Welcome to our platform!',
        templateId: emailTemplate.id,
        createdBy: testAdmin.id,
        targetSegment: {
          plans: ['free'],
        },
        variables: {
          company_name: 'Test Company',
        },
      };

      const campaign = await CommunicationService.createEmailCampaign(campaignData);

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe(campaignData.name);
      expect(campaign.status).toBe('draft');
      expect(campaign.templateId).toBe(emailTemplate.id);
    });

    it('should create scheduled campaign', async () => {
      const scheduledAt = new Date(Date.now() + 3600000); // 1 hour from now

      const campaign = await CommunicationService.createEmailCampaign({
        name: 'Scheduled Campaign',
        subject: 'Scheduled Email',
        templateId: emailTemplate.id,
        createdBy: testAdmin.id,
        scheduledAt,
      });

      expect(campaign.status).toBe('scheduled');
      expect(campaign.scheduledAt).toEqual(scheduledAt);
    });

    it('should get email campaigns with filtering', async () => {
      await CommunicationService.createEmailCampaign({
        name: 'Draft Campaign',
        subject: 'Draft',
        templateId: emailTemplate.id,
        createdBy: testAdmin.id,
      });

      const campaigns = await CommunicationService.getEmailCampaigns();
      expect(campaigns).toHaveLength(1);

      const draftCampaigns = await CommunicationService.getEmailCampaigns({
        status: 'draft',
      });
      expect(draftCampaigns).toHaveLength(1);
    });

    it('should get campaign details', async () => {
      const campaign = await CommunicationService.createEmailCampaign({
        name: 'Test Campaign',
        subject: 'Test',
        templateId: emailTemplate.id,
        createdBy: testAdmin.id,
      });

      const details = await CommunicationService.getCampaignDetails(campaign.id);

      expect(details).toBeDefined();
      expect(details.template).toBeDefined();
      expect(details.template.name).toBe(emailTemplate.name);
    });

    it('should send campaign to segment', async () => {
      const campaign = await CommunicationService.createEmailCampaign({
        name: 'Test Campaign',
        subject: 'Test Subject',
        templateId: emailTemplate.id,
        createdBy: testAdmin.id,
        targetSegment: {
          plans: ['free'],
        },
      });

      const result = await CommunicationService.sendCampaignToSegment(campaign.id);

      expect(result.success).toBe(true);
      expect(result.totalQueued).toBeGreaterThan(0);
      expect(result.message).toContain('queued');
    });

    it('should calculate campaign statistics', async () => {
      const campaign = await CommunicationService.createEmailCampaign({
        name: 'Stats Campaign',
        subject: 'Stats Test',
        templateId: emailTemplate.id,
        createdBy: testAdmin.id,
      });

      // Create some email sends for testing
      await prisma.emailSend.createMany({
        data: [
          {
            campaignId: campaign.id,
            userId: testUser.id,
            email: testUser.email,
            templateId: emailTemplate.id,
            subject: 'Test',
            status: 'delivered',
          },
          {
            campaignId: campaign.id,
            userId: testUser.id,
            email: 'test2@example.com',
            templateId: emailTemplate.id,
            subject: 'Test',
            status: 'opened',
          },
        ],
      });

      const stats = await CommunicationService.getCampaignStats(campaign.id);

      expect(stats).toBeDefined();
      expect(stats.totalSent).toBe(2);
      expect(stats.delivered).toBe(1);
      expect(stats.opened).toBe(1);
      expect(stats.openRate).toBeGreaterThan(0);
    });
  });

  describe('Bulk Messaging', () => {
    let emailTemplate: any;

    beforeEach(async () => {
      emailTemplate = await CommunicationService.createEmailTemplate({
        name: 'bulk_template',
        subject: 'Bulk Email {{user_first_name}}',
        htmlContent: '<p>Hello {{user_first_name}}!</p>',
        language: 'fr',
      });
    });

    it('should send bulk email to multiple users', async () => {
      const userIds = [testUser.id];
      const variables = {
        company_name: 'Test Company',
      };

      const result = await CommunicationService.sendBulkEmail(
        userIds,
        emailTemplate.id,
        variables
      );

      expect(result.totalSent).toBe(1);
      expect(result.totalFailed).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe('sent');
    });

    it('should handle bulk email failures gracefully', async () => {
      const invalidUserIds = ['invalid-user-id'];

      const result = await CommunicationService.sendBulkEmail(
        invalidUserIds,
        emailTemplate.id,
        {}
      );

      expect(result.totalSent).toBe(0);
      expect(result.totalFailed).toBe(1);
      expect(result.results[0].status).toBe('failed');
      expect(result.results[0].error).toBeDefined();
    });
  });

  describe('Support Ticket Integration', () => {
    it('should create support ticket', async () => {
      const ticketData = {
        subject: 'Test Support Issue',
        description: 'This is a test support ticket',
        priority: 'medium' as const,
        category: 'technical' as const,
        contactEmail: testUser.email,
        contactName: `${testUser.firstName} ${testUser.lastName}`,
      };

      const ticket = await CommunicationService.createSupportTicket(testUser.id, ticketData);

      expect(ticket).toBeDefined();
      expect(ticket.subject).toBe(ticketData.subject);
      expect(ticket.status).toBe('open');
      expect(ticket.userId).toBe(testUser.id);
    });

    it('should add response to support ticket', async () => {
      const ticket = await CommunicationService.createSupportTicket(testUser.id, {
        subject: 'Test Ticket',
        description: 'Test description',
        priority: 'medium',
        category: 'general',
        contactEmail: testUser.email,
      });

      const response = await CommunicationService.addTicketResponse(
        ticket.id,
        testAdmin.id,
        'This is a response from support',
        false
      );

      expect(response).toBeDefined();
      expect(response.message).toBe('This is a response from support');
      expect(response.responderId).toBe(testAdmin.id);
      expect(response.isInternal).toBe(false);
    });

    it('should update ticket status', async () => {
      const ticket = await CommunicationService.createSupportTicket(testUser.id, {
        subject: 'Test Ticket',
        description: 'Test description',
        priority: 'medium',
        category: 'general',
        contactEmail: testUser.email,
      });

      const updatedTicket = await CommunicationService.updateTicketStatus(
        ticket.id,
        'resolved',
        testAdmin.id
      );

      expect(updatedTicket.status).toBe('resolved');
      expect(updatedTicket.assignedTo).toBe(testAdmin.id);
      expect(updatedTicket.resolvedAt).toBeDefined();
    });

    it('should get support history for user', async () => {
      await CommunicationService.createSupportTicket(testUser.id, {
        subject: 'First Ticket',
        description: 'First ticket description',
        priority: 'low',
        category: 'general',
        contactEmail: testUser.email,
      });

      await CommunicationService.createSupportTicket(testUser.id, {
        subject: 'Second Ticket',
        description: 'Second ticket description',
        priority: 'high',
        category: 'billing',
        contactEmail: testUser.email,
      });

      const history = await CommunicationService.getSupportHistory(testUser.id);

      expect(history).toHaveLength(2);
      expect(history[0].subject).toBe('Second Ticket'); // Should be ordered by creation date desc
    });

    it('should get ticket statistics', async () => {
      await CommunicationService.createSupportTicket(testUser.id, {
        subject: 'Open Ticket',
        description: 'Open ticket',
        priority: 'medium',
        category: 'technical',
        contactEmail: testUser.email,
      });

      const resolvedTicket = await CommunicationService.createSupportTicket(testUser.id, {
        subject: 'Resolved Ticket',
        description: 'Resolved ticket',
        priority: 'high',
        category: 'billing',
        contactEmail: testUser.email,
      });

      await CommunicationService.updateTicketStatus(resolvedTicket.id, 'resolved');

      const stats = await CommunicationService.getTicketStatistics();

      expect(stats.totalTickets).toBe(2);
      expect(stats.statusDistribution.open).toBe(1);
      expect(stats.statusDistribution.resolved).toBe(1);
      expect(stats.priorityDistribution.medium).toBe(1);
      expect(stats.priorityDistribution.high).toBe(1);
      expect(stats.categoryDistribution.technical).toBe(1);
      expect(stats.categoryDistribution.billing).toBe(1);
    });
  });

  describe('Communication History Tracking', () => {
    let emailTemplate: any;

    beforeEach(async () => {
      emailTemplate = await CommunicationService.createEmailTemplate({
        name: 'history_template',
        subject: 'History Test',
        htmlContent: '<p>Test</p>',
        language: 'fr',
      });
    });

    it('should get enhanced communication history', async () => {
      // Create email send record
      await prisma.emailSend.create({
        data: {
          userId: testUser.id,
          email: testUser.email,
          templateId: emailTemplate.id,
          subject: 'Test Email',
          status: 'delivered',
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      // Create support ticket
      await CommunicationService.createSupportTicket(testUser.id, {
        subject: 'Test Ticket',
        description: 'Test description',
        priority: 'medium',
        category: 'general',
        contactEmail: testUser.email,
      });

      const history = await CommunicationService.getEnhancedCommunicationHistory(testUser.id);

      expect(history.emails).toHaveLength(1);
      expect(history.tickets).toHaveLength(1);
      expect(history.totalEmails).toBe(1);
      expect(history.totalTickets).toBe(1);
      expect(history.engagementStats).toBeDefined();
      expect(history.engagementStats.emailsReceived).toBe(1);
    });

    it('should calculate engagement statistics', async () => {
      // Create email sends with different engagement levels
      await prisma.emailSend.createMany({
        data: [
          {
            userId: testUser.id,
            email: testUser.email,
            templateId: emailTemplate.id,
            subject: 'Email 1',
            status: 'delivered',
            deliveredAt: new Date(),
          },
          {
            userId: testUser.id,
            email: testUser.email,
            templateId: emailTemplate.id,
            subject: 'Email 2',
            status: 'opened',
            deliveredAt: new Date(),
            openedAt: new Date(),
          },
          {
            userId: testUser.id,
            email: testUser.email,
            templateId: emailTemplate.id,
            subject: 'Email 3',
            status: 'clicked',
            deliveredAt: new Date(),
            openedAt: new Date(),
            clickedAt: new Date(),
          },
        ],
      });

      const history = await CommunicationService.getEnhancedCommunicationHistory(testUser.id);

      expect(history.engagementStats.emailsReceived).toBe(3);
      expect(history.engagementStats.emailsOpened).toBe(2);
      expect(history.engagementStats.emailsClicked).toBe(1);
      expect(history.engagementStats.openRate).toBeCloseTo(66.67, 1);
      expect(history.engagementStats.clickRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('Email Engagement Tracking', () => {
    it('should track email engagement events', async () => {
      const emailSend = await prisma.emailSend.create({
        data: {
          userId: testUser.id,
          email: testUser.email,
          templateId: 'template-id',
          subject: 'Test Email',
          status: 'sent',
        },
      });

      await CommunicationService.trackEmailEngagementEnhanced(emailSend.id, {
        type: 'delivered',
        timestamp: new Date(),
      });

      const updatedEmail = await prisma.emailSend.findUnique({
        where: { id: emailSend.id },
      });

      expect(updatedEmail?.status).toBe('delivered');
      expect(updatedEmail?.deliveredAt).toBeDefined();
    });

    it('should track multiple engagement events', async () => {
      const emailSend = await prisma.emailSend.create({
        data: {
          userId: testUser.id,
          email: testUser.email,
          templateId: 'template-id',
          subject: 'Test Email',
          status: 'sent',
        },
      });

      const now = new Date();

      // Track delivery
      await CommunicationService.trackEmailEngagementEnhanced(emailSend.id, {
        type: 'delivered',
        timestamp: now,
      });

      // Track open
      await CommunicationService.trackEmailEngagementEnhanced(emailSend.id, {
        type: 'opened',
        timestamp: new Date(now.getTime() + 1000),
      });

      // Track click
      await CommunicationService.trackEmailEngagementEnhanced(emailSend.id, {
        type: 'clicked',
        timestamp: new Date(now.getTime() + 2000),
      });

      const updatedEmail = await prisma.emailSend.findUnique({
        where: { id: emailSend.id },
      });

      expect(updatedEmail?.status).toBe('clicked');
      expect(updatedEmail?.deliveredAt).toBeDefined();
      expect(updatedEmail?.openedAt).toBeDefined();
      expect(updatedEmail?.clickedAt).toBeDefined();
    });
  });
});