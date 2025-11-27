import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// Validation schemas
const adminLoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
  twoFactorCode: z.string().optional(),
});

const adminCreateSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  role: z.enum(['super_admin', 'support_admin', 'billing_admin']),
  permissions: z.object({}).passthrough(),
});

const enable2FASchema = z.object({
  secret: z.string(),
  token: z.string().length(6, 'Code à 6 chiffres requis'),
});

interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
    permissions: any;
  };
}

export class AdminAuthController {
  // Admin login
  static async login(req: Request, res: Response): Promise<Response | void> {
    try {
      console.log('[AdminAuth] Login attempt received:', { body: req.body, headers: req.headers });
      const { email, password, twoFactorCode } = adminLoginSchema.parse(req.body);
      // Find admin user
      const admin = await prisma.adminUser.findUnique({
        where: { email, isActive: true },
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou mot de passe incorrect',
          },
        });
      }

      // Check 2FA if enabled
      if (admin.twoFactorEnabled) {
        if (!twoFactorCode) {
          return res.status(200).json({
            success: true,
            requiresTwoFactor: true,
            message: "Code d'authentification à deux facteurs requis",
          });
        }

        const isValid2FA = speakeasy.totp.verify({
          secret: admin.twoFactorSecret!,
          encoding: 'base32',
          token: twoFactorCode,
          window: 2,
        });

        if (!isValid2FA) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_2FA_CODE',
              message: "Code d'authentification invalide",
            },
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          adminId: admin.id,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '8h' }
      );

      // Create admin session
      const session = await prisma.adminSession.create({
        data: {
          adminId: admin.id,
          token,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || undefined,
        },
      });

      // Update last login
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      // Log admin login
      await prisma.adminLog.create({
        data: {
          adminId: admin.id,
          action: 'admin_login',
          resourceType: 'admin_session',
          resourceId: session.id,
          description: `Admin ${admin.email} logged in`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || undefined,
        },
      });

      return res.json({
        success: true,
        data: {
          accessToken: token,
          admin: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            permissions: admin.permissions,
            twoFactorEnabled: admin.twoFactorEnabled,
            createdAt: admin.createdAt.toISOString(),
            lastLoginAt: admin.lastLoginAt?.toISOString(),
          },
        },
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

      console.error('ADMIN LOGIN FAILED - DETAILED ERROR:', JSON.stringify(error, null, 2));
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Admin logout
  static async logout(req: AdminAuthRequest, res: Response): Promise<Response | void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (token) {
        // Delete admin session
        await prisma.adminSession.deleteMany({
          where: { token },
        });

        // Log admin logout
        if (req.admin) {
          await prisma.adminLog.create({
            data: {
              adminId: req.admin.id,
              action: 'admin_logout',
              resourceType: 'admin_session',
              description: `Admin ${req.admin.email} logged out`,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
            },
          });
        }
      }

      return res.json({
        success: true,
        message: 'Déconnexion réussie',
      });
    } catch (error) {
      console.error('Admin logout error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Get current admin profile
  static async getProfile(req: AdminAuthRequest, res: Response): Promise<Response | void> {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      const admin = await prisma.adminUser.findUnique({
        where: { id: req.admin.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          permissions: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ADMIN_NOT_FOUND',
            message: 'Administrateur non trouvé',
          },
        });
      }

      return res.json({
        success: true,
        data: admin,
      });
    } catch (error) {
      console.error('Get admin profile error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Create new admin user (super_admin only)
  static async createAdmin(req: AdminAuthRequest, res: Response): Promise<Response | void> {
    try {
      // Check permissions
      if (!req.admin || req.admin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Permissions insuffisantes',
          },
        });
      }

      const { email, password, firstName, lastName, role, permissions } = adminCreateSchema.parse(req.body);

      // Check if admin already exists
      const existingAdmin = await prisma.adminUser.findUnique({
        where: { email },
      });

      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ADMIN_EXISTS',
            message: 'Un administrateur avec cet email existe déjà',
          },
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create admin user
      const newAdmin = await prisma.adminUser.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          permissions: permissions as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          permissions: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Log admin creation
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.id,
          action: 'admin_created',
          resourceType: 'admin_user',
          resourceId: newAdmin.id,
          description: `Admin user ${newAdmin.email} created by ${req.admin.email}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: { newAdminRole: role } as Prisma.InputJsonValue,
        },
      });

      return res.status(201).json({
        success: true,
        data: newAdmin,
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

      console.error('Create admin error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Setup 2FA
  static async setup2FA(req: AdminAuthRequest, res: Response): Promise<Response | void> {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `SimpliFaq Admin (${req.admin.email})`,
        issuer: 'SimpliFaq',
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      return res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
          manualEntryKey: secret.base32,
        },
      });
    } catch (error) {
      console.error('Setup 2FA error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Enable 2FA
  static async enable2FA(req: AdminAuthRequest, res: Response): Promise<Response | void> {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      const { secret, token } = enable2FASchema.parse(req.body);

      // Verify token
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Code d\'authentification invalide',
          },
        });
      }

      // Enable 2FA for admin
      await prisma.adminUser.update({
        where: { id: req.admin.id },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        },
      });

      // Log 2FA enablement
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.id,
          action: 'two_factor_enabled',
          resourceType: 'admin_user',
          resourceId: req.admin.id,
          description: `Two-factor authentication enabled for ${req.admin.email}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });

      return res.json({
        success: true,
        message: 'Authentification à deux facteurs activée avec succès',
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

      console.error('Enable 2FA error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }

  // Disable 2FA
  static async disable2FA(req: AdminAuthRequest, res: Response): Promise<Response | void> {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      // Disable 2FA for admin
      await prisma.adminUser.update({
        where: { id: req.admin.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });

      // Log 2FA disablement
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.id,
          action: 'two_factor_disabled',
          resourceType: 'admin_user',
          resourceId: req.admin.id,
          description: `Two-factor authentication disabled for ${req.admin.email}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });

      return res.json({
        success: true,
        message: 'Authentification à deux facteurs désactivée',
      });
    } catch (error) {
      console.error('Disable 2FA error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  }
}