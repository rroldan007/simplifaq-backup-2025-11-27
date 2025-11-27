import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';
import { generateTestToken, createTestUser, cleanupTestUser } from './test-utils';
import { validateQRBillData, generateQRReference } from '../utils/swissQRBill';
import { calculateSwissTVA, SwissTVACategory } from '../utils/swissTVA';

const prisma = new PrismaClient();

describe('Complete Swiss Invoicing Workflow Integration', () => {
  let authToken: string;
  let testUserId: string;
  let clientId: string;
  let productId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Create test user with complete Swiss company data
    const testUser = await createTestUser({
      email: 'complete-workflow@simplifaq.ch',
      firstName: 'Jean',
      lastName: 'Dupont',
      companyName: 'Simplifaq Solutions SA',
      address: {
        street: 'Avenue de la Gare 15',
        city: 'Lausanne',
        postalCode: '1000',
        country: 'CH',
        canton: 'VD',
      },
      iban: 'CH9300762011623852957',
      tvaNumber: 'CHE-123.456.789 TVA',
      phone: '+41 21 555 12 34',
    });
    testUserId = testUser.id;
    authToken = generateTestToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
    await prisma.$disconnect();
  });

  describe('Complete Workflow: Client → Product → Invoice → QR Bill → Email → Payment', () => {
    it('should execute complete Swiss invoicing workflow', async () => {
      console.log('🚀 Starting complete Swiss invoicing workflow test...');

      // ===== STEP 1: Create Swiss Client =====
      console.log('📝 Step 1: Creating Swiss client...');
      
      const clientData = {
        name: 'Entreprise Client SA',
        email: 'client@entreprise.ch',
        phone: '+41 22 789 45 67',
        address: {
          street: 'Rue du Commerce 42',
          city: 'Genève',
          postalCode: '1201',
          country: 'CH',
          canton: 'GE',
        },
        tvaNumber: 'CHE-987.654.321 TVA',
        notes: 'Client important - facturation mensuelle',
      };

      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      clientId = clientResponse.body.id;
      
      // Verify Swiss validations
      expect(clientResponse.body.address.postalCode).toMatch(/^\d{4}$/);
      expect(['AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH']).toContain(clientResponse.body.address.canton);
      expect(clientResponse.body.tvaNumber).toMatch(/^CHE-\d{3}\.\d{3}\.\d{3}\s+(TVA|MWST|IVA)$/);

      console.log('✅ Client created successfully:', clientResponse.body.name);

      // ===== STEP 2: Create Products/Services =====
      console.log('📦 Step 2: Creating products/services...');

      const products = [
        {
          name: 'Consultation IT Senior',
          description: 'Consultation informatique niveau senior',
          price: 180.00,
          currency: 'CHF',
          tvaCategory: SwissTVACategory.STANDARD,
          unit: 'heure',
        },
        {
          name: 'Formation équipe',
          description: 'Formation technique pour équipe',
          price: 1200.00,
          currency: 'CHF',
          tvaCategory: SwissTVACategory.STANDARD,
          unit: 'jour',
        },
        {
          name: 'Frais de déplacement',
          description: 'Remboursement frais de transport',
          price: 0.70,
          currency: 'CHF',
          tvaCategory: SwissTVACategory.EXEMPT,
          unit: 'km',
        },
      ];

      const createdProducts = [];
      for (const product of products) {
        const productResponse = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send(product)
          .expect(201);

        createdProducts.push(productResponse.body);
        console.log(`✅ Product created: ${productResponse.body.name}`);
      }

      productId = createdProducts[0].id;

      // ===== STEP 3: Create Complex Invoice =====
      console.log('📄 Step 3: Creating complex invoice...');

      const invoiceData = {
        clientId,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'CHF',
        reference: generateQRReference('202401001'),
        items: [
          {
            productId: createdProducts[0].id,
            description: 'Consultation IT Senior - Analyse système',
            quantity: 8,
            unitPrice: 180.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
          {
            productId: createdProducts[1].id,
            description: 'Formation équipe développement',
            quantity: 2,
            unitPrice: 1200.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
          {
            productId: createdProducts[2].id,
            description: 'Frais déplacement Lausanne-Genève',
            quantity: 120,
            unitPrice: 0.70,
            tvaCategory: SwissTVACategory.EXEMPT,
          },
        ],
        notes: 'Merci pour votre confiance. Paiement dans les 30 jours.',
        language: 'fr',
      };

      const invoiceResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      invoiceId = invoiceResponse.body.id;

      // Verify calculations
      const expectedNet = (8 * 180) + (2 * 1200) + (120 * 0.70); // 1440 + 2400 + 84 = 3924
      const standardTVA = calculateSwissTVA(1440 + 2400, SwissTVACategory.STANDARD);
      const exemptTVA = calculateSwissTVA(84, SwissTVACategory.EXEMPT);
      const expectedTotalTVA = standardTVA.tvaAmount + exemptTVA.tvaAmount;
      const expectedGross = expectedNet + expectedTotalTVA;

      expect(invoiceResponse.body.totalNet).toBe(expectedNet);
      expect(invoiceResponse.body.totalTVA).toBe(expectedTotalTVA);
      expect(invoiceResponse.body.totalGross).toBe(expectedGross);
      expect(invoiceResponse.body.status).toBe('DRAFT');
      expect(invoiceResponse.body.number).toMatch(/^INV-\d{4}-\d{3}$/);

      console.log(`✅ Invoice created: ${invoiceResponse.body.number}`);
      console.log(`   Net: ${expectedNet} CHF, TVA: ${expectedTotalTVA} CHF, Gross: ${expectedGross} CHF`);

      // ===== STEP 4: Generate Swiss QR Bill =====
      console.log('🏦 Step 4: Generating Swiss QR Bill...');

      const qrBillResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/qr-bill`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const qrBillData = qrBillResponse.body.qrBillData;

      // Validate QR Bill compliance
      const qrValidation = validateQRBillData(qrBillData);
      expect(qrValidation.isValid).toBe(true);
      expect(qrValidation.errors).toHaveLength(0);

      // Verify QR Bill content
      expect(qrBillData.creditor.name).toBe('Simplifaq Solutions SA');
      expect(qrBillData.creditor.addressLine1).toBe('Avenue de la Gare 15');
      expect(qrBillData.creditor.postalCode).toBe('1000');
      expect(qrBillData.creditor.city).toBe('Lausanne');
      expect(qrBillData.creditor.country).toBe('CH');
      expect(qrBillData.creditorAccount).toBe('CH9300762011623852957');
      expect(qrBillData.amount).toBe(expectedGross);
      expect(qrBillData.currency).toBe('CHF');
      expect(qrBillData.referenceType).toBe('QRR');
      expect(qrBillData.reference).toBe(invoiceData.reference);

      // Verify debtor information
      expect(qrBillData.debtor.name).toBe('Entreprise Client SA');
      expect(qrBillData.debtor.addressLine1).toBe('Rue du Commerce 42');
      expect(qrBillData.debtor.postalCode).toBe('1201');
      expect(qrBillData.debtor.city).toBe('Genève');

      console.log('✅ Swiss QR Bill generated and validated');

      // ===== STEP 5: Generate PDF with QR Bill =====
      console.log('📄 Step 5: Generating PDF with QR Bill...');

      const pdfResponse = await request(app)
        .get(`/api/invoices/${invoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(pdfResponse.headers['content-type']).toBe('application/pdf');
      expect(pdfResponse.body).toBeInstanceOf(Buffer);
      expect(pdfResponse.body.length).toBeGreaterThan(10000); // PDF should be substantial

      console.log(`✅ PDF generated (${pdfResponse.body.length} bytes)`);

      // ===== STEP 6: Send Invoice by Email =====
      console.log('📧 Step 6: Sending invoice by email...');

      const emailData = {
        to: 'client@entreprise.ch',
        subject: `Facture ${invoiceResponse.body.number} - Simplifaq Solutions SA`,
        template: 'invoice_notification',
        language: 'fr',
        templateData: {
          clientName: 'Entreprise Client SA',
          invoiceNumber: invoiceResponse.body.number,
          amount: `${expectedGross.toFixed(2)} CHF`,
          dueDate: new Date(invoiceData.dueDate).toLocaleDateString('fr-CH'),
          companyName: 'Simplifaq Solutions SA',
        },
        includePDF: true,
      };

      const emailResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(200);

      expect(emailResponse.body.success).toBe(true);
      expect(emailResponse.body.messageId).toBeDefined();
      expect(emailResponse.body.sentTo).toBe('client@entreprise.ch');

      console.log('✅ Invoice sent by email');

      // ===== STEP 7: Update Invoice Status to SENT =====
      console.log('📤 Step 7: Updating invoice status to SENT...');

      const statusResponse = await request(app)
        .patch(`/api/invoices/${invoiceId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SENT' })
        .expect(200);

      expect(statusResponse.body.status).toBe('SENT');
      expect(statusResponse.body.sentAt).toBeDefined();

      console.log('✅ Invoice status updated to SENT');

      // ===== STEP 8: Simulate Payment =====
      console.log('💰 Step 8: Processing payment...');

      const paymentData = {
        status: 'PAID',
        paidAt: new Date().toISOString(),
        paymentMethod: 'bank_transfer',
        paymentReference: qrBillData.reference,
        paidAmount: expectedGross,
      };

      const paymentResponse = await request(app)
        .patch(`/api/invoices/${invoiceId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.status).toBe('PAID');
      expect(paymentResponse.body.paidAt).toBeDefined();
      expect(paymentResponse.body.paymentReference).toBe(qrBillData.reference);

      console.log('✅ Payment processed successfully');

      // ===== STEP 9: Generate Financial Reports =====
      console.log('📊 Step 9: Generating financial reports...');

      // TVA Report
      const tvaReportResponse = await request(app)
        .get('/api/reports/tva')
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(tvaReportResponse.body.totalNet).toBeGreaterThanOrEqual(expectedNet);
      expect(tvaReportResponse.body.totalTVA).toBeGreaterThanOrEqual(expectedTotalTVA);
      expect(tvaReportResponse.body.breakdown).toBeDefined();

      // Financial Summary
      const summaryResponse = await request(app)
        .get('/api/reports/financial-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(summaryResponse.body.totalRevenue).toBeGreaterThanOrEqual(expectedGross);
      expect(summaryResponse.body.paidInvoices).toBeGreaterThanOrEqual(1);

      console.log('✅ Financial reports generated');

      // ===== STEP 10: Verify Database Consistency =====
      console.log('🔍 Step 10: Verifying database consistency...');

      const dbInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
          emailLogs: true,
        },
      });

      expect(dbInvoice).toBeDefined();
      expect(dbInvoice!.status).toBe('PAID');
      expect(dbInvoice!.client.name).toBe('Entreprise Client SA');
      expect(dbInvoice!.items).toHaveLength(3);
      expect(dbInvoice!.emailLogs).toHaveLength(1);
      expect(dbInvoice!.qrBillData).toBeDefined();

      // Verify QR Bill data in database
      const storedQRData = dbInvoice!.qrBillData as any;
      expect(storedQRData.creditorAccount).toBe('CH9300762011623852957');
      expect(storedQRData.amount).toBe(expectedGross);

      console.log('✅ Database consistency verified');

      // ===== STEP 11: Test Swiss Compliance =====
      console.log('🇨🇭 Step 11: Verifying Swiss compliance...');

      // Verify all Swiss standards are met
      const complianceChecks = {
        swissIBAN: /^CH\d{19}$/.test(qrBillData.creditorAccount.replace(/\s/g, '')),
        swissPostalCodes: /^\d{4}$/.test(qrBillData.creditor.postalCode) && /^\d{4}$/.test(qrBillData.debtor.postalCode),
        swissCurrency: ['CHF', 'EUR'].includes(qrBillData.currency),
        qrReferenceValid: qrBillData.reference.length === 27 && /^\d{27}$/.test(qrBillData.reference),
        tvaCalculationCorrect: Math.abs(dbInvoice!.totalTVA - expectedTotalTVA) < 0.01,
        swissAddressFormat: qrBillData.creditor.country === 'CH' && qrBillData.debtor.country === 'CH',
      };

      Object.entries(complianceChecks).forEach(([check, passed]) => {
        expect(passed).toBe(true);
        console.log(`   ✅ ${check}: ${passed ? 'PASSED' : 'FAILED'}`);
      });

      console.log('✅ Swiss compliance verified');

      // ===== FINAL SUMMARY =====
      console.log('\n🎉 COMPLETE WORKFLOW TEST SUMMARY:');
      console.log('=====================================');
      console.log(`✅ Client created: ${clientResponse.body.name}`);
      console.log(`✅ Products created: ${createdProducts.length} items`);
      console.log(`✅ Invoice created: ${invoiceResponse.body.number}`);
      console.log(`✅ Amount: ${expectedNet} CHF (net) + ${expectedTotalTVA} CHF (TVA) = ${expectedGross} CHF (gross)`);
      console.log(`✅ QR Bill generated and validated`);
      console.log(`✅ PDF generated (${pdfResponse.body.length} bytes)`);
      console.log(`✅ Email sent successfully`);
      console.log(`✅ Payment processed`);
      console.log(`✅ Reports generated`);
      console.log(`✅ Swiss compliance verified`);
      console.log('=====================================');
      console.log('🇨🇭 Swiss invoicing system fully operational! 🇨🇭');

      // Clean up created data
      await prisma.invoice.delete({ where: { id: invoiceId } });
      await prisma.client.delete({ where: { id: clientId } });
      for (const product of createdProducts) {
        await prisma.product.delete({ where: { id: product.id } });
      }
    });

    it('should handle multi-currency invoicing (EUR)', async () => {
      console.log('💶 Testing EUR currency workflow...');

      // Create EUR client
      const eurClientData = {
        name: 'European Client GmbH',
        email: 'client@european.com',
        address: {
          street: 'Europaplatz 1',
          city: 'Basel',
          postalCode: '4001',
          country: 'CH',
          canton: 'BS',
        },
      };

      const eurClientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eurClientData)
        .expect(201);

      // Create EUR invoice
      const eurInvoiceData = {
        clientId: eurClientResponse.body.id,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: 'EUR',
        items: [
          {
            description: 'European consulting service',
            quantity: 10,
            unitPrice: 120.00,
            tvaCategory: SwissTVACategory.STANDARD,
          },
        ],
      };

      const eurInvoiceResponse = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eurInvoiceData)
        .expect(201);

      expect(eurInvoiceResponse.body.currency).toBe('EUR');

      // Generate QR Bill for EUR
      const eurQRResponse = await request(app)
        .post(`/api/invoices/${eurInvoiceResponse.body.id}/qr-bill`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(eurQRResponse.body.qrBillData.currency).toBe('EUR');

      // Validate EUR QR Bill
      const eurValidation = validateQRBillData(eurQRResponse.body.qrBillData);
      expect(eurValidation.isValid).toBe(true);

      console.log('✅ EUR currency workflow completed successfully');

      // Clean up
      await prisma.invoice.delete({ where: { id: eurInvoiceResponse.body.id } });
      await prisma.client.delete({ where: { id: eurClientResponse.body.id } });
    });

    it('should handle error scenarios gracefully', async () => {
      console.log('⚠️ Testing error handling...');

      // Test invalid Swiss postal code
      const invalidClientData = {
        name: 'Invalid Client',
        email: 'invalid@example.com',
        address: {
          street: 'Test Street',
          city: 'Test City',
          postalCode: '12345', // Invalid Swiss postal code
          country: 'CH',
          canton: 'VD',
        },
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidClientData)
        .expect(400);

      // Test invalid IBAN for QR Bill
      const testClient = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Client',
          email: 'test@example.com',
          address: {
            street: 'Test Street',
            city: 'Lausanne',
            postalCode: '1000',
            country: 'CH',
            canton: 'VD',
          },
        })
        .expect(201);

      const testInvoice = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId: testClient.body.id,
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
        })
        .expect(201);

      // Update user with invalid IBAN
      await prisma.user.update({
        where: { id: testUserId },
        data: { iban: 'INVALID-IBAN' },
      });

      // Try to generate QR Bill with invalid IBAN
      await request(app)
        .post(`/api/invoices/${testInvoice.body.id}/qr-bill`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      console.log('✅ Error handling verified');

      // Restore valid IBAN
      await prisma.user.update({
        where: { id: testUserId },
        data: { iban: 'CH9300762011623852957' },
      });

      // Clean up
      await prisma.invoice.delete({ where: { id: testInvoice.body.id } });
      await prisma.client.delete({ where: { id: testClient.body.id } });
    });
  });
});