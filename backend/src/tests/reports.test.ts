import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Report Endpoints', () => {
  let authToken: string;
  let userId: string;
  let clientId: string;
  let productId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        companyName: 'Test Company SA',
        firstName: 'Test',
        lastName: 'User',
        vatNumber: 'CHE-123.456.789',
        street: '123 Test Street',
        postalCode: '1000',
        city: 'Lausanne',
        canton: 'VD',
        country: 'Switzerland',
      },
    });

    userId = testUser.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test client
    const testClient = await prisma.client.create({
      data: {
        companyName: 'Test Client SA',
        email: 'client@test.com',
        street: '456 Client Street',
        postalCode: '1001',
        city: 'Lausanne',
        canton: 'VD',
        country: 'Switzerland',
        userId,
      },
    });

    clientId = testClient.id;

    // Create test product
    const testProduct = await prisma.product.create({
      data: {
        name: 'Test Service',
        description: 'A test service',
        unitPrice: 100.0,
        tvaRate: 8.10,
        unit: 'hour',
        userId,
      },
    });

    productId = testProduct.id;

    // Create test invoices with different statuses and dates
    const baseDate = new Date('2024-01-15');
    
    const testInvoice1 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-001',
        clientId,
        userId,
        issueDate: baseDate,
        dueDate: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        status: 'paid',
        subtotal: 100.0,
        tvaAmount: 8.10,
        total: 108.10,
        currency: 'CHF',
      },
    });

    await prisma.invoiceItem.create({
      data: {
        invoiceId: testInvoice1.id,
        productId,
        description: 'Test service - paid',
        quantity: 1,
        unitPrice: 100.0,
        tvaRate: 8.10,
        total: 108.10,
      },
    });

    const testInvoice2 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-002',
        clientId,
        userId,
        issueDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        dueDate: new Date(baseDate.getTime() + 35 * 24 * 60 * 60 * 1000),
        status: 'sent',
        subtotal: 200.0,
        tvaAmount: 7.0,
        total: 207.0,
        currency: 'CHF',
      },
    });

    await prisma.invoiceItem.create({
      data: {
        invoiceId: testInvoice2.id,
        productId,
        description: 'Test service - sent',
        quantity: 2,
        unitPrice: 100.0,
        tvaRate: 3.50,
        total: 207.0,
      },
    });

    const testInvoice3 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-003',
        clientId,
        userId,
        issueDate: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000), // Overdue
        status: 'overdue',
        subtotal: 50.0,
        tvaAmount: 0.0,
        total: 50.0,
        currency: 'CHF',
      },
    });

    await prisma.invoiceItem.create({
      data: {
        invoiceId: testInvoice3.id,
        productId,
        description: 'Test service - overdue',
        quantity: 0.5,
        unitPrice: 100.0,
        tvaRate: 0.0,
        total: 50.0,
      },
    });

    invoiceId = testInvoice1.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/reports/financial-summary', () => {
    it('should return financial summary for authenticated user', async () => {
      const response = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('invoices');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('tva');

      const { invoices, revenue, tva } = response.body.data;

      // Check invoice counts
      expect(invoices.total).toBe(3);
      expect(invoices.paid).toBe(1);
      expect(invoices.sent).toBe(1);
      expect(invoices.overdue).toBe(1);

      // Check revenue totals
      expect(revenue.total).toBe(108.10); // Only paid invoices
      expect(revenue.pending).toBe(207.0); // Sent invoices
      expect(revenue.overdue).toBe(50.0); // Overdue invoices

      // Check TVA breakdown
      expect(tva.breakdown).toHaveLength(3); // Three different TVA rates
      expect(tva.totalTva).toBeCloseTo(15.10, 2); // 8.10 + 7.0 + 0.0
    });

    it('should filter by date range', async () => {
      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-01-20T23:59:59.999Z';

      const response = await request(app)
        .get(`/api/reports/financial-summary?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period.from).toBe(from);
      expect(response.body.data.period.to).toBe(to);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/reports/financial-summary')
        .expect(401);
    });
  });

  describe('GET /api/reports/tva-report', () => {
    it('should return TVA report for specified period', async () => {
      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-01-31T23:59:59.999Z';

      const response = await request(app)
        .get(`/api/reports/tva-report?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('company');
      expect(response.body.data).toHaveProperty('tvaRates');
      expect(response.body.data).toHaveProperty('summary');

      const { tvaRates, summary, company } = response.body.data;

      // Check company information
      expect(company.companyName).toBe('Test Company SA');
      expect(company.vatNumber).toBe('CHE-123.456.789');

      // Check TVA rates breakdown
      expect(tvaRates).toHaveLength(4); // 0%, 2.6%, 3.8%, 8.1%
      
      const rate0 = tvaRates.find((r: any) => r.rate === 0);
      const rate35 = tvaRates.find((r: any) => r.rate === 3.5);
      const rate81 = tvaRates.find((r: any) => r.rate === 8.1);

      expect(rate0.totalGross).toBe(50.0);
      expect(rate35.totalGross).toBe(207.0);
      expect(rate81.totalGross).toBe(108.10);

      // Check summary
      expect(summary.totalGross).toBeCloseTo(365.10, 2);
      expect(summary.totalTva).toBeCloseTo(15.10, 2);
    });

    it('should return 400 without required date parameters', async () => {
      const response = await request(app)
        .get('/api/reports/tva-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_PERIOD');
    });

    it('should return 400 with invalid date range', async () => {
      const from = '2024-01-31T00:00:00.000Z';
      const to = '2024-01-01T23:59:59.999Z'; // End before start

      const response = await request(app)
        .get(`/api/reports/tva-report?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('should return 401 without authentication', async () => {
      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-01-31T23:59:59.999Z';

      await request(app)
        .get(`/api/reports/tva-report?from=${from}&to=${to}`)
        .expect(401);
    });
  });

  describe('GET /api/reports/income-report', () => {
    it('should return monthly income report by default', async () => {
      const response = await request(app)
        .get('/api/reports/income-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('invoicesByStatus');
      expect(response.body.data).toHaveProperty('topClients');

      const { period, summary, invoicesByStatus } = response.body.data;

      expect(period.type).toBe('month');
      expect(summary).toHaveProperty('totalInvoices');
      expect(summary).toHaveProperty('totalRevenue');
      expect(summary).toHaveProperty('paidRevenue');
      expect(summary).toHaveProperty('pendingRevenue');

      expect(invoicesByStatus).toHaveProperty('paid');
      expect(invoicesByStatus).toHaveProperty('sent');
      expect(invoicesByStatus).toHaveProperty('overdue');
      expect(invoicesByStatus).toHaveProperty('draft');
    });

    it('should return quarterly report when specified', async () => {
      const response = await request(app)
        .get('/api/reports/income-report?period=quarter&year=2024')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period.type).toBe('quarter');
      expect(response.body.data.period.label).toContain('T1 2024');
    });

    it('should return yearly report with monthly breakdown', async () => {
      const response = await request(app)
        .get('/api/reports/income-report?period=year&year=2024')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period.type).toBe('year');
      expect(response.body.data).toHaveProperty('monthlyBreakdown');
      expect(response.body.data.monthlyBreakdown).toHaveLength(12);
    });

    it('should return 400 with invalid period', async () => {
      const response = await request(app)
        .get('/api/reports/income-report?period=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/reports/income-report')
        .expect(401);
    });
  });

  describe('Report Data Accuracy', () => {
    it('should calculate TVA amounts correctly', async () => {
      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-01-31T23:59:59.999Z';

      const response = await request(app)
        .get(`/api/reports/tva-report?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { tvaRates } = response.body.data;
      
      // Check 8.1% TVA calculation
      const rate81 = tvaRates.find((r: any) => r.rate === 8.1);
      const expectedNet81 = 108.10 / 1.081; // Gross / (1 + rate/100)
      const expectedTva81 = 108.10 - expectedNet81;
      
      expect(rate81.totalNet).toBeCloseTo(expectedNet81, 2);
      expect(rate81.totalTva).toBeCloseTo(expectedTva81, 2);

      // Check 3.5% TVA calculation
      const rate35 = tvaRates.find((r: any) => r.rate === 3.5);
      const expectedNet35 = 207.0 / 1.035;
      const expectedTva35 = 207.0 - expectedNet35;
      
      expect(rate35.totalNet).toBeCloseTo(expectedNet35, 2);
      expect(rate35.totalTva).toBeCloseTo(expectedTva35, 2);

      // Check 0% TVA (no tax)
      const rate0 = tvaRates.find((r: any) => r.rate === 0);
      expect(rate0.totalNet).toBe(50.0);
      expect(rate0.totalTva).toBe(0);
    });

    it('should include only relevant invoice statuses in reports', async () => {
      // Create a draft invoice that should not appear in TVA report
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2024-DRAFT',
          clientId,
          userId,
          issueDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-20'),
          status: 'draft',
          subtotal: 1000.0,
          tvaAmount: 81.0,
          total: 1081.0,
          currency: 'CHF',
        },
      });

      const from = '2024-01-01T00:00:00.000Z';
      const to = '2024-01-31T23:59:59.999Z';

      const response = await request(app)
        .get(`/api/reports/tva-report?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Draft invoices should not be included in TVA report
      expect(response.body.data.summary.totalGross).toBeCloseTo(365.10, 2);
      expect(response.body.data.summary.totalInvoices).toBe(3); // Not 4
    });
  });
});