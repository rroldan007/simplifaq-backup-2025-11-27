import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

// Use PostgreSQL adapter for BullMQ instead of Redis
const connection = {
  host: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'localhost',
  port: process.env.DATABASE_URL ? parseInt(new URL(process.env.DATABASE_URL).port) || 5432 : 5432,
  database: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : 'simplifaq_prod',
  user: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).username : 'simplifaq_user',
  password: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : '',
};

/**
 * Email job data interface
 */
interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateName?: string;
  userId?: string;
  invoiceId?: string;
  eventType?: string;
  metadata?: Record<string, any>;
}

/**
 * Email Queue - BullMQ queue for async email sending
 * Provides retry logic with exponential backoff
 */
export const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Max retry attempts
    backoff: {
      type: 'exponential',
      delay: 5000, // Initial delay: 5 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days for debugging
    },
  },
});

/**
 * Email Worker - Processes email jobs from the queue
 */
export const emailWorker = new Worker(
  'emails',
  async (job: Job<EmailJobData>) => {
    const { to, subject, html, text, templateName, userId, invoiceId, eventType, metadata } = job.data;

    // Create SMTP log entry
    const smtpLog = await prisma.smtpLog.create({
      data: {
        emailTo: to,
        emailFrom: '',
        subject,
        templateName,
        status: 'queued',
        provider: 'smtp',
        userId,
        invoiceId,
        eventType,
        metadata: metadata || {},
        queuedAt: new Date(),
      },
    });

    try {
      // Get active SMTP configuration from database
      const smtpConfig = await prisma.smtpConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      // Fallback to environment variables if no DB config
      const config = smtpConfig
        ? {
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
              user: smtpConfig.user,
              pass: decrypt(smtpConfig.password), // Decrypt stored password
            },
          }
        : {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          };

      const fromEmail = smtpConfig?.fromEmail || process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || 'contact@simplifaq.ch';
      const fromName = smtpConfig?.fromName || 'SimpliFaq';

      // Create transporter
      const transporter = nodemailer.createTransport(config);

      // Send email
      const result = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
        text: text || '', // Fallback to empty string if no text version
        replyTo: smtpConfig?.replyTo || undefined,
      });

      // Update log with success
      await prisma.smtpLog.update({
        where: { id: smtpLog.id },
        data: {
          status: 'sent',
          messageId: (result as any)?.messageId,
          sentAt: new Date(),
          emailFrom: fromEmail,
          provider: smtpConfig?.provider || 'smtp',
          smtpConfigId: smtpConfig?.id,
        },
      });

      console.log(`Email sent successfully: ${(result as any)?.messageId} to ${to}`);
      return { success: true, messageId: (result as any)?.messageId };
    } catch (error: any) {
      // Update log with failure
      await prisma.smtpLog.update({
        where: { id: smtpLog.id },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
          errorCode: error.code || 'UNKNOWN',
          retryCount: job.attemptsMade,
        },
      });

      console.error(`Email send failed to ${to}:`, error);
      throw error; // Re-throw to trigger retry
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 emails concurrently
  }
);

/**
 * Add an email to the queue
 * @param data - Email job data
 * @returns Job ID
 */
export async function queueEmail(data: EmailJobData): Promise<string> {
  const job = await emailQueue.add('send-email', data, {
    priority: data.eventType === 'password_reset' ? 1 : 10, // Higher priority for password resets
  });
  return job.id || '';
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const waiting = await emailQueue.getWaitingCount();
  const active = await emailQueue.getActiveCount();
  const completed = await emailQueue.getCompletedCount();
  const failed = await emailQueue.getFailedCount();

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

/**
 * Clear completed jobs from queue
 */
export async function clearCompletedJobs() {
  await emailQueue.clean(24 * 3600 * 1000, 1000, 'completed');
}

/**
 * Clear failed jobs from queue
 */
export async function clearFailedJobs() {
  await emailQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailWorker.close();
  await emailQueue.close();
});

export default {
  queue: emailQueue,
  worker: emailWorker,
  queueEmail,
  getQueueStats,
  clearCompletedJobs,
  clearFailedJobs,
};
