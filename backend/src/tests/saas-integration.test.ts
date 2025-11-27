import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index';
import {
  generateTestToken,
  createTestUser,
  cleanupTestUser,
  randomEmail,
  randomString,
  wait
} from './test-utils';

const prisma = new PrismaClient();

describe('SaaS Integration Tests', () => {
  let testUsers: any[] = [];
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // Create admin user for testing
    adminUser = await prisma.adminUser.create({
      data: {
        email: 'admin@simplifaq.ch',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        permissions: {
          users: ['read', 'write', 'delete'],
          billing: ['read', 'write'],
          system: ['read', 'write'],
          analytics: ['read']
        },
        isActive: true
      }
    });

    adminToken = generateTestToken(adminUser.id);
  });

  afterAll(async () => {
    // Cleanup all test data
    for (const user of testUsers) {
      try {
        await cleanupTestUser(user.id);
      } catch (error) {
        console.warn(`Failed to cleanup user ${user.id}:`, error);
      }
    }

    // Cleanup admin user
    if (adminUser) {
      await prisma.adminUser.delete({ where: { id: adminUser.id } });
    }

    await prisma.$disconnect();
  });

  describe('Complete User Lifecycle Testing', () => {
    let userEmail: string;
    let userId: string;
    let userToken: string;

    beforeEach(() => {
      userEmail = randomEmail();
    });

    it('should handle complete user lifecycle from registration to cancellation', async () => {
      // 1. User Registration
      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
          companyName: 'Test Company SA',
          vatNumber: 'CHE-123.456.789 TVA',
          address: {
            street: '123 Test Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD'
          },
          phone: '+41 21 123 45 67'
        });

      expect(registrationResponse.status).toBe(201);
      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.user.email).toBe(userEmail);

      userId = registrationResponse.body.data.user.id;
      testUsers.push({ id: userId });

      // 2. User Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'SecurePassword123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();

      userToken = loginResponse.body.data.token;

      // 3. User Profile Access
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.user.email).toBe(userEmail);

      // 4. User Activity (Create Invoice)
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Client',
          email: 'client@example.com',
          address: {
            street: '456 Client Street',
            city: 'Geneva',
            postalCode: '1200',
            country: 'CH',
            canton: 'GE'
          }
        });

      expect(clientResponse.status).toBe(201);
      const clientId = clientResponse.body.data.client.id;

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          clientId,
          items: [{
            description: 'Test Service',
            quantity: 1,
            unitPrice: 100,
            tvaCategory: 'STANDARD'
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(invoiceResponse.status).toBe(201);

      // 5. Subscription Management (Upgrade)
      const subscriptionResponse = await request(app)
        .put(`/api/admin/users/${userId}/subscription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan: 'premium',
          billingCycle: 'monthly'
        });

      expect(subscriptionResponse.status).toBe(200);

      // 6. Usage Tracking
      const usageResponse = await request(app)
        .get(`/api/admin/analytics/usage?userId=${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(usageResponse.status).toBe(200);
      expect(usageResponse.body.data.invoicesCreated).toBeGreaterThan(0);

      // 7. Account Cancellation
      const cancellationResponse = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cancellationResponse.status).toBe(200);

      // 8. Verify Account Deactivation
      const deactivatedProfileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(deactivatedProfileResponse.status).toBe(401);
    });

    it('should handle user data export before cancellation', async () => {
      // Create user
      const user = await createTestUser({
        email: randomEmail(),
        subscriptionPlan: 'basic'
      });
      testUsers.push(user);
      const token = generateTestToken(user.id);

      // Create some data
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Export Test Client',
          email: 'export@example.com',
          address: {
            street: '789 Export Street',
            city: 'Zurich',
            postalCode: '8001',
            country: 'CH',
            canton: 'ZH'
          }
        });

      expect(clientResponse.status).toBe(201);

      // Request data export
      const exportResponse = await request(app)
        .post('/api/users/export-data')
        .set('Authorization', `Bearer ${token}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.data.clients).toBeDefined();
      expect(exportResponse.body.data.invoices).toBeDefined();
      expect(exportResponse.body.data.products).toBeDefined();
    });
  });

  describe('Billing Cycles and Subscription Management', () => {
    let testUser: any;
    let userToken: string;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: randomEmail(),
        subscriptionPlan: 'free'
      });
      testUsers.push(testUser);
      userToken = generateTestToken(testUser.id);
    });

    it('should handle subscription upgrades and downgrades', async () => {
      // Upgrade to basic
      const upgradeResponse = await request(app)
        .put(`/api/admin/users/${testUser.id}/subscription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan: 'basic',
          billingCycle: 'monthly'
        });

      expect(upgradeResponse.status).toBe(200);
      expect(upgradeResponse.body.data.subscription.plan).toBe('basic');

      // Verify subscription limits
      const limitsResponse = await request(app)
        .get('/api/users/subscription/limits')
        .set('Authorization', `Bearer ${userToken}`);

      expect(limitsResponse.status).toBe(200);
      expect(limitsResponse.body.data.maxInvoices).toBeGreaterThan(10);

      // Upgrade to premium
      const premiumUpgradeResponse = await request(app)
        .put(`/api/admin/users/${testUser.id}/subscription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan: 'premium',
          billingCycle: 'yearly'
        });

      expect(premiumUpgradeResponse.status).toBe(200);
      expect(premiumUpgradeResponse.body.data.subscription.plan).toBe('premium');

      // Downgrade to basic
      const downgradeResponse = await request(app)
        .put(`/api/admin/users/${testUser.id}/subscription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan: 'basic',
          billingCycle: 'monthly'
        });

      expect(downgradeResponse.status).toBe(200);
      expect(downgradeResponse.body.data.subscription.plan).toBe('basic');
    });

    it('should handle billing cycle processing', async () => {
      // Set up subscription
      await request(app)
        .put(`/api/admin/users/${testUser.id}/subscription`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan: 'basic',
          billingCycle: 'monthly'
        });

      // Simulate billing cycle
      const billingResponse = await request(app)
        .post('/api/admin/billing/process-cycle')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: testUser.id
        });

      expect(billingResponse.status).toBe(200);

      // Check billing history
      const historyResponse = await request(app)
        .get(`/api/admin/users/${testUser.id}/billing-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.billingHistory).toBeDefined();
    });

    it('should enforce usage limits based on subscription plan', async () => {
      // Keep user on free plan
      const userToken = generateTestToken(testUser.id);

      // Create client first
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Limit Test Client',
          email: 'limit@example.com',
          address: {
            street: '123 Limit Street',
            city: 'Basel',
            postalCode: '4000',
            country: 'CH',
            canton: 'BS'
          }
        });

      expect(clientResponse.status).toBe(201);
      const clientId = clientResponse.body.data.client.id;

      // Try to create invoices beyond free plan limit (assuming 5 invoices max)
      const invoicePromises = [];
      for (let i = 0; i < 7; i++) {
        invoicePromises.push(
          request(app)
            .post('/api/invoices')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              clientId,
              items: [{
                description: `Test Service ${i}`,
                quantity: 1,
                unitPrice: 100,
                tvaCategory: 'STANDARD'
              }],
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
        );
      }

      const invoiceResponses = await Promise.all(invoicePromises);

      // First 5 should succeed, last 2 should fail due to limits
      const successfulInvoices = invoiceResponses.filter(r => r.status === 201);
      const failedInvoices = invoiceResponses.filter(r => r.status === 429);

      expect(successfulInvoices.length).toBe(5);
      expect(failedInvoices.length).toBe(2);
    });
  });

  describe('Admin Panel Functionality Across All Roles', () => {
    let superAdmin: any;
    let supportAdmin: any;
    let billingAdmin: any;
    let superAdminToken: string;
    let supportAdminToken: string;
    let billingAdminToken: string;

    beforeAll(async () => {
      // Create different admin roles
      superAdmin = await prisma.adminUser.create({
        data: {
          email: 'super@simplifaq.ch',
          password: 'hashedpassword',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
          permissions: {
            users: ['read', 'write', 'delete'],
            billing: ['read', 'write'],
            system: ['read', 'write'],
            analytics: ['read']
          },
          isActive: true
        }
      });

      supportAdmin = await prisma.adminUser.create({
        data: {
          email: 'support@simplifaq.ch',
          password: 'hashedpassword',
          firstName: 'Support',
          lastName: 'Admin',
          role: 'support_admin',
          permissions: {
            users: ['read', 'write'],
            analytics: ['read']
          },
          isActive: true
        }
      });

      billingAdmin = await prisma.adminUser.create({
        data: {
          email: 'billing@simplifaq.ch',
          password: 'hashedpassword',
          firstName: 'Billing',
          lastName: 'Admin',
          role: 'billing_admin',
          permissions: {
            users: ['read'],
            billing: ['read', 'write'],
            analytics: ['read']
          },
          isActive: true
        }
      });

      superAdminToken = generateTestToken(superAdmin.id);
      supportAdminToken = generateTestToken(supportAdmin.id);
      billingAdminToken = generateTestToken(billingAdmin.id);
    });

    afterAll(async () => {
      await prisma.adminUser.deleteMany({
        where: {
          id: { in: [superAdmin.id, supportAdmin.id, billingAdmin.id] }
        }
      });
    });

    it('should allow super admin access to all endpoints', async () => {
      // User management
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(usersResponse.status).toBe(200);

      // System configuration
      const configResponse = await request(app)
        .get('/api/admin/system/config')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(configResponse.status).toBe(200);

      // Analytics
      const analyticsResponse = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(analyticsResponse.status).toBe(200);

      // Billing management
      const billingResponse = await request(app)
        .get('/api/admin/billing/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(billingResponse.status).toBe(200);
    });

    it('should restrict support admin access appropriately', async () => {
      // Should have access to user management
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${supportAdminToken}`);
      expect(usersResponse.status).toBe(200);

      // Should NOT have access to system configuration
      const configResponse = await request(app)
        .post('/api/admin/system/config')
        .set('Authorization', `Bearer ${supportAdminToken}`)
        .send({ key: 'test', value: 'test' });
      expect(configResponse.status).toBe(403);

      // Should have limited access to analytics
      const analyticsResponse = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${supportAdminToken}`);
      expect(analyticsResponse.status).toBe(200);

      // Should NOT have access to billing management
      const billingResponse = await request(app)
        .post('/api/admin/billing/process-cycle')
        .set('Authorization', `Bearer ${supportAdminToken}`)
        .send({ userId: 'test' });
      expect(billingResponse.status).toBe(403);
    });

    it('should restrict billing admin access appropriately', async () => {
      // Should have limited access to user management (read-only)
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${billingAdminToken}`);
      expect(usersResponse.status).toBe(200);

      // Should NOT have access to system configuration
      const configResponse = await request(app)
        .post('/api/admin/system/config')
        .set('Authorization', `Bearer ${billingAdminToken}`)
        .send({ key: 'test', value: 'test' });
      expect(configResponse.status).toBe(403);

      // Should have access to billing analytics
      const analyticsResponse = await request(app)
        .get('/api/admin/analytics/revenue')
        .set('Authorization', `Bearer ${billingAdminToken}`);
      expect(analyticsResponse.status).toBe(200);

      // Should have full access to billing management
      const billingResponse = await request(app)
        .get('/api/admin/billing/overview')
        .set('Authorization', `Bearer ${billingAdminToken}`);
      expect(billingResponse.status).toBe(200);
    });

    it('should log all admin actions for audit trail', async () => {
      // Perform an admin action
      const testUser = await createTestUser({ email: randomEmail() });
      testUsers.push(testUser);

      const actionResponse = await request(app)
        .put(`/api/admin/users/${testUser.id}/subscription`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          plan: 'premium',
          billingCycle: 'monthly'
        });

      expect(actionResponse.status).toBe(200);

      // Check audit logs
      const logsResponse = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .query({
          action: 'subscription_update',
          adminId: superAdmin.id
        });

      expect(logsResponse.status).toBe(200);
      expect(logsResponse.body.data.logs.length).toBeGreaterThan(0);
      expect(logsResponse.body.data.logs[0].action).toBe('subscription_update');
      expect(logsResponse.body.data.logs[0].adminId).toBe(superAdmin.id);
    });
  });

  describe('Multi-tenancy and Data Isolation', () => {
    let tenant1User: any;
    let tenant2User: any;
    let tenant1Token: string;
    let tenant2Token: string;

    beforeEach(async () => {
      tenant1User = await createTestUser({
        email: randomEmail(),
        companyName: 'Tenant 1 Company'
      });
      tenant2User = await createTestUser({
        email: randomEmail(),
        companyName: 'Tenant 2 Company'
      });

      testUsers.push(tenant1User, tenant2User);

      tenant1Token = generateTestToken(tenant1User.id);
      tenant2Token = generateTestToken(tenant2User.id);
    });

    it('should isolate client data between tenants', async () => {
      // Tenant 1 creates a client
      const tenant1ClientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          name: 'Tenant 1 Client',
          email: 'tenant1client@example.com',
          address: {
            street: '123 Tenant 1 Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD'
          }
        });

      expect(tenant1ClientResponse.status).toBe(201);
      const tenant1ClientId = tenant1ClientResponse.body.data.client.id;

      // Tenant 2 creates a client
      const tenant2ClientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          name: 'Tenant 2 Client',
          email: 'tenant2client@example.com',
          address: {
            street: '456 Tenant 2 Street',
            city: 'Geneva',
            postalCode: '1200',
            country: 'CH',
            canton: 'GE'
          }
        });

      expect(tenant2ClientResponse.status).toBe(201);

      // Tenant 1 should only see their own clients
      const tenant1ClientsResponse = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(tenant1ClientsResponse.status).toBe(200);
      expect(tenant1ClientsResponse.body.data.clients.length).toBe(1);
      expect(tenant1ClientsResponse.body.data.clients[0].name).toBe('Tenant 1 Client');

      // Tenant 2 should only see their own clients
      const tenant2ClientsResponse = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(tenant2ClientsResponse.status).toBe(200);
      expect(tenant2ClientsResponse.body.data.clients.length).toBe(1);
      expect(tenant2ClientsResponse.body.data.clients[0].name).toBe('Tenant 2 Client');

      // Tenant 2 should not be able to access Tenant 1's client
      const unauthorizedAccessResponse = await request(app)
        .get(`/api/clients/${tenant1ClientId}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(unauthorizedAccessResponse.status).toBe(404);
    });

    it('should isolate invoice data between tenants', async () => {
      // Create clients for each tenant
      const tenant1ClientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          name: 'Tenant 1 Client',
          email: 'tenant1client@example.com',
          address: {
            street: '123 Tenant 1 Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD'
          }
        });

      const tenant2ClientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          name: 'Tenant 2 Client',
          email: 'tenant2client@example.com',
          address: {
            street: '456 Tenant 2 Street',
            city: 'Geneva',
            postalCode: '1200',
            country: 'CH',
            canton: 'GE'
          }
        });

      const tenant1ClientId = tenant1ClientResponse.body.data.client.id;
      const tenant2ClientId = tenant2ClientResponse.body.data.client.id;

      // Create invoices for each tenant
      const tenant1InvoiceResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          clientId: tenant1ClientId,
          items: [{
            description: 'Tenant 1 Service',
            quantity: 1,
            unitPrice: 100,
            tvaCategory: 'STANDARD'
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      const tenant2InvoiceResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          clientId: tenant2ClientId,
          items: [{
            description: 'Tenant 2 Service',
            quantity: 1,
            unitPrice: 200,
            tvaCategory: 'STANDARD'
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(tenant1InvoiceResponse.status).toBe(201);
      expect(tenant2InvoiceResponse.status).toBe(201);

      const tenant1InvoiceId = tenant1InvoiceResponse.body.data.invoice.id;

      // Verify data isolation
      const tenant1InvoicesResponse = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(tenant1InvoicesResponse.status).toBe(200);
      expect(tenant1InvoicesResponse.body.data.invoices.length).toBe(1);
      expect(tenant1InvoicesResponse.body.data.invoices[0].items[0].description).toBe('Tenant 1 Service');

      // Tenant 2 should not be able to access Tenant 1's invoice
      const unauthorizedInvoiceAccessResponse = await request(app)
        .get(`/api/invoices/${tenant1InvoiceId}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(unauthorizedInvoiceAccessResponse.status).toBe(404);
    });

    it('should prevent cross-tenant data access in reports', async () => {
      // Create some data for each tenant
      const tenant1ClientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          name: 'Tenant 1 Client',
          email: 'tenant1client@example.com',
          address: {
            street: '123 Tenant 1 Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD'
          }
        });

      const tenant1ClientId = tenant1ClientResponse.body.data.client.id;

      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .send({
          clientId: tenant1ClientId,
          items: [{
            description: 'Tenant 1 Service',
            quantity: 1,
            unitPrice: 1000,
            tvaCategory: 'STANDARD'
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      // Get financial summary for each tenant
      const tenant1SummaryResponse = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${tenant1Token}`);

      const tenant2SummaryResponse = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(tenant1SummaryResponse.status).toBe(200);
      expect(tenant2SummaryResponse.status).toBe(200);

      // Tenant 1 should have revenue, Tenant 2 should have zero
      expect(tenant1SummaryResponse.body.data.totalRevenue).toBeGreaterThan(0);
      expect(tenant2SummaryResponse.body.data.totalRevenue).toBe(0);
    });
  });

  describe('System Monitoring and Alerting', () => {
    it('should monitor system health endpoints', async () => {
      const healthResponse = await request(app)
        .get('/api/admin/monitoring/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.data.status).toBe('healthy');
      expect(healthResponse.body.data.database).toBe('connected');
      expect(healthResponse.body.data.uptime).toBeGreaterThan(0);
    });

    it('should track API performance metrics', async () => {
      // Make some API calls to generate metrics
      const testUser = await createTestUser({ email: randomEmail() });
      testUsers.push(testUser);
      const token = generateTestToken(testUser.id);

      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${token}`);

      // Check performance metrics
      const metricsResponse = await request(app)
        .get('/api/admin/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body.data.apiCalls).toBeDefined();
      expect(metricsResponse.body.data.responseTime).toBeDefined();
      expect(metricsResponse.body.data.errorRate).toBeDefined();
    });

    it('should generate alerts for critical issues', async () => {
      // Simulate a critical error
      const alertResponse = await request(app)
        .post('/api/admin/monitoring/simulate-alert')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'database_connection_error',
          severity: 'critical'
        });

      expect(alertResponse.status).toBe(200);

      // Check that alert was created
      const alertsResponse = await request(app)
        .get('/api/admin/monitoring/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ severity: 'critical' });

      expect(alertsResponse.status).toBe(200);
      expect(alertsResponse.body.data.alerts.length).toBeGreaterThan(0);
      expect(alertsResponse.body.data.alerts[0].type).toBe('database_connection_error');
    });

    it('should monitor usage patterns and limits', async () => {
      const testUser = await createTestUser({
        email: randomEmail(),
        subscriptionPlan: 'basic'
      });
      testUsers.push(testUser);
      const token = generateTestToken(testUser.id);

      // Create some usage
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Usage Test Client',
          email: 'usage@example.com',
          address: {
            street: '123 Usage Street',
            city: 'Bern',
            postalCode: '3000',
            country: 'CH',
            canton: 'BE'
          }
        });

      const clientId = clientResponse.body.data.client.id;

      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          clientId,
          items: [{
            description: 'Usage Test Service',
            quantity: 1,
            unitPrice: 100,
            tvaCategory: 'STANDARD'
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      // Check usage monitoring
      const usageResponse = await request(app)
        .get(`/api/admin/monitoring/usage/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(usageResponse.status).toBe(200);
      expect(usageResponse.body.data.invoicesCreated).toBe(1);
      expect(usageResponse.body.data.clientsCreated).toBe(1);
      expect(usageResponse.body.data.planLimits).toBeDefined();
    });
  });

  describe('Compliance Features and Audit Trails', () => {
    let testUser: any;
    let userToken: string;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: randomEmail(),
        subscriptionPlan: 'premium'
      });
      testUsers.push(testUser);
      userToken = generateTestToken(testUser.id);
    });

    it('should maintain audit trails for all user actions', async () => {
      // Perform various user actions
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Audit Test Client',
          email: 'audit@example.com',
          address: {
            street: '123 Audit Street',
            city: 'Zurich',
            postalCode: '8001',
            country: 'CH',
            canton: 'ZH'
          }
        });

      const clientId = clientResponse.body.data.client.id;

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          clientId,
          items: [{
            description: 'Audit Test Service',
            quantity: 1,
            unitPrice: 100,
            tvaCategory: 'STANDARD'
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      const invoiceId = invoiceResponse.body.data.invoice.id;

      // Update invoice
      await request(app)
        .put(`/api/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{
            description: 'Updated Audit Test Service',
            quantity: 2,
            unitPrice: 150,
            tvaCategory: 'STANDARD'
          }]
        });

      // Check audit trail
      const auditResponse = await request(app)
        .get(`/api/admin/compliance/audit-trail/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.data.auditTrail.length).toBeGreaterThan(0);

      const actions = auditResponse.body.data.auditTrail.map((entry: any) => entry.action);
      expect(actions).toContain('client_created');
      expect(actions).toContain('invoice_created');
      expect(actions).toContain('invoice_updated');
    });

    it('should support GDPR data export', async () => {
      // Create some user data
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'GDPR Test Client',
          email: 'gdpr@example.com',
          address: {
            street: '123 GDPR Street',
            city: 'Basel',
            postalCode: '4000',
            country: 'CH',
            canton: 'BS'
          }
        });

      const clientId = clientResponse.body.data.client.id;

      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          clientId,
          items: [{
            description: 'GDPR Test Service',
            quantity: 1,
            unitPrice: 100,
            tvaCategory: 'STANDARD'
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      // Request GDPR data export
      const exportResponse = await request(app)
        .post('/api/users/gdpr-export')
        .set('Authorization', `Bearer ${userToken}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.data.personalData).toBeDefined();
      expect(exportResponse.body.data.businessData).toBeDefined();
      expect(exportResponse.body.data.auditTrail).toBeDefined();
      expect(exportResponse.body.data.exportDate).toBeDefined();
    });

    it('should support GDPR data deletion', async () => {
      // Create some user data
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Deletion Test Client',
          email: 'deletion@example.com',
          address: {
            street: '123 Deletion Street',
            city: 'Lucerne',
            postalCode: '6000',
            country: 'CH',
            canton: 'LU'
          }
        });

      expect(clientResponse.status).toBe(201);

      // Request GDPR data deletion
      const deletionResponse = await request(app)
        .post('/api/users/gdpr-delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          confirmDeletion: true,
          reason: 'User requested data deletion'
        });

      expect(deletionResponse.status).toBe(200);

      // Verify data is anonymized/deleted
      const verifyResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(verifyResponse.status).toBe(401);
    });

    it('should maintain data retention policies', async () => {
      // Check data retention policy enforcement
      const retentionResponse = await request(app)
        .get('/api/admin/compliance/data-retention')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(retentionResponse.status).toBe(200);
      expect(retentionResponse.body.data.policies).toBeDefined();
      expect(retentionResponse.body.data.policies.auditLogs).toBeDefined();
      expect(retentionResponse.body.data.policies.userData).toBeDefined();

      // Simulate data cleanup based on retention policies
      const cleanupResponse = await request(app)
        .post('/api/admin/compliance/cleanup-expired-data')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(cleanupResponse.status).toBe(200);
      expect(cleanupResponse.body.data.deletedRecords).toBeDefined();
    });
  });

  describe('Load Testing for SaaS Scalability', () => {
    it('should handle concurrent user registrations', async () => {
      const concurrentRegistrations = 10;
      const registrationPromises = [];

      for (let i = 0; i < concurrentRegistrations; i++) {
        registrationPromises.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `load-test-${i}-${Date.now()}@example.com`,
              password: 'SecurePassword123!',
              firstName: 'Load',
              lastName: `Test${i}`,
              companyName: `Load Test Company ${i}`,
              vatNumber: `CHE-123.456.${String(789 + i).padStart(3, '0')} TVA`,
              address: {
                street: `${123 + i} Load Test Street`,
                city: 'Lausanne',
                postalCode: '1000',
                country: 'CH',
                canton: 'VD'
              },
              phone: `+41 21 123 45 ${String(67 + i).padStart(2, '0')}`
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(registrationPromises);
      const endTime = Date.now();

      // All registrations should succeed
      const successfulRegistrations = responses.filter(r => r.status === 201);
      expect(successfulRegistrations.length).toBe(concurrentRegistrations);

      // Should complete within reasonable time (adjust threshold as needed)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // 10 seconds

      // Cleanup created users
      for (const response of successfulRegistrations) {
        testUsers.push({ id: response.body.data.user.id });
      }
    });

    it('should handle concurrent invoice creation', async () => {
      // Create a test user and client
      const testUser = await createTestUser({
        email: randomEmail(),
        subscriptionPlan: 'premium'
      });
      testUsers.push(testUser);
      const token = generateTestToken(testUser.id);

      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Load Test Client',
          email: 'loadtest@example.com',
          address: {
            street: '123 Load Test Street',
            city: 'Geneva',
            postalCode: '1200',
            country: 'CH',
            canton: 'GE'
          }
        });

      const clientId = clientResponse.body.data.client.id;

      // Create multiple invoices concurrently
      const concurrentInvoices = 20;
      const invoicePromises = [];

      for (let i = 0; i < concurrentInvoices; i++) {
        invoicePromises.push(
          request(app)
            .post('/api/invoices')
            .set('Authorization', `Bearer ${token}`)
            .send({
              clientId,
              items: [{
                description: `Load Test Service ${i}`,
                quantity: 1,
                unitPrice: 100 + i,
                tvaCategory: 'STANDARD'
              }],
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(invoicePromises);
      const endTime = Date.now();

      // All invoice creations should succeed
      const successfulInvoices = responses.filter(r => r.status === 201);
      expect(successfulInvoices.length).toBe(concurrentInvoices);

      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(15000); // 15 seconds

      // Verify invoice numbers are unique
      const invoiceNumbers = successfulInvoices.map(r => r.body.data.invoice.number);
      const uniqueNumbers = new Set(invoiceNumbers);
      expect(uniqueNumbers.size).toBe(concurrentInvoices);
    });

    it('should handle high-frequency API requests', async () => {
      const testUser = await createTestUser({
        email: randomEmail(),
        subscriptionPlan: 'premium'
      });
      testUsers.push(testUser);
      const token = generateTestToken(testUser.id);

      // Make rapid API requests
      const requestCount = 50;
      const requestPromises = [];

      for (let i = 0; i < requestCount; i++) {
        requestPromises.push(
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();

      // All requests should succeed (or be rate limited appropriately)
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);

      expect(successfulRequests.length + rateLimitedRequests.length).toBe(requestCount);

      // Should handle requests efficiently
      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / requestCount;
      expect(avgResponseTime).toBeLessThan(200); // Average 200ms per request
    });

    it('should maintain database performance under load', async () => {
      // Create multiple users with data
      const userCount = 5;
      const userPromises = [];

      for (let i = 0; i < userCount; i++) {
        userPromises.push(createTestUser({
          email: `db-load-test-${i}-${Date.now()}@example.com`,
          subscriptionPlan: 'basic'
        }));
      }

      const users = await Promise.all(userPromises);
      testUsers.push(...users);

      // Create data for each user concurrently
      const dataCreationPromises = [];

      for (const user of users) {
        const token = generateTestToken(user.id);

        // Create clients and invoices for each user
        for (let j = 0; j < 5; j++) {
          dataCreationPromises.push(
            request(app)
              .post('/api/clients')
              .set('Authorization', `Bearer ${token}`)
              .send({
                name: `DB Load Client ${j}`,
                email: `dbload${j}@example.com`,
                address: {
                  street: `${123 + j} DB Load Street`,
                  city: 'Zurich',
                  postalCode: '8001',
                  country: 'CH',
                  canton: 'ZH'
                }
              })
              .then(clientResponse => {
                if (clientResponse.status === 201) {
                  return request(app)
                    .post('/api/invoices')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                      clientId: clientResponse.body.data.client.id,
                      items: [{
                        description: `DB Load Service ${j}`,
                        quantity: 1,
                        unitPrice: 100 + j,
                        tvaCategory: 'STANDARD'
                      }],
                      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    });
                }
                return Promise.resolve(clientResponse);
              })
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(dataCreationPromises);
      const endTime = Date.now();

      // Most operations should succeed
      const successfulOperations = responses.filter(r => r && r.status && (r.status === 201 || r.status === 200));
      expect(successfulOperations.length).toBeGreaterThan(userCount * 3); // At least 60% success rate

      // Database should handle the load efficiently
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(30000); // 30 seconds for all operations
    });
  });
});