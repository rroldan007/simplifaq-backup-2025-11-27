import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiResponse, AppError } from '../types';
import { prisma } from '../services/database';

// Note: Use shared Prisma client from services/database to avoid multiple client instances in dev

// Validation schemas
const createClientSchema = z.object({
  email: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val.trim() === '') return '';
    return val.trim();
  }).refine(val => val === '' || z.string().email().safeParse(val).success, {
    message: 'Email invalide'
  }),
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.object({
    street: z.string().min(1, 'Rue requise'),
    city: z.string().min(1, 'Ville requise'),
    postalCode: z.string().regex(/^\d{4}$/, 'Code postal suisse invalide (4 chiffres requis)'),
    country: z.string().default('Switzerland'),
    canton: z.string().optional(),
  }),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  language: z.enum(['de', 'fr', 'it', 'en']).default('fr'),
  paymentTerms: z.number().min(0).max(365).default(30),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // Either companyName is provided, or both firstName and lastName are provided
  const hasCompany = data.companyName && data.companyName.trim().length > 0;
  const hasIndividual = data.firstName && data.firstName.trim().length > 0 && 
                       data.lastName && data.lastName.trim().length > 0;
  return hasCompany || hasIndividual;
}, {
  message: "Veuillez fournir soit un nom d'entreprise, soit un prénom et nom",
  path: ["companyName"] // This will show the error on the companyName field
});

const updateClientSchema = z.object({
  email: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val.trim() === '') return '';
    return val.trim();
  }).refine(val => val === '' || z.string().email().safeParse(val).success, {
    message: 'Email invalide'
  }).optional(),
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.object({
    street: z.string().min(1, 'Rue requise'),
    city: z.string().min(1, 'Ville requise'),
    postalCode: z.string().regex(/^\d{4}$/, 'Code postal suisse invalide (4 chiffres requis)'),
    country: z.string().default('Switzerland'),
    canton: z.string().optional(),
  }).optional(),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  language: z.enum(['de', 'fr', 'it', 'en']).optional(),
  paymentTerms: z.number().min(0).max(365).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/clients - Get all clients for authenticated user
export const getClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { search, limit = '10', offset = '0', sortBy, sortOrder } = req.query as Record<string, unknown>;

    const whereClause: any = { userId };

    // Add search functionality
    if (search && typeof search === 'string') {
      whereClause.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Parse pagination safely
    const toInt = (v: unknown, def: number) => {
      const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
      return Number.isFinite(n) ? n : def;
    };
    const limitNum = Math.max(1, Math.min(100, toInt(limit, 10)));
    const offsetNum = Math.max(0, toInt(offset, 0));

    // Safe sorting
    const allowedSorts = new Set(['createdAt', 'updatedAt', 'email', 'companyName', 'firstName', 'lastName', 'name']);
    const order = String(sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const sortKeyRaw = typeof sortBy === 'string' ? sortBy : 'createdAt';
    const sortKey = allowedSorts.has(sortKeyRaw) ? sortKeyRaw : 'createdAt';

    let orderBy: any;
    if (sortKey === 'name') {
      // Sort by companyName, then lastName, then firstName
      orderBy = [
        { companyName: order },
        { lastName: order },
        { firstName: order },
      ];
    } else {
      orderBy = { [sortKey]: order } as any;
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      take: limitNum,
      skip: offsetNum,
      orderBy,
    });

    const total = await prisma.client.count({ where: whereClause });

    const response: ApiResponse = {
      success: true,
      data: {
        clients: clients,
        total: total,
        hasMore: (offsetNum + limitNum) < total
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting clients:', error);

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

// POST /api/clients - Create new client
export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    console.log('[DEBUG] Create client request body:', JSON.stringify(req.body, null, 2));

    // Validate request body
    try {
      const validatedData = createClientSchema.parse(req.body);
      console.log('[DEBUG] Validated data:', JSON.stringify(validatedData, null, 2));

    // Check if client with same email already exists for this user
    const existingClient = await prisma.client.findFirst({
      where: {
        userId,
        email: validatedData.email,
      },
    });

    if (existingClient) {
      throw new AppError('Un client avec cet email existe déjà', 400, 'CLIENT_EXISTS');
    }

    // Transform nested address to flat fields for Prisma
    const { address, ...otherData } = validatedData;
    const client = await prisma.client.create({
      data: {
        ...otherData,
        street: address.street,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        userId,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: client,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
    } catch (error) {
      console.error('Error during validation:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error creating client:', error);

    if (error instanceof z.ZodError) {
      console.error('Validation error details:', error.issues);
      const response: ApiResponse = {
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Données invalides', 
          details: error.issues 
        },
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

// GET /api/clients/:id - Get specific client
export const getClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const client = await prisma.client.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!client) {
      throw new AppError('Client non trouvé', 404, 'CLIENT_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: client,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting client:', error);

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

// PUT /api/clients/:id - Update client
export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Debug: Log the incoming request body
    console.log('[DEBUG] Update client request body:', JSON.stringify(req.body, null, 2));

    // Validate request body
    const validatedData = updateClientSchema.parse(req.body);
    console.log('[DEBUG] Validated data:', JSON.stringify(validatedData, null, 2));

    // Check if client exists and belongs to user
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingClient) {
      throw new AppError('Client non trouvé', 404, 'CLIENT_NOT_FOUND');
    }

    // Check if email is being changed and if it conflicts with another client
    if (validatedData.email && validatedData.email !== existingClient.email) {
      const emailConflict = await prisma.client.findFirst({
        where: {
          userId,
          email: validatedData.email,
          id: { not: id },
        },
      });

      if (emailConflict) {
        throw new AppError('Un client avec cet email existe déjà', 400, 'CLIENT_EXISTS');
      }
    }

    // Transform nested address to flat fields for Prisma
    const { address, ...otherData } = validatedData;
    const updateData: any = { ...otherData };
    
    // Only add address fields if they exist in the update
    if (address) {
      updateData.street = address.street;
      updateData.city = address.city;
      updateData.postalCode = address.postalCode;
      updateData.country = address.country;
    }

    console.log('[DEBUG] Final updateData for Prisma:', JSON.stringify(updateData, null, 2));
    console.log('[DEBUG] Updating client with ID:', id);

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    console.log('[DEBUG] Client updated successfully:', JSON.stringify(client, null, 2));

    const response: ApiResponse = {
      success: true,
      data: client,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating client:', error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Données invalides', 
          details: error.issues 
        },
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

// DELETE /api/clients/:id - Delete client
export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Check if client exists and belongs to user
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingClient) {
      throw new AppError('Client non trouvé', 404, 'CLIENT_NOT_FOUND');
    }

    // Check if client has invoices
    const invoiceCount = await prisma.invoice.count({
      where: { clientId: id },
    });

    if (invoiceCount > 0) {
      throw new AppError('Impossible de supprimer un client avec des factures', 400, 'CLIENT_HAS_INVOICES');
    }

    await prisma.client.delete({
      where: { id },
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Client supprimé avec succès' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting client:', error);

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