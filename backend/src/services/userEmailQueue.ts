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
 * User Email job data interface
 */
export interface UserEmailJobData {
  userId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateType: 'invoice' | 'quote' | 'payment_reminder' | 'delivery_confirmation';
  invoiceId?: string;
  quoteId?: string;
  documentNumber?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  includesQRBill?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Create a user-specific email queue
 * Each user has their own isolated queue: `user-emails-{userId}`
 */
export function getUserEmailQueue(userId: string): Queue<UserEmailJobData> {
  return new Queue(`user-emails-${userId}`, {
    connection,
    defaultJobOptions: {
      attempts: 3, // Max retry attempts
      backoff: {
        type: 'exponential',
        delay: 5000, // Initial delay: 5 seconds
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 100, // Keep max 100 completed jobs per user
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });
}

/**
 * User Email Worker - Processes email jobs from user-specific queues
 * This worker handles emails for ALL users dynamically
 */
export function createUserEmailWorker() {
  // We create a single worker that handles pattern-matched queues
  return new Worker(
    'user-emails-*', // Pattern match for all user queues
    async (job: Job<UserEmailJobData>) => {
      const { userId, to, subject, html, text, templateType, invoiceId, quoteId, documentNumber, attachments, includesQRBill, metadata } = job.data;

      console.log(`Processing email job for user ${userId}, template: ${templateType}`);

      // Create SMTP log entry
      const smtpLog = await prisma.userSmtpLog.create({
        data: {
          userId,
          emailTo: to,
          emailFrom: '',
          subject,
          templateType,
          invoiceId,
          quoteId,
          documentNumber,
          hasAttachment: !!attachments && attachments.length > 0,
          attachmentType: includesQRBill ? 'pdf_with_qr' : attachments ? 'pdf' : undefined,
          status: 'queued',
          provider: 'smtp',
          queuedAt: new Date(),
          includesQRBill: includesQRBill || false,
          metadata: metadata || {},
        },
      });

      try {
        // Check daily rate limit
        const userSmtpConfig = await prisma.userSmtpConfig.findUnique({
          where: { userId },
        });

        if (!userSmtpConfig) {
          throw new Error('User SMTP configuration not found');
        }

        // Check if daily limit exceeded
        if (userSmtpConfig.emailsSentToday >= userSmtpConfig.dailyLimit) {
          // Check if we need to reset the counter
          const now = new Date();
          const lastReset = new Date(userSmtpConfig.lastResetAt);
          const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 3600);

          if (hoursSinceReset >= 24) {
            // Reset counter
            await prisma.userSmtpConfig.update({
              where: { id: userSmtpConfig.id },
              data: {
                emailsSentToday: 0,
                lastResetAt: now,
              },
            });
          } else {
            throw new Error(`Daily email limit reached (${userSmtpConfig.dailyLimit} emails per day)`);
          }
        }

        // Get user's SMTP configuration
        const config = {
          host: userSmtpConfig.host,
          port: userSmtpConfig.port,
          secure: userSmtpConfig.secure,
          auth: {
            user: userSmtpConfig.smtpUser,
            pass: decrypt(userSmtpConfig.password),
          },
        };

        const fromEmail = userSmtpConfig.fromEmail;
        const fromName = userSmtpConfig.fromName;

        // Create transporter with user's SMTP
        const transporter = nodemailer.createTransport(config);

        // Prepare email options
        const mailOptions: any = {
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          html,
          text: text || '',
          replyTo: userSmtpConfig.replyTo,
        };

        // Add BCC copy to sender if enabled
        if (userSmtpConfig.sendCopyToSender) {
          mailOptions.bcc = fromEmail;
        }

        // Add attachments if any
        if (attachments && attachments.length > 0) {
          mailOptions.attachments = attachments;
        }

        // Send email
        const result = await transporter.sendMail(mailOptions);

        // Update log with success
        await prisma.userSmtpLog.update({
          where: { id: smtpLog.id },
          data: {
            status: 'sent',
            messageId: result.messageId,
            sentAt: new Date(),
            emailFrom: fromEmail,
            provider: userSmtpConfig.provider,
            smtpConfigId: userSmtpConfig.id,
          },
        });

        // Increment counter
        await prisma.userSmtpConfig.update({
          where: { id: userSmtpConfig.id },
          data: {
            emailsSentToday: { increment: 1 },
          },
        });

        console.log(`Email sent successfully: ${result.messageId} to ${to} for user ${userId}`);
        return { success: true, messageId: result.messageId };
      } catch (error: any) {
        console.error(`Email send failed to ${to} for user ${userId}:`, error);

        // Try fallback to global SMTP
        let usedFallback = false;
        let fallbackResult = null;

        try {
          console.log(`Attempting fallback to global SMTP for user ${userId}`);

          // Get global SMTP configuration
          const globalSmtpConfig = await prisma.smtpConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          });

          if (globalSmtpConfig) {
            const fallbackConfig = {
              host: globalSmtpConfig.host,
              port: globalSmtpConfig.port,
              secure: globalSmtpConfig.secure,
              auth: {
                user: globalSmtpConfig.user,
                pass: decrypt(globalSmtpConfig.password),
              },
            };

            const fallbackTransporter = nodemailer.createTransport(fallbackConfig);

            const fallbackMailOptions: any = {
              from: `${globalSmtpConfig.fromName} <${globalSmtpConfig.fromEmail}>`,
              to,
              subject,
              html,
              text: text || '',
            };

            if (attachments && attachments.length > 0) {
              fallbackMailOptions.attachments = attachments;
            }

            fallbackResult = await fallbackTransporter.sendMail(fallbackMailOptions);
            usedFallback = true;

            // Update log with fallback success
            await prisma.userSmtpLog.update({
              where: { id: smtpLog.id },
              data: {
                status: 'sent',
                messageId: fallbackResult.messageId,
                sentAt: new Date(),
                emailFrom: globalSmtpConfig.fromEmail,
                provider: 'fallback_global',
                usedFallback: true,
              },
            });

            console.log(`Fallback email sent successfully: ${fallbackResult.messageId}`);
            return { success: true, messageId: fallbackResult.messageId, usedFallback: true };
          }
        } catch (fallbackError: any) {
          console.error(`Fallback also failed:`, fallbackError);
        }

        // Update log with failure
        await prisma.userSmtpLog.update({
          where: { id: smtpLog.id },
          data: {
            status: 'failed',
            errorMessage: error.message || 'Unknown error',
            errorCode: error.code || 'UNKNOWN',
            retryCount: job.attemptsMade,
            usedFallback,
          },
        });

        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection,
      concurrency: 3, // Process up to 3 emails concurrently per worker
    }
  );
}

/**
 * Add an email to user's queue
 */
export async function queueUserEmail(userId: string, data: UserEmailJobData): Promise<string> {
  const queue = getUserEmailQueue(userId);
  const job = await queue.add('send-user-email', data, {
    priority: data.templateType === 'payment_reminder' ? 1 : 10, // Higher priority for payment reminders
  });
  return job.id || '';
}

/**
 * Get queue statistics for a specific user
 */
export async function getUserQueueStats(userId: string) {
  const queue = getUserEmailQueue(userId);

  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const completed = await queue.getCompletedCount();
  const failed = await queue.getFailedCount();

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

/**
 * Get user's email statistics from database logs
 */
export async function getUserEmailStats(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalSent, totalFailed, totalQueued, byTemplate] = await Promise.all([
    prisma.userSmtpLog.count({
      where: {
        userId,
        status: 'sent',
        queuedAt: { gte: startDate },
      },
    }),
    prisma.userSmtpLog.count({
      where: {
        userId,
        status: 'failed',
        queuedAt: { gte: startDate },
      },
    }),
    prisma.userSmtpLog.count({
      where: {
        userId,
        status: 'queued',
        queuedAt: { gte: startDate },
      },
    }),
    prisma.userSmtpLog.groupBy({
      by: ['templateType'],
      where: {
        userId,
        queuedAt: { gte: startDate },
      },
      _count: true,
    }),
  ]);

  const successRate = totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(2) : '0';

  return {
    totalSent,
    totalFailed,
    totalQueued,
    successRate: parseFloat(successRate),
    byTemplate: byTemplate.reduce((acc, item) => {
      acc[item.templateType] = item._count;
      return acc;
    }, {} as Record<string, number>),
    period: `last_${days}_days`,
  };
}

/**
 * Clear completed jobs from user's queue
 */
export async function clearUserCompletedJobs(userId: string) {
  const queue = getUserEmailQueue(userId);
  await queue.clean(24 * 3600 * 1000, 100, 'completed');
}

/**
 * Clear failed jobs from user's queue
 */
export async function clearUserFailedJobs(userId: string) {
  const queue = getUserEmailQueue(userId);
  await queue.clean(7 * 24 * 3600 * 1000, 100, 'failed');
}

// Create and start the worker
export const userEmailWorker = createUserEmailWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await userEmailWorker.close();
});

export default {
  getUserEmailQueue,
  createUserEmailWorker,
  queueUserEmail,
  getUserQueueStats,
  getUserEmailStats,
  clearUserCompletedJobs,
  clearUserFailedJobs,
  userEmailWorker,
};
