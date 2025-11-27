/**
 * Email Document Service
 * Handles sending invoices, quotes, and other documents via user's SMTP configuration
 */

import nodemailer from 'nodemailer';
import { prisma } from './database';
import { decrypt } from '../utils/encryption';
import { generateInvoicePDF } from '../utils/invoicePDFPdfkit';
import {
  prepareEmail,
  formatCurrency,
  formatDate,
  EmailTemplateVariables,
} from '../utils/emailTemplates';
import { PassThrough } from 'stream';

export interface SendDocumentOptions {
  documentId: string;
  documentType: 'invoice' | 'quote';
  recipientEmail?: string; // Optional override, defaults to client email
  customSubject?: string; // Optional custom subject
  customBody?: string; // Optional custom body
  userId: string;
}

export interface SendDocumentResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: string;
}

/**
 * Send a document (invoice/quote) by email
 */
export async function sendDocumentByEmail(
  options: SendDocumentOptions
): Promise<SendDocumentResult> {
  const { documentId, documentType, recipientEmail, customSubject, customBody, userId } = options;

  try {
    // 1. Get user's SMTP configuration
    const smtpConfig = await prisma.userSmtpConfig.findUnique({
      where: { userId },
    });

    if (!smtpConfig) {
      return {
        success: false,
        error: 'Configuration SMTP non trouvée. Veuillez configurer votre SMTP dans les paramètres.',
      };
    }

    if (!smtpConfig.isActive) {
      return {
        success: false,
        error: 'Configuration SMTP désactivée.',
      };
    }

    // Check daily limit
    if (smtpConfig.emailsSentToday >= smtpConfig.dailyLimit) {
      return {
        success: false,
        error: `Limite quotidienne d'emails atteinte (${smtpConfig.dailyLimit} emails/jour).`,
      };
    }

    // 2. Get document (invoice or quote)
    const document = await prisma.invoice.findFirst({
      where: {
        id: documentId,
        userId,
        isQuote: documentType === 'quote',
      },
      include: {
        client: true,
        items: {
          orderBy: { order: 'asc' },
        },
        user: true,
      },
    });

    if (!document) {
      return {
        success: false,
        error: documentType === 'invoice' ? 'Facture non trouvée.' : 'Devis non trouvé.',
      };
    }

    // 3. Get recipient email
    const toEmail = recipientEmail || document.client.email;
    
    if (!toEmail) {
      return {
        success: false,
        error: 'Adresse email du client non trouvée.',
      };
    }

    // 4. Generate PDF - Always use functional PDFKit system
    console.log('[PDF] Using PDFKit system with modern templates', { template: document.user?.pdfTemplate });
    
    const pdfStream = new PassThrough();
    const chunks: Buffer[] = [];
    
    pdfStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      pdfStream.on('end', () => resolve(Buffer.concat(chunks)));
      pdfStream.on('error', reject);
    });

    // Generate QR Bill data ONLY for invoices (not quotes)
    let qrData = null;
    if (documentType === 'invoice' && document.user?.iban && document.currency === 'CHF') {
      try {
        const { createQRBillFromInvoice } = await import('../controllers/invoiceController');
        qrData = await createQRBillFromInvoice(document as any);
        console.log('[PDF] QR Bill generated for invoice email:', { hasIban: !!document.user.iban, currency: document.currency });
      } catch (error) {
        console.warn('[PDF] Failed to generate QR Bill for email:', error);
      }
    }

    await generateInvoicePDF(
      {
        invoice: document as any,
        client: document.client,
        qrData, // Include QR Bill data
        template: document.user?.pdfTemplate,
        accentColor: (document.user as any)?.pdfPrimaryColor,
        lang: document.language as any,
      },
      pdfStream
    );

    const pdfBuffer = await pdfPromise;

    // 5. Prepare email variables
    const customerName = `${document.client.firstName || ''} ${document.client.lastName || ''}`.trim() || document.client.companyName || 'Client';
    const userCompanyName = document.user.companyName || `${document.user.firstName || ''} ${document.user.lastName || ''}`.trim() || 'Entreprise';
    
    const variables: EmailTemplateVariables = {
      customer_name: customerName,
      document_number: document.invoiceNumber,
      invoice_number: documentType === 'invoice' ? document.invoiceNumber : undefined,
      quote_number: documentType === 'quote' ? document.invoiceNumber : undefined,
      document_amount: formatCurrency(document.total, document.currency),
      invoice_amount: documentType === 'invoice' ? formatCurrency(document.total, document.currency) : undefined,
      quote_amount: documentType === 'quote' ? formatCurrency(document.total, document.currency) : undefined,
      due_date: document.dueDate ? formatDate(document.dueDate) : undefined,
      valid_until: document.validUntil ? formatDate(document.validUntil) : undefined,
      user_company_name: userCompanyName,
      user_email: document.user.email,
      user_phone: document.user.phone || undefined,
      user_website: document.user.website || undefined,
      currency: document.currency,
    };

    // 6. Prepare email content
    const emailContent = customSubject && customBody
      ? { subject: customSubject, body: customBody }
      : prepareEmail(documentType, variables, document.language || 'fr');

    // 7. Setup SMTP transporter
    console.log('[EMAIL] Setting up SMTP transport:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.smtpUser,
      hasPassword: !!smtpConfig.password,
    });

    const decryptedPassword = decrypt(smtpConfig.password);
    console.log('[EMAIL] Password decrypted successfully:', { length: decryptedPassword?.length });

    const transportConfig = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: decryptedPassword,
      },
    };

    const transporter = nodemailer.createTransport(transportConfig);

    // 8. Send email
    const mailOptions = {
      from: `${smtpConfig.fromName} <${smtpConfig.fromEmail}>`,
      to: toEmail,
      replyTo: smtpConfig.replyTo || smtpConfig.fromEmail,
      subject: emailContent.subject,
      text: emailContent.body,
      html: emailContent.body.replace(/\n/g, '<br>'),
      attachments: [
        {
          filename: `${documentType === 'invoice' ? 'Facture' : 'Devis'}_${document.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions) as any;

    // 9. Log the email send
    const log = await prisma.userSmtpLog.create({
      data: {
        userId,
        smtpConfigId: smtpConfig.id,
        emailTo: toEmail,
        emailFrom: smtpConfig.fromEmail,
        subject: emailContent.subject,
        templateType: documentType,
        invoiceId: documentType === 'invoice' ? documentId : undefined,
        quoteId: documentType === 'quote' ? documentId : undefined,
        documentNumber: document.invoiceNumber,
        hasAttachment: true,
        attachmentType: 'pdf',
        attachmentSize: pdfBuffer.length,
        status: 'sent',
        provider: smtpConfig.provider,
        messageId: info.messageId,
        sentAt: new Date(),
        includesQRBill: qrData !== null, // Only true if QR Bill was generated
        includesFooter: smtpConfig.includeFooter,
      },
    });

    // 10. Update email counter
    await prisma.userSmtpConfig.update({
      where: { id: smtpConfig.id },
      data: {
        emailsSentToday: { increment: 1 },
      },
    });

    // 11. Update document sent status
    await prisma.invoice.update({
      where: { id: documentId },
      data: {
        sentAt: new Date(),
        sentTo: toEmail,
        emailSentAt: new Date(),
        emailSentTo: toEmail,
        status: document.status.toLowerCase() === 'draft' ? 'SENT' : document.status,
      },
    });

    return {
      success: true,
      messageId: info.messageId,
      logId: log.id,
    };
  } catch (error: any) {
    console.error('Error sending document email:', error);

    // Log the failure
    try {
      await prisma.userSmtpLog.create({
        data: {
          userId,
          emailTo: recipientEmail || 'unknown',
          emailFrom: 'unknown',
          subject: customSubject || `Document ${documentId}`,
          templateType: documentType,
          invoiceId: documentType === 'invoice' ? documentId : undefined,
          quoteId: documentType === 'quote' ? documentId : undefined,
          status: 'failed',
          errorMessage: error.message,
          errorCode: error.code,
        },
      });
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }

    return {
      success: false,
      error: error.message || 'Erreur lors de l\'envoi de l\'email',
    };
  }
}

/**
 * Preview email content before sending
 */
export async function previewDocumentEmail(
  documentId: string,
  documentType: 'invoice' | 'quote',
  userId: string
): Promise<{ subject: string; body: string; variables: EmailTemplateVariables } | null> {
  try {
    const document = await prisma.invoice.findFirst({
      where: {
        id: documentId,
        userId,
        isQuote: documentType === 'quote',
      },
      include: {
        client: true,
        user: true,
      },
    });

    if (!document) {
      return null;
    }

    const customerName = `${document.client.firstName || ''} ${document.client.lastName || ''}`.trim() || document.client.companyName || 'Client';
    const userCompanyName = document.user.companyName || `${document.user.firstName || ''} ${document.user.lastName || ''}`.trim() || 'Entreprise';
    
    const variables: EmailTemplateVariables = {
      customer_name: customerName,
      document_number: document.invoiceNumber,
      invoice_number: documentType === 'invoice' ? document.invoiceNumber : undefined,
      quote_number: documentType === 'quote' ? document.invoiceNumber : undefined,
      document_amount: formatCurrency(document.total, document.currency),
      invoice_amount: documentType === 'invoice' ? formatCurrency(document.total, document.currency) : undefined,
      quote_amount: documentType === 'quote' ? formatCurrency(document.total, document.currency) : undefined,
      due_date: document.dueDate ? formatDate(document.dueDate) : undefined,
      valid_until: document.validUntil ? formatDate(document.validUntil) : undefined,
      user_company_name: userCompanyName,
      user_email: document.user.email,
      user_phone: document.user.phone || undefined,
      user_website: document.user.website || undefined,
      currency: document.currency,
    };

    const emailContent = prepareEmail(documentType, variables, document.language || 'fr');

    return {
      ...emailContent,
      variables,
    };
  } catch (error) {
    console.error('Error previewing email:', error);
    return null;
  }
}
