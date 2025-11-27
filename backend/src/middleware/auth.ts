import { Request as ExpressRequest, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/database';
import { ApiResponse } from '../types';
import { securityLogger } from './security';

// Request type is extended in types/express/index.d.ts
type Request = ExpressRequest;

interface UserWithRole {
  id: string;
  email: string;
  isActive: boolean;
  subscriptionPlan: string;
  emailConfirmed: boolean;
}

// This matches the Prisma Session model with included user
type SessionWithUser = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    isActive: boolean;
    subscriptionPlan: string;
    emailConfirmed: boolean;
  } | null;
};

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
/**
 * Admin authorization middleware
 * Checks if the authenticated user has admin privileges
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): Response | void => {
  // Check if user exists and is an admin
  if (!req.user || !req.user.isAdmin) {
    securityLogger.warn('Unauthorized admin access attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Accès refusé. Droits administrateur requis.',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
  next();
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      securityLogger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Token d\'authentification requis',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // Initialize req.user as null by default
    req.user = null;

    // Check if session exists in database with user data
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            subscriptionPlan: true,
            emailConfirmed: true
          },
        },
      },
    }) as unknown as SessionWithUser | null; // Type assertion to handle Prisma types

    // If no session, user is not active, email not confirmed, or session is expired, return unauthorized
    if (!session || !session.user || !session.user.isActive || !session.user.emailConfirmed || !session.expiresAt || new Date(session.expiresAt) < new Date()) {
      // Determine specific reason for better error messages
      let reason = 'Session invalide';
      if (!session) {
        reason = 'Session non trouvée';
      } else if (!session.user) {
        reason = 'Utilisateur non trouvé';
      } else if (!session.user.isActive) {
        reason = 'Compte désactivé';
      } else if (!session.user.emailConfirmed) {
        reason = 'Email non confirmé - Veuillez confirmer votre adresse email';
      } else if (!session.expiresAt || new Date(session.expiresAt) < new Date()) {
        reason = 'Session expirée';
      }

      securityLogger.warn('Invalid session attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        tokenPrefix: token ? token.substring(0, 10) + '...' : 'no-token',
        reason,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        error: {
          code: !session?.user?.emailConfirmed ? 'EMAIL_NOT_CONFIRMED' : 'INVALID_SESSION',
          message: reason,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // At this point, we know session and user exist and are valid
    const user = session.user;
    
    // Set user on request (cast to any because session only includes partial user data)
    req.user = {
      ...user,
      isAdmin: user.subscriptionPlan === 'enterprise' // Users with enterprise plan are admins
    } as any;

    // Add userId and token to request for controller compatibility
    (req as any).userId = user.id;
    (req as any).token = token;

    return next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      securityLogger.warn('Invalid JWT token attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token invalide',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (error instanceof jwt.TokenExpiredError) {
      securityLogger.warn('Expired JWT token attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        expiredAt: error.expiredAt,
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expiré',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    securityLogger.error('Authentication middleware error', {
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
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Optional authentication middleware
 * Adds user info to request if token is present, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return next();
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // Check if session exists in database
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            subscriptionPlan: true,
            emailConfirmed: true
          },
        },
      },
    });

    if (session && new Date((session as any).expiresAt) > new Date() && session.user?.isActive && session.user?.emailConfirmed) {
      // Add user info to request (with limited fields from session)
      req.user = {
        id: session.user.id,
        email: session.user.email,
        isAdmin: session.user.subscriptionPlan === 'enterprise'
      } as any; // Cast to any because we only have partial user data here
      (req as any).userId = session.user.id;
      (req as any).token = token;
    }

    next();

  } catch (error) {
    // For optional auth, we don't return errors, just continue without user info
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authAttempts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitAuth = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [ip, data] of authAttempts.entries()) {
      if (now > data.resetTime) {
        authAttempts.delete(ip);
      }
    }
    
    const attempts = authAttempts.get(clientIp);
    
    if (!attempts) {
      authAttempts.set(clientIp, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (attempts.count >= maxAttempts) {
      const remainingTime = Math.ceil((attempts.resetTime - now) / 1000 / 60);
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_ATTEMPTS',
          message: `Trop de tentatives. Réessayez dans ${remainingTime} minutes.`,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    
    attempts.count++;
    next();
  };
};