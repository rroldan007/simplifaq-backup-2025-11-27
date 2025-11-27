import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth, requirePermission, auditLog, AdminAuthRequest } from '../../middleware/adminAuth';
import { adminService } from '../../services/adminService';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuth);

// Validation schemas
const userSearchSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  plan: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email', 'companyName', 'lastLogin', 'subscriptionPlan']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  registrationDateFrom: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date().optional()),
  registrationDateTo: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date().optional()),
  lastLoginFrom: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date().optional()),
  lastLoginTo: z.preprocess((arg) => arg ? new Date(arg as string) : undefined, z.date().optional()),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string()).optional(),
  hasSubscription: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  subscriptionStatus: z.string().optional(),
  companySize: z.enum(['small', 'medium', 'large']).optional(),
  subscriptionPlan: z.string().optional(),
});

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  subscriptionPlan: z.string().optional(),
  notes: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  updates: z.object({
    isActive: z.boolean().optional(),
    subscriptionPlan: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
});

const exportUsersSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  filters: z.object({}).passthrough().optional(),
});

const impersonationSchema = z.object({
  reason: z.string().min(1, 'La raison est requise'),
});

const analyticsTimeRangeSchema = z.object({
  start: z.string().transform(val => new Date(val)),
  end: z.string().transform(val => new Date(val)),
});

const communicationSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const bulkCommunicationSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

// GET /api/admin/users - List users with advanced filtering and pagination
router.get('/', requirePermission('users', 'read'), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const filters = userSearchSchema.parse(req.query);
    
    const result = await adminService.getUsers({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    // Log action for audit
    await adminService.logAction(req, 'LIST_USERS', 'user', undefined, {
      filters,
      resultCount: result.users.length,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USERS_ERROR',
        message: 'Erreur lors de la récupération des utilisateurs',
      },
    });
  }
});

    // GET /api/admin/users/:id - Get detailed user information
router.get('/:id', requirePermission('users', 'read'), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const user = await adminService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Log action for audit
    await adminService.logAction(req, 'VIEW_USER', 'user', id);

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user details error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/:id', 
  requirePermission('users', 'write'), 
  auditLog('user_updated', 'user', (req: AdminAuthRequest) => req.params.id),
  async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const updateData = updateUserSchema.parse(req.body);
      const updatedUser = await adminService.updateUser(id, updateData);
      // Log action for audit
      await adminService.logAction(req, 'UPDATE_USER', 'user', id);
      return res.json({ success: true, data: updatedUser });
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
      console.error('Update user error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      });
    }
});

// Impersonate User
router.post('/impersonate/:userId', requirePermission('users', 'write'), auditLog('impersonate_user', 'user', (req: AdminAuthRequest) => req.params.userId), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized: Admin ID not found' } });
    }
    
    // Reason is now required for audit purposes
    const bodyParse = impersonationSchema.safeParse(req.body);
    if (!bodyParse.success) {
      return res.status(400).json({ success: false, error: { message: 'Invalid impersonation request', details: bodyParse.error.issues } });
    }

            const session = await UserManagementService.createImpersonationSession(adminId, userId);
            return res.json({ success: true, data: session });
  } catch (error) {
    console.error('Impersonate user error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});

// Get User Growth Analytics
router.get('/analytics/user-growth', requirePermission('users', 'read'), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const queryParse = analyticsTimeRangeSchema.safeParse(req.query);
    if (!queryParse.success) {
      return res.status(400).json({ success: false, error: { message: 'Invalid time range parameters', details: queryParse.error.issues } });
    }

    const growthData = await UserManagementService.getUsers(
      {
        registrationDateFrom: queryParse.data.start,
        registrationDateTo: queryParse.data.end,
      },
      { page: 1, limit: -1, sortBy: 'createdAt', sortOrder: 'desc' } // Use -1 limit to count all
    );

    return res.json({ success: true, data: { count: growthData.pagination.totalCount, range: queryParse.data } });
  } catch (error) {
    console.error('Get user growth error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});

// Send email to a user
router.post('/:id/send-email', requirePermission('users', 'write'), auditLog('send_email', 'user', (req: AdminAuthRequest) => req.params.id), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
        const emailSchema = z.object({
      templateId: z.string(),
      variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    });
    const parseResult = emailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: { message: 'Invalid email data', details: parseResult.error.issues } });
    }
    const { templateId, variables } = parseResult.data;
    const result = await CommunicationService.sendEmail(req.params.id, templateId, variables as Record<string, string | number | boolean> || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Send email error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});

// Get communication history for a user
// TODO: Implement CommunicationService.getCommunicationHistory
/* router.get('/:id/communication-history', requirePermission('users', 'read'), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const history = await CommunicationService.getCommunicationHistory(req.params.id);
    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get communication history error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
}); */

// Bulk Actions (Activate, Deactivate)
router.post('/bulk-action', requirePermission('users', 'write'), auditLog('bulk_action', 'user', (req) => `Multiple: ${req.body.userIds.length} users`), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const bulkActionSchema = z.object({
      userIds: z.array(z.string()).min(1),
      action: z.enum(['activate', 'deactivate']),
    });
    const { userIds, action } = bulkActionSchema.parse(req.body);
    const result = await UserManagementService.bulkUpdateUsers(userIds, { isActive: action === 'activate' });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Bulk action error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});

// Bulk Update
router.post('/bulk-update', requirePermission('users', 'write'), auditLog('bulk_update', 'user', (req) => `Multiple: ${req.body.userIds.length} users`), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { userIds, updates } = bulkUpdateSchema.parse(req.body);
    const result = await UserManagementService.bulkUpdateUsers(userIds, updates);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Bulk update error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});

// Bulk Communication
// TODO: Implement CommunicationService.sendBulkEmail
/* router.post('/bulk-communicate', requirePermission('users', 'write'), auditLog('bulk_communicate', 'user', (req) => `Multiple: ${req.body.userIds.length} users`), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { userIds, templateId, variables } = bulkCommunicationSchema.parse(req.body);
    const result = await CommunicationService.sendBulkEmail(userIds, templateId, variables as Record<string, string | number | boolean> || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Bulk communication error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
}); */

// GET /api/admin/users/newsletter/subscribers - List newsletter subscribers
router.get('/newsletter/subscribers', requirePermission('users', 'read'), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const { page = '1', limit = '50', emailConfirmed } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {
      subscribeNewsletter: true,
    };

    // Filter by email confirmation status if specified
    if (emailConfirmed !== undefined) {
      where.emailConfirmed = emailConfirmed === 'true';
    }

    // Get subscribers
    const [subscribers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          companyName: true,
          subscribeNewsletter: true,
          emailConfirmed: true,
          emailConfirmedAt: true,
          createdAt: true,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        subscribers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount: total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get newsletter subscribers error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});

// Export Users
router.post('/export', requirePermission('users', 'read'), auditLog('export_users', 'user'), async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
  try {
    const exportSchema = userSearchSchema.extend({
      format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
    });
    const queryParse = exportSchema.safeParse(req.query);
    if (!queryParse.success) {
      return res.status(400).json({ success: false, error: { message: 'Invalid export parameters', details: queryParse.error.issues } });
    }

    const { format, ...filters } = queryParse.data;
    const finalFilters = {
        ...filters,
        limit: z.coerce.number().int().min(1).max(10000).default(1000).parse(req.query.limit)
    };

    const result = await UserManagementService.exportUsers(finalFilters, format);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Export users error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
    });
  }
});


// DELETE /api/admin/users/:id - Soft-delete a user
router.delete('/:id', 
  requirePermission('users', 'write'), 
  auditLog('user_deactivated', 'user', (req: AdminAuthRequest) => req.params.id),
  async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      await UserManagementService.updateUser(id, { isActive: false });
      return res.json({ success: true, message: 'User deactivated successfully' });
    } catch (error: unknown) {
      console.error('Deactivate user error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      });
    }
  }
);

// DELETE /api/admin/users/:id/permanent - Hard-delete a user
router.delete('/:id/permanent', 
  requirePermission('users', 'write'), 
  auditLog('user_deleted_permanent', 'user', (req: AdminAuthRequest) => req.params.id),
  async (req: AdminAuthRequest, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await adminService.getUserById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' }
        });
      }
      
      // Perform hard delete
      await adminService.deleteUserPermanently(id);
      
      // Log action for audit
      await adminService.logAction(req, 'DELETE_USER_PERMANENT', 'user', id);
      
      return res.json({ 
        success: true, 
        message: 'Utilisateur supprimé définitivement avec succès!' 
      });
    } catch (error) {
      console.error('Delete user permanently error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' }
      });
    }
  }
);

export default router;