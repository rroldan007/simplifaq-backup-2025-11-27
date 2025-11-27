import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';
import { generateTestToken, createTestUser, createTestClient, cleanupTestUser } from './test-utils';
import { generateQRReference, validateQRBillData } from '../utils/swissQRBill';
import { calculateSwissTVA, SwissTVACategory } from '../utils/swissTVA';

const prisma = new PrismaClient();

describe('Swiss Invoicing Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testClientId: string;
  let testInvoiceId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await createTestUser({
      email: 'invoicing-integration@example.com',
      companyName: 'Test Invoicing Company SA',
      address: {
        street: '123 Company Street',
        city: 'Lausanne',
        postalCode: '1000',
        country: 'CH',
        canton: 'VD',
      },
      iban: 'CH9300762011623852957',
      tvaNumber: 'CHE-123.456.789 TVA',
    });
    testUserId = testUser.id;
    authToken = generateTestToken(testUser.id);

    // Create test client
    const testClient = await createTestClient(testUserId, {
      name: 'Integration Test Client SA',
      email: 'integration-client@example.com',
      address: {
        street: '456 Client Street',
        city: 'Geneva',
        postalCode: '1201',
        country: 'CH',
        canton: 'GE',
      },
      tvaNumber: 'CHE-987.654.321 TVA',
    });
    testClientId = testClient.id;
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up invoices after each test
    await prisma.invoice.deleteMany({ where: { userId: testUserId } });
  });

  describe('Complete Invoice Workflow', () => {
    it('should create, update, and finalize an invoice with Swiss QR Bill', async () => {
      // Step 1: Create draft invoice
      const invoiceData = {
        clientId: testClientId,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'CHF',
        items: [
          {
            description: 'Consultation service',
            quantity: 10,
            unitPrice: 150.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
          {
            description: 'Travel expenses',
            quantity: 1,
            unitPrice: 200.00,
            tvaCategory: SwissTVACategory.EXEMPT,
          },
        ],
        notes: 'Thank you for your business',
      };

      const createResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      testInvoiceId = createResponse.body.id;

      // Verify invoice creation
      expect(createResponse.body).toMatchObject({
        clientId: testClientId,
        userId: testUserId,
        status: 'DRAFT',
        currency: 'CHF',
        items: expect.arrayContaining([
          expect.objectContaining({
            description: 'Consultation service',
            quantity: 10,
            unitPrice: 150.00,
          }),
          expect.objectContaining({
            description: 'Travel expenses',
            quantity: 1,
            unitPrice: 200.00,
          }),
        ]),
      });

      // Verify TVA calculations
      const standardTVA = calculateSwissTVA(1500, SwissTVACategory.STANDARD);
      const exemptTVA = calculateSwissTVA(200, SwissTVACategory.EXEMPT);
      const expectedTotalNet = 1700;
      const expectedTotalTVA = standardTVA.tvaAmount + exemptTVA.tvaAmount;
      const expectedTotalGross = expectedTotalNet + expectedTotalTVA;

      expect(createResponse.body.totalNet).toBe(expectedTotalNet);
      expect(createResponse.body.totalTVA).toBe(expectedTotalTVA);
      expect(createResponse.body.totalGross).toBe(expectedTotalGross);

      // Step 2: Update invoice
      const updateData = {
        items: [
          ...invoiceData.items,
          {
            description: 'Additional service',
            quantity: 2,
            unitPrice: 100.00,
            tvaCategory: SwissTVACategory.REDUCED,
          },
        ],
        notes: 'Updated invoice with additional service',
      };

      const updateResponse = await request(app)
        .put(`/api/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Verify updated calculations
      const additionalTVA = calculateSwissTVA(200, SwissTVACategory.REDUCED);
      const newExpectedTotalNet = 1900;
      const newExpectedTotalTVA = standardTVA.tvaAmount + exemptTVA.tvaAmount + additionalTVA.tvaAmount;
      const newExpectedTotalGross = newExpectedTotalNet + newExpectedTotalTVA;

      expect(updateResponse.body.totalNet).toBe(newExpectedTotalNet);
      expect(updateResponse.body.totalTVA).toBe(newExpectedTotalTVA);
      expect(updateResponse.body.totalGross).toBe(newExpectedTotalGross);

      // Step 3: Generate Swiss QR Bill
      const qrBillResponse = await request(app)
        .post(`/api/invoices/${testInvoiceId}/qr-bill`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify QR Bill data
      expect(qrBillResponse.body).toHaveProperty('qrBillData');
      const qrBillData = qrBillResponse.body.qrBillData;

      expect(qrBillData.creditor.name).toBe('Test Invoicing Company SA');
      expect(qrBillData.creditorAccount).toBe('CH9300762011623852957');
      expect(qrBillData.amount).toBe(newExpectedTotalGross);
      expect(qrBillData.currency).toBe('CHF');

      // Validate QR Bill data
      const validation = validateQRBillData(qrBillData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 4: Finalize invoice (change status to SENT)
      const finalizeResponse = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SENT' })
        .expect(200);

      expect(finalizeResponse.body.status).toBe('SENT');
      expect(finalizeResponse.body.sentAt).toBeDefined();

      // Step 5: Generate PDF
      const pdfResponse = await request(app)
        .get(`/api/invoices/${testInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(pdfResponse.headers['content-type']).toBe('application/pdf');
      expect(pdfResponse.body).toBeInstanceOf(Buffer);
      expect(pdfResponse.body.length).toBeGreaterThan(1000); // PDF should have content

      // Step 6: Verify invoice in database
      const dbInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
        include: { client: true },
      });

      expect(dbInvoice).toBeDefined();
      expect(dbInvoice!.status).toBe('SENT');
      expect(dbInvoice!.qrBillData).toBeDefined();
      expect(dbInvoice!.client.name).toBe('Integration Test Client SA');
    });

    it('should handle invoice with QR reference', async () => {
      // Create invoice with QR reference
      const qrReference = generateQRReference('123456');
      const invoiceData = {
        clientId: testClientId,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'CHF',
        reference: qrReference,
        items: [
          {
            description: 'Service with QR reference',
            quantity: 1,
            unitPrice: 1000.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
        ],
      };

      const createResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      testInvoiceId = createResponse.body.id;

      // Generate QR Bill
      const qrBillResponse = await request(app)
        .post(`/api/invoices/${testInvoiceId}/qr-bill`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const qrBillData = qrBillResponse.body.qrBillData;
      expect(qrBillData.referenceType).toBe('QRR');
      expect(qrBillData.reference).toBe(qrReference);

      // Validate QR Bill with reference
      const validation = validateQRBillData(qrBillData);
      expect(validation.isValid).toBe(true);
    });

    it('should handle multi-currency invoice (EUR)', async () => {
      const invoiceData = {
        clientId: testClientId,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'EUR',
        items: [
          {
            description: 'European service',
            quantity: 1,
            unitPrice: 500.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
        ],
      };

      const createResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      testInvoiceId = createResponse.body.id;

      expect(createResponse.body.currency).toBe('EUR');

      // Generate QR Bill for EUR invoice
      const qrBillResponse = await request(app)
        .post(`/api/invoices/${testInvoiceId}/qr-bill`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const qrBillData = qrBillResponse.body.qrBillData;
      expect(qrBillData.currency).toBe('EUR');

      // Validate EUR QR Bill
      const validation = validateQRBillData(qrBillData);
      expect(validation.isValid).toBe(true);
    });

    it('should handle invoice payment workflow', async () => {
      // Create and send invoice
      const invoiceData = {
        clientId: testClientId,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'CHF',
        items: [
          {
            description: 'Payment test service',
            quantity: 1,
            unitPrice: 1000.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
        ],
      };

      const createResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      testInvoiceId = createResponse.body.id;

      // Send invoice
      await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SENT' })
        .expect(200);

      // Mark as paid
      const paymentData = {
        status: 'PAID',
        paidAt: new Date().toISOString(),
        paymentMethod: 'bank_transfer',
        paymentReference: 'TXN-123456789',
      };

      const paymentResponse = await request(app)
        .patch(`/api/invoices/${testInvoiceId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.status).toBe('PAID');
      expect(paymentResponse.body.paidAt).toBeDefined();
      expect(paymentResponse.body.paymentMethod).toBe('bank_transfer');
      expect(paymentResponse.body.paymentReference).toBe('TXN-123456789');

      // Verify payment in database
      const dbInvoice = await prisma.invoice.findUnique({
        where: { id: testInvoiceId },
      });

      expect(dbInvoice!.status).toBe('PAID');
      expect(dbInvoice!.paidAt).toBeDefined();
    });

    it('should handle overdue invoice detection', async () => {
      // Create invoice with past due date
      const pastDueDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const invoiceData = {
        clientId: testClientId,
        dueDate: pastDueDate.toISOString(),
        currency: 'CHF',
        items: [
          {
            description: 'Overdue test service',
            quantity: 1,
            unitPrice: 500.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
        ],
      };

      const createResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      testInvoiceId = createResponse.body.id;

      // Send invoice
      await request(app)
        .patch(`/api/invoices/${testInvoiceId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SENT' })
        .expect(200);

      // Check overdue invoices
      const overdueResponse = await request(app)
        .get('/api/invoices/overdue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(overdueResponse.body).toHaveLength(1);
      expect(overdueResponse.body[0].id).toBe(testInvoiceId);
      expect(overdueResponse.body[0].status).toBe('SENT');
      expect(new Date(overdueResponse.body[0].dueDate)).toEqual(pastDueDate);
    });

    it('should generate correct TVA report data', async () => {
      // Create multiple invoices with different TVA categories
      const invoices = [
        {
          clientId: testClientId,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'CHF',
          items: [
            {
              description: 'Standard TVA service',
              quantity: 1,
              unitPrice: 1000.00,
              tvaCategory: SwissTVACategory.STANDARD,
            },
          ],
        },
        {
          clientId: testClientId,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'CHF',
          items: [
            {
              description: 'Reduced TVA service',
              quantity: 1,
              unitPrice: 500.00,
              tvaCategory: SwissTVACategory.REDUCED,
            },
          ],
        },
        {
          clientId: testClientId,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currency: 'CHF',
          items: [
            {
              description: 'Exempt service',
              quantity: 1,
              unitPrice: 200.00,
              tvaCategory: SwissTVACategory.EXEMPT,
            },
          ],
        },
      ];

      const invoiceIds = [];
      for (const invoiceData of invoices) {
        const response = await request(app)
          .post('/api/invoices')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invoiceData)
          .expect(201);

        invoiceIds.push(response.body.id);

        // Send each invoice
        await request(app)
          .patch(`/api/invoices/${response.body.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status: 'SENT' })
          .expect(200);
      }

      // Generate TVA report
      const reportResponse = await request(app)
        .get('/api/reports/tva')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      // Verify TVA report calculations
      expect(reportResponse.body.totalNet).toBe(1700); // 1000 + 500 + 200
      expect(reportResponse.body.totalTVA).toBe(89.5); // 77 + 12.5 + 0
      expect(reportResponse.body.totalGross).toBe(1789.5);

      expect(reportResponse.body.breakdown.standard.net).toBe(1000);
      expect(reportResponse.body.breakdown.standard.tva).toBe(77);

      expect(reportResponse.body.breakdown.reduced.net).toBe(500);
      expect(reportResponse.body.breakdown.reduced.tva).toBe(12.5);

      expect(reportResponse.body.breakdown.exempt.net).toBe(200);
      expect(reportResponse.body.breakdown.exempt.tva).toBe(0);

      // Clean up
      for (const invoiceId of invoiceIds) {
        await prisma.invoice.delete({ where: { id: invoiceId } });
      }
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate invoice data before creation', async () => {
      const invalidInvoiceData = {
        clientId: 'invalid-client-id',
        dueDate: 'invalid-date',
        currency: 'INVALID',
        items: [],
      };

      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidInvoiceData)
        .expect(400);
    });

    it('should prevent unauthorized access to invoices', async () => {
      // Create invoice
      const invoiceData = {
        clientId: testClientId,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'CHF',
        items: [
          {
            description: 'Unauthorized test service',
            quantity: 1,
            unitPrice: 100.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
        ],
      };

      const createResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      testInvoiceId = createResponse.body.id;

      // Try to access with different user
      const otherUser = await createTestUser({
        email: 'other-user@example.com',
      });
      const otherToken = generateTestToken(otherUser.id);

      await request(app)
        .get(`/api/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // Clean up
      await cleanupTestUser(otherUser.id);
    });

    it('should handle QR Bill generation errors gracefully', async () => {
      // Create invoice with invalid IBAN in user profile
      const userWithInvalidIBAN = await createTestUser({
        email: 'invalid-iban@example.com',
        iban: 'INVALID-IBAN',
      });
      const invalidToken = generateTestToken(userWithInvalidIBAN.id);

      const client = await createTestClient(userWithInvalidIBAN.id);

      const invoiceData = {
        clientId: client.id,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'CHF',
        items: [
          {
            description: 'Test service',
            quantity: 1,
            unitPrice: 100.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
        ],
      };

      const createResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(invoiceData)
        .expect(201);

      // Try to generate QR Bill with invalid IBAN
      await request(app)
        .post(`/api/invoices/${createResponse.body.id}/qr-bill`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(400);

      // Clean up
      await cleanupTestUser(userWithInvalidIBAN.id);
    });
  });
});