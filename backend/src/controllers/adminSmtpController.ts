import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { encrypt, decrypt } from '../utils/encryption';
import { EmailService } from '../services/emailService';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

/**
 * Validation schema for SMTP configuration
 */
// Helper to clean email fields that might have markdown-style links
const cleanEmailField = (val: any): string | undefined => {
  if (typeof val !== 'string') return val;
  
  // Remove markdown-style links: email[domain.com](cci:4://file://...) -> email@domain.com
  const cleaned = val.replace(/([a-zA-Z0-9._+-]+)\[([a-zA-Z0-9.-]+)\]\([^)]+\)/g, '$1@$2');
  
  return cleaned.trim() || undefined;
};

const smtpConfigSchema = z.object({
  host: z.string().min(3, 'Le serveur SMTP est requis').max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.preprocess(cleanEmailField, z.string().min(1, 'L\'utilisateur SMTP est requis').max(255)),
  password: z.string().min(1, 'Le mot de passe est requis'),
  fromEmail: z.preprocess(cleanEmailField, z.string().email('Email expéditeur invalide')),
  fromName: z.string().min(1).max(255),
  replyTo: z.preprocess(
    (val) => {
      const cleaned = cleanEmailField(val);
      return !cleaned || cleaned.trim() === '' ? undefined : cleaned;
    },
    z.string().email().optional()
  ),
  provider: z.enum(['smtp', 'sendgrid', 'ses', 'mailgun']).default('smtp'),
  apiKey: z.string().optional().nullable(),
  includeUnsubscribe: z.boolean().default(true),
  trackOpens: z.boolean().default(false),
  trackClicks: z.boolean().default(false),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().min(0).max(3600).default(300),
});

/**
 * GET /api/admin/smtp-config
 * Get current SMTP configuration
 */
export const getSmtpConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    // Get active SMTP configuration
    const config = await prisma.smtpConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        user: true,
        password: true, // We'll check if it exists, but won't return the value
        fromEmail: true,
        fromName: true,
        replyTo: true,
        provider: true,
        isActive: true,
        isVerified: true,
        lastTestedAt: true,
        lastTestedBy: true,
        includeUnsubscribe: true,
        trackOpens: true,
        trackClicks: true,
        maxRetries: true,
        retryDelay: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // If no config, return defaults (from env vars)
    if (!config) {
      res.json({
        success: true,
        data: {
          config: {
            host: process.env.SMTP_HOST || '',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER || '',
            fromEmail: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
            fromName: 'SimpliFaq',
            provider: 'smtp',
            isActive: false,
            isVerified: false,
            source: 'environment',
          },
        },
      });
      return;
    }

    // Don't send real password, send placeholder
    const { password, ...configWithoutPassword } = config;
    
    res.json({
      success: true,
      data: {
        config: {
          ...configWithoutPassword,
          password: password ? '••••••••' : '', // Placeholder if password exists
          hasPassword: !!password,
          source: 'database',
        },
      },
    });
  } catch (error: any) {
    console.error('Get SMTP config error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
};

/**
 * POST /api/admin/smtp-config
 * Create or update SMTP configuration
 */
export const createOrUpdateSmtpConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    // Validate request body
    const validatedData = smtpConfigSchema.parse(req.body);

    // Check if password is placeholder (meaning user didn't change it)
    const isPasswordPlaceholder = validatedData.password === '••••••••';
    
    let encryptedPassword: string;
    if (isPasswordPlaceholder) {
      // Get existing password from current active config
      const existingConfig = await prisma.smtpConfig.findFirst({
        where: { isActive: true },
        select: { password: true },
      });
      
      if (!existingConfig?.password) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'PASSWORD_REQUIRED', 
            message: 'Le mot de passe est requis pour la première configuration' 
          },
        });
        return;
      }
      
      encryptedPassword = existingConfig.password; // Reuse existing encrypted password
    } else {
      // Encrypt new password
      encryptedPassword = encrypt(validatedData.password);
    }
    
    const encryptedApiKey = validatedData.apiKey ? encrypt(validatedData.apiKey) : null;

    // Deactivate existing configs
    await prisma.smtpConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new config
    const config = await prisma.smtpConfig.create({
      data: {
        host: validatedData.host,
        port: validatedData.port,
        secure: validatedData.secure,
        user: validatedData.user,
        password: encryptedPassword,
        fromEmail: validatedData.fromEmail,
        fromName: validatedData.fromName,
        replyTo: validatedData.replyTo || null,
        provider: validatedData.provider,
        apiKey: encryptedApiKey,
        isActive: true,
        isVerified: false, // Will be set to true after test
        includeUnsubscribe: validatedData.includeUnsubscribe,
        trackOpens: validatedData.trackOpens,
        trackClicks: validatedData.trackClicks,
        maxRetries: validatedData.maxRetries,
        retryDelay: validatedData.retryDelay,
        createdBy: adminId,
      },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        user: true,
        fromEmail: true,
        fromName: true,
        replyTo: true,
        provider: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        config,
        message: 'Configuration SMTP enregistrée avec succès',
      },
    });
  } catch (error: any) {
    console.error('Create/Update SMTP config error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: error.issues,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
};

/**
 * POST /api/admin/smtp-config/test
 * Test SMTP connection and send test email
 */
export const testSmtpConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    const { testEmail, configId } = req.body;

    if (!testEmail || !z.string().email().safeParse(testEmail).success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email de test invalide' },
      });
      return;
    }

    // Check if there's an active SMTP configuration
    const activeConfig = await prisma.smtpConfig.findFirst({
      where: { isActive: true },
    });

    if (!activeConfig) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_CONFIG',
          message: 'Aucune configuration SMTP active. Veuillez d\'abord enregistrer votre configuration.',
        },
      });
      return;
    }

    // Test connection first
    let connectionTest;
    try {
      connectionTest = await EmailService.testEmailConfiguration(configId || activeConfig.id);
    } catch (testError: any) {
      console.error('Email configuration test failed:', testError);
      
      // Handle authentication errors
      if (testError.code === 'EAUTH' || testError.message?.includes('Username and Password') || testError.message?.includes('Invalid login')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'AUTH_FAILED',
            message: 'Échec d\'authentification SMTP. Vérifiez les identifiants (email et mot de passe).',
            details: testError.message,
          },
        });
        return;
      }
      
      // Handle connection errors
      if (testError.code === 'ECONNREFUSED' || testError.code === 'ETIMEDOUT' || testError.code === 'ENOTFOUND') {
        res.status(400).json({
          success: false,
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Impossible de se connecter au serveur SMTP. Vérifiez l\'hôte et le port.',
            details: testError.message,
          },
        });
        return;
      }
      
      // Generic error
      res.status(400).json({
        success: false,
        error: {
          code: 'TEST_FAILED',
          message: 'Échec du test de configuration SMTP',
          details: testError.message,
        },
      });
      return;
    }
    
    if (!connectionTest) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Échec de la connexion au serveur SMTP. Vérifiez votre configuration.',
        },
      });
      return;
    }

    // Send test email
    const result = await EmailService.sendTestEmail(testEmail, false);

    // Update config with test info
    if (configId) {
      await prisma.smtpConfig.update({
        where: { id: configId },
        data: {
          isVerified: true,
          lastTestedAt: new Date(),
          lastTestedBy: adminId,
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Email de test envoyé avec succès',
        sentTo: testEmail,
        messageId: (result as any)?.messageId || (result as any)?.jobId || 'test',
        connectionStatus: 'OK',
      },
    });
  } catch (error: any) {
    console.error('Test SMTP config error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
        details: error.message,
      },
    });
  }
};

/**
 * DELETE /api/admin/smtp-config/:id
 * Delete SMTP configuration
 */
export const deleteSmtpConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    const { id } = req.params;

    await prisma.smtpConfig.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Configuration SMTP supprimée' },
    });
  } catch (error: any) {
    console.error('Delete SMTP config error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
};

/**
 * GET /api/admin/smtp-logs
 * Get SMTP logs with pagination and filters
 */
export const getSmtpLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    const {
      page = '1',
      limit = '50',
      status,
      eventType,
      emailTo,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (eventType) {
      where.eventType = eventType;
    }
    
    if (emailTo) {
      where.emailTo = { contains: emailTo as string };
    }
    
    if (startDate || endDate) {
      where.queuedAt = {};
      if (startDate) {
        where.queuedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.queuedAt.lte = new Date(endDate as string);
      }
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.smtpLog.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          emailTo: true,
          emailFrom: true,
          subject: true,
          status: true,
          provider: true,
          messageId: true,
          errorMessage: true,
          errorCode: true,
          retryCount: true,
          queuedAt: true,
          sentAt: true,
          deliveredAt: true,
          eventType: true,
          userId: true,
          invoiceId: true,
        },
      }),
      prisma.smtpLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Get SMTP logs error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
};

/**
 * GET /api/admin/smtp-stats
 * Get SMTP statistics
 */
export const getSmtpStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    // Get stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalSent,
      totalFailed,
      totalQueued,
      totalDelivered,
      recentLogs,
    ] = await Promise.all([
      prisma.smtpLog.count({
        where: {
          status: 'SENT',
          queuedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.smtpLog.count({
        where: {
          status: 'failed',
          queuedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.smtpLog.count({
        where: {
          status: 'queued',
          queuedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.smtpLog.count({
        where: {
          status: 'delivered',
          queuedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.smtpLog.findMany({
        take: 10,
        orderBy: { queuedAt: 'desc' },
        select: {
          id: true,
          emailTo: true,
          subject: true,
          status: true,
          queuedAt: true,
          eventType: true,
        },
      }),
    ]);

    const successRate = totalSent > 0 
      ? ((totalSent - totalFailed) / totalSent * 100).toFixed(2)
      : '0';

    res.json({
      success: true,
      data: {
        stats: {
          totalSent,
          totalFailed,
          totalQueued,
          totalDelivered,
          successRate: parseFloat(successRate),
          period: 'last_30_days',
        },
        recentLogs,
      },
    });
  } catch (error: any) {
    console.error('Get SMTP stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
};
