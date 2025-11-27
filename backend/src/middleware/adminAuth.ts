import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: any;
  };
}



interface AdminJWTPayload {
  adminId: string;
  email: string;
  role: string;
  permissions: any;
  iat: number;
  exp: number;
}

// Admin authentication middleware
export const adminAuth = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Token d\'authentification requis',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AdminJWTPayload;

    // Check if admin session exists and is valid
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
            permissions: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Session invalide',
        },
      });
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Delete expired session
      await prisma.adminSession.delete({
        where: { id: session.id },
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session expirée',
        },
      });
    }

    // Check if admin is active
    if (!session.admin.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ADMIN_INACTIVE',
          message: 'Compte administrateur désactivé',
        },
      });
    }

    // Attach admin info to request
    req.admin = {
      id: session.admin.id,
      email: session.admin.email,
      role: session.admin.role,
      permissions: session.admin.permissions,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token invalide',
        },
      });
    }

    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
    });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: AdminAuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Non autorisé',
        },
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Rôle insuffisant pour cette action',
        },
      });
    }

    return next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (resource: string, action: string) => {
  return (req: AdminAuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Non autorisé',
        },
      });
    }

    const permissions = req.admin.permissions;
    
    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check specific permission
    if (!permissions[resource] || !permissions[resource].includes(action)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission manquante: ${resource}:${action}`,
        },
      });
    }

    next();
  };
};

// Rate limiting for admin endpoints
export const adminRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: AdminAuthRequest, res: Response, next: NextFunction): Response | void => {
    const key = req.admin?.id ?? req.ip ?? 'anonymous';
    const now = Date.now();
    
    const userRequests = requests.get(key);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Trop de requêtes, veuillez réessayer plus tard',
        },
      });
    }
    
    userRequests.count++;
    return next();
  };
};

// Audit logging middleware for admin actions
export const auditLog = (action: string, resourceType: string, getResourceId?: (req: AdminAuthRequest, resBody: any) => string) => {
  return async (req: AdminAuthRequest, res: Response, next: NextFunction) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Log the action after successful response
      if (req.admin && res.statusCode < 400) {
        setImmediate(async () => {
          try {
            await prisma.adminLog.create({
              data: {
                adminId: req.admin!.id,
                action,
                resourceType,
                resourceId: getResourceId ? getResourceId(req, body) : (body?.data?.id || req.params.id),
                description: `${action} performed by ${req.admin!.email}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                metadata: {
                  method: req.method,
                  path: req.path,
                  statusCode: res.statusCode,
                },
              },
            });
          } catch (error) {
            console.error('Audit log error:', error);
          }
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};