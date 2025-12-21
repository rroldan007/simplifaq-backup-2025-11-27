import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ApiResponse, AppError } from '../types';
import { DiscountType, validateDiscount } from '../utils/discountCalculations';

const prisma = new PrismaClient();

const baseProductSchema = z.object({
  name: z.string().min(1, 'Le nom du produit est requis').max(255),
  description: z.string().nullable().optional(),
  unitPrice: z.number().positive('Le prix unitaire doit être positif'),
  tvaRate: z.number().min(0, 'Le taux TVA ne peut pas être négatif').max(100, 'Le taux TVA ne peut pas dépasser 100%'),
  unit: z.string().min(1, 'L\'unité est requise').max(50).default('piece'),
  // SKU / Barcode fields
  sku: z.string().max(50).nullable().optional(),
  barcodeType: z.enum(['EAN13', 'EAN8', 'CODE128', 'QR']).nullable().optional(),
  isVariableWeight: z.boolean().default(false),
  weightUnit: z.enum(['kg', 'g', 'lb']).nullable().optional(),
  // Discount fields - accept null and convert to undefined
  discountValue: z.number().min(0, 'La valeur du rabais ne peut pas être négative').nullable().optional(),
  discountType: z.enum(['PERCENT', 'AMOUNT']).nullable().optional(),
  discountActive: z.boolean().default(false),
});

const createProductSchema = baseProductSchema.refine(
  (data) => {
    // If discount is active, require both value and type
    if (data.discountActive && (!data.discountValue || !data.discountType)) {
      return false;
    }
    // If discount value or type is provided, validate
    if (data.discountValue && data.discountType) {
      const validation = validateDiscount(
        data.discountValue,
        data.discountType as DiscountType,
        data.unitPrice
      );
      return validation.isValid;
    }
    return true;
  },
  {
    message: 'Configuration de rabais invalide',
  }
).transform((data) => ({
  ...data,
  // Convert null to undefined for database compatibility
  discountValue: data.discountValue ?? undefined,
  discountType: data.discountType ?? undefined,
  sku: data.sku ?? undefined,
  barcodeType: data.barcodeType ?? undefined,
  weightUnit: data.weightUnit ?? undefined,
}));

const updateProductSchema = baseProductSchema.partial().refine(
  (data) => {
    // If discount is active, require both value and type
    if (data.discountActive && (!data.discountValue || !data.discountType)) {
      return false;
    }
    // If discount value or type is provided, validate
    if (data.discountValue && data.discountType && data.unitPrice) {
      const validation = validateDiscount(
        data.discountValue,
        data.discountType as DiscountType,
        data.unitPrice
      );
      return validation.isValid;
    }
    return true;
  },
  {
    message: 'Configuration de rabais invalide',
  }
).transform((data) => ({
  ...data,
  // Convert null to undefined for database compatibility
  discountValue: data.discountValue ?? undefined,
  discountType: data.discountType ?? undefined,
  sku: data.sku ?? undefined,
  barcodeType: data.barcodeType ?? undefined,
  weightUnit: data.weightUnit ?? undefined,
}));

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { search, isActive } = req.query;
    const where: any = { userId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    const response: ApiResponse = {
      success: true,
      data: {
        products: products,
        total: products.length,
        hasMore: false // For now, we're not implementing pagination
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching products:', error);

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

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Log incoming data for debugging
    console.log('[CREATE_PRODUCT] Incoming data:', JSON.stringify(req.body, null, 2));

    const validatedData = createProductSchema.parse(req.body);
    
    // Log validated data
    console.log('[CREATE_PRODUCT] Validated data:', JSON.stringify(validatedData, null, 2));
    
    const product = await prisma.product.create({
      data: { ...validatedData, userId },
    });

    const response: ApiResponse = {
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: error.issues },
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

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

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!product) {
      throw new AppError('Produit non trouvé', 404, 'PRODUCT_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching product:', error);

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

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    
    // Log incoming data for debugging
    console.log('[UPDATE_PRODUCT] Product ID:', id);
    console.log('[UPDATE_PRODUCT] Incoming data:', JSON.stringify(req.body, null, 2));
    
    const validatedData = updateProductSchema.parse(req.body);
    
    // Log validated data
    console.log('[UPDATE_PRODUCT] Validated data:', JSON.stringify(validatedData, null, 2));

    const existingProduct = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!existingProduct) {
      throw new AppError('Produit non trouvé', 404, 'PRODUCT_NOT_FOUND');
    }

    const product = await prisma.product.update({
      where: { id },
      data: validatedData,
    });

    const response: ApiResponse = {
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating product:', error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: error.issues },
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

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

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const existingProduct = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!existingProduct) {
      throw new AppError('Produit non trouvé', 404, 'PRODUCT_NOT_FOUND');
    }

    const invoiceItemsCount = await prisma.invoiceItem.count({
      where: { productId: id },
    });

    if (invoiceItemsCount > 0) {
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Produit désactivé car utilisé dans des factures existantes',
          product,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
      return;
    } else {
      await prisma.product.delete({ where: { id } });

      const response: ApiResponse = {
        success: true,
        data: { message: 'Produit supprimé avec succès' },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
      return;
    }
  } catch (error) {
    console.error('Error deleting product:', error);

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

export const duplicateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const existingProduct = await prisma.product.findFirst({
      where: { id, userId },
    });

    if (!existingProduct) {
      throw new AppError('Produit non trouvé', 404, 'PRODUCT_NOT_FOUND');
    }

    // Create a duplicate with "(Copie)" suffix
    const duplicatedProduct = await prisma.product.create({
      data: {
        name: `${existingProduct.name} (Copie)`,
        description: existingProduct.description,
        unitPrice: existingProduct.unitPrice,
        tvaRate: existingProduct.tvaRate,
        unit: existingProduct.unit,
        isActive: existingProduct.isActive,
        discountValue: existingProduct.discountValue,
        discountType: existingProduct.discountType,
        discountActive: existingProduct.discountActive,
        userId,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: duplicatedProduct,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error duplicating product:', error);

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
