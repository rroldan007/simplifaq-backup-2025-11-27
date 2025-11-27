/**
 * 🇨🇭 SimpliFaq - Tenant Context Middleware
 * 
 * Middleware for implementing multi-tenancy and data isolation
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../types';
import { securityLogger } from './security';



const prisma = new PrismaClient();

/**
 * Tenant Context Middleware
 * Adds tenant context to requests based on authenticated user
 */
export const tenantContext = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    // Skip tenant context for non-authenticated routes or if user is not on the request
    if (!req.user) {
      return next();
    }

    // Get user details to establish tenant context
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        companyName: true,
        subscriptionPlan: true,
        isActive: true,
        email: true,
      },
    });

    if (!user) {
      securityLogger.warn('Tenant context: User not found', {
        userId: req.user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!user.isActive) {
      securityLogger.warn('Tenant context: Inactive user access attempt', {
        userId: req.user.id,
        userEmail: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Compte inactif',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Set tenant context
    req.tenantId = user.id;
    req.tenantContext = {
      userId: user.id,
      companyName: user.companyName,
      subscriptionPlan: user.subscriptionPlan,
      isActive: user.isActive,
    };

    // Log tenant access for audit
    securityLogger.info('Tenant context established', {
      tenantId: req.tenantId,
      userId: req.user.id,
      companyName: user.companyName,
      subscriptionPlan: user.subscriptionPlan,
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    return next();

  } catch (error) {
    securityLogger.error('Tenant context middleware error', {
      userId: req.user ? req.user.id : 'N/A',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_ERROR',
        message: 'Erreur de contexte tenant',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Tenant Isolation Middleware
 * Ensures data access is restricted to the current tenant
 */
export const tenantIsolation = (req: Request, res: Response, next: NextFunction): Response | void => {
  // Skip for admin routes
  if (req.path.startsWith('/api/admin/')) {
    return next();
  }

  // Ensure tenant context exists
  if (!req.tenantId || !req.tenantContext) {
    securityLogger.warn('Tenant isolation: Missing tenant context', {
      userId: req.user ? req.user.id : 'N/A',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'MISSING_TENANT_CONTEXT',
        message: 'Contexte tenant manquant',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  return next();
};

/**
 * Cross-Tenant Access Prevention
 * Validates that resource access is within tenant boundaries
 */
export const validateTenantAccess = async (
  resourceType: 'client' | 'invoice' | 'product' | 'payment',
  resourceId: string,
  tenantId: string
): Promise<boolean> => {
  try {
    let resource;

    switch (resourceType) {
      case 'client':
        resource = await prisma.client.findFirst({
          where: { id: resourceId, userId: tenantId },
          select: { id: true },
        });
        break;

      case 'invoice':
        resource = await prisma.invoice.findFirst({
          where: { id: resourceId, userId: tenantId },
          select: { id: true },
        });
        break;

      case 'product':
        resource = await prisma.product.findFirst({
          where: { id: resourceId, userId: tenantId },
          select: { id: true },
        });
        break;

      case 'payment':
        resource = await prisma.payment.findFirst({
          where: { 
            id: resourceId,
            invoice: { userId: tenantId }
          },
          select: { id: true },
        });
        break;

      default:
        return false;
    }

    return !!resource;

  } catch (error) {
    securityLogger.error('Tenant access validation error', {
      resourceType,
      resourceId,
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    return false;
  }
};

/**
 * Tenant-specific configuration middleware
 * Adds tenant-specific settings to request context
 */
export const tenantConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenantId) {
      return next();
    }

    // Get tenant-specific configuration
    const tenantConfig = await prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: `tenant_${req.tenantId}_`
        },
        isActive: true,
      },
    });

    // Add tenant config to request
    req.tenantConfig = tenantConfig.reduce((config, item) => {
      const key = item.key.replace(`tenant_${req.tenantId}_`, '');
      config[key] = item.value;
      return config;
    }, {} as Record<string, any>);

    next();

  } catch (error) {
    securityLogger.error('Tenant configuration middleware error', {
      tenantId: req.tenantId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    next(); // Continue without tenant config
  }
};

/**
 * Tenant backup and restore utilities
 */
export class TenantDataManager {
  /**
   * Create a backup of all tenant data
   */
  static async createTenantBackup(tenantId: string): Promise<{
    clients: any[];
    invoices: any[];
    products: any[];
    payments: any[];
    metadata: {
      tenantId: string;
      backupDate: string;
      recordCounts: Record<string, number>;
    };
  }> {
    try {
      const [clients, invoices, products, payments] = await Promise.all([
        prisma.client.findMany({
          where: { userId: tenantId },
          include: { invoices: true },
        }),
        prisma.invoice.findMany({
          where: { userId: tenantId },
          include: { items: true, payments: true },
        }),
        prisma.product.findMany({
          where: { userId: tenantId },
        }),
        prisma.payment.findMany({
          where: { invoice: { userId: tenantId } },
        }),
      ]);

      const backup = {
        clients,
        invoices,
        products,
        payments,
        metadata: {
          tenantId,
          backupDate: new Date().toISOString(),
          recordCounts: {
            clients: clients.length,
            invoices: invoices.length,
            products: products.length,
            payments: payments.length,
          },
        },
      };

      securityLogger.info('Tenant backup created', {
        tenantId,
        recordCounts: backup.metadata.recordCounts,
        timestamp: new Date().toISOString()
      });

      return backup;

    } catch (error) {
      securityLogger.error('Tenant backup creation error', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Delete all tenant data (for GDPR compliance)
   */
  static async deleteTenantData(tenantId: string): Promise<{
    deletedCounts: Record<string, number>;
  }> {
    try {
      // Delete in correct order to respect foreign key constraints
      const deletedPayments = await prisma.payment.deleteMany({
        where: { invoice: { userId: tenantId } },
      });

      const deletedInvoiceItems = await prisma.invoiceItem.deleteMany({
        where: { invoice: { userId: tenantId } },
      });

      const deletedInvoices = await prisma.invoice.deleteMany({
        where: { userId: tenantId },
      });

      const deletedClients = await prisma.client.deleteMany({
        where: { userId: tenantId },
      });

      const deletedProducts = await prisma.product.deleteMany({
        where: { userId: tenantId },
      });

      const deletedSessions = await prisma.session.deleteMany({
        where: { userId: tenantId },
      });

      const result = {
        deletedCounts: {
          payments: deletedPayments.count,
          invoiceItems: deletedInvoiceItems.count,
          invoices: deletedInvoices.count,
          clients: deletedClients.count,
          products: deletedProducts.count,
          sessions: deletedSessions.count,
        },
      };

      securityLogger.info('Tenant data deleted', {
        tenantId,
        deletedCounts: result.deletedCounts,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      securityLogger.error('Tenant data deletion error', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}
