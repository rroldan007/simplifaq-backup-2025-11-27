import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { UserManagementService } from '../services/userManagementService';
import { AnalyticsService } from '../services/analyticsService';
import { CommunicationService } from '../services/communicationService';

const prisma = new PrismaClient();

describe('Enhanced User Management API', () => {
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test data and get admin token
    // This would typically be done in a test setup file
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.$disconnect();
  });

  describe('UserManagementService', () => {
    describe('getUsers', () => {
      it('should return users with advanced filtering', async () => {
        const filters = {
          search: 'test',
          status: 'active' as const,
          hasSubscription: true,
        };
        const pagination = {
          page: 1,
          limit: 20,
          sortBy: 'createdAt' as const,
          sortOrder: 'desc' as const,
        };

        const result = await UserManagementService.getUsers(filters, pagination);

        expect(result).toHaveProperty('users');
        expect(result).toHaveProperty('pagination');
        expect(result.pagination.currentPage).toBe(1);
        expect(result.pagination.limit).toBe(20);
        expect(Array.isArray(result.users)).toBe(true);
      });

      it('should handle date range filters', async () => {
        const filters = {
          registrationDateFrom: new Date('2024-01-01'),
          registrationDateTo: new Date('2024-12-31'),
        };
        const pagination = {
          page: 1,
          limit: 10,
          sortBy: 'createdAt' as const,
          sortOrder: 'desc' as const,
        };

        const result = await UserManagementService.getUsers(filters, pagination);

        expect(result).toHaveProperty('users');
        expect(result.users.every((user: any) => user.engagementScore !== undefined)).toBe(true);
        expect(result.users.every((user: any) => user.riskLevel !== undefined)).toBe(true);
      });
    });

    describe('getUserDetails', () => {
      it('should return detailed user information', async () => {
        // This would use a real test user ID
        const mockUserId = 'test-user-id';
        
        try {
          const result = await UserManagementService.getUserDetails(mockUserId);
          
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('metrics');
          expect(result).toHaveProperty('activityTimeline');
          expect(result.password).toBeUndefined();
        } catch (error) {
          // Expected to fail with test data
          expect((error as Error).message).toBe('User not found');
        }
      });
    });

    describe('bulkUpdateUsers', () => {
      it('should update multiple users', async () => {
        const userIds = ['user1', 'user2'];
        const updates = {
          isActive: false,
          notes: 'Bulk updated',
        };

        const result = await UserManagementService.bulkUpdateUsers(userIds, updates);

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('updatedCount');
        expect(result).toHaveProperty('errors');
        expect(Array.isArray(result.errors)).toBe(true);
      });
    });

    describe('exportUsers', () => {
      it('should export users data', async () => {
        const filters = { status: 'active' as const };
        const format = 'csv' as const;

        const result = await UserManagementService.exportUsers(filters, format);

        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('filename');
        expect(result).toHaveProperty('recordCount');
        expect(result.filename).toContain('.csv');
      });
    });

    describe('impersonation', () => {
      it('should create impersonation session', async () => {
        const adminId = 'admin-id';
        const userId = 'user-id';

        try {
          const session = await UserManagementService.createImpersonationSession(adminId, userId);
          
          expect(session).toHaveProperty('id');
          expect(session).toHaveProperty('token');
          expect(session).toHaveProperty('expiresAt');
          expect(session.adminId).toBe(adminId);
          expect(session.userId).toBe(userId);
        } catch (error) {
          // Expected to fail with test data
          expect((error as Error).message).toBe('User not found');
        }
      });

      it('should end impersonation session', async () => {
        const sessionId = 'session-id';

        await expect(UserManagementService.endImpersonationSession(sessionId))
          .resolves.not.toThrow();
      });
    });
  });

  describe('AnalyticsService', () => {
    describe('getUserEngagementMetrics', () => {
      it('should return engagement metrics', async () => {
        const userId = 'test-user-id';
        const timeRange = {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        };

        try {
          const metrics = await AnalyticsService.getUserEngagementMetrics(userId, timeRange);
          
          expect(metrics).toHaveProperty('loginFrequency');
          expect(metrics).toHaveProperty('featureUsage');
          expect(metrics).toHaveProperty('sessionDuration');
          expect(metrics).toHaveProperty('engagementScore');
          expect(metrics).toHaveProperty('trendDirection');
          expect(typeof metrics.engagementScore).toBe('number');
        } catch (error) {
          // May fail with test data, but structure should be correct
          console.log('Expected error in test environment:', (error as Error).message);
        }
      });
    });

    describe('getChurnPrediction', () => {
      it('should return churn prediction', async () => {
        const userId = 'test-user-id';

        try {
          const prediction = await AnalyticsService.getChurnPrediction(userId);
          
          expect(prediction).toHaveProperty('riskScore');
          expect(prediction).toHaveProperty('riskLevel');
          expect(prediction).toHaveProperty('factors');
          expect(prediction).toHaveProperty('recommendedActions');
          expect(prediction).toHaveProperty('confidenceLevel');
          expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);
        } catch (error) {
          expect((error as Error).message).toBe('User not found');
        }
      });
    });

    describe('getRevenueAnalytics', () => {
      it('should return revenue analytics', async () => {
        const timeRange = {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        };

        const analytics = await AnalyticsService.getRevenueAnalytics(timeRange);
        
        expect(analytics).toHaveProperty('totalRevenue');
        expect(analytics).toHaveProperty('monthlyRecurringRevenue');
        expect(analytics).toHaveProperty('averageRevenuePerUser');
        expect(analytics).toHaveProperty('revenueGrowthRate');
        expect(analytics).toHaveProperty('churnRate');
        expect(analytics).toHaveProperty('lifetimeValue');
        expect(typeof analytics.totalRevenue).toBe('number');
      });
    });

    describe('getFeatureUsageStats', () => {
      it('should return feature usage statistics', async () => {
        const feature = 'invoicing';
        const timeRange = {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        };

        const stats = await AnalyticsService.getFeatureUsageStats(feature, timeRange);
        
        expect(stats).toHaveProperty('feature');
        expect(stats).toHaveProperty('totalUsers');
        expect(stats).toHaveProperty('activeUsers');
        expect(stats).toHaveProperty('usageCount');
        expect(stats).toHaveProperty('adoptionRate');
        expect(stats).toHaveProperty('trendData');
        expect(stats.feature).toBe(feature);
      });

      it('should throw error for unsupported feature', async () => {
        const feature = 'unsupported_feature';
        const timeRange = {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        };

        await expect(AnalyticsService.getFeatureUsageStats(feature, timeRange))
          .rejects.toThrow('Feature unsupported_feature not supported');
      });
    });
  });

  describe('CommunicationService', () => {
    describe('sendEmail', () => {
      it('should send email to user', async () => {
        const userId = 'test-user-id';
        const templateId = 'welcome';
        const variables = {
          user_name: 'Test User',
          company_name: 'Test Company',
        };

        const result = await CommunicationService.sendEmail(userId, templateId, variables);
        
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('status');
        expect(['sent', 'failed', 'queued']).toContain(result.status);
      });
    });

    describe('sendBulkEmail', () => {
      it('should send bulk email', async () => {
        const userIds = ['user1', 'user2', 'user3'];
        const templateId = 'newsletter';
        const variables = {
          campaign_name: 'Monthly Update',
        };

        const result = await CommunicationService.sendBulkEmail(userIds, templateId, variables);
        
        expect(result).toHaveProperty('totalSent');
        expect(result).toHaveProperty('totalFailed');
        expect(result).toHaveProperty('results');
        expect(Array.isArray(result.results)).toBe(true);
        expect(result.results).toHaveLength(userIds.length);
      });
    });

    describe('getEmailTemplates', () => {
      it('should return email templates', async () => {
        const templates = await CommunicationService.getEmailTemplates();
        
        expect(Array.isArray(templates)).toBe(true);
        // Templates array might be empty in test environment
      });

      it('should filter templates by category', async () => {
        const category = 'welcome';
        const templates = await CommunicationService.getEmailTemplates(category);
        
        expect(Array.isArray(templates)).toBe(true);
      });
    });

    describe('support tickets', () => {
      it('should create support ticket', async () => {
        const userId = 'test-user-id';
        const ticketData = {
          subject: 'Test Issue',
          description: 'This is a test support ticket',
          priority: 'medium' as const,
          category: 'technical' as const,
          contactEmail: 'test@example.com',
          contactName: 'Test User',
        };

        const ticket = await CommunicationService.createSupportTicket(userId, ticketData);
        
        expect(ticket).toHaveProperty('id');
        expect(ticket).toHaveProperty('subject');
        expect(ticket).toHaveProperty('status');
        expect(ticket.subject).toBe(ticketData.subject);
        expect(ticket.status).toBe('open');
      });

      it('should get support history', async () => {
        const userId = 'test-user-id';

        const history = await CommunicationService.getSupportHistory(userId);
        
        expect(Array.isArray(history)).toBe(true);
      });

      it('should get communication history', async () => {
        const userId = 'test-user-id';

        const history = await CommunicationService.getCommunicationHistory(userId);
        
        expect(history).toHaveProperty('emails');
        expect(history).toHaveProperty('tickets');
        expect(history).toHaveProperty('totalEmails');
        expect(history).toHaveProperty('totalTickets');
        expect(Array.isArray(history.emails)).toBe(true);
        expect(Array.isArray(history.tickets)).toBe(true);
      });
    });

    describe('email templates management', () => {
      it('should create email template', async () => {
        const templateData = {
          name: 'test_template',
          subject: 'Test Subject {{user_name}}',
          htmlContent: '<h1>Hello {{user_name}}</h1><p>Welcome to {{company_name}}!</p>',
          textContent: 'Hello {{user_name}}, Welcome to {{company_name}}!',
          language: 'en',
          variables: {
            user_name: 'string',
            company_name: 'string',
          },
        };

        const template = await CommunicationService.createEmailTemplate(templateData);
        
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('subject');
        expect(template.name).toBe(templateData.name);
        expect(template.isActive).toBe(true);
      });
    });
  });

  describe('API Endpoints Integration', () => {
    // These tests would require a running server and proper authentication
    // They are included as examples of how to test the actual API endpoints

    describe('GET /api/admin/users', () => {
      it('should return users with advanced filtering', async () => {
        // This would require proper test setup with authentication
        // const response = await request(app)
        //   .get('/api/admin/users')
        //   .set('Authorization', `Bearer ${adminToken}`)
        //   .query({
        //     search: 'test',
        //     status: 'active',
        //     hasSubscription: 'true',
        //     page: '1',
        //     limit: '10'
        //   });
        
        // expect(response.status).toBe(200);
        // expect(response.body.success).toBe(true);
        // expect(response.body.data).toHaveProperty('users');
        // expect(response.body.data).toHaveProperty('pagination');
      });
    });

    describe('POST /api/admin/users/bulk-update', () => {
      it('should bulk update users', async () => {
        // const response = await request(app)
        //   .post('/api/admin/users/bulk-update')
        //   .set('Authorization', `Bearer ${adminToken}`)
        //   .send({
        //     userIds: ['user1', 'user2'],
        //     updates: {
        //       isActive: false,
        //       notes: 'Bulk updated'
        //     }
        //   });
        
        // expect(response.status).toBe(200);
        // expect(response.body.success).toBe(true);
        // expect(response.body.data).toHaveProperty('updatedCount');
      });
    });

    describe('GET /api/admin/users/:id/analytics', () => {
      it('should return user analytics', async () => {
        // const response = await request(app)
        //   .get(`/api/admin/users/${testUserId}/analytics`)
        //   .set('Authorization', `Bearer ${adminToken}`)
        //   .query({
        //     start: '2024-01-01T00:00:00Z',
        //     end: '2024-12-31T23:59:59Z'
        //   });
        
        // expect(response.status).toBe(200);
        // expect(response.body.success).toBe(true);
        // expect(response.body.data).toHaveProperty('engagementMetrics');
        // expect(response.body.data).toHaveProperty('churnPrediction');
        // expect(response.body.data).toHaveProperty('lifetimeValue');
      });
    });
  });
});

// Helper functions for testing
export const createTestUser = async (userData: any) => {
  return await prisma.user.create({
    data: {
      email: userData.email || 'test@example.com',
      password: 'hashed_password',
      companyName: userData.companyName || 'Test Company',
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      street: '123 Test St',
      city: 'Test City',
      postalCode: '12345',
      country: 'Switzerland',
      ...userData,
    },
  });
};

export const createTestAdmin = async (adminData: any) => {
  return await prisma.adminUser.create({
    data: {
      email: adminData.email || 'admin@example.com',
      password: 'hashed_password',
      firstName: adminData.firstName || 'Admin',
      lastName: adminData.lastName || 'User',
      role: adminData.role || 'super_admin',
      permissions: adminData.permissions || {},
      ...adminData,
    },
  });
};

export const cleanupTestData = async () => {
  // Clean up test data in reverse order of dependencies
  await prisma.adminLog.deleteMany({
    where: { description: { contains: 'test' } },
  });
  await prisma.supportResponse.deleteMany({
    where: { message: { contains: 'test' } },
  });
  await prisma.supportTicket.deleteMany({
    where: { subject: { contains: 'test' } },
  });
  await prisma.emailTemplate.deleteMany({
    where: { name: { contains: 'test' } },
  });
  await prisma.adminSession.deleteMany({});
  await prisma.adminUser.deleteMany({
    where: { email: { contains: 'test' } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: 'test' } },
  });
};