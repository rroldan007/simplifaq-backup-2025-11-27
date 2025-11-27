/**
 * 🇨🇭 SimpliFaq - Admin Service (Backend)
 * 
 * Centralized admin service to eliminate code duplication and hardcodeos
 */

import { PrismaClient } from '@prisma/client';
import { AdminAuthRequest } from '../middleware/adminAuth';

const prisma = new PrismaClient();

interface AdminServiceConfig {
  jwt: {
    secret: string;
    expiresIn: string;
  };
  smtp: {
    defaultConfig: Record<string, any>;
    providers: Record<string, Record<string, any>>;
  };
  features: {
    auditLogging: boolean;
    rateLimiting: boolean;
  };
}

class AdminService {
  private static instance: AdminService;
  private config: AdminServiceConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  private loadConfig(): AdminServiceConfig {
    return {
      jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      },
      smtp: {
        defaultConfig: {
          host: process.env.SMTP_HOST || '',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER || '',
          fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@simplifaq.com',
          fromName: process.env.SMTP_FROM_NAME || 'SimpliFaq',
          provider: 'smtp',
          includeUnsubscribe: true,
          trackOpens: false,
          trackClicks: false,
          maxRetries: 3,
          retryDelay: 300,
        },
        providers: {
          gmail: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            info: 'Use Google App Password',
          },
          outlook: {
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            info: 'Microsoft account with modern auth',
          },
          sendgrid: {
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            info: 'Use API key as password',
          },
        },
      },
      features: {
        auditLogging: process.env.ENABLE_AUDIT_LOG === 'true',
        rateLimiting: process.env.ENABLE_RATE_LIMIT === 'true',
      },
    };
  }

  getConfig(): AdminServiceConfig {
    return { ...this.config };
  }

  // User Management Methods
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          subscription: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
      },
    });
  }

  async updateUser(id: string, data: Record<string, any>) {
    const { subscriptionPlan, isActive, ...userData } = data;
    
    const updateData: any = userData;
    
    if (subscriptionPlan !== undefined) {
      updateData.subscriptionPlan = subscriptionPlan;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        subscription: true,
      },
    });
  }

  async createUser(userData: Record<string, any>) {
    const { email, firstName, lastName, company, subscriptionPlan = 'free', password = 'temp123', street = '', city = '', postalCode = '' } = userData;

    return await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        companyName: company || '',
        subscriptionPlan,
        isActive: true,
        emailConfirmed: false,
        password,
        street,
        city,
        postalCode,
      },
      include: {
        subscription: true,
      },
    });
  }

  async deleteUserPermanently(id: string) {
    // Delete related records first (cascade delete will handle sessions)
    await prisma.subscription.deleteMany({ where: { userId: id } });
    
    // Delete the user
    return await prisma.user.delete({
      where: { id },
    });
  }

  // SMTP Configuration Methods
  async getSmtpConfig() {
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'smtp_config' },
    });

    if (config && config.value) {
      const { password, ...configWithoutPassword } = JSON.parse(config.value as string);
      return configWithoutPassword;
    }

    return this.config.smtp.defaultConfig;
  }

  async updateSmtpConfig(config: Record<string, any>) {
    const { password, ...configToStore } = config;
    
    // Store config without password for security
    await prisma.systemConfig.upsert({
      where: { key: 'smtp_config' },
      update: { value: JSON.stringify(configToStore) },
      create: { key: 'smtp_config', value: JSON.stringify(configToStore) },
    });

    return config;
  }

  async testSmtpConfig(testEmail: string, configId?: string) {
    // This would integrate with your email service
    // For now, return a mock response
    return {
      success: true,
      message: `Test email sent to ${testEmail}`,
      timestamp: new Date().toISOString(),
    };
  }

  async getSmtpStats() {
    // Mock stats - implement real stats from your email logs
    return {
      totalSent: 1250,
      totalFailed: 23,
      totalQueued: 5,
      totalDelivered: 1227,
      successRate: 98.2,
    };
  }

  // Analytics Methods
  async getDashboardAnalytics(params: {
    startDate?: string;
    endDate?: string;
    period?: string;
  }) {
    const { startDate, endDate } = params;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalUsers, activeUsers, totalRevenue, totalInvoices] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, isActive: true } }),
      // Add revenue calculation from invoices
      prisma.invoice.aggregate({
        where: { createdAt: where.createdAt },
        _sum: { total: true },
      }),
      prisma.invoice.count({ where: { createdAt: where.createdAt } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        growth: 12.5, // Calculate real growth
      },
      revenue: {
        total: totalRevenue._sum.total || 0,
        growth: 8.3,
      },
      invoices: {
        total: totalInvoices,
        growth: 15.2,
      },
    };
  }

  // Audit Logging Methods
  async logAction(req: AdminAuthRequest, action: string, resourceType: string, resourceId?: string, metadata?: any) {
    if (!this.config.features.auditLogging) return;

    try {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin!.id,
          action,
          resourceType,
          resourceId,
          description: `${action} performed by ${req.admin!.email}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.path,
            ...metadata,
          },
        },
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  // Utility Methods
  validateSmtpConfig(config: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.host) errors.push('SMTP host is required');
    if (!config.port || config.port < 1 || config.port > 65535) errors.push('Valid SMTP port is required');
    if (!config.user) errors.push('SMTP username is required');
    if (!config.fromEmail) errors.push('From email is required');
    if (!config.fromName) errors.push('From name is required');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  isFeatureEnabled(feature: keyof AdminServiceConfig['features']): boolean {
    return this.config.features[feature];
  }
}

// Export singleton instance
export const adminService = AdminService.getInstance();

// Export types
export type { AdminServiceConfig };
