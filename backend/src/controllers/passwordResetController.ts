import { Request, Response } from 'express';
import { prisma } from '../services/database';
import { ApiResponse } from '../types';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Request password reset - Send email with reset token
 */
export const forgotPassword = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    let { email } = req.body;

    // Normalize email to lowercase to match registration behavior
    email = email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EMAIL', message: 'Email requis' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Find user (email is already normalized to lowercase)
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success (don't reveal if user exists)
    if (!user) {
      return res.json({
        success: true,
        data: { message: 'Si ce compte existe, un email de réinitialisation a été envoyé' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpires,
      },
    });

    // Send reset email (async)
    const resetUrl = `${process.env.FRONTEND_URL || 'https://test.simplifaq.ch'}/reset-password?token=${resetToken}`;
    
    import('../services/emailService').then(({ EmailService }) => {
      EmailService.sendTemplateEmail({
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe',
        templateName: 'password_reset',
        templateData: {
          firstName: user.firstName,
          companyName: user.companyName,
          resetUrl,
          expiresIn: '1 heure',
        },
        language: 'fr',
      }).catch(err => console.error('Failed to send password reset email:', err));
    });

    console.log(`Password reset requested for ${email}`);

    res.json({
      success: true,
      data: { message: 'Si ce compte existe, un email de réinitialisation a été envoyé' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
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
 * Reset password with token
 */
export const resetPassword = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Token et nouveau mot de passe requis' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Le mot de passe doit contenir au moins 8 caractères' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpires: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
        updatedAt: new Date(),
      },
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    console.log(`Password reset successful for ${user.email}`);

    res.json({
      success: true,
      data: { message: 'Mot de passe réinitialisé avec succès' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
