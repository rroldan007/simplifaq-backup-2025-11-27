import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../services/database';
import { ApiResponse, AppError } from '../types';
import { generateTokenPair } from '../utils/tokenUtils';
import {
  validateSwissPostalCode,
  validateSwissCanton,
  validateSwissPhone,
  formatSwissPhone,
  formatSwissVATNumber,
  validateSwissVATNumber,
  validateEmail,
} from '../utils/swissValidation';
import * as IBAN from 'iban';
import { securityLogger } from '../middleware/security';
import { encrypt, decrypt } from '../utils/encryption';
import { securityAuditService, SecurityEventType } from '../services/securityAuditService';

/**
 * Change current user's password
 */
export const changePassword = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Utilisateur non authentifié' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string };
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Ancien et nouveau mot de passe requis' },
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_OLD_PASSWORD', message: 'Ancien mot de passe incorrect' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed, updatedAt: new Date() } });

    return res.json({
      success: true,
      data: { message: 'Mot de passe modifié avec succès' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Register a new Swiss company
 */
export const registerCompany = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    let {
      email,
      password,
      confirmPassword,
      companyName,
      firstName,
      lastName,
      vatNumber,
      phone,
      website,
      street,
      city,
      postalCode,
      canton,
      iban,
      subscribeNewsletter,
    } = req.body;

    // Normalize email to lowercase to prevent case-sensitive duplicates
    email = email?.trim().toLowerCase();

    // Validation
    if (!email || !password || !companyName || !firstName || !lastName || !street || !city || !postalCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Tous les champs obligatoires doivent être remplis',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Password confirmation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_MISMATCH',
          message: 'Les mots de passe ne correspondent pas',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Le mot de passe doit contenir au moins 8 caractères',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Email validation
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Format d\'email invalide',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Swiss postal code validation
    if (!validateSwissPostalCode(postalCode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POSTAL_CODE',
          message: 'Code postal suisse invalide (doit être 4 chiffres)',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Swiss canton validation
    if (canton && !validateSwissCanton(canton)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CANTON',
          message: 'Canton suisse invalide',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Swiss VAT number validation (if provided)
    if (vatNumber && !validateSwissVATNumber(vatNumber)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VAT_NUMBER',
          message: 'Numéro de TVA suisse invalide (format: CHE-XXX.XXX.XXX)',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Phone validation (if provided)
    if (phone && !validateSwissPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: 'Numéro de téléphone suisse invalide',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Check if user already exists (email is already normalized to lowercase)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'Un compte avec cette adresse email existe déjà',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email confirmation token for LPD compliance (24 hours validity)
    const emailConfirmToken = crypto.randomBytes(32).toString('hex');
    const emailConfirmTokenHash = await bcrypt.hash(emailConfirmToken, 10);
    const emailConfirmTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        companyName,
        firstName,
        lastName,
        vatNumber: vatNumber ? formatSwissVATNumber(vatNumber) : null,
        phone: phone ? formatSwissPhone(phone) : null,
        website,
        street,
        city,
        postalCode,
        country: 'Switzerland',
        canton: canton?.toUpperCase() || null,
        iban,
        language: 'fr', // Application in French
        currency: 'CHF', // Default to Swiss Francs
        subscriptionPlan: 'free', // Start with free plan
        subscribeNewsletter: subscribeNewsletter || false, // Newsletter subscription
        emailConfirmed: false, // Requires LPD confirmation
        emailConfirmToken: emailConfirmTokenHash, // Hashed token
        emailConfirmTokenExpires, // 24 hour expiration
      },
    });

    // Log successful registration
    securityLogger.info('User registration successful - email confirmation required', {
      userId: user.id,
      email: user.email,
      companyName: user.companyName,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    // Send email confirmation (LPD compliance - double opt-in)
    const confirmationUrl = `${process.env.FRONTEND_URL || 'https://test.simplifaq.ch'}/auth/confirm-email?token=${emailConfirmToken}`;
    
    import('../services/emailService').then(async ({ EmailService }) => {
      const confirmationEmailData = {
        to: user.email,
        subject: 'Confirmez votre adresse email - SimpliFaq',
        templateName: 'email_confirmation',
        templateData: {
          firstName: user.firstName,
          companyName: user.companyName,
          confirmationUrl,
          expiresIn: '24 heures',
          registeredAt: new Date().toLocaleString('fr-CH', { 
            dateStyle: 'full', 
            timeStyle: 'short',
            timeZone: 'Europe/Zurich'
          }),
        },
        language: 'fr',
      };

      // Send confirmation email to user (LPD compliance)
      EmailService.sendTemplateEmail(confirmationEmailData)
        .catch(err => console.error('Failed to send confirmation email to user:', err));

      // Notify admin about new registration (pending confirmation)
      try {
        const adminEmail = process.env.EMAIL_FROM || 'contact@simplifaq.ch';
        EmailService.sendTemplateEmail({
          to: adminEmail,
          subject: `[Nouveau compte - En attente] ${user.companyName} - ${user.firstName} ${user.lastName}`,
          templateName: 'admin_new_registration',
          templateData: {
            firstName: user.firstName,
            lastName: user.lastName,
            companyName: user.companyName,
            email: user.email,
            subscribeNewsletter: user.subscribeNewsletter,
            registeredAt: new Date().toLocaleString('fr-CH'),
          },
          language: 'fr',
        }).catch(err => console.error('Failed to send notification to admin:', err));
      } catch (err) {
        console.error('Failed to send admin notification:', err);
      }
    });

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        message: 'Compte créé avec succès. Veuillez confirmer votre adresse email pour accéder à votre tableau de bord.',
        requiresEmailConfirmation: true,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Registration error:', error);
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
 * Update current user profile (company/billing info)
 */
export const updateProfile = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Utilisateur non authentifié' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    
    // Log the incoming request body for debugging
    console.log('Update profile request body:', JSON.stringify(req.body, null, 2));

    const {
      companyName,
      firstName,
      lastName,
      vatNumber,
      phone,
      website,
      street,
      city,
      postalCode,
      canton,
      country,
      iban,
      logoUrl,
      recurrenceBasePreference,
      bankApiKey,
      bankApiProvider,
      bankSyncEnabled,
      bankSyncStatus,
      qrReferenceMode,
      qrReferencePrefix,
      // PDF appearance fields
      pdfPrimaryColor,
      pdfTemplate,
      pdfShowCompanyNameWithLogo,
      pdfShowVAT,
      pdfShowPhone,
      pdfShowEmail,
      pdfShowWebsite,
      pdfShowIBAN,
      // Numbering fields
      invoicePrefix,
      nextInvoiceNumber,
      invoicePadding,
      quotePrefix,
      nextQuoteNumber,
      quotePadding,
      quantityDecimals,
    } = req.body;

    // --- Build a secure update object ---
    const dataToUpdate: any = {};

    if (companyName !== undefined) dataToUpdate.companyName = companyName;
    if (firstName !== undefined) dataToUpdate.firstName = firstName;
    if (lastName !== undefined) dataToUpdate.lastName = lastName;
    if (website !== undefined) dataToUpdate.website = website;
    if (street !== undefined) dataToUpdate.street = street;
    if (city !== undefined) dataToUpdate.city = city;
    if (country !== undefined) dataToUpdate.country = country;
    
    // Handle fields with validation and formatting
    if (postalCode !== undefined) {
      if (!validateSwissPostalCode(postalCode)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_POSTAL_CODE', message: 'Code postal suisse invalide (4 chiffres)' }, timestamp: new Date().toISOString() } as ApiResponse);
      }
      dataToUpdate.postalCode = postalCode;
    }

    if (canton !== undefined) {
      if (!validateSwissCanton(canton)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_CANTON', message: 'Canton suisse invalide' }, timestamp: new Date().toISOString() } as ApiResponse);
      }
      dataToUpdate.canton = canton;
    }

    if (phone !== undefined) {
      if (phone && !validateSwissPhone(phone)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PHONE', message: 'Numéro de téléphone suisse invalide' }, timestamp: new Date().toISOString() } as ApiResponse);
      }
      dataToUpdate.phone = phone ? formatSwissPhone(phone) : phone;
    }

    // Initialize dataToUpdate.vatNumber to ensure it's included in the update
    if (vatNumber !== undefined) {
      try {
        // If vatNumber is an empty string, treat it as null to clear the field
        const cleanVAT = vatNumber ? String(vatNumber).trim() : '';
        
        console.log('Processing VAT number:', { original: vatNumber, clean: cleanVAT });
        
        // Only validate if VAT number is not empty
        if (cleanVAT) {
          // Basic validation: at least 6 characters
          if (cleanVAT.length < 6) {
            console.error('VAT number is too short:', { cleanVAT });
            return res.status(400).json({ 
              success: false, 
              error: { 
                code: 'INVALID_VAT_NUMBER', 
                message: 'Le numéro de TVA est trop court' 
              }, 
              timestamp: new Date().toISOString() 
            } as ApiResponse);
          }
          
          // Format the VAT number but don't fail validation if format is unexpected
          dataToUpdate.vatNumber = formatSwissVATNumber(cleanVAT);
        } else {
          // Explicitly set to null to clear the VAT number
          dataToUpdate.vatNumber = null;
        }
      } catch (error) {
        console.error('Error processing VAT number:', { vatNumber, error });
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VAT_NUMBER',
            message: 'Erreur lors du traitement du numéro de TVA',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
          },
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }
    
    if (iban !== undefined) {
      try {
        // Convert to string and clean up
        const originalIban = String(iban).trim();
        const formattedIban = originalIban ? originalIban.replace(/\s+/g, '').toUpperCase() : '';
        
        console.log('Processing IBAN:', { 
          original: originalIban,
          formatted: formattedIban,
          length: formattedIban.length,
          isSwiss: formattedIban.startsWith('CH')
        });
        
        // Only validate if IBAN is not empty
        if (formattedIban) {
          // Basic format check (CH followed by digits/letters, 21 chars total)
          if (!/^CH[0-9A-Z]{19}$/.test(formattedIban)) {
            console.error('IBAN format is invalid:', { formattedIban });
            return res.status(400).json({ 
              success: false, 
              error: { 
                code: 'INVALID_IBAN_FORMAT',
                message: `Format IBAN invalide. Format attendu: CHXX XXXX XXXX XXXX XXXX X`,
                details: { formattedIban, length: formattedIban.length }
              },
              timestamp: new Date().toISOString()
            });
          }
          
          // Try to validate with IBAN library, but don't fail if it's a Swiss IBAN
          if (!IBAN.isValid(formattedIban)) {
            console.warn('IBAN failed library validation but will be accepted:', { formattedIban });
            // Continue anyway since we've already checked the basic format
          }
        }
        
        // Save the formatted IBAN (or empty string to clear it)
        dataToUpdate.iban = formattedIban;
      } catch (error) {
        console.error('Error processing IBAN:', { iban, error });
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IBAN',
            message: 'Erreur lors du traitement de l\'IBAN',
            details: error instanceof Error ? error.message : String(error)
          },
          timestamp: new Date().toISOString()
        } as ApiResponse);
      }
    }

    if (logoUrl !== undefined) {
      if (logoUrl && typeof logoUrl !== 'string') {
        return res.status(400).json({ success: false, error: { code: 'INVALID_LOGO_URL', message: 'URL du logo invalide' }, timestamp: new Date().toISOString() } as ApiResponse);
      }
      // If logoUrl is an empty string, treat it as null to allow deletion.
      // Otherwise, update with the new URL. If undefined, this block is skipped.
      dataToUpdate.logoUrl = logoUrl || null;
    }

    if (bankApiKey !== undefined) {
      if (bankApiKey === null || bankApiKey === '') {
        dataToUpdate.bankApiKey = null;
      } else if (typeof bankApiKey === 'string') {
        try {
          dataToUpdate.bankApiKey = encrypt(bankApiKey.trim());
        } catch (error) {
          console.error('Error encrypting bank API key:', error);
          return res.status(500).json({
            success: false,
            error: {
              code: 'BANK_API_KEY_ENCRYPTION_FAILED',
              message: 'Erreur lors du chiffrement de la clé API bancaire',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse);
        }
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BANK_API_KEY',
            message: 'Clé API bancaire invalide',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    if (bankApiProvider !== undefined) {
      if (bankApiProvider === null || bankApiProvider === '') {
        dataToUpdate.bankApiProvider = null;
      } else if (typeof bankApiProvider === 'string') {
        dataToUpdate.bankApiProvider = bankApiProvider.trim().toLowerCase();
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BANK_API_PROVIDER',
            message: 'Fournisseur de banque invalide',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    if (bankSyncEnabled !== undefined) {
      if (typeof bankSyncEnabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BANK_SYNC_ENABLED',
            message: 'Le paramètre de synchronisation bancaire doit être un booléen',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
      dataToUpdate.bankSyncEnabled = bankSyncEnabled;
    }

    if (bankSyncStatus !== undefined) {
      if (bankSyncStatus === null || bankSyncStatus === '') {
        dataToUpdate.bankSyncStatus = null;
      } else if (typeof bankSyncStatus === 'string') {
        dataToUpdate.bankSyncStatus = bankSyncStatus.trim().toLowerCase();
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BANK_SYNC_STATUS',
            message: 'Statut de synchronisation bancaire invalide',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    if (qrReferenceMode !== undefined) {
      if (typeof qrReferenceMode !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QR_REFERENCE_MODE',
            message: 'Mode de référence QR invalide',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      const normalizedMode = qrReferenceMode.trim().toLowerCase();
      const allowedModes = ['auto', 'disabled', 'manual'];
      if (!allowedModes.includes(normalizedMode)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QR_REFERENCE_MODE',
            message: 'Mode de référence QR invalide (auto, disabled, manual)',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      dataToUpdate.qrReferenceMode = normalizedMode;
    }

    if (qrReferencePrefix !== undefined) {
      if (qrReferencePrefix === null || qrReferencePrefix === '') {
        dataToUpdate.qrReferencePrefix = null;
      } else if (typeof qrReferencePrefix === 'string') {
        const trimmedPrefix = qrReferencePrefix.trim();
        if (!/^[A-Za-z0-9]{0,8}$/.test(trimmedPrefix)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_QR_REFERENCE_PREFIX',
              message: 'Le préfixe QR doit contenir 1 à 8 caractères alphanumériques',
            },
            timestamp: new Date().toISOString(),
          } as ApiResponse);
        }
        dataToUpdate.qrReferencePrefix = trimmedPrefix.toUpperCase();
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QR_REFERENCE_PREFIX',
            message: 'Préfixe de référence QR invalide',
          },
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }
    }

    // PDF appearance settings
    if (pdfPrimaryColor !== undefined) dataToUpdate.pdfPrimaryColor = pdfPrimaryColor;
    if (pdfTemplate !== undefined) dataToUpdate.pdfTemplate = pdfTemplate;
    if (pdfShowCompanyNameWithLogo !== undefined) dataToUpdate.pdfShowCompanyNameWithLogo = pdfShowCompanyNameWithLogo;
    if (pdfShowVAT !== undefined) dataToUpdate.pdfShowVAT = pdfShowVAT;
    if (pdfShowPhone !== undefined) dataToUpdate.pdfShowPhone = pdfShowPhone;
    if (pdfShowEmail !== undefined) dataToUpdate.pdfShowEmail = pdfShowEmail;
    if (pdfShowWebsite !== undefined) dataToUpdate.pdfShowWebsite = pdfShowWebsite;
    if (pdfShowIBAN !== undefined) dataToUpdate.pdfShowIBAN = pdfShowIBAN;

    // Numbering settings
    if (invoicePrefix !== undefined) dataToUpdate.invoicePrefix = invoicePrefix;
    if (nextInvoiceNumber !== undefined) dataToUpdate.nextInvoiceNumber = nextInvoiceNumber;
    if (invoicePadding !== undefined) dataToUpdate.invoicePadding = invoicePadding;
    if (quotePrefix !== undefined) dataToUpdate.quotePrefix = quotePrefix;
    if (nextQuoteNumber !== undefined) dataToUpdate.nextQuoteNumber = nextQuoteNumber;
    if (quotePadding !== undefined) dataToUpdate.quotePadding = quotePadding;
    if (quantityDecimals !== undefined) dataToUpdate.quantityDecimals = quantityDecimals;

    // Only proceed if there is something to update
    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_DATA_TO_UPDATE', message: 'Aucune donnée fournie pour la mise à jour' },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    
    dataToUpdate.updatedAt = new Date();

    // Perform secure update
    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    const {
      password: _password,
      bankApiKey: encryptedBankApiKey,
      ...rest
    } = updated as typeof updated & { password?: string; bankApiKey?: string | null };

    let decryptedBankApiKey: string | null | undefined = bankApiKey === undefined ? undefined : null;
    if (encryptedBankApiKey && bankApiKey !== undefined) {
      try {
        decryptedBankApiKey = decrypt(encryptedBankApiKey);
      } catch (error) {
        console.warn('Failed to decrypt bank API key after update:', error);
        decryptedBankApiKey = null;
      }
    }

    return res.json({
      success: true,
      data: {
        user: {
          ...rest,
          bankApiKey: decryptedBankApiKey,
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Check if it's a validation error
    if (error instanceof Error && error.message.includes('Validation')) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Erreur de validation des données',
          details: error.message
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    
    // Check if it's a Prisma error
    if (error instanceof Error && error.name.includes('Prisma')) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'DATABASE_ERROR', 
          message: 'Erreur de base de données',
          details: error.message
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
    
    // Default error response
    return res.status(500).json({
      success: false,
      error: { 
        code: 'INTERNAL_SERVER_ERROR', 
        message: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<Response | void> => {
  console.log('Login attempt for email:', req.body.email);
  try {
    let { email, password } = req.body;

    // Normalize email to lowercase to match registration behavior
    email = email?.trim().toLowerCase();

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email et mot de passe requis',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Find user (email is already normalized to lowercase)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      console.log('User found:', user.id);
    } else {
      console.log('User not found for email:', email);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Compte désactivé',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Generate token pair
    const tokenPair = generateTokenPair(user.id, user.email);

    // Atomically delete old session and create a new one
    await prisma.$transaction(async (tx) => {
      // 1. Delete any existing session for this user to prevent unique constraint errors
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      // 2. Create the new session
      // Convert Date to ISO string for SQLite compatibility
      const expiresAtDate = tokenPair.accessExpiresAt instanceof Date 
        ? tokenPair.accessExpiresAt 
        : new Date(tokenPair.accessExpiresAt);
      const refreshExpiresAtDate = tokenPair.refreshExpiresAt instanceof Date
        ? tokenPair.refreshExpiresAt
        : new Date(tokenPair.refreshExpiresAt);
      
      await tx.session.create({
        data: {
          userId: user.id,
          token: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresAt: expiresAtDate.toISOString() as any,
          refreshExpiresAt: refreshExpiresAtDate.toISOString() as any,
          createdAt: new Date().toISOString() as any,
          updatedAt: new Date().toISOString() as any,
        },
      });
    });

    // Log successful login
    securityLogger.info('User login successful', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      data: {
        user: userResponse,
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.accessExpiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Login error:', error);
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
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const userId = (req as any).userId; // Set by auth middleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const {
      password: _password,
      bankApiKey: encryptedBankApiKey,
      ...rest
    } = user as typeof user & { password?: string; bankApiKey?: string | null };

    let decryptedBankApiKey: string | null = null;
    if (encryptedBankApiKey) {
      try {
        decryptedBankApiKey = decrypt(encryptedBankApiKey);
      } catch (error) {
        console.warn('Failed to decrypt bank API key for profile response:', error);
        decryptedBankApiKey = null;
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          ...rest,
          bankApiKey: decryptedBankApiKey,
        },
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Get profile error:', error);
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
 * Refresh access token using refresh token
 */
export const refreshToken = async (req: Request, res: Response): Promise<Response | void> => {
  const operationId = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  securityAuditService.startPerformanceMonitoring(operationId);
  
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      securityLogger.warn('Token refresh attempt without refresh token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });

      securityAuditService.logTokenEvent(
        SecurityEventType.TOKEN_REFRESH_FAILURE,
        req,
        undefined,
        undefined,
        { reason: 'missing_refresh_token' }
      );

      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Token de rafraîchissement requis',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Find session with refresh token
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) {
      securityLogger.warn('Token refresh attempt with invalid refresh token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        refreshTokenPrefix: refreshToken.substring(0, 10) + '...', 
        timestamp: new Date().toISOString(),
      });

      securityAuditService.logTokenEvent(
        SecurityEventType.INVALID_TOKEN_ATTEMPT,
        req,
        undefined,
        undefined,
        {
          reason: 'invalid_refresh_token',
          tokenPrefix: refreshToken.substring(0, 10) + '...'
        }
      );

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Token de rafraîchissement invalide',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Check if refresh token is expired (Session date fields are stored as ISO strings in SQLite)
    if (new Date((session as any).refreshExpiresAt) < new Date()) {
      securityLogger.warn('Token refresh attempt with expired refresh token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: session.userId,
        refreshExpired: session.refreshExpiresAt,
        timestamp: new Date().toISOString(),
      });

      securityAuditService.logTokenEvent(
        SecurityEventType.TOKEN_REFRESH_EXPIRED,
        req,
        session.userId,
        session.id,
        {
          expiredAt: new Date((session as any).refreshExpiresAt).toISOString(),
          timeSinceExpiry: Date.now() - new Date((session as any).refreshExpiresAt).getTime()
        }
      );

      // Remove expired session
      await prisma.session.delete({
        where: { id: session.id },
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Token de rafraîchissement expiré',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Check if user is active
    if (!session.user?.isActive) {
      securityLogger.warn('Token refresh attempt for disabled account', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: session.userId,
        userEmail: session.user?.email,
        timestamp: new Date().toISOString(),
      });

      securityAuditService.logTokenEvent(
        SecurityEventType.TOKEN_REFRESH_FAILURE,
        req,
        session.userId,
        session.id,
        {
          reason: 'account_disabled',
          userEmail: session.user?.email
        }
      );

      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Compte désactivé',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Generate new token pair (refresh token rotation)
    const newTokenPair = generateTokenPair(session.user.id, session.user.email);

    // Update session with new tokens
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newTokenPair.accessToken,
        refreshToken: newTokenPair.refreshToken,
        expiresAt: newTokenPair.accessExpiresAt.toISOString() as any,
        refreshExpiresAt: newTokenPair.refreshExpiresAt.toISOString() as any,
        updatedAt: new Date().toISOString() as any,
      },
    });

    // End performance monitoring and get metrics
    const performanceMetrics = securityAuditService.endPerformanceMonitoring(
      operationId,
      req,
      session.user.id,
      session.id
    );

    // Log successful token refresh
    securityLogger.info('Token refresh successful', {
      userId: session.user.id,
      email: session.user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    securityAuditService.logTokenEvent(
      SecurityEventType.TOKEN_REFRESH_SUCCESS,
      req,
      session.user.id,
      session.id,
      {
        tokenRotated: true,
        previousTokenPrefix: refreshToken.substring(0, 10) + '...', 
        newTokenExpiresAt: newTokenPair.accessExpiresAt.toISOString()
      },
      performanceMetrics || undefined
    );

    res.json({
      success: true,
      data: {
        token: newTokenPair.accessToken,
        refreshToken: newTokenPair.refreshToken,
        expiresAt: newTokenPair.accessExpiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    // End performance monitoring for failed operations
    securityAuditService.endPerformanceMonitoring(
      operationId,
      req,
      undefined,
      undefined,
      { error: true }
    );

    securityLogger.error('Token refresh error', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    securityAuditService.logTokenEvent(
      SecurityEventType.TOKEN_REFRESH_FAILURE,
      req,
      undefined,
      undefined,
      {
        reason: 'internal_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );

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
 * Confirm email address (LPD compliance - double opt-in)
 */
export const confirmEmail = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Token de confirmation manquant',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Find user with matching token (not expired)
    const users = await prisma.user.findMany({
      where: {
        emailConfirmed: false,
        emailConfirmTokenExpires: {
          gte: new Date(), // Token not expired
        },
      },
    });

    // Find user by comparing hashed token
    let user = null;
    for (const u of users) {
      if (u.emailConfirmToken) {
        const isValid = await bcrypt.compare(token, u.emailConfirmToken);
        if (isValid) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Token de confirmation invalide ou expiré',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Update user to mark email as confirmed
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailConfirmed: true,
        emailConfirmedAt: new Date(),
        emailConfirmToken: null,
        emailConfirmTokenExpires: null,
      },
    });

    // Auto-login user after email confirmation
    const { accessToken, refreshToken } = await generateTokenPair(updatedUser.id, updatedUser.email);

    // Create session in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const now = new Date();
    
    await prisma.session.create({
      data: {
        userId: updatedUser.id,
        token: accessToken,
        refreshToken,
        expiresAt: expiresAt.toISOString(),
        refreshExpiresAt: refreshExpiresAt.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });

    // Log successful email confirmation
    securityLogger.info('Email confirmation successful', {
      userId: updatedUser.id,
      email: updatedUser.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    // Send welcome email now that email is confirmed (LPD compliant)
    import('../services/emailService').then(async ({ EmailService }) => {
      const welcomeEmailData = {
        to: updatedUser.email,
        subject: 'Bienvenue sur SimpliFaq! 🎉 Votre compte est actif',
        templateName: 'welcome',
        templateData: {
          firstName: updatedUser.firstName,
          companyName: updatedUser.companyName,
          dashboardUrl: `${process.env.FRONTEND_URL || 'https://test.simplifaq.ch'}/dashboard`,
        },
        language: 'fr',
      };

      // Send welcome email to user
      EmailService.sendTemplateEmail(welcomeEmailData)
        .catch(err => console.error('Failed to send welcome email:', err));

      // Notify admin that user confirmed email
      try {
        const adminEmail = process.env.EMAIL_FROM || 'contact@simplifaq.ch';
        EmailService.sendTemplateEmail({
          to: adminEmail,
          subject: `[Compte confirmé] ${updatedUser.companyName} - ${updatedUser.firstName} ${updatedUser.lastName}`,
          templateName: 'admin_email_confirmed',
          templateData: {
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            companyName: updatedUser.companyName,
            email: updatedUser.email,
            subscribeNewsletter: updatedUser.subscribeNewsletter,
            confirmedAt: new Date().toLocaleString('fr-CH'),
          },
          language: 'fr',
        }).catch(err => console.error('Failed to send admin notification:', err));
      } catch (err) {
        console.error('Failed to send admin notification:', err);
      }
    });

    return res.json({
      success: true,
      data: {
        message: 'Votre adresse email a été confirmée avec succès',
        emailConfirmed: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          companyName: updatedUser.companyName,
          emailConfirmed: true,
        },
        accessToken,
        refreshToken,
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Email confirmation error:', error);
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
 * Logout user
 */
export const logout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Remove session from database
      await prisma.session.deleteMany({
        where: { token },
      });

      // Log successful logout
      securityLogger.info('User logout successful', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: { message: 'Déconnexion réussie' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Logout error:', error);
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
 * Resend email confirmation
 */
export const resendConfirmationEmail = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Adresse email invalide',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        data: {
          message: 'Si cette adresse email existe dans notre système, un email de confirmation a été envoyé.',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Check if email is already confirmed
    if (user.emailConfirmed) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_CONFIRMED',
          message: 'Cette adresse email est déjà confirmée.',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Generate new confirmation token
    const emailConfirmToken = crypto.randomBytes(32).toString('hex');
    const emailConfirmTokenHash = await bcrypt.hash(emailConfirmToken, 10);
    const emailConfirmTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailConfirmToken: emailConfirmTokenHash,
        emailConfirmTokenExpires,
      },
    });

    // Send confirmation email
    const confirmationUrl = `${process.env.FRONTEND_URL || 'https://my.simplifaq.ch'}/auth/confirm-email?token=${emailConfirmToken}`;
    
    import('../services/emailService').then(async ({ EmailService }) => {
      const confirmationEmailData = {
        to: user.email,
        subject: 'Confirmez votre adresse email - SimpliFaq',
        templateName: 'email_confirmation',
        templateData: {
          firstName: user.firstName,
          confirmationLink: confirmationUrl,
        },
        language: 'fr',
      };
      
      await EmailService.sendTemplateEmail(confirmationEmailData);
    }).catch(err => {
      console.error('Failed to send confirmation email:', err);
    });

    // Log successful resend
    securityLogger.info('Confirmation email resent', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: {
        message: 'Email de confirmation renvoyé avec succès!',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Resend confirmation email error:', error);
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
