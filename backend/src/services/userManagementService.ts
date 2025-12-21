import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Types and interfaces
export interface UserFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  plan?: string;
  registrationDateFrom?: Date;
  registrationDateTo?: Date;
  lastLoginFrom?: Date;
  lastLoginTo?: Date;
  riskLevel?: 'low' | 'medium' | 'high';
  tags?: string[];
  hasSubscription?: boolean;
  subscriptionStatus?: string;
  companySize?: 'small' | 'medium' | 'large';
}

export interface Pagination {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface UserListResponse {
  users: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface BulkUserUpdates {
  isActive?: boolean;
  subscriptionPlan?: string;
  tags?: string[];
  notes?: string;
}

export interface BulkOperationResult {
  success: boolean;
  updatedCount: number;
  errors: Array<{ userId: string; error: string }>;
}

export interface ExportResult {
  url: string;
  filename: string;
  recordCount: number;
}

export interface ImpersonationSession {
  id: string;
  adminId: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
}

// Validation schemas
const userFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  plan: z.string().optional(),
  registrationDateFrom: z.union([z.string(), z.date()]).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
  registrationDateTo: z.union([z.string(), z.date()]).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
  lastLoginFrom: z.union([z.string(), z.date()]).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
  lastLoginTo: z.union([z.string(), z.date()]).optional().transform(val => val ? (val instanceof Date ? val : new Date(val)) : undefined),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string()).optional(),
  hasSubscription: z.boolean().optional(),
  subscriptionStatus: z.string().optional(),
  companySize: z.enum(['small', 'medium', 'large']).optional(),
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(10000).default(20), // Allow higher limit for exports
  sortBy: z.enum(['createdAt', 'email', 'companyName', 'lastLogin', 'subscriptionPlan']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const bulkUpdatesSchema = z.object({
  isActive: z.boolean().optional(),
  subscriptionPlan: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export class UserManagementService {
  /**
   * Get users with advanced filtering and pagination
   */
  static async getUsers(filters: UserFilters, pagination: Pagination): Promise<UserListResponse> {
    const validatedFilters = userFiltersSchema.parse(filters);
    const validatedPagination = paginationSchema.parse(pagination);

    const skip = (validatedPagination.page - 1) * validatedPagination.limit;

    // Build complex where clause
    const where: Prisma.UserWhereInput = {};

    // Search across multiple fields
    if (validatedFilters.search) {
      where.OR = [
        { email: { contains: validatedFilters.search } },
        { companyName: { contains: validatedFilters.search } },
        { firstName: { contains: validatedFilters.search } },
        { lastName: { contains: validatedFilters.search } },
        { vatNumber: { contains: validatedFilters.search } },
        { phone: { contains: validatedFilters.search } },
      ];
    }

    // Status filter
    if (validatedFilters.status !== 'all') {
      where.isActive = validatedFilters.status === 'active';
    }

    // Plan filter
    if (validatedFilters.plan) {
      where.subscriptionPlan = validatedFilters.plan;
    }

    // Date range filters
    if (validatedFilters.registrationDateFrom || validatedFilters.registrationDateTo) {
      where.createdAt = {};
      if (validatedFilters.registrationDateFrom) {
        where.createdAt.gte = validatedFilters.registrationDateFrom;
      }
      if (validatedFilters.registrationDateTo) {
        where.createdAt.lte = validatedFilters.registrationDateTo;
      }
    }

    // Subscription filters
    if (validatedFilters.hasSubscription !== undefined) {
      if (validatedFilters.hasSubscription) {
        where.subscription = { isNot: null };
      } else {
        where.subscription = null;
      }
    }

    if (validatedFilters.subscriptionStatus) {
      where.subscription = {
        status: validatedFilters.subscriptionStatus,
      };
    }

    // Get users with comprehensive data
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: validatedPagination.limit,
        orderBy: { [validatedPagination.sortBy]: validatedPagination.sortOrder },
        select: {
          id: true,
          email: true,
          companyName: true,
          firstName: true,
          lastName: true,
          vatNumber: true,
          phone: true,
          isActive: true,
          subscriptionPlan: true,
          emailConfirmed: true,
          emailConfirmedAt: true,
          createdAt: true,
          updatedAt: true,
          subscription: {
            include: {
              plan: {
                select: {
                  name: true,
                  displayName: true,
                  price: true,
                },
              },
            },
          },
          _count: {
            select: {
              invoices: true,
              clients: true,
              products: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / validatedPagination.limit);
    const hasNextPage = validatedPagination.page < totalPages;
    const hasPrevPage = validatedPagination.page > 1;

    // Enhance user data with calculated fields
    const enhancedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      companyName: user.companyName,
      firstName: user.firstName,
      lastName: user.lastName,
      vatNumber: user.vatNumber,
      phone: user.phone,
      isActive: user.isActive,
      subscriptionPlan: user.subscriptionPlan,
      emailConfirmed: user.emailConfirmed,
      emailConfirmedAt: user.emailConfirmedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscription: user.subscription,
      stats: {
        invoiceCount: user._count.invoices,
        clientCount: user._count.clients,
        productCount: user._count.products,
      },
      // Calculate engagement score (simplified)
      engagementScore: this.calculateEngagementScore(user),
      // Calculate risk level (simplified)
      riskLevel: this.calculateRiskLevel(user),
    }));

    return {
      users: enhancedUsers,
      pagination: {
        currentPage: validatedPagination.page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: validatedPagination.limit,
      },
    };
  }

  /**
   * Get detailed user information
   */
  static async getUserDetails(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            plan: true,
            usageRecords: {
              where: {
                period: new Date().toISOString().slice(0, 7), // Current month
              },
            },
            billingLogs: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            issueDate: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        clients: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        products: {
          select: {
            id: true,
            name: true,
            unitPrice: true,
            tvaRate: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            invoices: true,
            clients: true,
            products: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate additional metrics
    const totalRevenue = await this.calculateUserRevenue(userId);
    const activityTimeline = await this.getUserActivityTimeline(userId);
    const engagementMetrics = await this.getUserEngagementMetrics(userId);

    return {
      ...user,
      password: undefined, // Never return password
      metrics: {
        totalRevenue,
        engagementScore: this.calculateEngagementScore(user),
        riskLevel: this.calculateRiskLevel(user),
        ...engagementMetrics,
      },
      activityTimeline,
    };
  }

  /**
   * Update user information
   */
  static async updateUser(userId: string, updates: any): Promise<any> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        companyName: true,
        firstName: true,
        lastName: true,
        isActive: true,
        subscriptionPlan: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Bulk update users
   */
  static async bulkUpdateUsers(userIds: string[], updates: BulkUserUpdates): Promise<BulkOperationResult> {
    const validatedUpdates = bulkUpdatesSchema.parse(updates);
    const errors: Array<{ userId: string; error: string }> = [];
    let updatedCount = 0;

    for (const userId of userIds) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: validatedUpdates,
        });
        updatedCount++;
      } catch (error) {
        errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      updatedCount,
      errors,
    };
  }

  /**
   * Export users data
   */
  static async exportUsers(filters: UserFilters, format: 'csv' | 'json' | 'xlsx'): Promise<ExportResult> {
    // Get all users matching filters (without pagination)
    const users = await this.getUsers(filters, { page: 1, limit: 10000, sortBy: 'createdAt', sortOrder: 'desc' });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `users_export_${timestamp}.${format}`;
    
    // In a real implementation, you would generate the actual file here
    // For now, we'll return a placeholder
    return {
      url: `/exports/${filename}`,
      filename,
      recordCount: users.users.length,
    };
  }

  /**
   * Create impersonation session
   */
  static async createImpersonationSession(adminId: string, userId: string): Promise<ImpersonationSession> {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Cannot impersonate inactive user');
    }

    // Create impersonation session (we'll add this to the schema later)
    const session = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId,
      userId,
      token: `imp_token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      isActive: true,
    };

    // Log impersonation start
    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'user_impersonation_started',
        resourceType: 'user',
        resourceId: userId,
        description: `Admin started impersonating user ${user.email}`,
        metadata: {
          impersonationSessionId: session.id,
          userEmail: user.email,
        },
      },
    });

    return session;
  }

  /**
   * End impersonation session
   */
  static async endImpersonationSession(sessionId: string): Promise<void> {
    // In a real implementation, you would update the session in the database
    // For now, we'll just log the action
    
    // Log impersonation end
    await prisma.adminLog.create({
      data: {
        adminId: 'admin_id', // Would get from session
        action: 'user_impersonation_ended',
        resourceType: 'impersonation_session',
        resourceId: sessionId,
        description: `Admin ended impersonation session`,
        metadata: {
          impersonationSessionId: sessionId,
        },
      },
    });
  }

  // Helper methods
  private static calculateEngagementScore(user: any): number {
    // Simplified engagement score calculation
    let score = 0;
    
    // Base score for active users
    if (user.isActive) score += 20;
    
    // Score based on invoice count
    if (user._count?.invoices) {
      score += Math.min(user._count.invoices * 5, 30);
    }
    
    // Score based on client count
    if (user._count?.clients) {
      score += Math.min(user._count.clients * 3, 20);
    }
    
    // Score based on subscription
    if (user.subscription) {
      score += 30;
    }
    
    return Math.min(score, 100);
  }

  private static calculateRiskLevel(user: any): 'low' | 'medium' | 'high' {
    const engagementScore = this.calculateEngagementScore(user);
    
    if (engagementScore >= 70) return 'low';
    if (engagementScore >= 40) return 'medium';
    return 'high';
  }

  private static async calculateUserRevenue(userId: string): Promise<number> {
    const result = await prisma.invoice.aggregate({
      where: {
        userId,
        paymentStatus: 'PAID',
      },
      _sum: {
        total: true,
      },
    });

    return Number(result._sum?.total || 0);
  }

  private static async getUserActivityTimeline(userId: string, limit: number = 20): Promise<any[]> {
    // Get recent activities from various sources
    const [recentInvoices, recentClients, recentProducts] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.client.findMany({
        where: { userId },
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.product.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Combine and sort activities
    const activities = [
      ...recentInvoices.map(invoice => ({
        type: 'invoice',
        action: 'created',
        description: `Created invoice ${invoice.invoiceNumber}`,
        timestamp: invoice.createdAt,
        metadata: invoice,
      })),
      ...recentClients.map(client => ({
        type: 'client',
        action: 'created',
        description: `Added client ${client.companyName || `${client.firstName} ${client.lastName}`}`,
        timestamp: client.createdAt,
        metadata: client,
      })),
      ...recentProducts.map(product => ({
        type: 'product',
        action: 'created',
        description: `Created product ${product.name}`,
        timestamp: product.createdAt,
        metadata: product,
      })),
    ];

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private static async getUserEngagementMetrics(userId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [invoicesThisMonth, clientsThisMonth, productsThisMonth] = await Promise.all([
      prisma.invoice.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.client.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.product.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      invoicesThisMonth,
      clientsThisMonth,
      productsThisMonth,
      lastActivityDate: new Date(), // Would calculate from actual activity
    };
  }

  /**
   * Get a single user by ID
   */
  static async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        isActive: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  /**
   * Permanently delete a user (hard delete)
   */
  static async deleteUserPermanently(id: string) {
    // First delete all related data to maintain referential integrity
    await prisma.$transaction(async (tx) => {
      // Delete invoice items first (before invoices)
      const invoices = await tx.invoice.findMany({
        where: { userId: id },
        select: { id: true }
      });
      if (invoices.length > 0) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: { in: invoices.map(i => i.id) } }
        });
      }

      // Delete quote items first (before quotes)
      const quotes = await tx.quote.findMany({
        where: { userId: id },
        select: { id: true }
      });
      if (quotes.length > 0) {
        await tx.quoteItem.deleteMany({
          where: { quoteId: { in: quotes.map(q => q.id) } }
        });
      }

      // Delete user's invoices
      await tx.invoice.deleteMany({
        where: { userId: id }
      });

      // Delete user's quotes
      await tx.quote.deleteMany({
        where: { userId: id }
      });

      // Delete user's clients
      await tx.client.deleteMany({
        where: { userId: id }
      });

      // Delete user's products
      await tx.product.deleteMany({
        where: { userId: id }
      });

      // Delete user's expenses
      await tx.expense.deleteMany({
        where: { userId: id }
      });

      // Delete user's accounts
      await tx.account.deleteMany({
        where: { userId: id }
      });

      // Delete user's subscriptions and related data
      const subscriptions = await tx.subscription.findMany({
        where: { userId: id },
        select: { id: true }
      });
      if (subscriptions.length > 0) {
        // Delete usage records
        await tx.usageRecord.deleteMany({
          where: { subscriptionId: { in: subscriptions.map(s => s.id) } }
        });
        // Delete billing logs
        await tx.billingLog.deleteMany({
          where: { subscriptionId: { in: subscriptions.map(s => s.id) } }
        });
      }
      await tx.subscription.deleteMany({
        where: { userId: id }
      });

      // Delete user's sessions
      await tx.session.deleteMany({
        where: { userId: id }
      });

      // Delete user's assistant actions
      await tx.assistantAction.deleteMany({
        where: { userId: id }
      });

      // Delete user's support tickets and responses
      const tickets = await tx.supportTicket.findMany({
        where: { userId: id },
        select: { id: true }
      });
      if (tickets.length > 0) {
        await tx.supportResponse.deleteMany({
          where: { ticketId: { in: tickets.map(t => t.id) } }
        });
      }
      await tx.supportTicket.deleteMany({
        where: { userId: id }
      });

      // Delete user's email sends
      await tx.emailSend.deleteMany({
        where: { user_id: id }
      });

      // Delete user's SMTP logs
      await tx.userSmtpLog.deleteMany({
        where: { userId: id }
      });

      // Delete user's SMTP config
      await tx.userSmtpConfig.deleteMany({
        where: { userId: id }
      });

      // Delete user's onboarding data
      await tx.userOnboarding.deleteMany({
        where: { userId: id }
      });

      // Delete user's feedbacks (set to null by schema, but delete if exists)
      // COMMENTED: Feedback model does not exist in schema
      // await tx.feedback.updateMany({
      //   where: { userId: id },
      //   data: { userId: null }
      // });

      // Finally delete the user
      await tx.user.delete({
        where: { id }
      });
    });
  }
}