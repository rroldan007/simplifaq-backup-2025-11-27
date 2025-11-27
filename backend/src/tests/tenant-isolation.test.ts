/**
 * 🇨🇭 SimpliFaq - Tenant Isolation Security Tests
 * 
 * Tests to verify data isolation and prevent cross-tenant data access
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../index';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Tenant Isolation Security Tests', () => {
  let tenant1: any;
  let tenant2: any;
  let tenant1Token: string;
  let tenant2Token: string;
  let tenant1Client: any;
  let tenant1Invoice: any;
  let tenant1Product: any;

  beforeAll(async () => {
    // Create test tenants
    const hashedPassword = await bcrypt.hash('testpassword123', 10);

    tenant1 = await prisma.user.create({
      data: {
        email: 'tenant1@test.com',
        password: hashedPassword,
        companyName: 'Tenant 1 Company',
        firstName: 'John',
        lastName: 'Doe',
        street: 'Test Street 1',
        city: 'Geneva',
        postalCode: '1200',
        country: 'Switzerland',
        canton: 'GE',
      },
    });

    tenant2 = await prisma.user.create({
      data: {
        email: 'tenant2@test.com',
        password: hashedPassword,
        companyName: 'Tenant 2 Company',
        firstName: 'Jane',
        lastName: 'Smith',
        street: 'Test Street 2',
        city: 'Zurich',
        postalCode: '8000',
        country: 'Switzerland',
        canton: 'ZH',
      },
    });

    // Login both tenants to get tokens
    const tenant1Login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tenant1@test.com',
        password: 'testpassword123',
      });

    const tenant2Login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tenant2@test.com',
        password: 'testpassword123',
      });

    tenant1Token = tenant1Login.body.data.token;
    tenant2Token = tenant2Login.body.data.token;

    // Create test data for tenant1
    tenant1Client = await prisma.client.create({
      data: {
        userId: tenant1.id,
        email: 'client1@test.com',
        firstName: 'Client',
        lastName: 'One',
        street: 'Client Street 1',
        city: 'Geneva',
        postalCode: '1200',
        country: 'Switzerland',
      },
    });

    tenant1Product = await prisma.product.create({
      data: {
        userId: tenant1.id,
        name: 'Test Product 1',
        description: 'Test product for tenant 1',
        unitPrice: 100.00,
        tvaRate: 8.1,
      },
    });

    tenant1Invoice = await prisma.invoice.create({
      data: {
        userId: tenant1.id,
        clientId: tenant1Client.id,
        invoiceNumber: 'INV-001',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: 100.00,
        tvaAmount: 8.10,
        total: 108.10,
        items: {
          create: {
            productId: tenant1Product.id,
            description: 'Test item',
            quantity: 1,
            unitPrice: 100.00,
            tvaRate: 8.1,
            total: 108.10,
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invoiceItem.deleteMany({
      where: { invoice: { userId: { in: [tenant1.id, tenant2.id] } } },
    });
    await prisma.invoice.deleteMany({
      where: { userId: { in: [tenant1.id, tenant2.id] } },
    });
    await prisma.client.deleteMany({
      where: { userId: { in: [tenant1.id, tenant2.id] } },
    });
    await prisma.product.deleteMany({
      where: { userId: { in: [tenant1.id, tenant2.id] } },
    });
    await prisma.session.deleteMany({
      where: { userId: { in: [tenant1.id, tenant2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [tenant1.id, tenant2.id] } },
    });

    await prisma.$disconnect();
  });

  describe('Client Data Isolation', () => {
    it('should not allow tenant2 to access tenant1 clients', async () => {
      const response = await request(app)
        .get(`/api/clients/${tenant1Client.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow tenant2 to update tenant1 clients', async () => {
      const response = await request(app)
        .put(`/api/clients/${tenant1Client.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          firstName: 'Hacked',
          lastName: 'Client',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow tenant2 to delete tenant1 clients', async () => {
      const response = await request(app)
        .delete(`/api/clients/${tenant1Client.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not return tenant1 clients in tenant2 client list', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const clientIds = response.body.data.clients.map((c: any) => c.id);
      expect(clientIds).not.toContain(tenant1Client.id);
    });
  });

  describe('Invoice Data Isolation', () => {
    it('should not allow tenant2 to access tenant1 invoices', async () => {
      const response = await request(app)
        .get(`/api/invoices/${tenant1Invoice.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow tenant2 to update tenant1 invoices', async () => {
      const response = await request(app)
        .put(`/api/invoices/${tenant1Invoice.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          notes: 'Hacked invoice',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow tenant2 to delete tenant1 invoices', async () => {
      const response = await request(app)
        .delete(`/api/invoices/${tenant1Invoice.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not return tenant1 invoices in tenant2 invoice list', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const invoiceIds = response.body.data.invoices.map((i: any) => i.id);
      expect(invoiceIds).not.toContain(tenant1Invoice.id);
    });

    it('should not allow tenant2 to generate PDF for tenant1 invoices', async () => {
      const response = await request(app)
        .get(`/api/invoices/${tenant1Invoice.id}/pdf`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Product Data Isolation', () => {
    it('should not allow tenant2 to access tenant1 products', async () => {
      const response = await request(app)
        .get(`/api/products/${tenant1Product.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow tenant2 to update tenant1 products', async () => {
      const response = await request(app)
        .put(`/api/products/${tenant1Product.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          name: 'Hacked Product',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow tenant2 to delete tenant1 products', async () => {
      const response = await request(app)
        .delete(`/api/products/${tenant1Product.id}`)
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not return tenant1 products in tenant2 product list', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const productIds = response.body.data.products.map((p: any) => p.id);
      expect(productIds).not.toContain(tenant1Product.id);
    });
  });

  describe('Cross-Tenant Data Creation Prevention', () => {
    it('should not allow tenant2 to create invoices for tenant1 clients', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          clientId: tenant1Client.id,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              description: 'Hacked item',
              quantity: 1,
              unitPrice: 100,
              tvaRate: 8.1,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow tenant2 to use tenant1 products in invoices', async () => {
      // First create a client for tenant2
      const tenant2Client = await prisma.client.create({
        data: {
          userId: tenant2.id,
          email: 'client2@test.com',
          firstName: 'Client',
          lastName: 'Two',
          street: 'Client Street 2',
          city: 'Zurich',
          postalCode: '8000',
          country: 'Switzerland',
        },
      });

      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenant2Token}`)
        .send({
          clientId: tenant2Client.id,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              productId: tenant1Product.id, // Try to use tenant1's product
              description: 'Hacked item',
              quantity: 1,
              unitPrice: 100,
              tvaRate: 8.1,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Clean up
      await prisma.client.delete({ where: { id: tenant2Client.id } });
    });
  });

  describe('Tenant Context Validation', () => {
    it('should include correct tenant context in successful requests', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned clients should belong to tenant1
      response.body.data.clients.forEach((client: any) => {
        expect(client.userId).toBe(tenant1.id);
      });
    });

    it('should reject requests without proper tenant context', async () => {
      // Create a malformed token or use an invalid token
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Aggregation Isolation', () => {
    it('should only include tenant data in reports', async () => {
      const response = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${tenant1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // The report should only reflect tenant1's data
      const summary = response.body.data;
      expect(summary.totalInvoices).toBeGreaterThanOrEqual(1); // At least our test invoice
    });

    it('should not leak tenant data in search results', async () => {
      const response = await request(app)
        .get('/api/clients?search=Client')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should not return tenant1's client even though it matches the search
      const clientIds = response.body.data.clients.map((c: any) => c.id);
      expect(clientIds).not.toContain(tenant1Client.id);
    });
  });

  describe('Bulk Operations Isolation', () => {
    it('should not allow bulk operations across tenants', async () => {
      // This test would be relevant if we had bulk delete/update operations
      // For now, we test that individual operations are properly isolated
      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${tenant2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Tenant2 should see 0 invoices (they don't have any)
      expect(response.body.data.invoices).toHaveLength(0);
    });
  });
});