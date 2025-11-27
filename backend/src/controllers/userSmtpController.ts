import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { encrypt, decrypt } from '../utils/encryption';
import { UserEmailService } from '../services/userEmailService';
import { getUserQueueStats, getUserEmailStats } from '../services/userEmailQueue';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

/**
 * Validation schemas
 */
const smtpConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
  fromEmail: z.string().email('Valid email required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional().nullable(),
  provider: z.enum(['smtp', 'sendgrid', 'ses', 'mailgun']).default('smtp'),
  apiKey: z.string().optional().nullable(),
  enableAutoSend: z.boolean().optional().default(false),
  includeFooter: z.boolean().optional().default(true),
  sendCopyToSender: z.boolean().optional().default(false),
});

const testEmailSchema = z.object({
  testEmail: z.string().email('Valid email required for testing'),
});

/**
 * SMTP Configuration presets for common providers
 */
const SMTP_PRESETS = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    provider: 'smtp',
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    provider: 'smtp',
  },
  office365: {
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    provider: 'smtp',
  },
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    provider: 'sendgrid',
  },
  mailgun: {
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    provider: 'mailgun',
  },
};

/**
 * Get user's SMTP configuration
 */
// @ts-ignore: TS7030
export async function getUserSmtpConfig(req: Request, res: Response): Promise<any> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const smtpConfig = await prisma.userSmtpConfig.findUnique({
      where: { userId },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        smtpUser: true,
        // Password excluded for security
        fromEmail: true,
        fromName: true,
        replyTo: true,
        provider: true,
        isActive: true,
        isVerified: true,
        lastTestedAt: true,
        enableAutoSend: true,
        includeFooter: true,
        dailyLimit: true,
        emailsSentToday: true,
        lastResetAt: true,
        requires2FA: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!smtpConfig) {
      // Return 200 with presets even if no config exists
      return res.status(200).json({ 
        success: true,
        data: {
          config: null,
          message: 'No SMTP configuration found. Please configure your SMTP settings.',
          presets: SMTP_PRESETS,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Map smtpUser to user for frontend compatibility
    const response = {
      ...smtpConfig,
      user: smtpConfig.smtpUser,
    };
    delete (response as any).smtpUser;

    res.json({ 
      success: true,
      data: {
        config: response,
        presets: SMTP_PRESETS,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching user SMTP config:', error);
    return res.status(500).json({ error: 'Failed to fetch SMTP configuration' });
  }
}

/**
 * Create or update user's SMTP configuration
 */
// @ts-ignore: TS7030
export async function updateUserSmtpConfig(req: Request, res: Response): Promise<any> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if config already exists to determine if password is optional
    const existingConfig = await prisma.userSmtpConfig.findUnique({
      where: { userId },
    });

    // Make password optional for updates
    const updateSchema = existingConfig 
      ? smtpConfigSchema.extend({
          password: z.string().optional(), // Password is optional for updates
        })
      : smtpConfigSchema;

    // Validate request body
    const validationResult = updateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const data = validationResult.data;

    // Get user's subscription plan to determine daily limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine daily limit based on plan
    let dailyLimit = 100; // Free plan default
    
    // TODO: Adjust based on actual plan structure
    if (user.subscriptionPlan === 'basic') {
      dailyLimit = 500;
    } else if (user.subscriptionPlan === 'premium') {
      dailyLimit = 2000;
    } else if (user.subscriptionPlan === 'enterprise') {
      dailyLimit = 10000;
    }

    // Encrypt password only if provided, otherwise keep existing
    const encryptedPassword = data.password ? encrypt(data.password) : undefined;
    const encryptedApiKey = data.apiKey ? encrypt(data.apiKey) : null;

    let smtpConfig;

    if (existingConfig) {
      // Update existing configuration
      smtpConfig = await prisma.userSmtpConfig.update({
        where: { userId },
        data: {
          host: data.host,
          port: data.port,
          secure: data.secure,
          smtpUser: data.user,
          // Only update password if provided
          ...(encryptedPassword ? { password: encryptedPassword } : {}),
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          replyTo: data.replyTo,
          provider: data.provider,
          apiKey: encryptedApiKey,
          enableAutoSend: data.enableAutoSend,
          includeFooter: data.includeFooter,
          sendCopyToSender: data.sendCopyToSender,
          dailyLimit,
          isVerified: false, // Reset verification when config changes
          lastTestedAt: null,
        },
        select: {
          id: true,
          host: true,
          port: true,
          secure: true,
          smtpUser: true,
          fromEmail: true,
          fromName: true,
          replyTo: true,
          provider: true,
          isActive: true,
          isVerified: true,
          enableAutoSend: true,
          includeFooter: true,
          sendCopyToSender: true,
          dailyLimit: true,
          updatedAt: true,
        },
      });
    } else {
      // Create new configuration - password is required
      if (!data.password) {
        return res.status(400).json({
          error: 'Password is required for new SMTP configuration',
        });
      }
      
      smtpConfig = await prisma.userSmtpConfig.create({
        data: {
          userId,
          host: data.host,
          port: data.port,
          secure: data.secure,
          smtpUser: data.user,
          password: encrypt(data.password),
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          replyTo: data.replyTo,
          provider: data.provider,
          apiKey: encryptedApiKey,
          enableAutoSend: data.enableAutoSend,
          includeFooter: data.includeFooter,
          sendCopyToSender: data.sendCopyToSender,
          dailyLimit,
          isVerified: false,
        },
        select: {
          id: true,
          host: true,
          port: true,
          secure: true,
          smtpUser: true,
          fromEmail: true,
          fromName: true,
          replyTo: true,
          provider: true,
          isActive: true,
          isVerified: true,
          enableAutoSend: true,
          includeFooter: true,
          sendCopyToSender: true,
          dailyLimit: true,
          createdAt: true,
        },
      });
    }

    // Map smtpUser to user for frontend compatibility
    const response = {
      ...smtpConfig,
      user: smtpConfig.smtpUser,
    };
    delete (response as any).smtpUser;

    res.json({
      success: true,
      data: {
        message: existingConfig ? 'SMTP configuration updated successfully' : 'SMTP configuration created successfully',
        config: response,
        notice: 'Please test your configuration to verify it works correctly',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating user SMTP config:', error);
    return res.status(500).json({ error: 'Failed to update SMTP configuration' });
  }
}

/**
 * Test user's SMTP configuration
 */
// @ts-ignore: TS7030
export async function testUserSmtpConfig(req: Request, res: Response): Promise<any> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate test email
    const validationResult = testEmailSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.issues,
      });
    }

    const { testEmail } = validationResult.data;

    // Get user's SMTP configuration
    const smtpConfig = await prisma.userSmtpConfig.findUnique({
      where: { userId },
    });

    if (!smtpConfig) {
      return res.status(404).json({ error: 'SMTP configuration not found' });
    }

    // Decrypt password
    const decryptedPassword = decrypt(smtpConfig.password);
    
    // Debug: Log connection details (mask password)
    console.log('[SMTP_TEST] Connection config:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.smtpUser,
      passwordLength: decryptedPassword.length,
      passwordPreview: decryptedPassword.substring(0, 3) + '***',
    });
    
    // Test connection
    const config = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: decryptedPassword,
      },
    };

    const transporter = nodemailer.createTransport(config);

    // Verify connection
    await transporter.verify();

    // Send test email using UserEmailService
    const result = await UserEmailService.sendTestEmail(userId, testEmail);

    // Update configuration as verified
    await prisma.userSmtpConfig.update({
      where: { id: smtpConfig.id },
      data: {
        isVerified: true,
        lastTestedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        message: `Test email sent successfully to ${testEmail}`,
        details: {
          messageId: 'messageId' in result ? result.messageId : undefined,
          jobId: 'jobId' in result ? result.jobId : undefined,
          from: `${smtpConfig.fromName} <${smtpConfig.fromEmail}>`,
          provider: smtpConfig.provider,
          verified: true,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('SMTP test failed:', error);
    
    // Update verification status
    const userId = (req as any).userId;
    if (userId) {
      await prisma.userSmtpConfig.update({
        where: { userId },
        data: {
          isVerified: false,
          lastTestedAt: new Date(),
        },
      }).catch(() => {}); // Ignore errors in this update
    }

    return res.status(500).json({
      success: false,
      error: 'SMTP test failed',
      message: error.message || 'Failed to send test email',
      details: {
        code: error.code,
        command: error.command,
        response: error.response,
      },
    });
  }
}

/**
 * Get user's email statistics
 */
// @ts-ignore: TS7030
export async function getUserSmtpStats(req: Request, res: Response): Promise<any> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const days = parseInt(req.query.days as string) || 30;

    // Get statistics from queue and database
    // Gracefully handle Redis/queue unavailability
    let queueStats: any = null;
    try {
      queueStats = await Promise.race([
        getUserQueueStats(userId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Queue stats timeout')), 2000)
        )
      ]);
    } catch (queueError) {
      console.warn(`Queue stats unavailable for user ${userId}:`, queueError);
      // Continue without queue stats - Redis may not be available
    }

    // Get email stats and config with error handling
    let emailStats: any = null;
    let recentLogs: any[] = [];
    
    try {
      emailStats = await getUserEmailStats(userId, days);
    } catch (statsError) {
      console.warn(`Email stats unavailable for user ${userId}:`, statsError);
      // Provide default stats if DB query fails
      emailStats = {
        totalSent: 0,
        totalFailed: 0,
        totalQueued: 0,
        successRate: 0,
        byTemplate: {},
        period: `last_${days}_days`,
      } as any;
    }

    const smtpConfig = await prisma.userSmtpConfig.findUnique({
      where: { userId },
      select: {
        dailyLimit: true,
        emailsSentToday: true,
        lastResetAt: true,
        isVerified: true,
      },
    });

    // Get recent logs with error handling
    try {
      recentLogs = await prisma.userSmtpLog.findMany({
        where: { userId },
        orderBy: { queuedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          emailTo: true,
          subject: true,
          templateType: true,
          status: true,
          documentNumber: true,
          queuedAt: true,
          sentAt: true,
          errorMessage: true,
        },
      });
    } catch (logsError) {
      console.warn(`Logs unavailable for user ${userId}:`, logsError);
      // Continue with empty logs
    }

    res.json({
      success: true,
      data: {
        queue: queueStats,
        email: emailStats,
        config: smtpConfig,
        recentLogs,
        period: `last_${days}_days`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching user SMTP stats:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

/**
 * Get user's email logs
 */
// @ts-ignore: TS7030
export async function getUserSmtpLogs(req: Request, res: Response): Promise<any> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const templateType = req.query.templateType as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.userSmtpLog.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          emailTo: true,
          emailFrom: true,
          subject: true,
          templateType: true,
          documentNumber: true,
          status: true,
          provider: true,
          messageId: true,
          errorMessage: true,
          queuedAt: true,
          sentAt: true,
          deliveredAt: true,
          usedFallback: true,
          includesQRBill: true,
        },
      }),
      prisma.userSmtpLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching user SMTP logs:', error);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
}

/**
 * Delete user's SMTP configuration
 */
// @ts-ignore: TS7030
export async function deleteUserSmtpConfig(req: Request, res: Response): Promise<any> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.userSmtpConfig.delete({
      where: { userId },
    });

    return res.json({
      success: true,
      data: {
        message: 'SMTP configuration deleted successfully',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error deleting user SMTP config:', error);
    return res.status(500).json({ error: 'Failed to delete SMTP configuration' });
  }
}

/**
 * Get SMTP presets
 */
export async function getSmtpPresets(req: Request, res: Response): Promise<any> {
  return res.json({ 
    success: true,
    data: { 
      presets: SMTP_PRESETS 
    },
    timestamp: new Date().toISOString(),
  });
}
