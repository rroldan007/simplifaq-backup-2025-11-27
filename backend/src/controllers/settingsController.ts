import { Request, Response } from 'express';
import { prisma } from '../services/database';
import { ApiResponse, AppError } from '../types';

// PATCH /api/settings/invoicing-numbering
// Body: { prefix: string, nextNumber: number, padding: number }
export const updateInvoicingNumbering = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { prefix, nextNumber, padding } = req.body || {};

    // Basic validations (French messages)
    const sanitizedPrefix = typeof prefix === 'string' ? prefix.trim() : undefined;
    if (sanitizedPrefix !== undefined) {
      if (sanitizedPrefix.length > 16) {
        throw new AppError('Le préfixe est trop long (max 16 caractères).', 400, 'INVALID_PREFIX');
      }
      if (!/^[-_A-Za-z0-9]*$/.test(sanitizedPrefix)) {
        throw new AppError('Le préfixe ne doit contenir que des lettres, chiffres, tirets et underscores.', 400, 'INVALID_PREFIX');
      }
    }

    const sanitizedNext = nextNumber !== undefined ? Number(nextNumber) : undefined;
    if (sanitizedNext !== undefined) {
      if (!Number.isFinite(sanitizedNext) || sanitizedNext < 1 || sanitizedNext > 999999) {
        throw new AppError('Le prochain numéro doit être un entier entre 1 et 999999.', 400, 'INVALID_NEXT_NUMBER');
      }
    }

    const sanitizedPad = padding !== undefined ? Number(padding) : undefined;
    if (sanitizedPad !== undefined) {
      if (!Number.isInteger(sanitizedPad) || sanitizedPad < 0 || sanitizedPad > 6) {
        throw new AppError('Le padding doit être un entier entre 0 et 6.', 400, 'INVALID_PADDING');
      }
    }

    const data: any = {};
    if (sanitizedPrefix !== undefined) data.invoicePrefix = sanitizedPrefix;
    if (sanitizedNext !== undefined) data.nextInvoiceNumber = sanitizedNext;
    if (sanitizedPad !== undefined) data.invoicePadding = sanitizedPad;

    if (Object.keys(data).length === 0) {
      throw new AppError('Aucune donnée à mettre à jour.', 400, 'NO_UPDATE');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        invoicePrefix: true,
        nextInvoiceNumber: true,
        invoicePadding: true,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};

// PATCH /api/settings/quantity-decimals
// Body: { quantityDecimals: 2 | 3 }
export const updateQuantityDecimals = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { quantityDecimals } = req.body || {};

    // Validate presence and allowed values
    if (quantityDecimals === undefined || quantityDecimals === null) {
      throw new AppError('Le champ quantityDecimals est requis.', 400, 'INVALID_QUANTITY_DECIMALS');
    }

    const parsed = Number(quantityDecimals);
    if (!Number.isInteger(parsed) || (parsed !== 2 && parsed !== 3)) {
      throw new AppError('La précision doit être 2 ou 3 décimales.', 400, 'INVALID_QUANTITY_DECIMALS');
    }

    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data: { quantityDecimals: parsed },
      // Select only id for now to avoid type mismatch before Prisma client is regenerated
      select: { id: true },
    });

    const response: ApiResponse = {
      success: true,
      data: { ...updated, quantityDecimals: parsed },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};
