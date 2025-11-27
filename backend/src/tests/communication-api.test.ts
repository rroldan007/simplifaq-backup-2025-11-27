import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import communicationRoutes from '../routes/admin/communication';

// Mock the middleware
jest.mock('../middleware/adminAuth', () => ({
  adminAuth: (req: any, res: any, next: any) => {
    req.admin = { id: 'test-admin', email: 'admin@test.com', role: 'super_admin' };
    next();
  },
  requirePermission: (resource: string, action: string) => (req: any, res: any, next: any) => next(),
  auditLog: (action: string, resourceType: string) => (req: any, res: any, next: any) => next(),
}));

// Mock the CommunicationService
jest.mock('../services/communicationService', () => ({
  CommunicationService: {
    getEmailTemplates: jest.fn().mockResolvedValue([
      {
        id: 'template-1',
        name: 'Welcome Template',
        subject: 'Welcome {{user_first_name}}!',
        htmlContent: '<h1>Welcome {{user_first_name}}!</h1>',
        isActive: true,
      },
    ]),
    createEmailTemplate: jest.fn().mockResolvedValue({
      id: 'template-2',
      name: 'Test Template',
      subject: 'Test Subject',
      htmlContent: '<p>Test Content</p>',
      isActive: true,
    }),
    getUserSegments: jest.fn().mockResolvedValue([
      {
        id: 'segment-1',
        name: 'Premium Users',
        description: 'Users with premium subscription',
        criteria: { plans: ['premium'] },
        userCount: 10,
        isDynamic: true,
      },
    ]),
    createUserSegment: jest.fn().mockResolvedValue({
      id: 'segment-2',
      name: 'Test Segment',
      description: 'Test segment',
      criteria: { plans: ['free'] },
      userCount: 5,
      isDynamic: true,
    }),
    getEmailCampaigns: jest.fn().mockResolvedValue([
      {
        id: 'campaign-1',
        name: 'Welcome Campaign',
        subject: 'Welcome!',
        status: 'draft',
        templateId: 'template-1',
        createdBy: 'admin-1',
      },
    ]),
    createEmailCampaign: jest.fn().mockResolvedValue({
      id: 'campaign-2',
      name: 'Test Campaign',
      subject: 'Test Subject',
      status: 'draft',
      templateId: 'template-1',
      createdBy: 'admin-1',
    }),
    sendBulkEmail: jest.fn().mockResolvedValue({
      totalSent: 5,
      totalFailed: 0,
      results: [
        { userId: 'user-1', status: 'sent', messageId: 'msg-1' },
        { userId: 'user-2', status: 'sent', messageId: 'msg-2' },
      ],
    }),
    getTicketStatistics: jest.fn().mockResolvedValue({
      totalTickets: 10,
      statusDistribution: { open: 5, resolved: 5 },
      priorityDistribution: { high: 2, medium: 5, low: 3 },
    }),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/admin/communication', communicationRoutes);

describe('Communication API Routes', () => {
  describe('Email Templates', () => {
    it('should get email templates', async () => {
      const response = await request(app)
        .get('/api/admin/communication/templates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Welcome Template');
    });

    it('should create email template', async () => {
      const templateData = {
        name: 'New Template',
        subject: 'New Subject',
        htmlContent: '<p>New Content</p>',
        language: 'fr',
      };

      const response = await request(app)
        .post('/api/admin/communication/templates')
        .send(templateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Template');
    });

    it('should validate template data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        subject: 'Test Subject',
        htmlContent: '<p>Test</p>',
      };

      const response = await request(app)
        .post('/api/admin/communication/templates')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Segments', () => {
    it('should get user segments', async () => {
      const response = await request(app)
        .get('/api/admin/communication/segments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Premium Users');
    });

    it('should create user segment', async () => {
      const segmentData = {
        name: 'New Segment',
        description: 'New segment description',
        criteria: { plans: ['basic'] },
        isDynamic: true,
      };

      const response = await request(app)
        .post('/api/admin/communication/segments')
        .send(segmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Segment');
    });
  });

  describe('Email Campaigns', () => {
    it('should get email campaigns', async () => {
      const response = await request(app)
        .get('/api/admin/communication/campaigns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Welcome Campaign');
    });

    it('should create email campaign', async () => {
      const campaignData = {
        name: 'New Campaign',
        subject: 'New Campaign Subject',
        templateId: 'template-1',
        targetSegment: { plans: ['premium'] },
      };

      const response = await request(app)
        .post('/api/admin/communication/campaigns')
        .send(campaignData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Campaign');
    });
  });

  describe('Bulk Messaging', () => {
    it('should send bulk email', async () => {
      const bulkEmailData = {
        templateId: 'template-1',
        userIds: ['user-1', 'user-2'],
        variables: { company_name: 'Test Company' },
      };

      const response = await request(app)
        .post('/api/admin/communication/bulk-email')
        .send(bulkEmailData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSent).toBe(5);
      expect(response.body.data.totalFailed).toBe(0);
    });

    it('should validate bulk email data', async () => {
      const invalidData = {
        templateId: '', // Invalid: empty template ID
        userIds: ['user-1'],
      };

      const response = await request(app)
        .post('/api/admin/communication/bulk-email')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Statistics', () => {
    it('should get communication statistics', async () => {
      const response = await request(app)
        .get('/api/admin/communication/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalTickets).toBe(10);
      expect(response.body.data.statusDistribution).toBeDefined();
      expect(response.body.data.priorityDistribution).toBeDefined();
    });
  });
});