import { PrismaClient } from '@prisma/client';
import Handlebars from 'handlebars';
import { queueUserEmail, UserEmailJobData } from './userEmailQueue';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

/**
 * User Email Service
 * Handles sending emails using user's personal SMTP configuration
 */
export class UserEmailService {
  /**
   * Send invoice email to client
   */
  static async sendInvoiceEmail(
    userId: string,
    data: {
      clientEmail: string;
      clientName: string;
      invoiceNumber: string;
      invoiceId: string;
      amount: string;
      currency: string;
      dueDate: string;
      issueDate: string;
      items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
      pdfBuffer?: Buffer;
      includeQRBill?: boolean;
    },
    useQueue: boolean = true
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userSmtpConfig: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.userSmtpConfig) {
      throw new Error('User SMTP configuration not set. Please configure SMTP settings first.');
    }

    // Generate items table HTML
    const itemsTableHTML = data.items
      .map(
        item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unitPrice.toFixed(2)} ${data.currency}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${item.total.toFixed(2)} ${data.currency}</td>
        </tr>
      `
      )
      .join('');

    const subject = `Facture #${data.invoiceNumber} - Paiement de ${data.amount} ${data.currency}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .invoice-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    .total-row { background: #f9fafb; font-weight: bold; font-size: 18px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .qr-notice { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .swiss-compliance { font-size: 11px; color: #6b7280; margin-top: 15px; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Facture #${data.invoiceNumber}</h1>
      <p>Document envoyé par ${user.companyName}</p>
    </div>
    <div class="content">
      <h2>Bonjour ${data.clientName},</h2>
      <p>Nous vous prions de trouver ci-joint votre facture pour les prestations fournies.</p>
      
      <div class="invoice-details">
        <h3 style="margin-top: 0;">Détails de la facture</h3>
        <p><strong>Numéro :</strong> ${data.invoiceNumber}</p>
        <p><strong>Date d'émission :</strong> ${data.issueDate}</p>
        <p><strong>Date d'échéance :</strong> ${data.dueDate}</p>
        <p><strong>Montant total :</strong> ${data.amount} ${data.currency}</p>
      </div>

      <h3>Articles / Prestations :</h3>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Quantité</th>
            <th style="text-align: right;">Prix unitaire</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableHTML}
          <tr class="total-row">
            <td colspan="3" style="padding: 12px; text-align: right;">Total TTC :</td>
            <td style="padding: 12px; text-align: right;">${data.amount} ${data.currency}</td>
          </tr>
        </tbody>
      </table>

      ${
        data.includeQRBill
          ? `
      <div class="qr-notice">
        <strong>🔷 QR-Bill Suisse inclus</strong><br>
        Un code QR pour le paiement simplifié est inclus dans le PDF joint. Scannez-le avec votre application bancaire pour effectuer le paiement rapidement et sans erreur.
      </div>
      `
          : ''
      }

      <p>Veuillez effectuer le paiement avant le <strong>${data.dueDate}</strong>.</p>
      <p>Pour toute question concernant cette facture, n'hésitez pas à nous contacter.</p>

      <p style="margin-top: 30px;">Cordialement,<br><strong>${user.companyName}</strong></p>

      ${user.phone ? `<p style="font-size: 14px; color: #6b7280;">📞 ${user.phone}</p>` : ''}
      ${user.email ? `<p style="font-size: 14px; color: #6b7280;">✉️ ${user.email}</p>` : ''}
      ${user.website ? `<p style="font-size: 14px; color: #6b7280;">🌐 ${user.website}</p>` : ''}
    </div>
    <div class="footer">
      <p>${user.companyName}</p>
      <p>${user.street}, ${user.postalCode} ${user.city}, ${user.country}</p>
      ${user.vatNumber ? `<p>TVA: ${user.vatNumber}</p>` : ''}
      
      <div class="swiss-compliance">
        📋 Cette facture est conforme aux normes suisses (ORQR) et aux exigences de l'AFC.<br>
        Conservez ce document pour votre comptabilité et vos déclarations TVA.
      </div>
      
      <p style="margin-top: 15px;">
        <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(data.clientEmail)}" style="color: #6b7280; text-decoration: underline;">Se désabonner des notifications</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Facture #${data.invoiceNumber}

Bonjour ${data.clientName},

Nous vous prions de trouver ci-joint votre facture pour les prestations fournies.

Détails de la facture:
- Numéro: ${data.invoiceNumber}
- Date d'émission: ${data.issueDate}
- Date d'échéance: ${data.dueDate}
- Montant total: ${data.amount} ${data.currency}

Articles / Prestations:
${data.items.map(item => `- ${item.description}: ${item.quantity} x ${item.unitPrice} ${data.currency} = ${item.total} ${data.currency}`).join('\n')}

Total TTC: ${data.amount} ${data.currency}

Veuillez effectuer le paiement avant le ${data.dueDate}.

Cordialement,
${user.companyName}

${user.street}, ${user.postalCode} ${user.city}, ${user.country}
${user.vatNumber ? `TVA: ${user.vatNumber}` : ''}

---
Cette facture est conforme aux normes suisses (ORQR).
Se désabonner: ${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(data.clientEmail)}
    `;

    const attachments = data.pdfBuffer
      ? [
          {
            filename: `Facture_${data.invoiceNumber}.pdf`,
            content: data.pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [];

    const emailData: UserEmailJobData = {
      userId,
      to: data.clientEmail,
      subject,
      html,
      text,
      templateType: 'invoice',
      invoiceId: data.invoiceId,
      documentNumber: data.invoiceNumber,
      attachments,
      includesQRBill: data.includeQRBill,
      metadata: {
        clientName: data.clientName,
        amount: data.amount,
        currency: data.currency,
      },
    };

    if (useQueue) {
      const jobId = await queueUserEmail(userId, emailData);
      return { queued: true, jobId };
    }

    // Direct send (for testing or immediate sending)
    return this.sendDirectEmail(userId, emailData);
  }

  /**
   * Send quote (devis) email to client
   */
  static async sendQuoteEmail(
    userId: string,
    data: {
      clientEmail: string;
      clientName: string;
      quoteNumber: string;
      quoteId: string;
      total: string;
      currency: string;
      validUntil: string;
      issueDate: string;
      items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
      acceptLink?: string;
      pdfBuffer?: Buffer;
    },
    useQueue: boolean = true
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userSmtpConfig: true },
    });

    if (!user || !user.userSmtpConfig) {
      throw new Error('User or SMTP configuration not found');
    }

    const itemsTableHTML = data.items
      .map(
        item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unitPrice.toFixed(2)} ${data.currency}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${item.total.toFixed(2)} ${data.currency}</td>
        </tr>
      `
      )
      .join('');

    const subject = `Devis #${data.quoteNumber} - ${user.companyName} pour ${data.clientName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .quote-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    .total-row { background: #f9fafb; font-weight: bold; font-size: 18px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .validity { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Devis #${data.quoteNumber}</h1>
      <p>Proposition commerciale de ${user.companyName}</p>
    </div>
    <div class="content">
      <h2>Bonjour ${data.clientName},</h2>
      <p>Nous sommes ravis de vous présenter notre devis personnalisé pour les prestations discutées.</p>
      
      <div class="quote-details">
        <h3 style="margin-top: 0;">Informations du devis</h3>
        <p><strong>Numéro :</strong> ${data.quoteNumber}</p>
        <p><strong>Date d'émission :</strong> ${data.issueDate}</p>
        <p><strong>Valide jusqu'au :</strong> ${data.validUntil}</p>
        <p><strong>Montant total :</strong> ${data.total} ${data.currency}</p>
      </div>

      <h3>Prestations proposées :</h3>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center;">Quantité</th>
            <th style="text-align: right;">Prix unitaire</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableHTML}
          <tr class="total-row">
            <td colspan="3" style="padding: 12px; text-align: right;">Total TTC :</td>
            <td style="padding: 12px; text-align: right;">${data.total} ${data.currency}</td>
          </tr>
        </tbody>
      </table>

      <div class="validity">
        <strong>⏰ Validité du devis</strong><br>
        Ce devis est valable jusqu'au <strong>${data.validUntil}</strong>. Au-delà de cette date, les prix et disponibilités peuvent être sujets à modification.
      </div>

      ${
        data.acceptLink
          ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.acceptLink}" class="button">✅ Accepter ce devis</a>
      </div>
      `
          : ''
      }

      <p>Nous restons à votre disposition pour toute question ou ajustement de cette proposition.</p>

      <p style="margin-top: 30px;">Cordialement,<br><strong>${user.companyName}</strong></p>

      ${user.phone ? `<p style="font-size: 14px; color: #6b7280;">📞 ${user.phone}</p>` : ''}
      ${user.email ? `<p style="font-size: 14px; color: #6b7280;">✉️ ${user.email}</p>` : ''}
    </div>
    <div class="footer">
      <p>${user.companyName}</p>
      <p>${user.street}, ${user.postalCode} ${user.city}, ${user.country}</p>
      ${user.vatNumber ? `<p>TVA: ${user.vatNumber}</p>` : ''}
      
      <p style="margin-top: 15px;">
        <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(data.clientEmail)}" style="color: #6b7280; text-decoration: underline;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Devis #${data.quoteNumber}

Bonjour ${data.clientName},

Nous sommes ravis de vous présenter notre devis personnalisé.

Informations du devis:
- Numéro: ${data.quoteNumber}
- Date d'émission: ${data.issueDate}
- Valide jusqu'au: ${data.validUntil}
- Montant total: ${data.total} ${data.currency}

Prestations proposées:
${data.items.map(item => `- ${item.description}: ${item.quantity} x ${item.unitPrice} ${data.currency} = ${item.total} ${data.currency}`).join('\n')}

Total TTC: ${data.total} ${data.currency}

${data.acceptLink ? `Accepter le devis: ${data.acceptLink}` : ''}

Cordialement,
${user.companyName}
    `;

    const attachments = data.pdfBuffer
      ? [
          {
            filename: `Devis_${data.quoteNumber}.pdf`,
            content: data.pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [];

    const emailData: UserEmailJobData = {
      userId,
      to: data.clientEmail,
      subject,
      html,
      text,
      templateType: 'quote',
      quoteId: data.quoteId,
      documentNumber: data.quoteNumber,
      attachments,
      metadata: {
        clientName: data.clientName,
        total: data.total,
        currency: data.currency,
      },
    };

    if (useQueue) {
      const jobId = await queueUserEmail(userId, emailData);
      return { queued: true, jobId };
    }

    return this.sendDirectEmail(userId, emailData);
  }

  /**
   * Send payment reminder email
   */
  static async sendPaymentReminderEmail(
    userId: string,
    data: {
      clientEmail: string;
      clientName: string;
      invoiceNumber: string;
      invoiceId: string;
      amount: string;
      currency: string;
      dueDate: string;
      daysPastDue: number;
      pdfBuffer?: Buffer;
    },
    useQueue: boolean = true
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userSmtpConfig: true },
    });

    if (!user || !user.userSmtpConfig) {
      throw new Error('User or SMTP configuration not found');
    }

    const subject = `Rappel: Facture #${data.invoiceNumber} en attente de paiement`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .reminder-box { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Rappel de Paiement</h1>
      <p>Facture #${data.invoiceNumber}</p>
    </div>
    <div class="content">
      <h2>Cher(e) ${data.clientName},</h2>
      <p>Nous vous contactons concernant le paiement de la facture #${data.invoiceNumber}.</p>
      
      <div class="reminder-box">
        <h3 style="color: #dc2626; margin-top: 0;">⏰ Paiement en retard</h3>
        <p><strong>Montant dû :</strong> ${data.amount} ${data.currency}</p>
        <p><strong>Date d'échéance :</strong> ${data.dueDate}</p>
        <p><strong>Retard :</strong> ${data.daysPastDue} jour(s)</p>
      </div>

      <p>Nous vous prions de bien vouloir effectuer le paiement dans les plus brefs délais.</p>
      
      <p>Si le paiement a déjà été effectué, veuillez ignorer ce message. Dans le cas contraire, veuillez nous contacter si vous rencontrez des difficultés.</p>

      <p>Vous trouverez la facture complète en pièce jointe de cet email, incluant le QR-Bill pour faciliter le paiement.</p>

      <p style="margin-top: 30px;">Cordialement,<br><strong>${user.companyName}</strong></p>

      ${user.phone ? `<p style="font-size: 14px; color: #6b7280;">📞 ${user.phone}</p>` : ''}
      ${user.email ? `<p style="font-size: 14px; color: #6b7280;">✉️ ${user.email}</p>` : ''}
    </div>
    <div class="footer">
      <p>${user.companyName}</p>
      <p>${user.street}, ${user.postalCode} ${user.city}, ${user.country}</p>
      
      <p style="margin-top: 15px;">
        <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(data.clientEmail)}" style="color: #6b7280; text-decoration: underline;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Rappel de Paiement - Facture #${data.invoiceNumber}

Cher(e) ${data.clientName},

Nous vous contactons concernant le paiement de la facture #${data.invoiceNumber}.

Détails:
- Montant dû: ${data.amount} ${data.currency}
- Date d'échéance: ${data.dueDate}
- Retard: ${data.daysPastDue} jour(s)

Nous vous prions de bien vouloir effectuer le paiement dans les plus brefs délais.

Si le paiement a déjà été effectué, veuillez ignorer ce message.

Cordialement,
${user.companyName}
    `;

    const attachments = data.pdfBuffer
      ? [
          {
            filename: `Rappel_Facture_${data.invoiceNumber}.pdf`,
            content: data.pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [];

    const emailData: UserEmailJobData = {
      userId,
      to: data.clientEmail,
      subject,
      html,
      text,
      templateType: 'payment_reminder',
      invoiceId: data.invoiceId,
      documentNumber: data.invoiceNumber,
      attachments,
      metadata: {
        clientName: data.clientName,
        amount: data.amount,
        daysPastDue: data.daysPastDue,
      },
    };

    if (useQueue) {
      const jobId = await queueUserEmail(userId, emailData);
      return { queued: true, jobId };
    }

    return this.sendDirectEmail(userId, emailData);
  }

  /**
   * Send direct email without queue (for testing)
   */
  private static async sendDirectEmail(userId: string, emailData: UserEmailJobData) {
    const userSmtpConfig = await prisma.userSmtpConfig.findUnique({
      where: { userId },
    });

    if (!userSmtpConfig) {
      throw new Error('User SMTP configuration not found');
    }

    const config = {
      host: userSmtpConfig.host,
      port: userSmtpConfig.port,
      secure: userSmtpConfig.secure,
      auth: {
        user: userSmtpConfig.smtpUser,
        pass: decrypt(userSmtpConfig.password),
      },
    };

    const transporter = nodemailer.createTransport(config);

    const mailOptions: any = {
      from: `${userSmtpConfig.fromName} <${userSmtpConfig.fromEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: userSmtpConfig.replyTo,
    };

    if (emailData.attachments && emailData.attachments.length > 0) {
      mailOptions.attachments = emailData.attachments;
    }

    const result = await transporter.sendMail(mailOptions);

    // Log the email
    await prisma.userSmtpLog.create({
      data: {
        userId,
        emailTo: emailData.to,
        emailFrom: userSmtpConfig.fromEmail,
        subject: emailData.subject,
        templateType: emailData.templateType,
        invoiceId: emailData.invoiceId,
        quoteId: emailData.quoteId,
        documentNumber: emailData.documentNumber,
        hasAttachment: !!emailData.attachments && emailData.attachments.length > 0,
        status: 'sent',
        provider: userSmtpConfig.provider,
        messageId: result.messageId,
        sentAt: new Date(),
        smtpConfigId: userSmtpConfig.id,
        includesQRBill: emailData.includesQRBill || false,
        metadata: emailData.metadata || {},
      },
    });

    return { success: true, messageId: result.messageId };
  }

  /**
   * Send test email
   */
  static async sendTestEmail(userId: string, testEmail: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userSmtpConfig: true },
    });

    if (!user || !user.userSmtpConfig) {
      throw new Error('User or SMTP configuration not found');
    }

    return this.sendInvoiceEmail(
      userId,
      {
        clientEmail: testEmail,
        clientName: 'Client Test',
        invoiceNumber: 'TEST-001',
        invoiceId: 'test',
        amount: '1500.00',
        currency: 'CHF',
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString('fr-CH'),
        issueDate: new Date().toLocaleDateString('fr-CH'),
        items: [
          {
            description: 'Service de consultation',
            quantity: 1,
            unitPrice: 1500.0,
            total: 1500.0,
          },
        ],
        includeQRBill: true,
      },
      false // Don't queue, send immediately
    );
  }
}

