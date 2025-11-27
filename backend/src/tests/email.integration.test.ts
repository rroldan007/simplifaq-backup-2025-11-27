import request from 'supertest';
import { app } from '../index';
import { PrismaClient } from '@prisma/client';
import { generateTestToken, createTestUser, createTestClient, createTestInvoice, cleanupTestUser } from './test-utils';

const prisma = new PrismaClient();

// Mock nodemailer for testing
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    }),
  })),
}));

describe('Email Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testClientId: string;
  let testInvoiceId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await createTestUser({
      email: 'email-integration@example.com',
      companyName: 'Test Email Company SA',
    });
    testUserId = testUser.id;
    authToken = generateTestToken(testUser.id);

    // Create test client
    const testClient = await createTestClient(testUserId, {
      name: 'Email Test Client SA',
      email: 'email-client@example.com',
    });
    testClientId = testClient.id;

    // Create test invoice
    const testInvoice = await createTestInvoice(testUserId, testClientId, {
      status: 'SENT',
    });
    testInvoiceId = testInvoice.id;
  });

  afterAll(async () => {
    await cleanupTestUser(testUserId);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up email logs after each test
    await prisma.emailLog.deleteMany({ where: { userId: testUserId } });
  });

  describe('Invoice Email Sending', () => {
    it('should send invoice email with PDF attachment', async () => {
      const emailData = {
        to: 'email-client@example.com',
        subject: 'Votre facture INV-2024-001',
        message: 'Veuillez trouver ci-joint votre facture.',
        includePDF: true,
        language: 'fr',
      };

      const response = await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        messageId: 'test-message-id',
        sentTo: 'email-client@example.com',
      });

      // Verify email log was created
      const emailLog = await prisma.emailLog.findFirst({
        where: {
          invoiceId: testInvoiceId,
          userId: testUserId,
        },
      });

      expect(emailLog).toBeDefined();
      expect(emailLog!.to).toBe('email-client@example.com');
      expect(emailLog!.subject).toBe('Votre facture INV-2024-001');
      expect(emailLog!.status).toBe('SENT');
      expect(emailLog!.messageId).toBe('test-message-id');
    });

    it('should send invoice email without PDF attachment', async () => {
      const emailData = {
        to: 'email-client@example.com',
        subject: 'Notification de facture',
        message: 'Une nouvelle facture est disponible.',
        includePDF: false,
        language: 'fr',
      };

      const response = await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify email log
      const emailLog = await prisma.emailLog.findFirst({
        where: {
          invoiceId: testInvoiceId,
          userId: testUserId,
        },
      });

      expect(emailLog!.includedPDF).toBe(false);
    });

    it('should handle email template rendering in French', async () => {
      const emailData = {
        to: 'email-client@example.com',
        template: 'invoice_reminder',
        language: 'fr',
        templateData: {
          clientName: 'Email Test Client SA',
          invoiceNumber: 'INV-2024-001',
          amount: '1077.54 CHF',
          dueDate: '2024-12-31',
        },
      };

      const response = await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify template was used
      const emailLog = await prisma.emailLog.findFirst({
        where: {
          invoiceId: testInvoiceId,
          userId: testUserId,
        },
      });

      expect(emailLog!.template).toBe('invoice_reminder');
      expect(emailLog!.language).toBe('fr');
    });

    it('should send payment reminder emails', async () => {
      // Mark invoice as overdue
      await prisma.invoice.update({
        where: { id: testInvoiceId },
        data: {
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
      });

      const reminderData = {
        to: 'email-client@example.com',
        template: 'payment_reminder',
        language: 'fr',
        templateData: {
          clientName: 'Email Test Client SA',
          invoiceNumber: 'INV-2024-001',
          amount: '1077.54 CHF',
          daysPastDue: 7,
        },
      };

      const response = await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-reminder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reminderData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify reminder log
      const emailLog = await prisma.emailLog.findFirst({
        where: {
          invoiceId: testInvoiceId,
          userId: testUserId,
          template: 'payment_reminder',
        },
      });

      expect(emailLog).toBeDefined();
      expect(emailLog!.template).toBe('payment_reminder');
    });

    it('should handle bulk email sending', async () => {
      // Create additional invoices and clients
      const additionalClients = [];
      const additionalInvoices = [];

      for (let i = 0; i < 3; i++) {
        const client = await createTestClient(testUserId, {
          name: `Bulk Client ${i + 1}`,
          email: `bulk-client-${i + 1}@example.com`,
        });
        additionalClients.push(client);

        const invoice = await createTestInvoice(testUserId, client.id, {
          status: 'SENT',
        });
        additionalInvoices.push(invoice);
      }

      const bulkEmailData = {
        invoiceIds: additionalInvoices.map(inv => inv.id),
        template: 'invoice_notification',
        language: 'fr',
        subject: 'Votre facture est prête',
        includePDF: true,
      };

      const response = await request(app)
        .post('/api/emails/bulk-send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkEmailData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sentCount).toBe(3);
      expect(response.body.failedCount).toBe(0);

      // Verify all email logs were created
      const emailLogs = await prisma.emailLog.findMany({
        where: {
          userId: testUserId,
          template: 'invoice_notification',
        },
      });

      expect(emailLogs).toHaveLength(3);

      // Clean up
      for (const invoice of additionalInvoices) {
        await prisma.invoice.delete({ where: { id: invoice.id } });
      }
      for (const client of additionalClients) {
        await prisma.client.delete({ where: { id: client.id } });
      }
    });
  });

  describe('Email History and Tracking', () => {
    it('should retrieve email history for an invoice', async () => {
      // Send a few emails
      const emails = [
        {
          to: 'email-client@example.com',
          subject: 'Facture initiale',
          message: 'Votre facture est prête.',
        },
        {
          to: 'email-client@example.com',
          subject: 'Rappel de paiement',
          message: 'Rappel pour votre facture.',
        },
      ];

      for (const emailData of emails) {
        await request(app)
          .post(`/api/invoices/${testInvoiceId}/send-email`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(emailData)
          .expect(200);
      }

      // Get email history
      const historyResponse = await request(app)
        .get(`/api/invoices/${testInvoiceId}/email-history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveLength(2);
      expect(historyResponse.body[0]).toMatchObject({
        to: 'email-client@example.com',
        subject: 'Rappel de paiement',
        status: 'SENT',
      });
      expect(historyResponse.body[1]).toMatchObject({
        to: 'email-client@example.com',
        subject: 'Facture initiale',
        status: 'SENT',
      });
    });

    it('should track email delivery status', async () => {
      const emailData = {
        to: 'email-client@example.com',
        subject: 'Test de suivi',
        message: 'Email de test pour le suivi.',
      };

      const sendResponse = await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(200);

      const messageId = sendResponse.body.messageId;

      // Simulate delivery webhook
      const deliveryData = {
        messageId,
        status: 'delivered',
        timestamp: new Date().toISOString(),
      };

      await request(app)
        .post('/api/emails/webhook/delivery')
        .send(deliveryData)
        .expect(200);

      // Check updated status
      const emailLog = await prisma.emailLog.findFirst({
        where: { messageId },
      });

      expect(emailLog!.status).toBe('DELIVERED');
      expect(emailLog!.deliveredAt).toBeDefined();
    });

    it('should handle email bounce notifications', async () => {
      const emailData = {
        to: 'bounce@example.com',
        subject: 'Test bounce',
        message: 'This email will bounce.',
      };

      const sendResponse = await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(200);

      const messageId = sendResponse.body.messageId;

      // Simulate bounce webhook
      const bounceData = {
        messageId,
        status: 'bounced',
        bounceReason: 'Invalid email address',
        timestamp: new Date().toISOString(),
      };

      await request(app)
        .post('/api/emails/webhook/bounce')
        .send(bounceData)
        .expect(200);

      // Check bounce status
      const emailLog = await prisma.emailLog.findFirst({
        where: { messageId },
      });

      expect(emailLog!.status).toBe('BOUNCED');
      expect(emailLog!.bounceReason).toBe('Invalid email address');
    });
  });

  describe('Email Templates and Localization', () => {
    it('should render French email templates correctly', async () => {
      const templateData = {
        clientName: 'Monsieur Dupont',
        invoiceNumber: 'FACT-2024-001',
        amount: '1\'234.56 CHF',
        dueDate: '31 décembre 2024',
        companyName: 'Ma Société SA',
      };

      const response = await request(app)
        .post('/api/emails/preview-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          template: 'invoice_notification',
          language: 'fr',
          data: templateData,
        })
        .expect(200);

      expect(response.body.subject).toContain('Facture');
      expect(response.body.html).toContain('Monsieur Dupont');
      expect(response.body.html).toContain('FACT-2024-001');
      expect(response.body.html).toContain('1\'234.56 CHF');
      expect(response.body.html).toContain('Ma Société SA');
    });

    it('should handle missing template gracefully', async () => {
      const emailData = {
        to: 'email-client@example.com',
        template: 'non_existent_template',
        language: 'fr',
      };

      await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(400);
    });

    it('should validate email addresses', async () => {
      const invalidEmailData = {
        to: 'invalid-email-address',
        subject: 'Test',
        message: 'Test message',
      };

      await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEmailData)
        .expect(400);
    });
  });

  describe('Email Security and Rate Limiting', () => {
    it('should prevent unauthorized email sending', async () => {
      // Try to send email without authentication
      const emailData = {
        to: 'email-client@example.com',
        subject: 'Unauthorized email',
        message: 'This should not be sent.',
      };

      await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .send(emailData)
        .expect(401);
    });

    it('should prevent sending emails for invoices belonging to other users', async () => {
      // Create another user and invoice
      const otherUser = await createTestUser({
        email: 'other-email-user@example.com',
      });
      const otherClient = await createTestClient(otherUser.id);
      const otherInvoice = await createTestInvoice(otherUser.id, otherClient.id);
      const otherToken = generateTestToken(otherUser.id);

      const emailData = {
        to: 'email-client@example.com',
        subject: 'Unauthorized access attempt',
        message: 'This should not be sent.',
      };

      // Try to send email for other user's invoice
      await request(app)
        .post(`/api/invoices/${otherInvoice.id}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(403);

      // Clean up
      await cleanupTestUser(otherUser.id);
    });

    it('should implement rate limiting for email sending', async () => {
      const emailData = {
        to: 'email-client@example.com',
        subject: 'Rate limit test',
        message: 'Testing rate limits.',
      };

      // Send multiple emails quickly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post(`/api/invoices/${testInvoiceId}/send-email`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(emailData)
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Email Configuration and Settings', () => {
    it('should allow users to configure email settings', async () => {
      const emailSettings = {
        fromName: 'Ma Société SA',
        fromEmail: 'factures@masociete.ch',
        replyTo: 'contact@masociete.ch',
        signature: 'Cordialement,\\nL\'équipe de Ma Société SA',
        defaultLanguage: 'fr',
      };

      const response = await request(app)
        .put('/api/users/email-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailSettings)
        .expect(200);

      expect(response.body).toMatchObject(emailSettings);

      // Verify settings are used in emails
      const emailData = {
        to: 'email-client@example.com',
        subject: 'Test avec paramètres',
        message: 'Test des paramètres email.',
      };

      await request(app)
        .post(`/api/invoices/${testInvoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emailData)
        .expect(200);

      const emailLog = await prisma.emailLog.findFirst({
        where: {
          invoiceId: testInvoiceId,
          subject: 'Test avec paramètres',
        },
      });

      expect(emailLog!.fromName).toBe('Ma Société SA');
      expect(emailLog!.fromEmail).toBe('factures@masociete.ch');
    });

    it('should validate email configuration', async () => {
      const invalidSettings = {
        fromEmail: 'invalid-email',
        replyTo: 'also-invalid',
      };

      await request(app)
        .put('/api/users/email-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSettings)
        .expect(400);
    });
  });
});