/**
 * 🇨🇭 SimpliFaq - Tenant Service
 * 
 * Service for managing tenant-specific operations and data isolation
 */

import { PrismaClient } from '@prisma/client';
import { securityLogger } from '../middleware/security';

const prisma = new PrismaClient();

export interface TenantAnalytics {
  tenantId: string;
  companyName: string;
  subscriptionPlan: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  
  // Usage statistics
  usage: {
    invoicesThisMonth: number;
    clientsTotal: number;
    productsTotal: number;
    storageUsed: number;
  };
  
  // Financial data
  financial: {
    totalRevenue: number;
    invoicesPaid: number;
    invoicesOverdue: number;
    averageInvoiceValue: number;
  };
}

export interface TenantConfiguration {
  tenantId: string;
  settings: Record<string, any>;
  customization: {
    branding?: {
      [key: string]: any;
      logo?: string;
      colors?: Record<string, string>;
      companyInfo?: Record<string, string>;
    };
    features?: {
      enabledFeatures: string[];
      disabledFeatures: string[];
    };
    limits?: {
      customLimits?: Record<string, number>;
    };
  };
}

export class TenantService {
  /**
   * Get comprehensive tenant analytics
   */
  static async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    try {
      // Get user/tenant basic info
      const user = await prisma.user.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          companyName: true,
          subscriptionPlan: true,
          isActive: true,
          createdAt: true,
          sessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      });

      if (!user) {
        throw new Error('Tenant not found');
      }

      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get usage statistics
      const [
        invoicesThisMonth,
        clientsTotal,
        productsTotal,
        invoicesPaid,
        invoicesOverdue,
        revenueData
      ] = await Promise.all([
        // Invoices this month
        prisma.invoice.count({
          where: {
            userId: tenantId,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
        
        // Total clients
        prisma.client.count({
          where: { userId: tenantId, isActive: true },
        }),
        
        // Total products
        prisma.product.count({
          where: { userId: tenantId, isActive: true },
        }),
        
        // Paid invoices
        prisma.invoice.count({
          where: { userId: tenantId, status: 'paid' },
        }),
        
        // Overdue invoices
        prisma.invoice.count({
          where: {
            userId: tenantId,
            status: 'sent',
            dueDate: { lt: now },
          },
        }),
        
        // Revenue data
        prisma.invoice.aggregate({
          where: { userId: tenantId, status: 'paid' },
          _sum: { total: true },
          _avg: { total: true },
        }),
      ]);

      const analytics: TenantAnalytics = {
        tenantId: user.id,
        companyName: user.companyName,
        subscriptionPlan: user.subscriptionPlan,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.sessions[0]?.createdAt ? new Date(user.sessions[0].createdAt).toISOString() : undefined,
        
        usage: {
          invoicesThisMonth,
          clientsTotal,
          productsTotal,
          storageUsed: 0, // TODO: Calculate actual storage usage
        },
        
        financial: {
          totalRevenue: Number(revenueData._sum.total || 0),
          invoicesPaid,
          invoicesOverdue,
          averageInvoiceValue: Number(revenueData._avg.total || 0),
        },
      };

      securityLogger.info('Tenant analytics retrieved', {
        tenantId,
        companyName: user.companyName,
        timestamp: new Date().toISOString()
      });

      return analytics;

    } catch (error) {
      securityLogger.error('Tenant analytics error', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Get tenant-specific configuration
   */
  static async getTenantConfiguration(tenantId: string): Promise<TenantConfiguration> {
    try {
      // Get tenant-specific system configurations
      const configs = await prisma.systemConfig.findMany({
        where: {
          OR: [
            { key: { startsWith: `tenant_${tenantId}_` } },
            { key: { startsWith: 'global_' } },
          ],
          isActive: true,
        },
      });

      const settings: Record<string, any> = {};
      const customization: TenantConfiguration['customization'] = {};

      configs.forEach(config => {
        if (config.key.startsWith(`tenant_${tenantId}_`)) {
          const key = config.key.replace(`tenant_${tenantId}_`, '');
          
          if (key.startsWith('branding_')) {
            if (!customization.branding) customization.branding = {};
            const bKey = key.replace('branding_', '');
            // Store dynamic branding values as strings to satisfy typing
            (customization.branding as Record<string, any>)[bKey] = typeof config.value === 'string'
              ? config.value
              : config.value != null
              ? String(config.value)
              : '';
          } else if (key.startsWith('feature_')) {
            if (!customization.features) customization.features = { enabledFeatures: [], disabledFeatures: [] };
            const featureName = key.replace('feature_', '');
            if (config.value) {
              customization.features.enabledFeatures.push(featureName);
            } else {
              customization.features.disabledFeatures.push(featureName);
            }
          } else if (key.startsWith('limit_')) {
            if (!customization.limits) customization.limits = { customLimits: {} };
            if (!customization.limits.customLimits) customization.limits.customLimits = {};
            const lKey = key.replace('limit_', '');
            // Ensure numeric assignment
            customization.limits.customLimits[lKey] = typeof config.value === 'number'
              ? config.value
              : Number(config.value ?? 0);
          } else {
            settings[key] = config.value;
          }
        } else if (config.key.startsWith('global_')) {
          const key = config.key.replace('global_', '');
          settings[key] = config.value;
        }
      });

      return {
        tenantId,
        settings,
        customization,
      };

    } catch (error) {
      securityLogger.error('Tenant configuration error', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Update tenant-specific configuration
   */
  static async updateTenantConfiguration(
    tenantId: string,
    updates: Partial<TenantConfiguration['customization']>
  ): Promise<void> {
    try {
      const configUpdates: Array<{ key: string; value: any; description?: string }> = [];

      // Process branding updates
      if (updates.branding) {
        Object.entries(updates.branding).forEach(([key, value]) => {
          configUpdates.push({
            key: `tenant_${tenantId}_branding_${key}`,
            value,
            description: `Tenant branding: ${key}`,
          });
        });
      }

      // Process feature updates
      if (updates.features) {
        if (updates.features.enabledFeatures) {
          updates.features.enabledFeatures.forEach(feature => {
            configUpdates.push({
              key: `tenant_${tenantId}_feature_${feature}`,
              value: true,
              description: `Tenant feature: ${feature} enabled`,
            });
          });
        }
        
        if (updates.features.disabledFeatures) {
          updates.features.disabledFeatures.forEach(feature => {
            configUpdates.push({
              key: `tenant_${tenantId}_feature_${feature}`,
              value: false,
              description: `Tenant feature: ${feature} disabled`,
            });
          });
        }
      }

      // Process limit updates
      if (updates.limits?.customLimits) {
        Object.entries(updates.limits.customLimits).forEach(([key, value]) => {
          configUpdates.push({
            key: `tenant_${tenantId}_limit_${key}`,
            value,
            description: `Tenant limit: ${key}`,
          });
        });
      }

      // Apply updates
      for (const update of configUpdates) {
        await prisma.systemConfig.upsert({
          where: { key: update.key },
          update: {
            value: update.value,
            description: update.description,
            updatedAt: new Date(),
          },
          create: {
            key: update.key,
            value: update.value,
            description: update.description,
            isActive: true,
          },
        });
      }

      securityLogger.info('Tenant configuration updated', {
        tenantId,
        updatesCount: configUpdates.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      securityLogger.error('Tenant configuration update error', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Validate tenant resource access
   */
  static async validateResourceAccess(
    tenantId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      let hasAccess = false;

      switch (resourceType) {
        case 'client':
          const client = await prisma.client.findFirst({
            where: { id: resourceId, userId: tenantId },
            select: { id: true },
          });
          hasAccess = !!client;
          break;

        case 'invoice':
          const invoice = await prisma.invoice.findFirst({
            where: { id: resourceId, userId: tenantId },
            select: { id: true },
          });
          hasAccess = !!invoice;
          break;

        case 'product':
          const product = await prisma.product.findFirst({
            where: { id: resourceId, userId: tenantId },
            select: { id: true },
          });
          hasAccess = !!product;
          break;

        case 'payment':
          const payment = await prisma.payment.findFirst({
            where: { 
              id: resourceId,
              invoice: { userId: tenantId }
            },
            select: { id: true },
          });
          hasAccess = !!payment;
          break;

        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        securityLogger.warn('Unauthorized tenant resource access attempt', {
          tenantId,
          resourceType,
          resourceId,
          timestamp: new Date().toISOString()
        });
      }

      return hasAccess;

    } catch (error) {
      securityLogger.error('Tenant resource access validation error', {
        tenantId,
        resourceType,
        resourceId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Get tenant usage statistics for plan limit enforcement
   */
  static async getTenantUsage(tenantId: string): Promise<{
    invoicesThisMonth: number;
    clientsTotal: number;
    productsTotal: number;
    storageUsed: number;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [invoicesThisMonth, clientsTotal, productsTotal] = await Promise.all([
        prisma.invoice.count({
          where: {
            userId: tenantId,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
        
        prisma.client.count({
          where: { userId: tenantId, isActive: true },
        }),
        
        prisma.product.count({
          where: { userId: tenantId, isActive: true },
        }),
      ]);

      return {
        invoicesThisMonth,
        clientsTotal,
        productsTotal,
        storageUsed: 0, // TODO: Calculate actual storage usage
      };

    } catch (error) {
      securityLogger.error('Tenant usage statistics error', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Check if tenant has exceeded plan limits
   */
  static async checkPlanLimits(tenantId: string): Promise<{
    withinLimits: boolean;
    violations: Array<{
      resource: string;
      current: number;
      limit: number;
      percentage: number;
    }>;
  }> {
    try {
      // Get user's subscription plan
      const user = await prisma.user.findUnique({
        where: { id: tenantId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      if (!user?.subscription?.plan) {
        throw new Error('No subscription plan found');
      }

      const plan = user.subscription.plan;
      const usage = await this.getTenantUsage(tenantId);

      const violations: Array<{
        resource: string;
        current: number;
        limit: number;
        percentage: number;
      }> = [];

      // Check invoice limit
      if (usage.invoicesThisMonth > plan.maxInvoicesPerMonth) {
        violations.push({
          resource: 'invoices',
          current: usage.invoicesThisMonth,
          limit: plan.maxInvoicesPerMonth,
          percentage: Math.round((usage.invoicesThisMonth / plan.maxInvoicesPerMonth) * 100),
        });
      }

      // Check client limit
      if (usage.clientsTotal > plan.maxClientsTotal) {
        violations.push({
          resource: 'clients',
          current: usage.clientsTotal,
          limit: plan.maxClientsTotal,
          percentage: Math.round((usage.clientsTotal / plan.maxClientsTotal) * 100),
        });
      }

      // Check product limit
      if (usage.productsTotal > plan.maxProductsTotal) {
        violations.push({
          resource: 'products',
          current: usage.productsTotal,
          limit: plan.maxProductsTotal,
          percentage: Math.round((usage.productsTotal / plan.maxProductsTotal) * 100),
        });
      }

      // Check storage limit
      if (usage.storageUsed > plan.storageLimit) {
        violations.push({
          resource: 'storage',
          current: usage.storageUsed,
          limit: plan.storageLimit,
          percentage: Math.round((usage.storageUsed / plan.storageLimit) * 100),
        });
      }

      const withinLimits = violations.length === 0;

      if (!withinLimits) {
        securityLogger.warn('Tenant plan limits exceeded', {
          tenantId,
          companyName: user.companyName,
          planName: plan.name,
          violations,
          timestamp: new Date().toISOString()
        });
      }

      return {
        withinLimits,
        violations,
      };

    } catch (error) {
      securityLogger.error('Plan limits check error', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}