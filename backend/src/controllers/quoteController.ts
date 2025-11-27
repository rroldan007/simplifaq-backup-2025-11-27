import { Request, Response } from 'express';
import { prisma } from '../services/database';
import { ApiResponse, AppError } from '../types';

const toInt = (v: unknown, def: number) => {
  const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : def;
};

// NOTE: Quotes are handled via Invoice model with isQuote=true
export const getQuotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string;
    if (!userId) throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');

    const { search, limit = '10', offset = '0', sortBy = 'createdAt', sortOrder = 'desc', status } = req.query as Record<string, unknown>;

    const where: any = { userId, isQuote: true };
    if (typeof status === 'string' && status.trim()) where.status = status.trim().toUpperCase();
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { status: { contains: q, mode: 'insensitive' } },
      ];
    }

    const limitNum = Math.max(1, Math.min(100, toInt(limit, 50)));
    const offsetNum = Math.max(0, toInt(offset, 0));

    const allowedSorts = new Set(['createdAt', 'updatedAt', 'issueDate', 'status', 'invoiceNumber', 'total']);
    const order = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
    const sortKey = allowedSorts.has(String(sortBy)) ? String(sortBy) : 'createdAt';

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({ 
        where, 
        orderBy: { [sortKey]: order } as any, 
        take: limitNum, 
        skip: offsetNum,
        include: { client: true }
      }),
      prisma.invoice.count({ where }),
    ]);

    // Map Invoice fields to Quote-compatible format
    const quotes = invoices.map(invoice => ({
      ...invoice,
      quoteNumber: invoice.invoiceNumber, // Map invoiceNumber to quoteNumber
    }));

    res.json({
      success: true,
      data: { quotes, total, hasMore: offsetNum + limitNum < total },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error) {
    console.error('Error getting quotes:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const getQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as string;
    const { id } = req.params;
    if (!userId) throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId, isQuote: true },
      include: { client: true, items: { include: { product: true } } },
    });
    if (!invoice) throw new AppError('Devis non trouvé', 404, 'QUOTE_NOT_FOUND');

    // Map Invoice fields to Quote-compatible format
    const quote = {
      ...invoice,
      quoteNumber: invoice.invoiceNumber, // Map invoiceNumber to quoteNumber
    };

    res.json({ success: true, data: quote, timestamp: new Date().toISOString() } as ApiResponse);
  } catch (error) {
    console.error('Error getting quote:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const createQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { clientId, validUntil, items, notes, terms, language, currency, globalDiscountValue, globalDiscountType, globalDiscountNote } = req.body;

    if (!clientId || !validUntil || !items || items.length === 0) {
      throw new AppError('Données requises manquantes', 400, 'MISSING_DATA');
    }

    // Validate validUntil
    const parsedValidUntil = new Date(validUntil);
    if (isNaN(parsedValidUntil.getTime())) {
      throw new AppError('Date de validité invalide', 400, 'INVALID_VALID_UNTIL');
    }

    // Calculate totals
    const sanitizeNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const normalized = val.replace(',', '.').replace(/[^\d.-]/g, '');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? NaN : parsed;
      }
      return NaN;
    };

    let subtotal = 0;
    let tvaAmount = 0;

    const calculatedItems = items.map((item: any, index: number) => {
      const quantity = sanitizeNumber(item.quantity);
      const unitPrice = sanitizeNumber(item.unitPrice);
      const tvaRate = sanitizeNumber(item.tvaRate);
      const unitRaw = typeof item.unit === 'string' ? item.unit.trim() : undefined;
      const unit = unitRaw && unitRaw.length > 0 ? unitRaw : undefined;

      if (
        !isFinite(quantity) || quantity < 0 ||
        !isFinite(unitPrice) || unitPrice < 0 ||
        !isFinite(tvaRate) || tvaRate < 0
      ) {
        throw new AppError('Données de ligne de devis invalides', 400, 'INVALID_QUOTE_ITEM');
      }

      const itemTotal = quantity * unitPrice;
      const itemTva = itemTotal * (tvaRate / 100);

      subtotal += itemTotal;
      tvaAmount += itemTva;

      return {
        productId: item.productId || undefined,
        description: String(item.description || ''),
        quantity,
        unitPrice,
        tvaRate,
        total: itemTotal,
        order: index + 1,
        unit,
      };
    });

    // Apply global discount
    let globalDiscount = 0;
    if (globalDiscountValue && globalDiscountValue > 0) {
      if (globalDiscountType === 'PERCENT') {
        globalDiscount = subtotal * (globalDiscountValue / 100);
      } else {
        globalDiscount = Math.min(globalDiscountValue, subtotal);
      }
    }

    const subtotalAfterDiscount = subtotal - globalDiscount;
    const tvaAfterDiscount = subtotalAfterDiscount * (tvaAmount / subtotal || 0);
    const total = subtotalAfterDiscount + tvaAfterDiscount;

    // Verify client exists
    const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
    if (!client) {
      throw new AppError('Client non trouvé', 404, 'CLIENT_NOT_FOUND');
    }

    // Get user settings for quote prefix and numbering
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quotePrefix: true, nextQuoteNumber: true, quotePadding: true }
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404, 'USER_NOT_FOUND');
    }

    // Sync nextQuoteNumber if needed (check for existing quotes with this prefix)
    const prefix = user.quotePrefix || 'DEV';
    const separator = prefix.includes('-') ? '' : '-';
    const prefixPattern = `${prefix}${separator}`;
    
    const lastQuote = await prisma.invoice.findFirst({
      where: { 
        userId, 
        isQuote: true,
        invoiceNumber: { startsWith: prefixPattern }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lastQuote) {
      // Extract number from last quote
      const regex = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${separator}(\\d+)`);
      const match = lastQuote.invoiceNumber.match(regex);
      if (match) {
        const lastNumber = parseInt(match[1], 10);
        // If user counter is behind, sync it
        if (user.nextQuoteNumber <= lastNumber) {
          user.nextQuoteNumber = lastNumber + 1;
          await prisma.user.update({
            where: { id: userId },
            data: { nextQuoteNumber: lastNumber + 1 }
          });
        }
      }
    }

    // Create quote (isQuote = true) and update user counter
    const quote = await prisma.$transaction(async (tx) => {
      const nextNumber = user.nextQuoteNumber || 1;
      const padding = user.quotePadding || 3;
      const quoteNumber = `${prefixPattern}${String(nextNumber).padStart(padding, '0')}`;

      // Update user's next quote number
      await tx.user.update({
        where: { id: userId },
        data: { nextQuoteNumber: nextNumber + 1 }
      });

      // Create the quote
      return tx.invoice.create({
        data: {
          userId,
          clientId,
          invoiceNumber: quoteNumber,
          isQuote: true,
          status: 'DRAFT',
          issueDate: new Date(),
          dueDate: parsedValidUntil,  // dueDate used as validUntil for quotes
          validUntil: parsedValidUntil,
          language: language || 'fr',
          currency: currency || 'CHF',
          subtotal,
          tvaAmount: tvaAfterDiscount,
          total,
          globalDiscountValue: globalDiscountValue || null,
          globalDiscountType: globalDiscountType || null,
          globalDiscountNote: globalDiscountNote || null,
          notes,
          terms,
          items: {
            create: calculatedItems
          }
        },
        include: {
          items: true,
          client: true
        }
      });
    });

    res.status(201).json({ success: true, data: quote, timestamp: new Date().toISOString() } as ApiResponse);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur interne' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const updateQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Check if quote exists and belongs to user
    const existingQuote = await prisma.invoice.findFirst({
      where: { id, userId, isQuote: true }
    });

    if (!existingQuote) {
      throw new AppError('Devis non trouvé', 404, 'QUOTE_NOT_FOUND');
    }

    // Check if already converted
    if (existingQuote.convertedInvoiceId) {
      throw new AppError('Impossible de modifier un devis déjà converti', 400, 'QUOTE_ALREADY_CONVERTED');
    }

    const { clientId, validUntil, items, notes, terms, language, currency, globalDiscountValue, globalDiscountType, globalDiscountNote } = req.body;

    if (!clientId || !validUntil || !items || items.length === 0) {
      throw new AppError('Données requises manquantes', 400, 'MISSING_DATA');
    }

    // Validate validUntil
    const parsedValidUntil = new Date(validUntil);
    if (isNaN(parsedValidUntil.getTime())) {
      throw new AppError('Date de validité invalide', 400, 'INVALID_VALID_UNTIL');
    }

    // Calculate totals
    const sanitizeNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const normalized = val.replace(',', '.').replace(/[^\d.-]/g, '');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? NaN : parsed;
      }
      return NaN;
    };

    let subtotal = 0;
    let tvaAmount = 0;

    const calculatedItems = items.map((item: any, index: number) => {
      const quantity = sanitizeNumber(item.quantity);
      const unitPrice = sanitizeNumber(item.unitPrice);
      const tvaRate = sanitizeNumber(item.tvaRate);
      const unitRaw = typeof item.unit === 'string' ? item.unit.trim() : undefined;
      const unit = unitRaw && unitRaw.length > 0 ? unitRaw : undefined;

      if (
        !isFinite(quantity) || quantity < 0 ||
        !isFinite(unitPrice) || unitPrice < 0 ||
        !isFinite(tvaRate) || tvaRate < 0
      ) {
        throw new AppError('Données de ligne de devis invalides', 400, 'INVALID_QUOTE_ITEM');
      }

      const itemTotal = quantity * unitPrice;
      const itemTva = itemTotal * (tvaRate / 100);

      subtotal += itemTotal;
      tvaAmount += itemTva;

      return {
        productId: item.productId || undefined,
        description: String(item.description || ''),
        quantity,
        unitPrice,
        tvaRate,
        total: itemTotal,
        order: index + 1,
        unit,
      };
    });

    // Apply global discount
    let globalDiscount = 0;
    if (globalDiscountValue && globalDiscountValue > 0) {
      if (globalDiscountType === 'PERCENT') {
        globalDiscount = subtotal * (globalDiscountValue / 100);
      } else {
        globalDiscount = Math.min(globalDiscountValue, subtotal);
      }
    }

    const subtotalAfterDiscount = subtotal - globalDiscount;
    const tvaAfterDiscount = subtotalAfterDiscount * (tvaAmount / subtotal || 0);
    const total = subtotalAfterDiscount + tvaAfterDiscount;

    // Verify client exists
    const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
    if (!client) {
      throw new AppError('Client non trouvé', 404, 'CLIENT_NOT_FOUND');
    }

    // Update quote
    const updatedQuote = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      });

      // Update quote with new items
      return tx.invoice.update({
        where: { id },
        data: {
          clientId,
          dueDate: parsedValidUntil,
          validUntil: parsedValidUntil,
          language: language || 'fr',
          currency: currency || 'CHF',
          subtotal,
          tvaAmount: tvaAfterDiscount,
          total,
          globalDiscountValue: globalDiscountValue || null,
          globalDiscountType: globalDiscountType || null,
          globalDiscountNote: globalDiscountNote || null,
          notes,
          terms,
          items: {
            create: calculatedItems
          }
        },
        include: {
          items: true,
          client: true
        }
      });
    });

    res.json({ success: true, data: updatedQuote, timestamp: new Date().toISOString() } as ApiResponse);
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur interne' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const deleteQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const quote = await prisma.invoice.findFirst({
      where: { id, userId, isQuote: true }
    });

    if (!quote) {
      throw new AppError('Devis non trouvé', 404, 'QUOTE_NOT_FOUND');
    }

    // Check if already converted
    if (quote.convertedInvoiceId) {
      throw new AppError('Impossible de supprimer un devis déjà converti', 400, 'QUOTE_ALREADY_CONVERTED');
    }

    await prisma.invoice.delete({ where: { id } });

    res.json({ success: true, message: 'Devis supprimé', timestamp: new Date().toISOString() } as ApiResponse);
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur interne' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const generateQuotePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const quote = await prisma.invoice.findFirst({
      where: { id, userId, isQuote: true },
      include: {
        items: {
          include: { product: true },
          orderBy: { order: 'asc' }
        },
        client: true,
        user: true
      }
    });

    if (!quote) {
      throw new AppError('Devis non trouvé', 404, 'QUOTE_NOT_FOUND');
    }

    // Use quote-specific PDF generator (no QR for quotes)
    const { generateQuotePDF: renderQuotePDF } = await import('../utils/quotePDFPdfkit');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Devis_${quote.invoiceNumber}.pdf"`);

    await renderQuotePDF(
      {
        quote: quote as any,
        client: quote.client,
        accentColor: (quote.user as any)?.pdfPrimaryColor,
        template: (quote.user as any)?.pdfTemplate,
        lang: quote.language || 'fr',
        showHeader: true,
      },
      res
    );
  } catch (error) {
    console.error('Error generating quote PDF:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur génération PDF' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

export const convertQuoteToInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const quote = await prisma.invoice.findFirst({
      where: { id, userId, isQuote: true },
      include: { items: true, client: true }
    });

    if (!quote) {
      throw new AppError('Devis non trouvé', 404, 'QUOTE_NOT_FOUND');
    }

    if (quote.convertedInvoiceId) {
      throw new AppError('Ce devis a déjà été converti', 400, 'ALREADY_CONVERTED');
    }

    // Get user settings for invoice prefix and numbering
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { invoicePrefix: true, nextInvoiceNumber: true, invoicePadding: true }
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404, 'USER_NOT_FOUND');
    }

    // Sync nextInvoiceNumber if needed (check for existing invoices with this prefix)
    const prefix = user.invoicePrefix || 'FAC';
    const separator = prefix.includes('-') ? '' : '-';
    const prefixPattern = `${prefix}${separator}`;
    
    const lastInvoice = await prisma.invoice.findFirst({
      where: { 
        userId, 
        isQuote: false,
        invoiceNumber: { startsWith: prefixPattern }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lastInvoice) {
      // Extract number from last invoice
      const regex = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${separator}(\\d+)`);
      const match = lastInvoice.invoiceNumber.match(regex);
      if (match) {
        const lastNumber = parseInt(match[1], 10);
        // If user counter is behind, sync it
        if (user.nextInvoiceNumber <= lastNumber) {
          user.nextInvoiceNumber = lastNumber + 1;
          await prisma.user.update({
            where: { id: userId },
            data: { nextInvoiceNumber: lastNumber + 1 }
          });
        }
      }
    }

    // Create invoice from quote and update user counter
    const invoice = await prisma.$transaction(async (tx) => {
      const nextNumber = user.nextInvoiceNumber || 1;
      const padding = user.invoicePadding || 3;
      const invoiceNumber = `${prefixPattern}${String(nextNumber).padStart(padding, '0')}`;

      // Update user's next invoice number
      await tx.user.update({
        where: { id: userId },
        data: { nextInvoiceNumber: nextNumber + 1 }
      });

      // Create the invoice
      const newInvoice = await tx.invoice.create({
        data: {
          userId,
          clientId: quote.clientId,
          invoiceNumber,
          isQuote: false,
          status: 'DRAFT',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          language: quote.language,
          currency: quote.currency,
          subtotal: quote.subtotal,
          tvaAmount: quote.tvaAmount,
          total: quote.total,
          globalDiscountValue: quote.globalDiscountValue,
          globalDiscountType: quote.globalDiscountType,
          globalDiscountNote: quote.globalDiscountNote,
          notes: quote.notes,
          terms: quote.terms,
          items: {
            create: quote.items.map(item => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              tvaRate: item.tvaRate,
              total: item.total,
              order: item.order,
              unit: (item as any).unit,
            }))
          }
        },
        include: {
          items: true,
          client: true
        }
      });

      // Mark quote as converted and accepted (within transaction)
      await tx.invoice.update({
        where: { id },
        data: {
          convertedInvoiceId: newInvoice.id,
          status: 'ACCEPTED',
        }
      });

      return newInvoice;
    });

    res.json({ success: true, data: invoice, timestamp: new Date().toISOString() } as ApiResponse);
  } catch (error) {
    console.error('Error converting quote:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur conversion' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

// GET /api/quotes/next-number - Get next available quote number
export const getNextQuoteNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    
    // Get user settings
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quotePrefix: true, nextQuoteNumber: true, quotePadding: true }
    });

    if (!user) {
      throw new AppError('Utilisateur non trouvé', 404, 'USER_NOT_FOUND');
    }

    // Sync with existing quotes
    const prefix = user.quotePrefix || 'DEV';
    const separator = prefix.includes('-') ? '' : '-';
    const prefixPattern = `${prefix}${separator}`;
    
    const lastQuote = await prisma.invoice.findFirst({
      where: { 
        userId, 
        isQuote: true,
        invoiceNumber: { startsWith: prefixPattern }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (lastQuote) {
      const regex = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${separator}(\\d+)`);
      const match = lastQuote.invoiceNumber.match(regex);
      if (match) {
        const lastNumber = parseInt(match[1], 10);
        if (user.nextQuoteNumber <= lastNumber) {
          user.nextQuoteNumber = lastNumber + 1;
        }
      }
    }

    const nextNumber = user.nextQuoteNumber || 1;
    const padding = user.quotePadding || 3;
    const quoteNumber = `${prefixPattern}${String(nextNumber).padStart(padding, '0')}`;

    res.json({ 
      success: true, 
      data: { 
        nextNumber: quoteNumber,
        prefix,
        number: nextNumber,
        padding
      } 
    });
  } catch (error) {
    console.error('Error getting next quote number:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: { 
        code: error instanceof AppError ? error.code : 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Erreur interne' 
      }
    });
  }
};
