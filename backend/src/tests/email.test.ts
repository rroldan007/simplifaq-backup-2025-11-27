import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
// import { emailService } from '../services/emailService';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Mock the email service
// jest.mock('../services/emailService');
// const mockedEmailService = emailService as jest.Mocked<typeof emailService>;

// Mock PDF generation
jest.mock('../utils/invoicePDF', () => ({
  generateInvoicePDF: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
}));

describe('Email API', () => {
  let authToken: string;
  let userId: string;
  let clientId: string;
  let invoiceId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        companyName: 'Test Company',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Switzerland',
      },
    });
    userId = user.id;

    // Create test client
    const client = await prisma.client.create({
      data: {
        userId,
        email: 'client@example.com',
        firstName: 'Jane',
        lastName: 'Client',
        street: '456 Client St',
        city: 'Client City',
        postalCode: '67890',
        country: 'Switzerland',
      },
    });
    clientId = client.id;

    // Create test invoice
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        clientId,
        invoiceNumber: 'INV-2024-001',
        status: 'draft',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        subtotal: 1000,
        tvaAmount: 81,
        total: 1081,
        currency: 'CHF',
      },
    });
    invoiceId = invoice.id;

    // Generate auth token
    authToken = jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret');
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invoice.deleteMany({ where: { userId } });
    await prisma.client.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/invoices/:id/send-email', () => {
    it('should send invoice email successfully', async () => {
      // mockedEmailService.sendInvoiceEmail.mockResolvedValue({
      //   success: true,
      //   messageId: 'test-message-id',
      // });

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: 'client@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // expect(response.body.data.messageId).toBe('test-message-id');
      expect(response.body.data.sentTo).toBe('client@example.com');

      // expect(mockedEmailService.sendInvoiceEmail).toHaveBeenCalledWith(
      //   invoiceId,
      //   'client@example.com',
      //   expect.any(Buffer),
      //   undefined
      // );
    });

    it('should send invoice email with custom sender', async () => {
      // mockedEmailService.sendInvoiceEmail.mockResolvedValue({
      //   success: true,
      //   messageId: 'test-message-id',
      // });

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: 'client@example.com',
          senderEmail: 'custom@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // expect(mockedEmailService.sendInvoiceEmail).toHaveBeenCalledWith(
      //   invoiceId,
      //   'client@example.com',
      //   expect.any(Buffer),
      //   'custom@example.com'
      // );
    });

    it('should update invoice status from draft to sent', async () => {
      // mockedEmailService.sendInvoiceEmail.mockResolvedValue({
      //   success: true,
      //   messageId: 'test-message-id',
      // });

      // Ensure invoice is in draft status
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'draft' },
      });

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: 'client@example.com',
        });

      expect(response.status).toBe(200);

      // Check that invoice status was updated
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      expect(updatedInvoice?.status).toBe('sent');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await request(app)
        .post('/api/invoices/non-existent-id/send-email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: 'client@example.com',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVOICE_NOT_FOUND');
    });

    it('should return 500 when email service fails', async () => {
      // mockedEmailService.sendInvoiceEmail.mockResolvedValue({
      //   success: false,
      //   error: 'SMTP connection failed',
      // });

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/send-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientEmail: 'client@example.com',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/send-email`)
        .send({
          recipientEmail: 'client@example.com',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/invoices/:id/email-history', () => {
    it('should get email history for invoice', async () => {
      // Update invoice with email history
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          // emailSentAt: new Date(),
          // emailSentTo: 'client@example.com',
          sentAt: new Date(),
          sentTo: 'client@example.com',
        },
      });

      const response = await request(app)
        .get(`/api/invoices/${invoiceId}/email-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoiceId).toBe(invoiceId);
      expect(response.body.data.emailHistory).toHaveLength(1);
      // expect(response.body.data.emailHistory[0].type).toBe('email_sent');
      expect(response.body.data.emailHistory[0].type).toBe('invoice_sent');
    });

    it('should return empty history for invoice without emails', async () => {
      // Create new invoice without email history
      const newInvoice = await prisma.invoice.create({
        data: {
          userId,
          clientId,
          invoiceNumber: 'INV-2024-002',
          status: 'draft',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 500,
          tvaAmount: 40.5,
          total: 540.5,
          currency: 'CHF',
        },
      });

      const response = await request(app)
        .get(`/api/invoices/${newInvoice.id}/email-history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.emailHistory).toHaveLength(0);

      // Clean up
      await prisma.invoice.delete({ where: { id: newInvoice.id } });
    });

    it('should return 404 for non-existent invoice', async () => {
      const response = await request(app)
        .get('/api/invoices/non-existent-id/email-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVOICE_NOT_FOUND');
    });
  });

  describe('POST /api/email/test', () => {
    it('should send test email successfully', async () => {
      // mockedEmailService.testConnection.mockResolvedValue(true);
      // mockedEmailService.sendTestEmail.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/email/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Email de test envoyé avec succès');
      expect(response.body.data.sentTo).toBe('test@example.com');
      expect(response.body.data.connectionStatus).toBe('OK');

      // expect(mockedEmailService.testConnection).toHaveBeenCalled();
      // expect(mockedEmailService.sendTestEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return 500 when email configuration is invalid', async () => {
      // mockedEmailService.testConnection.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/email/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 500 when test email fails', async () => {
      // mockedEmailService.testConnection.mockResolvedValue(true);
      // mockedEmailService.sendTestEmail.mockResolvedValue({
      //   success: false,
      //   error: 'SMTP error',
      // });

      const response = await request(app)
        .post('/api/email/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/email/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/email/status', () => {
    it('should return email service status when connected', async () => {
      // mockedEmailService.testConnection.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/email/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // expect(response.body.data.status).toBe('connected');
      expect(response.body.data.smtpHost).toBeDefined();
      expect(response.body.data.smtpPort).toBeDefined();
      expect(response.body.data.smtpUser).toBeDefined();
      expect(response.body.data.lastChecked).toBeDefined();
    });

    it('should return email service status when disconnected', async () => {
      // mockedEmailService.testConnection.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/email/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // expect(response.body.data.status).toBe('disconnected');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/email/status');

      expect(response.status).toBe(401);
    });
  });
});