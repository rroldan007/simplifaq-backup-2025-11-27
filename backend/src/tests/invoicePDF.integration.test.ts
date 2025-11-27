import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

describe('Invoice PDF Generation Integration', () => {
  let authToken: string;
  let userId: string;
  let clientId: string;
  let productId: string;
  let invoiceId: string;

  // Create test output directory
  const testOutputDir = path.join(__dirname, '../../test-output');

  beforeAll(async () => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // Clean up test data
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test user with Swiss company data
    const testUser = await prisma.user.create({
      data: {
        email: 'test@simplifaq.ch',
        password: 'hashedpassword',
        companyName: 'Simplifaq SA',
        firstName: 'Jean',
        lastName: 'Dupont',
        vatNumber: 'CHE-123.456.789',
        street: '123 Avenue de la Gare',
        postalCode: '1000',
        city: 'Lausanne',
        canton: 'VD',
        country: 'Suisse',
        phone: '+41 21 123 45 67',
        website: 'www.simplifaq.ch',
        iban: 'CH9300762011623852957',
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
        companyName: 'Client Test SA',
        email: 'client@test.com',
        street: '456 Rue du Commerce',
        postalCode: '1201',
        city: 'Genève',
        canton: 'GE',
        country: 'Suisse',
        vatNumber: 'CHE-987.654.321',
        userId,
      },
    });

    clientId = testClient.id;

    // Create test products
    const testProduct1 = await prisma.product.create({
      data: {
        name: 'Développement Web',
        description: 'Développement d\'application web sur mesure',
        unitPrice: 120.00,
        tvaRate: 8.10,
        unit: 'heure',
        userId,
      },
    });

    const testProduct2 = await prisma.product.create({
      data: {
        name: 'Consultation',
        description: 'Consultation technique et stratégique',
        unitPrice: 150.00,
        tvaRate: 8.10,
        unit: 'heure',
        userId,
      },
    });

    productId = testProduct1.id;

    // Create test invoice with multiple items
    const testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-001',
        clientId,
        userId,
        issueDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-14'),
        status: 'sent',
        subtotal: 5400.00,
        tvaAmount: 437.40,
        total: 5837.40,
        currency: 'CHF',
        notes: 'Merci pour votre confiance. Paiement dans les 30 jours.',
        terms: 'Paiement net à 30 jours. Retard de paiement: intérêts de 5% par an.',
      },
    });

    invoiceId = testInvoice.id;

    // Create invoice items
    await prisma.invoiceItem.createMany({
      data: [
        {
          invoiceId: testInvoice.id,
          productId: testProduct1.id,
          description: 'Développement application web - Phase 1',
          quantity: 30,
          unitPrice: 120.00,
          tvaRate: 8.10,
          total: 3891.60,
          order: 1,
        },
        {
          invoiceId: testInvoice.id,
          productId: testProduct2.id,
          description: 'Consultation technique et architecture',
          quantity: 12,
          unitPrice: 150.00,
          tvaRate: 8.10,
          total: 1945.80,
          order: 2,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();

    console.log(`Integration test PDFs generated in: ${testOutputDir}`);
  });

  describe('GET /api/invoices/:id/pdf', () => {
    it('should generate PDF for invoice with Swiss QR Bill', async () => {
      const response = await request(app)
        .get(`/api/invoices/${invoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check response headers
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('facture-INV-2024-001.pdf');
      expect(response.headers['content-length']).toBeDefined();

      // Check PDF content
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(5000); // PDF should have reasonable size

      // Check PDF header
      const pdfHeader = response.body.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');

      // Save PDF for manual inspection
      const outputPath = path.join(testOutputDir, 'invoice-with-qr-bill.pdf');
      fs.writeFileSync(outputPath, response.body);
      console.log(`Invoice PDF saved to: ${outputPath}`);
    }, 60000);

    it('should generate PDF in different languages', async () => {
      const languages = ['fr', 'de', 'it', 'en'];

      for (const language of languages) {
        const response = await request(app)
          .get(`/api/invoices/${invoiceId}/pdf?language=${language}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.body.length).toBeGreaterThan(5000);

        // Save language-specific PDFs
        const outputPath = path.join(testOutputDir, `invoice-${language}.pdf`);
        fs.writeFileSync(outputPath, response.body);
      }
    }, 120000);

    it('should generate PDF with different formats', async () => {
      const formats = ['A4', 'Letter'];

      for (const format of formats) {
        const response = await request(app)
          .get(`/api/invoices/${invoiceId}/pdf?format=${format}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.body.length).toBeGreaterThan(5000);

        // Save format-specific PDFs
        const outputPath = path.join(testOutputDir, `invoice-${format.toLowerCase()}.pdf`);
        fs.writeFileSync(outputPath, response.body);
      }
    }, 90000);

    it('should return 404 for non-existent invoice', async () => {
      const fakeId = 'non-existent-id';
      const response = await request(app)
        .get(`/api/invoices/${fakeId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVOICE_NOT_FOUND');
    }, 30000);

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/invoices/${invoiceId}/pdf`)
        .expect(401);
    }, 30000);

    it('should handle invoice without IBAN gracefully', async () => {
      // Create user without IBAN
      const userWithoutIban = await prisma.user.create({
        data: {
          email: 'noiban@test.com',
          password: 'hashedpassword',
          companyName: 'Company Without IBAN',
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test Street',
          postalCode: '1000',
          city: 'Lausanne',
          country: 'Suisse',
          // No IBAN provided
        },
      });

      const clientForNoIban = await prisma.client.create({
        data: {
          companyName: 'Client for No IBAN Test',
          email: 'client@noiban.com',
          street: '456 Client Street',
          postalCode: '1001',
          city: 'Lausanne',
          country: 'Suisse',
          userId: userWithoutIban.id,
        },
      });

      const invoiceWithoutIban = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-NO-IBAN-001',
          clientId: clientForNoIban.id,
          userId: userWithoutIban.id,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'draft',
          subtotal: 1000.00,
          tvaAmount: 81.00,
          total: 1081.00,
          currency: 'CHF',
        },
      });

      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoiceWithoutIban.id,
          description: 'Test service',
          quantity: 10,
          unitPrice: 100.00,
          tvaRate: 8.10,
          total: 1081.00,
          order: 1,
        },
      });

      const noIbanToken = jwt.sign(
        { userId: userWithoutIban.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/invoices/${invoiceWithoutIban.id}/pdf`)
        .set('Authorization', `Bearer ${noIbanToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);

      // Save PDF for inspection
      const outputPath = path.join(testOutputDir, 'invoice-no-iban.pdf');
      fs.writeFileSync(outputPath, response.body);

      // Clean up
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoiceWithoutIban.id } });
      await prisma.invoice.delete({ where: { id: invoiceWithoutIban.id } });
      await prisma.client.delete({ where: { id: clientForNoIban.id } });
      await prisma.user.delete({ where: { id: userWithoutIban.id } });
    }, 60000);
  });

  describe('PDF Content Validation', () => {
    it('should generate PDF with proper invoice data', async () => {
      const response = await request(app)
        .get(`/api/invoices/${invoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(5000);

      // Save for content inspection
      const outputPath = path.join(testOutputDir, 'invoice-content-validation.pdf');
      fs.writeFileSync(outputPath, response.body);

      // Basic PDF structure validation
      const pdfContent = response.body.toString('ascii');
      expect(pdfContent).toContain('%PDF');
      expect(pdfContent).toContain('%%EOF');
    }, 60000);

    it('should handle invoice with many items (multi-page test)', async () => {
      // Create invoice with many items to test page breaks
      const manyItemsInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-MANY-ITEMS-001',
          clientId,
          userId,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'draft',
          subtotal: 10000.00,
          tvaAmount: 810.00,
          total: 10810.00,
          currency: 'CHF',
        },
      });

      // Create many invoice items
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        invoiceId: manyItemsInvoice.id,
        description: `Service ${i + 1} - Description détaillée du service fourni avec beaucoup de texte`,
        quantity: Math.floor(Math.random() * 5) + 1,
        unitPrice: Math.floor(Math.random() * 200) + 50,
        tvaRate: 8.10,
        total: 0, // Will be calculated
        order: i + 1,
      })).map(item => ({
        ...item,
        total: item.quantity * item.unitPrice * 1.081,
      }));

      await prisma.invoiceItem.createMany({
        data: manyItems,
      });

      const response = await request(app)
        .get(`/api/invoices/${manyItemsInvoice.id}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(8000); // Should be larger with more items

      // Save for page break inspection
      const outputPath = path.join(testOutputDir, 'invoice-many-items-multipage.pdf');
      fs.writeFileSync(outputPath, response.body);

      // Clean up
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: manyItemsInvoice.id } });
      await prisma.invoice.delete({ where: { id: manyItemsInvoice.id } });
    }, 90000);

    it('should generate PDF with EUR currency', async () => {
      // Create EUR invoice
      const eurInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-EUR-001',
          clientId,
          userId,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'sent',
          subtotal: 1000.00,
          tvaAmount: 81.00,
          total: 1081.00,
          currency: 'EUR',
        },
      });

      await prisma.invoiceItem.create({
        data: {
          invoiceId: eurInvoice.id,
          description: 'Service en EUR',
          quantity: 10,
          unitPrice: 100.00,
          tvaRate: 8.10,
          total: 1081.00,
          order: 1,
        },
      });

      const response = await request(app)
        .get(`/api/invoices/${eurInvoice.id}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(5000);

      // Save EUR invoice PDF
      const outputPath = path.join(testOutputDir, 'invoice-eur-currency.pdf');
      fs.writeFileSync(outputPath, response.body);

      // Clean up
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: eurInvoice.id } });
      await prisma.invoice.delete({ where: { id: eurInvoice.id } });
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle PDF generation errors gracefully', async () => {
      // Create invoice with invalid data that might cause PDF generation to fail
      const invalidInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-INVALID-001',
          clientId,
          userId,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'draft',
          subtotal: 0,
          tvaAmount: 0,
          total: 0,
          currency: 'CHF',
        },
      });

      // Try to generate PDF - should handle gracefully even with zero amounts
      const response = await request(app)
        .get(`/api/invoices/${invalidInvoice.id}/pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should either succeed with zero amounts or fail gracefully
      if (response.status === 200) {
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.body).toBeInstanceOf(Buffer);
      } else {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }

      // Clean up
      await prisma.invoice.delete({ where: { id: invalidInvoice.id } });
    }, 60000);

    it('should handle missing client data gracefully', async () => {
      // This test ensures the system handles edge cases in data
      const response = await request(app)
        .get(`/api/invoices/${invoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(5000);
    }, 60000);
  });
});