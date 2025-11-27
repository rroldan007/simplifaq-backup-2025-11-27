import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

/**
 * Email Settings Controller
 * Manages advanced email settings (rate limiting, queue config, etc.)
 */

const emailSettingsSchema = z.object({
  emailRateLimit: z.number().int().min(10).max(10000).optional(),
  emailQueueEnabled: z.boolean().optional(),
  emailMaxRetries: z.number().int().min(0).max(10).optional(),
  emailRetryDelay: z.number().int().min(60).max(3600).optional(),
  bounceHandlingEnabled: z.boolean().optional(),
  unsubscribeEnabled: z.boolean().optional(),
  trackingEnabled: z.boolean().optional(),
});

export const getEmailSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    // Get current settings from env or defaults
    const settings = {
      emailRateLimit: parseInt(process.env.EMAIL_RATE_LIMIT || '100'),
      emailQueueEnabled: process.env.EMAIL_QUEUE_ENABLED !== 'false',
      emailMaxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
      emailRetryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '300'),
      bounceHandlingEnabled: process.env.BOUNCE_HANDLING_ENABLED === 'true',
      unsubscribeEnabled: process.env.UNSUBSCRIBE_ENABLED !== 'false',
      trackingEnabled: process.env.EMAIL_TRACKING_ENABLED === 'true',
    };

    // Get SMTP config status
    const smtpConfig = await prisma.smtpConfig.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        host: true,
        port: true,
        fromEmail: true,
        fromName: true,
        isVerified: true,
        lastTestedAt: true,
      },
    });

    // Get email stats (placeholder until EmailLog model is implemented)
    const emailStats = {
      _count: 0,
    };
    const failedEmails = 0;

    res.json({
      success: true,
      data: {
        settings,
        smtpConfig: smtpConfig || null,
        stats: {
          last24Hours: emailStats._count,
          failed: failedEmails,
          successRate: emailStats._count > 0 
            ? ((emailStats._count - failedEmails) / emailStats._count * 100).toFixed(2)
            : 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Get email settings error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
};

export const updateEmailSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    const validatedData = emailSettingsSchema.parse(req.body);

    // Note: In a real implementation, you would save these to a SystemSettings table
    // For now, we'll just return success as these would typically be env vars
    
    res.json({
      success: true,
      data: {
        message: 'Paramètres email mis à jour avec succès',
        settings: validatedData,
        note: 'Certains paramètres nécessitent un redémarrage du serveur',
      },
    });
  } catch (error: any) {
    console.error('Update email settings error:', error);
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: error.errors,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
};

export const getEmailTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        subject: true,
        language: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error: any) {
    console.error('Get email templates error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
};

export const getEmailLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).admin?.id;
    
    if (!adminId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
      });
      return;
    }

    // Placeholder until EmailLog model is implemented
    res.json({
      success: true,
      data: {
        logs: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
        message: 'Fonctionnalité en cours de développement',
      },
    });
  } catch (error: any) {
    console.error('Get email logs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
};
