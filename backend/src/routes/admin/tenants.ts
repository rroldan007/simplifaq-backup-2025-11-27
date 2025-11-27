/**
 * 🇨🇭 SimpliFaq - Admin Tenant Management Routes
 * 
 * API endpoints for managing tenants, data isolation, and multi-tenancy
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth, requireRole } from '../../middleware/adminAuth';
import { TenantService } from '../../services/tenantService';
import { TenantDataManager } from '../../middleware/tenantContext';
import { ApiResponse, AppError } from '../../types';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Apply admin authentication and role authorization to all routes
router.use(adminAuth);
router.use(requireRole(['super_admin', 'support_admin']));

// Validation schemas
const tenantConfigUpdateSchema = z.object({
  branding: z.object({
    logo: z.string().optional(),
    colors: z.record(z.string(), z.string()).optional(),
    companyInfo: z.record(z.string(), z.string()).optional(),
  }).optional(),
  features: z.object({
    enabledFeatures: z.array(z.string()).optional(),
    disabledFeatures: z.array(z.string()).optional(),
  }).optional(),
  limits: z.object({
    customLimits: z.record(z.string(), z.number()).optional(),
  }).optional(),
});

/**
 * GET /api/admin/tenants
 * Get list of all tenants with analytics
 */
router.get('/', async (req: Request, res: Response): Promise<Response> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const plan = req.query.plan as string || 'all';
    const status = req.query.status as string || 'all';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (plan !== 'all') {
      where.subscriptionPlan = plan;
    }

    if (status !== 'all') {
      where.isActive = status === 'active';
    }

    // Get tenants with pagination
    const [tenants, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          companyName: true,
          firstName: true,
          lastName: true,
          subscriptionPlan: true,
          isActive: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
              plan: {
                select: {
                  displayName: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Get analytics for each tenant
    const tenantsWithAnalytics = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const analytics = await TenantService.getTenantAnalytics(tenant.id);
          return {
            ...tenant,
            analytics: analytics.usage,
            financial: analytics.financial,
          };
        } catch (error) {
          return {
            ...tenant,
            analytics: null,
            financial: null,
          };
        }
      })
    );

    const response: ApiResponse = {
      success: true,
      data: {
        tenants: tenantsWithAnalytics,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get tenants error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/tenants/:id
 * Get detailed tenant information
 */
router.get('/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: tenantId } = req.params;

    // Get tenant details
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: { plan: true },
        },
        clients: {
          select: { id: true, companyName: true, isActive: true },
        },
        invoices: {
          select: { id: true, invoiceNumber: true, status: true, total: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        products: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (!tenant) {
      throw new AppError('Tenant non trouvé', 404, 'TENANT_NOT_FOUND');
    }

    // Get analytics and configuration
    const [analytics, configuration, planLimits] = await Promise.all([
      TenantService.getTenantAnalytics(tenantId),
      TenantService.getTenantConfiguration(tenantId),
      TenantService.checkPlanLimits(tenantId),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        tenant,
        analytics,
        configuration,
        planLimits,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get tenant details error:', error);

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
 * PUT /api/admin/tenants/:id/configuration
 * Update tenant-specific configuration
 */
router.put('/:id/configuration', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: tenantId } = req.params;
    const validatedData = tenantConfigUpdateSchema.parse(req.body);

    // Verify tenant exists
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      select: { id: true, companyName: true },
    });

    if (!tenant) {
      throw new AppError('Tenant non trouvé', 404, 'TENANT_NOT_FOUND');
    }

    // Normalize features arrays to satisfy service types
    const normalizedData = {
      ...validatedData,
      features: validatedData.features
        ? {
            enabledFeatures: validatedData.features.enabledFeatures ?? [],
            disabledFeatures: validatedData.features.disabledFeatures ?? [],
          }
        : undefined,
    };

    // Update configuration
    await TenantService.updateTenantConfiguration(tenantId, normalizedData);

    // Get updated configuration
    const updatedConfig = await TenantService.getTenantConfiguration(tenantId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Configuration mise à jour avec succès',
        configuration: updatedConfig,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Update tenant configuration error:', error);

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
 * POST /api/admin/tenants/:id/backup
 * Create a backup of tenant data
 */
router.post('/:id/backup', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: tenantId } = req.params;

    // Verify tenant exists
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      select: { id: true, companyName: true },
    });

    if (!tenant) {
      throw new AppError('Tenant non trouvé', 404, 'TENANT_NOT_FOUND');
    }

    // Create backup
    const backup = await TenantDataManager.createTenantBackup(tenantId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Sauvegarde créée avec succès',
        backup: {
          metadata: backup.metadata,
          // Don't send actual data in response for security
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Create tenant backup error:', error);

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
 * DELETE /api/admin/tenants/:id/data
 * Delete all tenant data (GDPR compliance)
 */
router.delete('/:id/data', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: tenantId } = req.params;
    const { confirm } = req.body;

    if (confirm !== 'DELETE_ALL_DATA') {
      throw new AppError('Confirmation requise', 400, 'CONFIRMATION_REQUIRED');
    }

    // Verify tenant exists
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      select: { id: true, companyName: true, email: true },
    });

    if (!tenant) {
      throw new AppError('Tenant non trouvé', 404, 'TENANT_NOT_FOUND');
    }

    // Create backup before deletion
    const backup = await TenantDataManager.createTenantBackup(tenantId);

    // Delete tenant data
    const deletionResult = await TenantDataManager.deleteTenantData(tenantId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Données tenant supprimées avec succès',
        deletionResult,
        backupCreated: backup.metadata,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Delete tenant data error:', error);

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
 * GET /api/admin/tenants/:id/usage
 * Get tenant usage statistics
 */
router.get('/:id/usage', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: tenantId } = req.params;

    // Verify tenant exists
    const tenant = await prisma.user.findUnique({
      where: { id: tenantId },
      select: { id: true, companyName: true },
    });

    if (!tenant) {
      throw new AppError('Tenant non trouvé', 404, 'TENANT_NOT_FOUND');
    }

    // Get usage and plan limits
    const [usage, planLimits] = await Promise.all([
      TenantService.getTenantUsage(tenantId),
      TenantService.checkPlanLimits(tenantId),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        usage,
        planLimits,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get tenant usage error:', error);

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

export default router;