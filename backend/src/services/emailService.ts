import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decrypt } from '../utils/encryption';
// Temporarily disabled email queues - using direct email sending
// import { queueEmail } from './emailQueue';
import Handlebars from 'handlebars';

const prisma = new PrismaClient();

interface EmailData {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  language?: string;
}

interface BillingEmailData {
  userId: string;
  eventType: 'subscription_created' | 'payment_succeeded' | 'payment_failed' | 'subscription_cancelled' | 'usage_limit_warning';
  additionalData?: Record<string, any>;
}

export class EmailService {
  /**
   * Get active SMTP configuration from database or fallback to env vars
   */
  private static async getSmtpConfig() {
    try {
      // Try to get active config from database
      const dbConfig = await prisma.smtpConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (dbConfig) {
        return {
          host: dbConfig.host,
          port: dbConfig.port,
          secure: dbConfig.secure,
          auth: {
            user: dbConfig.user,
            pass: decrypt(dbConfig.password), // Decrypt password
          },
          fromEmail: dbConfig.fromEmail,
          fromName: dbConfig.fromName,
          replyTo: dbConfig.replyTo,
          configId: dbConfig.id,
          provider: dbConfig.provider,
        };
      }
    } catch (error) {
      console.error('Failed to load SMTP config from database:', error);
    }

    // Fallback to environment variables
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || 'contact@simplifaq.ch',
      fromName: 'SimpliFaq',
      replyTo: undefined,
      configId: undefined,
      provider: 'smtp',
    };
  }

  /**
   * Create transporter instance with current config
   */
  private static async createTransporter() {
    const config = await this.getSmtpConfig();
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });
  }

  /**
   * Send email using template (uses queue for async sending)
   * @param data - Email data with template name
   * @param useQueue - Whether to use queue (default: true)
   */
  static async sendTemplateEmail(data: EmailData, useQueue: boolean = true) {
    try {
      const { to, subject, templateName, templateData, language = 'fr' } = data;

      // Get email template
      const template = await prisma.emailTemplate.findFirst({
        where: {
          name: templateName,
          language,
          isActive: true,
        },
      });

      if (!template) {
        throw new Error(`Template ${templateName} not found for language ${language}`);
      }

      // Use Handlebars for template compilation (more powerful than simple replace)
      const htmlTemplate = Handlebars.compile(template.htmlContent);
      const textTemplate = Handlebars.compile(template.textContent || '');
      const subjectTemplate = Handlebars.compile(subject || template.subject);

      const htmlContent = htmlTemplate(templateData);
      const textContent = textTemplate(templateData);
      const emailSubject = subjectTemplate(templateData);

      // If using queue (recommended for production)
      if (useQueue) {
        // Direct email sending instead of queue
        await this.sendEmailDirectly({
          to,
          subject: emailSubject,
          html: htmlContent,
          text: textContent,
          templateName,
          eventType: templateData.eventType,
          userId: templateData.userId,
          invoiceId: templateData.invoiceId,
        });
        console.log(`Email sent directly`);
        return { queued: true, jobId: 'direct-send' };
      }

      // Direct send (for urgent emails or testing)
      const config = await this.getSmtpConfig();
      const transporter = await this.createTransporter();
      
      const result = await transporter.sendMail({
        from: `${config.fromName} <${config.fromEmail}>`,
        to,
        subject: emailSubject,
        html: htmlContent,
        text: textContent,
        replyTo: config.replyTo || undefined,
      });
      
      // Log the email send
      await prisma.smtpLog.create({
        data: {
          emailTo: to,
          emailFrom: `${config.fromName} <${config.fromEmail}>`,
          subject: emailSubject,
          templateName,
          status: 'sent',
          provider: config.provider,
          messageId: (result as any)?.messageId,
          sentAt: new Date(),
          smtpConfigId: config.configId,
        },
      });

      console.log('Email sent successfully:', (result as any)?.messageId);
      return result;
    } catch (error) {
      console.error('Send template email error:', error);
      throw error;
    }
  }

  // Send billing-related emails
  static async sendBillingEmail(data: BillingEmailData) {
    try {
      const { userId, eventType, additionalData = {} } = data;

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const subscription = user.subscription;
      const plan = subscription?.plan;

      // Prepare template data
      const templateData: Record<string, any> = {
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        email: user.email,
        planName: plan?.displayName || 'Plan Gratuit',
        planPrice: plan?.price || 0,
        currency: plan?.currency || 'CHF',
        maxInvoices: plan?.maxInvoicesPerMonth || 0,
        maxClients: plan?.maxClientsTotal || 0,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        ...additionalData,
      };

      let templateName: string;
      let subject: string;

      switch (eventType) {
        case 'subscription_created':
          templateName = 'subscription_created';
          subject = `Votre abonnement ${templateData.planName} est actif`;
          templateData.nextBillingDate = subscription?.currentPeriodEnd.toLocaleDateString('fr-CH') || '';
          break;

        case 'payment_succeeded':
          templateName = 'payment_succeeded';
          subject = 'Paiement confirmé - Merci !';
          templateData.amount = additionalData.amount || 0;
          templateData.invoiceUrl = additionalData.invoiceUrl || '';
          break;

        case 'payment_failed':
          templateName = 'payment_failed';
          subject = 'Échec du paiement - Action requise';
          templateData.amount = additionalData.amount || 0;
          templateData.retryUrl = `${process.env.FRONTEND_URL}/billing`;
          templateData.supportUrl = `${process.env.FRONTEND_URL}/support`;
          break;

        case 'subscription_cancelled':
          templateName = 'subscription_cancelled';
          subject = 'Confirmation d\'annulation d\'abonnement';
          templateData.cancellationDate = additionalData.cancellationDate || new Date().toLocaleDateString('fr-CH');
          templateData.accessEndDate = subscription?.currentPeriodEnd.toLocaleDateString('fr-CH') || '';
          break;

        case 'usage_limit_warning':
          templateName = 'usage_limit_warning';
          subject = 'Limite d\'utilisation bientôt atteinte';
          templateData.resourceType = additionalData.resourceType || '';
          templateData.currentUsage = additionalData.currentUsage || 0;
          templateData.limit = additionalData.limit || 0;
          templateData.upgradeUrl = `${process.env.FRONTEND_URL}/billing/upgrade`;
          break;

        default:
          throw new Error(`Unknown billing event type: ${eventType}`);
      }

      // Send email
      await this.sendTemplateEmail({
        to: user.email,
        subject,
        templateName,
        templateData,
        language: user.language,
      });

      console.log(`Billing email sent: ${eventType} to ${user.email}`);
    } catch (error) {
      console.error('Send billing email error:', error);
      throw error;
    }
  }

  // Send usage limit warning
  static async sendUsageLimitWarning(userId: string, resourceType: string, currentUsage: number, limit: number) {
    try {
      await this.sendBillingEmail({
        userId,
        eventType: 'usage_limit_warning',
        additionalData: {
          resourceType,
          currentUsage,
          limit,
          usagePercentage: Math.round((currentUsage / limit) * 100),
        },
      });
    } catch (error) {
      console.error('Send usage limit warning error:', error);
      throw error;
    }
  }

  // Send subscription welcome email
  static async sendSubscriptionWelcome(userId: string, planId: string) {
    try {
      await this.sendBillingEmail({
        userId,
        eventType: 'subscription_created',
        additionalData: {
          planId,
        },
      });
    } catch (error) {
      console.error('Send subscription welcome error:', error);
      throw error;
    }
  }

  // Send payment confirmation
  static async sendPaymentConfirmation(userId: string, amount: number, currency: string, invoiceUrl?: string) {
    try {
      await this.sendBillingEmail({
        userId,
        eventType: 'payment_succeeded',
        additionalData: {
          amount,
          currency,
          invoiceUrl,
          paymentDate: new Date().toLocaleDateString('fr-CH'),
        },
      });
    } catch (error) {
      console.error('Send payment confirmation error:', error);
      throw error;
    }
  }

  // Send payment failure notification
  static async sendPaymentFailure(userId: string, amount: number, currency: string, reason?: string) {
    try {
      await this.sendBillingEmail({
        userId,
        eventType: 'payment_failed',
        additionalData: {
          amount,
          currency,
          reason: reason || 'Paiement refusé',
          failureDate: new Date().toLocaleDateString('fr-CH'),
        },
      });
    } catch (error) {
      console.error('Send payment failure error:', error);
      throw error;
    }
  }

  // Send cancellation confirmation
  static async sendCancellationConfirmation(userId: string, immediate: boolean = false) {
    try {
      await this.sendBillingEmail({
        userId,
        eventType: 'subscription_cancelled',
        additionalData: {
          immediate,
          cancellationDate: new Date().toLocaleDateString('fr-CH'),
        },
      });
    } catch (error) {
      console.error('Send cancellation confirmation error:', error);
      throw error;
    }
  }

  /**
   * Test email configuration
   * @param smtpConfigId - Optional specific config ID to test
   */
  static async testEmailConfiguration(smtpConfigId?: string) {
    try {
      const transporter = await this.createTransporter();
      const testResult = await transporter.verify();
      
      // Update last tested timestamp if config ID provided
      if (smtpConfigId && testResult) {
        await prisma.smtpConfig.update({
          where: { id: smtpConfigId },
          data: {
            isVerified: true,
            lastTestedAt: new Date(),
          },
        });
      }
      
      console.log('Email configuration test:', testResult ? 'SUCCESS' : 'FAILED');
      return testResult;
    } catch (error: any) {
      console.error('Email configuration test failed:', error);
      // Re-throw the error so the controller can handle it properly
      throw error;
    }
  }

  /**
   * Send test email
   * @param to - Recipient email
   * @param useQueue - Whether to use queue (default: false for immediate feedback)
   */
  static async sendTestEmail(to: string, useQueue: boolean = false) {
    try {
      const config = await this.getSmtpConfig();
      const transporter = await this.createTransporter();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .success { color: #10B981; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Email de Test - SimpliFaq</h1>
            </div>
            <div class="content">
              <h2 class="success">✅ Configuration SMTP Validée</h2>
              <p>Félicitations ! Ceci est un email de test du système SimpliFaq.</p>
              <p>Si vous recevez cet email, votre configuration SMTP fonctionne correctement.</p>
              <hr>
              <p><strong>Détails de la configuration :</strong></p>
              <ul>
                <li>Serveur SMTP : ${config.host}:${config.port}</li>
                <li>Sécurité : ${config.secure ? 'SSL/TLS activé' : 'STARTTLS'}</li>
                <li>Expéditeur : ${config.fromName} &lt;${config.fromEmail}&gt;</li>
                <li>Date du test : ${new Date().toLocaleString('fr-CH')}</li>
              </ul>
            </div>
            <div class="footer">
              <p>SimpliFaq - Plateforme de Facturation Suisse</p>
              <p>Cet email a été envoyé automatiquement pour tester votre configuration SMTP.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Email de Test - SimpliFaq
        
        ✅ Configuration SMTP Validée
        
        Félicitations ! Ceci est un email de test du système SimpliFaq.
        Si vous recevez cet email, votre configuration SMTP fonctionne correctement.
        
        Détails de la configuration :
        - Serveur SMTP : ${config.host}:${config.port}
        - Sécurité : ${config.secure ? 'SSL/TLS activé' : 'STARTTLS'}
        - Expéditeur : ${config.fromName} <${config.fromEmail}>
        - Date du test : ${new Date().toLocaleString('fr-CH')}
        
        SimpliFaq - Plateforme de Facturation Suisse
      `;

      if (useQueue) {
        // Direct email sending instead of queue
        await this.sendEmailDirectly({
          to,
          subject: '✉️ Test Email - Configuration SMTP SimpliFaq',
          html: htmlContent,
          text: textContent,
          eventType: 'test_email',
        });
        return { queued: true, jobId: 'direct-send' };
      }

      const result = await transporter.sendMail({
        from: `${config.fromName} <${config.fromEmail}>`,
        to,
        subject: '✉️ Test Email - Configuration SMTP SimpliFaq',
        html: htmlContent,
        text: textContent,
        replyTo: config.replyTo || undefined,
      });

      // Log the test email
      await prisma.smtpLog.create({
        data: {
          emailTo: to,
          emailFrom: `${config.fromName} <${config.fromEmail}>`,
          subject: 'Test Email - Configuration SMTP SimpliFaq',
          status: 'sent',
          provider: config.provider,
          messageId: (result as any)?.messageId,
          sentAt: new Date(),
          eventType: 'test_email',
          smtpConfigId: config.configId,
        },
      });

      console.log('Test email sent successfully:', (result as any)?.messageId);
      return result;
    } catch (error) {
      console.error('Send test email error:', error);
      throw error;
    }
  }

  /**
   * Send email directly without queue (for development/fallback)
   */
  private static async sendEmailDirectly(data: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    templateName?: string;
    eventType?: string;
    userId?: string;
    invoiceId?: string;
  }) {
    const config = await this.getSmtpConfig();
    const transporter = await this.createTransporter();
    
    const result = await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      replyTo: config.replyTo || undefined,
    });
    
    return result;
  }

  /**
   * Send registration confirmation email
   */
  static async sendRegistrationEmail(userEmail: string, userName: string, confirmationLink: string) {
    return this.sendTemplateEmail({
      to: userEmail,
      subject: 'Confirmez votre inscription - SimpliFaq',
      templateName: 'registration_confirmation',
      templateData: {
        userName,
        confirmationLink,
        eventType: 'registration',
      },
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(userEmail: string, userName: string, resetLink: string) {
    return this.sendTemplateEmail(
      {
        to: userEmail,
        subject: 'Réinitialisation de mot de passe - SimpliFaq',
        templateName: 'password_reset',
        templateData: {
          userName,
          resetLink,
          eventType: 'password_reset',
        },
      },
      false // Don't queue password reset emails (urgent)
    );
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(userEmail: string, userName: string, companyName: string) {
    return this.sendTemplateEmail({
      to: userEmail,
      subject: 'Bienvenue sur SimpliFaq ! 🎉',
      templateName: 'welcome',
      templateData: {
        userName,
        companyName,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
        eventType: 'welcome',
      },
    });
  }
}
