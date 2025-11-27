import { Router, Response } from 'express';
import { z } from 'zod';
import { adminAuth, requirePermission, auditLog, AdminAuthRequest } from '../middleware/adminAuth';
import { adminService } from '../services/adminService';

const router = Router();

/**
 * SMTP Configuration Routes (Admin Only)
 * Base path: /api/admin/smtp
 */

// Apply admin authentication to all routes
router.use(adminAuth);

// Validation schemas
const smtpConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().min(1, 'User is required'),
  password: z.string().optional(),
  fromEmail: z.string().email('Valid email is required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional(),
  provider: z.enum(['smtp', 'sendgrid', 'ses', 'mailgun']),
  includeUnsubscribe: z.boolean(),
  trackOpens: z.boolean(),
  trackClicks: z.boolean(),
  maxRetries: z.number().min(1),
  retryDelay: z.number().min(0),
});

const testEmailSchema = z.object({
  testEmail: z.string().email('Valid test email is required'),
  configId: z.string().optional(),
});

// Get current SMTP configuration
router.get('/config', requirePermission('smtp', 'read'), async (req: AdminAuthRequest, res: Response) => {
  try {
    const config = await adminService.getSmtpConfig();
    
    return res.json({
      success: true,
      data: { config },
    });
  } catch (error) {
    console.error('Get SMTP config error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_SMTP_CONFIG_ERROR',
        message: 'Erreur lors de la récupération de la configuration SMTP',
      },
    });
  }
});

// Create or update SMTP configuration
router.post('/config', 
  requirePermission('smtp', 'write'),
  auditLog('smtp_config_updated', 'smtp'),
  async (req: AdminAuthRequest, res: Response) => {
    try {
      const configData = smtpConfigSchema.parse(req.body);
      
      // Validate config
      const validation = adminService.validateSmtpConfig(configData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Configuration SMTP invalide',
            details: validation.errors,
          },
        });
      }

      const updatedConfig = await adminService.updateSmtpConfig(configData);
      
      return res.json({
        success: true,
        data: updatedConfig,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données invalides',
            details: error.issues,
          },
        });
      }
      
      console.error('Update SMTP config error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_SMTP_CONFIG_ERROR',
          message: 'Erreur lors de la mise à jour de la configuration SMTP',
        },
      });
    }
  }
);

// Test SMTP configuration
router.post('/config/test', 
  requirePermission('smtp', 'test'),
  auditLog('smtp_config_tested', 'smtp'),
  async (req: AdminAuthRequest, res: Response) => {
    try {
      const { testEmail, configId } = testEmailSchema.parse(req.body);
      
      const result = await adminService.testSmtpConfig(testEmail, configId);
      
      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données invalides',
            details: error.issues,
          },
        });
      }
      
      console.error('Test SMTP config error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'TEST_SMTP_CONFIG_ERROR',
          message: 'Erreur lors du test de la configuration SMTP',
        },
      });
    }
  }
);

// Get SMTP statistics
router.get('/stats', requirePermission('smtp', 'read'), async (req: AdminAuthRequest, res: Response) => {
  try {
    const stats = await adminService.getSmtpStats();
    
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get SMTP stats error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'GET_SMTP_STATS_ERROR',
        message: 'Erreur lors de la récupération des statistiques SMTP',
      },
    });
  }
});

export default router;
