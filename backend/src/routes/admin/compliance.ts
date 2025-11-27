/**
 * 🇨🇭 SimpliFaq - Admin Compliance Routes
 * 
 * API endpoints for GDPR compliance, data retention, and regulatory requirements
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth, requireRole } from '../../middleware/adminAuth';
import { ComplianceService } from '../../services/complianceService';
import { ApiResponse, AppError } from '../../types';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Apply admin authentication and role authorization to all routes
router.use(adminAuth);
router.use(requireRole(['super_admin', 'support_admin']));

// Validation schemas
const dataExportSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  requestType: z.enum(['gdpr_export', 'data_portability', 'account_closure']).optional(),
});

const dataDeletionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().min(1, 'Reason is required'),
  confirmation: z.literal('DELETE_USER_DATA'),
});

const retentionPolicyUpdateSchema = z.object({
  retentionPeriodDays: z.number().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const complianceReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

/**
 * POST /api/admin/compliance/data-export
 * Create GDPR data export request
 */
router.post('/data-export', async (req: Request, res: Response): Promise<Response> => {
  try {
    const validatedData = dataExportSchema.parse(req.body);

    const exportRequest = await ComplianceService.createDataExport(
      validatedData.userId,
      validatedData.requestType
    );

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Demande d\'export de données créée avec succès',
        exportRequest,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Create data export error:', error);

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
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * DELETE /api/admin/compliance/user-data
 * Delete user data (GDPR right to be forgotten)
 */
router.delete('/user-data', async (req: Request, res: Response): Promise<Response> => {
  try {
    const validatedData = dataDeletionSchema.parse(req.body);

    const deletionResult = await ComplianceService.deleteUserData(
      validatedData.userId,
      validatedData.reason
    );

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Données utilisateur supprimées avec succès',
        deletionResult,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Delete user data error:', error);

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
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/compliance/data-retention-policies
 * Get data retention policies
 */
router.get('/data-retention-policies', async (req: Request, res: Response): Promise<Response> => {
  try {
    const policies = ComplianceService.getDataRetentionPolicies();

    const response: ApiResponse = {
      success: true,
      data: {
        policies,
        summary: {
          total: policies.length,
          active: policies.filter(p => p.isActive).length,
          inactive: policies.filter(p => !p.isActive).length,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get data retention policies error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * PUT /api/admin/compliance/data-retention-policies/:id
 * Update data retention policy
 */
router.put('/data-retention-policies/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: policyId } = req.params;
    const validatedData = retentionPolicyUpdateSchema.parse(req.body);

    const success = ComplianceService.updateDataRetentionPolicy(policyId, validatedData);

    if (!success) {
      throw new AppError('Politique de rétention non trouvée', 404, 'POLICY_NOT_FOUND');
    }

    const updatedPolicies = ComplianceService.getDataRetentionPolicies();
    const updatedPolicy = updatedPolicies.find(p => p.id === policyId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Politique de rétention mise à jour avec succès',
        policy: updatedPolicy,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Update data retention policy error:', error);

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
      return res.status(400).json(response);
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      return res.status(error.statusCode).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * POST /api/admin/compliance/apply-retention-policies
 * Manually apply data retention policies
 */
router.post('/apply-retention-policies', async (req: Request, res: Response): Promise<Response> => {
  try {
    const result = await ComplianceService.applyDataRetentionPolicies();

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Politiques de rétention appliquées avec succès',
        result,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Apply retention policies error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * POST /api/admin/compliance/generate-report
 * Generate compliance report
 */
router.post('/generate-report', async (req: Request, res: Response): Promise<Response> => {
  try {
    const validatedData = complianceReportSchema.parse(req.body);

    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (startDate >= endDate) {
      throw new AppError('La date de début doit être antérieure à la date de fin', 400, 'INVALID_DATE_RANGE');
    }

    const report = await ComplianceService.generateComplianceReport(startDate, endDate);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Rapport de conformité généré avec succès',
        report,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Generate compliance report error:', error);

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
      return res.status(400).json(response);
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      return res.status(error.statusCode).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/compliance/violations-scan
 * Scan for compliance violations
 */
router.get('/violations-scan', async (req: Request, res: Response): Promise<Response> => {
  try {
    const scanResult = await ComplianceService.scanComplianceViolations();

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Scan de conformité terminé',
        scanResult,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Compliance violations scan error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/compliance/exports/:id/download
 * Download data export file
 */
router.get('/exports/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: exportId } = req.params;

    // Validate export ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exportId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EXPORT_ID', message: 'ID d\'export invalide' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    const exportsDir = path.join(process.cwd(), 'exports');
    const fileName = `data_export_${exportId}.json`;
    const filePath = path.join(exportsDir, fileName);

    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({
        success: false,
        error: { code: 'EXPORT_NOT_FOUND', message: 'Fichier d\'export non trouvé' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
      return;
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="data_export_${exportId}.json"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    res.send(fileContent);

  } catch (error) {
    console.error('Download export file error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * GET /api/admin/compliance/gdpr-status
 * Get GDPR compliance status overview
 */
router.get('/gdpr-status', async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get current compliance status
    const [policies, violations] = await Promise.all([
      ComplianceService.getDataRetentionPolicies(),
      ComplianceService.scanComplianceViolations(),
    ]);

    const status = {
      overallCompliance: violations.summary.criticalViolations === 0 && violations.summary.highViolations === 0,
      dataRetention: {
        policiesActive: policies.filter(p => p.isActive).length,
        policiesTotal: policies.length,
        lastCleanup: policies[0]?.lastCleanupAt || null,
      },
      violations: violations.summary,
      recommendations: violations.violations
        .filter(v => v.severity === 'critical' || v.severity === 'high')
        .map(v => ({
          type: v.type,
          severity: v.severity,
          action: v.recommendedAction,
        })),
    };

    const response: ApiResponse = {
      success: true,
      data: {
        status,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get GDPR status error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

export default router;