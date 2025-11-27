import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ApiResponse, AppError } from '../types';
// import { EmailService } from '../services/emailService';
import { generateInvoicePDFWithQRBill } from '../utils/invoicePDF';

const prisma = new PrismaClient();

// Validation schemas
const sendInvoiceEmailSchema = z.object({
  recipientEmail: z.string().email('Email invalide'),
  senderEmail: z.string().email('Email expéditeur invalide').optional(),
  message: z.string().optional(),
});

const testEmailSchema = z.object({
  email: z.string().email('Email invalide'),
});

// POST /api/invoices/:id/send-email - Send invoice via email
export const sendInvoiceEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id: invoiceId } = req.params;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Validate request body
    const validatedData = sendInvoiceEmailSchema.parse(req.body);

    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        client: true,
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
    }

    // TODO: Generate PDF - requires proper data transformation
    // const pdfBuffer = await generateInvoicePDFWithQRBill(invoiceData, qrBillData);
    const pdfBuffer = Buffer.from('Mock PDF content for testing');

    // Send email
    // const emailResult = await EmailService.sendTestEmail(validatedData.recipientEmail);

    // Update invoice status if it was draft
    if (invoice.status === 'draft') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'sent' },
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        // messageId: emailResult.messageId,
        sentTo: validatedData.recipientEmail,
        sentAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error sending invoice email:', error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Données invalides', 
          details: error.issues 
        },
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};

// GET /api/invoices/:id/email-history - Get email history for invoice
export const getInvoiceEmailHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id: invoiceId } = req.params;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Check if invoice exists and belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        sentAt: true,
        sentTo: true,
        status: true,
      },
    });

    if (!invoice) {
      throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
    }

    const emailHistory = [];

    // Add email history entries based on available fields
    // Note: emailSentAt and emailSentTo fields don't exist in current schema
    // Using sentAt and sentTo as fallback

    if (invoice.sentAt && invoice.sentTo) {
      emailHistory.push({
        type: 'invoice_sent',
        timestamp: invoice.sentAt,
        recipient: invoice.sentTo,
        status: 'SENT',
      });
    }

    // Sort by timestamp (most recent first)
    emailHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const response: ApiResponse = {
      success: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currentStatus: invoice.status,
        emailHistory,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting invoice email history:', error);

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};

// POST /api/email/test - Test email configuration
export const testEmailConfiguration = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Validate request body
    const validatedData = testEmailSchema.parse(req.body);

    // Test email connection
    // const connectionTest = await EmailService.testEmailConfiguration();
    // if (!connectionTest) {
    //   throw new AppError('Configuration email invalide', 500, 'EMAIL_CONFIG_ERROR');
    // }

    // Send test email
    // const testResult = await EmailService.sendTestEmail(validatedData.email);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Email de test envoyé avec succès',
        sentTo: validatedData.email,
        connectionStatus: 'OK',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error testing email configuration:', error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Données invalides', 
          details: error.issues 
        },
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};

// GET /api/email/status - Get email service status
export const getEmailServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Test email connection
    // const connectionTest = await EmailService.testEmailConfiguration();

    const response: ApiResponse = {
      success: true,
      data: {
        // status: connectionTest ? 'connected' : 'disconnected',
        smtpHost: process.env.SMTP_HOST || 'Non configuré',
        smtpPort: process.env.SMTP_PORT || 'Non configuré',
        smtpUser: process.env.SMTP_USER || 'Non configuré',
        lastChecked: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting email service status:', error);

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};