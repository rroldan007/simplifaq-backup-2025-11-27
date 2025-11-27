import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../services/database';
import { ApiResponse, AppError } from '../types';
import { generateInvoicePDF as renderInvoicePDF } from '../utils/invoicePDFPdfkit';
import { getInvoicePDFService } from '../services/invoicePDFService';
import { featureFlags } from '../features/featureFlags';
import { SwissQRBillData, QRReferenceType, generateQRReference, formatIBAN, isValidSwissIBAN, isQRIBAN, isValidQRReference } from '../utils/swissQRBill';
import archiver from 'archiver';
import { PassThrough, Writable } from 'stream';

// Extend the Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Helper: generate a globally-unique invoice number to satisfy unique constraint
const generateUniqueInvoiceNumber = async (userId: string): Promise<string> => {
  const year = new Date().getFullYear();
  // Start from the user's invoice count to keep it compact for that user
  let counter = await prisma.invoice.count({ where: { userId } }) + 1;
  const userPrefix = userId.slice(0, 4).toUpperCase();

  // Try a few times in case of collisions with other users
  for (let attempts = 0; attempts < 50; attempts++) {
    const candidate = `${userPrefix}-FAC-${year}-${counter.toString().padStart(3, '0')}`;
    const exists = await prisma.invoice.findUnique({ 
      where: { 
        invoiceNumber_userId: { 
          invoiceNumber: candidate,
          userId 
        } 
      } 
    });
    if (!exists) return candidate;
    counter++;
  }
  // Fallback with timestamp if too many collisions
  return `${userPrefix}-FAC-${year}-${Date.now()}`;
};

interface QRReferenceOptions {
  mode?: string | null;
  prefix?: string | null;
  iban?: string | null;
  invoiceNumber: string;
  manualReference?: string | null;
}

function computeQRReference(options: QRReferenceOptions): { reference: string | null; type: QRReferenceType } {
  const normalizedMode = (options.mode || 'auto').toLowerCase();

  if (normalizedMode === 'disabled') {
    return { reference: null, type: QRReferenceType.NON };
  }

  if (normalizedMode === 'manual') {
    const manualRef = (options.manualReference || '').replace(/\s+/g, '');
    if (manualRef && isValidQRReference(manualRef)) {
      return { reference: manualRef, type: QRReferenceType.QRR };
    }
    return { reference: null, type: QRReferenceType.NON };
  }

  const rawIban = (options.iban || '').replace(/\s+/g, '').toUpperCase();
  if (!rawIban || !isValidSwissIBAN(rawIban) || !isQRIBAN(rawIban)) {
    return { reference: null, type: QRReferenceType.NON };
  }

  const baseSeed = `${options.prefix || ''}${options.invoiceNumber || ''}`;
  let numericSeed = baseSeed.replace(/\D/g, '');
  if (!numericSeed) {
    numericSeed = `${Date.now()}`;
  }
  numericSeed = numericSeed.slice(-26);
  if (!numericSeed) {
    numericSeed = '1';
  }

  const reference = generateQRReference(numericSeed);
  return { reference, type: QRReferenceType.QRR };
}

// GET /api/invoices/export - Export invoices as ZIP of PDFs
export const exportInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { clientId, from, to } = req.query as { clientId?: string; from?: string; to?: string };
    const where: any = { userId };
    if (clientId && typeof clientId === 'string') where.clientId = clientId;
    if (from || to) {
      where.createdAt = {} as any;
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        items: { orderBy: { order: 'asc' } },
        user: true,
      },
    });

    if (!invoices || invoices.length === 0) {
      const response: ApiResponse = { success: false, error: { code: 'NO_INVOICES', message: 'Aucune facture pour les filtres fournis.' }, timestamp: new Date().toISOString() };
      res.status(404).json(response);
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="factures_export_${ts}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    const toBuffer = async (writer: (stream: Writable) => Promise<void>): Promise<Buffer> => {
      return new Promise<Buffer>(async (resolve, reject) => {
        const pass = new PassThrough();
        const chunks: Buffer[] = [];
        pass.on('data', (c: Buffer) => chunks.push(c));
        pass.on('error', reject);
        pass.on('end', () => resolve(Buffer.concat(chunks)));
        try {
          await writer(pass);
        } catch (e) {
          reject(e as any);
        }
      });
    };

    for (const inv of invoices) {
      const qrData: any = undefined;
      const buf = await toBuffer(async (stream) => {
        await generatePDFForInvoice(inv, stream);
      });
      const safeNumber = inv.invoiceNumber?.replace(/[^A-Za-z0-9._-]/g, '_') || inv.id;
      archive.append(buf, { name: `${safeNumber}.pdf` });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error exporting invoices:', error);
    if (!res.headersSent) {
      const response: ApiResponse = { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur lors de l\'export' }, timestamp: new Date().toISOString() };
      res.status(500).json(response);
    }
  }
};

const generatePDFForInvoice = async (
  invoice: any,
  stream: Writable,
) => {
  const qrData: SwissQRBillData | undefined = undefined as any;
  await renderInvoicePDF({ invoice, client: invoice.client, qrData, accentColor: (invoice.user as any)?.pdfPrimaryColor, template: (invoice.user as any)?.pdfTemplate, lang: invoice.language || 'fr' }, stream);
};

// GET /api/invoices - Get all invoices for authenticated user
export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    // Parse query parameters
    const { isQuote } = req.query;
    
    // Build where clause with optional isQuote filter
    const where: any = { userId };
    if (isQuote !== undefined) {
      // If isQuote is explicitly set (true or false), filter by it
      where.isQuote = isQuote === 'true';
    }
    
    const include = {
      client: {
        select: { id: true, companyName: true, firstName: true, lastName: true, email: true },
      },
      items: { orderBy: { order: 'asc' as const } },
    } as const;
    const orderBy = { createdAt: 'desc' as const };

    const invoices = await prisma.invoice.findMany({ where, include, orderBy });

    const response: ApiResponse = {
      success: true,
      data: invoices.map(invoice => {
        // Check if invoice is overdue
        const isOverdue = invoice.status === 'sent' && 
                         invoice.paymentStatus !== 'PAID' && 
                         invoice.dueDate < new Date();
        return { ...invoice, isOverdue };
      }),
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
      return;
  }
};

/**
 * POST /api/invoices/:id/recurrence/cancel
 * Disable recurrence for a master invoice: clears recurrence fields and marks the series as finished
 */
export const cancelInvoiceRecurrence = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    // Ensure invoice belongs to the authenticated user
    const existing = await prisma.invoice.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        estRecurrente: false,
        frequence: null,
        prochaineDateRecurrence: null,
        dateFinRecurrence: null,
        statutRecurrence: 'termine',
        updatedAt: new Date(),
      },
      include: {
        client: true,
        items: { orderBy: { order: 'asc' } },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    console.error('Error cancelling invoice recurrence:', error);
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};

// POST /api/invoices - Create new invoice
export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    console.log('[DEBUG] createInvoice called - userId:', userId);
    console.log('[DEBUG] Request body keys:', Object.keys(req.body));
    console.log('[DEBUG] Request body:', JSON.stringify(req.body, null, 2));

    const { clientId, dueDate, items, notes, terms } = req.body;
    // Optional discount fields
    const globalDiscountValue: number | undefined = req.body.globalDiscountValue ? Number(req.body.globalDiscountValue) : undefined;
    const globalDiscountType: 'PERCENT' | 'AMOUNT' | undefined = req.body.globalDiscountType;
    const globalDiscountNote: string | undefined = req.body.globalDiscountNote;
    // Optional recurrence fields
    const estRecurrente: boolean = Boolean((req.body as any)?.estRecurrente);
    const freqRaw: unknown = (req.body as any)?.frequence;
    const frequence: 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | undefined =
      typeof freqRaw === 'string' && ['MENSUEL','TRIMESTRIEL','SEMESTRIEL'].includes(freqRaw)
        ? (freqRaw as any)
        : undefined;
    const prochaineDateRecurrenceRaw: string | undefined = (req.body as any)?.prochaineDateRecurrence;
    const dateFinRecurrenceRaw: string | undefined = (req.body as any)?.dateFinRecurrence;
    console.debug('createInvoice payload snapshot', {
      clientId,
      dueDate,
      itemsCount: Array.isArray(items) ? items.length : undefined,
      firstItem: Array.isArray(items) && items.length > 0 ? items[0] : undefined,
      notes: typeof notes === 'string' ? (notes.length > 40 ? notes.slice(0, 40) + '…' : notes) : undefined,
      terms: typeof terms === 'string' ? (terms.length > 40 ? terms.slice(0, 40) + '…' : terms) : undefined,
    });

    if (!clientId || !dueDate || !items || items.length === 0) {
      throw new AppError('Données requises manquantes', 400, 'MISSING_DATA');
    }

    // Validate dueDate
    const parsedDue = new Date(dueDate);
    if (isNaN(parsedDue.getTime())) {
      throw new AppError('Date d\'échéance invalide', 400, 'INVALID_DUE_DATE');
    }

    // Calculate totals with sanitization/coercion
    const sanitizeNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        // Replace comma with dot and strip non-numeric except . and -
        const normalized = val.replace(',', '.').replace(/[^\d.-]/g, '');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? NaN : parsed;
      }
      return NaN;
    };

    // Helper function to round to 2 decimals
    const round2 = (num: number) => Math.round(num * 100) / 100;

    let subtotal = 0;
    let tvaAmount = 0;

    const calculatedItems = items.map((item: any, index: number) => {
      const quantity = sanitizeNumber(item.quantity);
      const unitPrice = sanitizeNumber(item.unitPrice);
      const tvaRate = sanitizeNumber(item.tvaRate);

      console.log('[DEBUG] Invoice item validation:', {
        index,
        original: { quantity: item.quantity, unitPrice: item.unitPrice, tvaRate: item.tvaRate },
        sanitized: { quantity, unitPrice, tvaRate },
        checks: {
          quantityFinite: isFinite(quantity),
          quantityNonNegative: quantity >= 0,
          priceFinite: isFinite(unitPrice),
          priceNonNegative: unitPrice >= 0,
          tvaFinite: isFinite(tvaRate),
          tvaNonNegative: tvaRate >= 0
        }
      });

      if (
        !isFinite(quantity) || quantity < 0 ||
        !isFinite(unitPrice) || unitPrice < 0 ||
        !isFinite(tvaRate) || tvaRate < 0
      ) {
        console.error('[ERROR] Invalid invoice item detected:', { index, quantity, unitPrice, tvaRate });
        throw new AppError('Données de ligne de facture invalides', 400, 'INVALID_INVOICE_ITEM');
      }

      // Process line discount
      const lineDiscountValue = item.lineDiscountValue ? sanitizeNumber(item.lineDiscountValue) : undefined;
      const lineDiscountType: 'PERCENT' | 'AMOUNT' | undefined = item.lineDiscountType;
      const lineDiscountSource: 'FROM_PRODUCT' | 'MANUAL' | 'NONE' = item.lineDiscountSource || 'NONE';
      
      let subtotalBeforeDiscount = round2(quantity * unitPrice);
      let discountAmount = 0;
      
      if (lineDiscountValue && lineDiscountValue > 0 && lineDiscountType) {
        if (lineDiscountType === 'PERCENT') {
          discountAmount = round2(subtotalBeforeDiscount * (lineDiscountValue / 100));
        } else {
          discountAmount = Math.min(lineDiscountValue, subtotalBeforeDiscount);
        }
      }
      
      const subtotalAfterDiscount = round2(subtotalBeforeDiscount - discountAmount);
      const itemTva = round2(subtotalAfterDiscount * (tvaRate / 100));

      subtotal += subtotalAfterDiscount;
      tvaAmount += itemTva;

      return {
        // Only pass allowed fields to Prisma
        productId: item.productId || undefined,
        description: String(item.description || ''),
        quantity,
        unitPrice,
        tvaRate,
        total: subtotalAfterDiscount,
        order: index + 1,
        // Line discount fields
        lineDiscountValue: lineDiscountValue || null,
        lineDiscountType: lineDiscountType || null,
        lineDiscountSource,
        subtotalBeforeDiscount,
        discountAmount,
        subtotalAfterDiscount,
      };
    });

    // Apply global discount
    let subtotalAfterGlobalDiscount = subtotal;
    let globalDiscountAmount = 0;
    
    if (globalDiscountValue && globalDiscountValue > 0 && globalDiscountType) {
      if (globalDiscountType === 'PERCENT') {
        globalDiscountAmount = round2(subtotal * (globalDiscountValue / 100));
      } else {
        globalDiscountAmount = Math.min(globalDiscountValue, subtotal);
      }
      subtotalAfterGlobalDiscount = round2(subtotal - globalDiscountAmount);
      
      // Recalculate TVA proportionally after global discount
      tvaAmount = calculatedItems.reduce((sum: number, item: any) => {
        const itemProportion = subtotal > 0 ? item.subtotalAfterDiscount / subtotal : 0;
        const itemGlobalDiscount = globalDiscountAmount * itemProportion;
        const itemFinalSubtotal = item.subtotalAfterDiscount - itemGlobalDiscount;
        return sum + (itemFinalSubtotal * (item.tvaRate / 100));
      }, 0);
      tvaAmount = round2(tvaAmount);
    }
    
    // Round all financial values to 2 decimals
    subtotal = round2(subtotal);
    tvaAmount = round2(tvaAmount);
    const total = round2(subtotalAfterGlobalDiscount + tvaAmount);

    // Ensure client exists and belongs to the authenticated user (avoid FK violation)
    console.log('[DEBUG] Checking client existence:', { clientId, userId });
    const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
    if (!client) {
      console.error('[ERROR] Client not found:', { clientId, userId });
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: "Le client sélectionné est introuvable pour votre compte.",
        },
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }
    console.log('[DEBUG] Client found, proceeding with invoice creation');

    // Optional manual invoice number override (validated below)
    const requestedInvoiceNumberRaw: unknown = (req.body as any)?.invoiceNumber;
    const normalizeCandidate = (v: unknown): string | null => {
      if (typeof v !== 'string') return null;
      const s = v.trim();
      // Alphanumeric with separators allowed, length 1..40
      if (!/^[A-Za-z0-9._-]{1,40}$/.test(s)) return null;
      return s;
    };
    const manualNumber = normalizeCandidate(requestedInvoiceNumberRaw);
    if (manualNumber) {
      // Ensure uniqueness per user
      const existing = await prisma.invoice.findUnique({ 
        where: { 
          invoiceNumber_userId: { 
            invoiceNumber: manualNumber,
            userId 
          } 
        } 
      });
      if (existing) {
        throw new AppError(`Le numéro de facture '${manualNumber}' est déjà utilisé`, 409, 'INVOICE_NUMBER_TAKEN');
      }
      const createdManual = await prisma.invoice.create({
        data: {
          userId,
          clientId,
          invoiceNumber: manualNumber,
          status: 'draft',
          issueDate: new Date(),
          dueDate: parsedDue,
          language: 'fr',
          currency: 'CHF',
          subtotal,
          tvaAmount,
          total,
          notes,
          terms,
          // Global discount fields
          globalDiscountValue: globalDiscountValue || null,
          globalDiscountType: globalDiscountType || null,
          globalDiscountNote: globalDiscountNote || null,
          ...(estRecurrente
            ? {
              estRecurrente: true,
              frequence: frequence,
              prochaineDateRecurrence: prochaineDateRecurrenceRaw ? new Date(prochaineDateRecurrenceRaw) : new Date(),
              dateFinRecurrence: dateFinRecurrenceRaw ? new Date(dateFinRecurrenceRaw) : null,
              statutRecurrence: 'actif',
            }
            : {
              estRecurrente: false,
              statutRecurrence: 'inactif',
            }),
          items: { create: calculatedItems },
        },
        include: {
          client: true,
          items: { orderBy: { order: 'asc' } },
        },
      });
      // Note: we purposely do NOT increment nextInvoiceNumber when a manual number is used
      const response: ApiResponse = {
        success: true,
        data: createdManual,
        timestamp: new Date().toISOString(),
      };
      res.status(201).json(response);
      return;
    }

    // Créer la facture avec numérotation configurable de l'utilisateur
    // - Utilise User.invoicePrefix, User.invoicePadding, User.nextInvoiceNumber
    // - Incrémente le compteur de façon atomique
    const invoice = await prisma.$transaction(async (tx) => {
      const userCfg = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!userCfg) {
        throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');
      }

      const makeNumber = (prefix: string | null | undefined, next: number, padding: number): string => {
        const pad = Math.max(0, Number(padding || 0));
        const numeric = String(next);
        const padded = pad > 0 ? numeric.padStart(pad, '0') : numeric;
        const pref = (prefix || '').trim();
        return pref ? `${pref}-${padded}` : padded;
      };

      let attempts = 0;
      while (attempts < 3) {
        attempts++;
        const numberStr = makeNumber(userCfg.invoicePrefix, userCfg.nextInvoiceNumber, userCfg.invoicePadding);
        const qr = computeQRReference({
          mode: ((userCfg as any)?.qrReferenceMode ?? 'auto') as string,
          prefix: ((userCfg as any)?.qrReferencePrefix ?? undefined) as string | undefined,
          invoiceNumber: numberStr,
          iban: userCfg.iban ?? undefined,
        });
        try {
          const created = await tx.invoice.create({
            data: {
              userId,
              clientId,
              invoiceNumber: numberStr,
              status: 'draft',
              issueDate: new Date(),
              dueDate: parsedDue,
              language: 'fr',
              currency: 'CHF',
              subtotal,
              tvaAmount,
              total,
              notes,
              terms,
              // Global discount fields
              globalDiscountValue: globalDiscountValue || null,
              globalDiscountType: globalDiscountType || null,
              globalDiscountNote: globalDiscountNote || null,
              qrReferenceType: qr.type,
              ...(qr.reference ? { qrReference: qr.reference } : { qrReference: null }),
              ...(estRecurrente
                ? {
                    estRecurrente: true,
                    ...(frequence ? { frequence: frequence as any } : {}),
                    prochaineDateRecurrence: prochaineDateRecurrenceRaw ? new Date(prochaineDateRecurrenceRaw) : new Date(),
                    dateFinRecurrence: dateFinRecurrenceRaw ? new Date(dateFinRecurrenceRaw) : null,
                    statutRecurrence: 'actif',
                  }
                : {
                    estRecurrente: false,
                    statutRecurrence: 'inactif',
                  }),
              items: { create: calculatedItems },
            },
            include: {
              client: true,
              items: { orderBy: { order: 'asc' } },
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { nextInvoiceNumber: { increment: 1 } },
          });

          return created;
        } catch (e: any) {
          if (e && e.code === 'P2002') {
            await tx.user.update({
              where: { id: userId },
              data: { nextInvoiceNumber: { increment: 1 } },
            });

            const reloaded = await tx.user.findUnique({
              where: { id: userId },
            });
            if (!reloaded) throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');
            Object.assign(userCfg, reloaded);
            continue;
          }
          throw e;
        }
      }
      throw new AppError('Échec de génération du numéro de facture après plusieurs tentatives', 500, 'INVOICE_NUMBERING_FAILED');
    });

    const response: ApiResponse = {
      success: true,
      data: invoice,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
      return;
  } catch (error) {
    console.error('Error creating invoice:', error);

    // Map known Prisma errors to useful responses
    if (error && typeof error === 'object' && (error as any).code) {
      const e = error as any;
      const code = e.code as string;
      const meta = e.meta;
      console.error('Prisma error details:', { code, meta });

      if (code === 'P2002') {
        // Unique constraint failed (likely invoiceNumber)
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: 'Conflit sur un champ unique (invoiceNumber) – veuillez réessayer',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(409).json(response);
        return;
      }

      if (code === 'P2003') {
        // Foreign key constraint failed (e.g., clientId)
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FOREIGN_KEY_CONSTRAINT',
            message: "Référence étrangère invalide (clientId). Veuillez sélectionner un client valide.",
          },
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      if (code === 'P2011' || code === 'P2009') {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: "Entrée invalide pour la création de facture.",
          },
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
      return;
  }
};

// GET /api/invoices/:id - Get specific invoice
export const getInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        client: true,
        items: {
          orderBy: { order: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
    }

    // Populate unit field for items that don't have it but have a productId
    const itemsWithUnit = await Promise.all(
      invoice.items.map(async (item) => {
        if (!item.unit && item.productId) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { unit: true },
          });
          if (product?.unit) {
            console.log(`[getInvoice] Populated unit for item ${item.description}: ${product.unit}`);
            return { ...item, unit: product.unit };
          }
        }
        return item;
      })
    );
    
    console.log(`[getInvoice] Invoice ${id} - Total items: ${itemsWithUnit.length}, Items with unit: ${itemsWithUnit.filter(i => i.unit).length}`);

    const response: ApiResponse = {
      success: true,
      data: { ...invoice, items: itemsWithUnit },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
      return;
  }
};

// PUT /api/invoices/:id - Update invoice
export const updateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { dueDate, notes, terms, status, items, invoiceNumber: requestedInvoiceNumber } = req.body as any;

    // Helper to safely parse numbers from mixed inputs
    const sanitizeNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const normalized = val.replace(',', '.').replace(/[\d.-]/g, (m) => m).replace(/(?![\d.-])./g, '');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? NaN : parsed;
      }
      return NaN;
    };

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Ensure invoice belongs to user and load existing items
      const existing = await tx.invoice.findFirst({
        where: { id, userId },
        include: { items: true },
      });
      if (!existing) {
        throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
      }

      // Normalize and validate invoice number if provided
      const normalizeCandidate = (v: unknown): string | null => {
        if (typeof v !== 'string') return null;
        const s = v.trim();
        if (!/^[A-Za-z0-9._-]{1,40}$/.test(s)) return null;
        return s;
      };
      const normalizedInvoiceNumber = normalizeCandidate(requestedInvoiceNumber);
      if (normalizedInvoiceNumber && normalizedInvoiceNumber !== existing.invoiceNumber) {
        const taken = await tx.invoice.findUnique({ 
          where: { 
            invoiceNumber_userId: { 
              invoiceNumber: normalizedInvoiceNumber,
              userId 
            } 
          } 
        });
        if (taken) {
          throw new AppError(`Le numéro de facture '${normalizedInvoiceNumber}' est déjà utilisé`, 409, 'INVOICE_NUMBER_TAKEN');
        }
      }

      // Determine if items were provided in the request
      let itemsProvided = Array.isArray(items);

      // If invoice has been sent or paid, lock item-level edits (prices/quantities/TVA)
      const immutableStatuses = new Set(['sent', 'paid']);
      if (immutableStatuses.has(existing.status)) {
        if (itemsProvided) {
          // Ignore item-level updates for sent/paid invoices; allow header/recurrence updates to proceed
          itemsProvided = false;
        }
      }

      let subtotal = 0;
      let tvaAmount = 0;
      let total = 0;

      if (itemsProvided) {
        // Update items only when explicitly provided
        const incomingItems: any[] = items as any[];

        // Map, validate and compute totals per item
        const normalizedItems = incomingItems.map((item: any, index: number) => {
          const quantity = sanitizeNumber(item.quantity);
          const unitPrice = sanitizeNumber(item.unitPrice);
          const tvaRate = sanitizeNumber(item.tvaRate);

          if (
            !isFinite(quantity) || quantity < 0 ||
            !isFinite(unitPrice) || unitPrice < 0 ||
            !isFinite(tvaRate) || tvaRate < 0
          ) {
            throw new AppError('Données de ligne de facture invalides', 400, 'INVALID_INVOICE_ITEM');
          }

          const lineTotal = quantity * unitPrice;
          const itemTva = lineTotal * (tvaRate / 100);
          subtotal += lineTotal;
          tvaAmount += itemTva;

          return {
            id: item.id as string | undefined,
            productId: item.productId || undefined,
            description: String(item.description || ''),
            quantity,
            unitPrice,
            tvaRate,
            total: lineTotal,
            order: Number.isFinite(item.order) ? Number(item.order) : index + 1,
          };
        });

        total = subtotal + tvaAmount;

        // Determine deletions
        const existingIds = new Set((existing.items || []).map((it) => it.id));
        const incomingIds = new Set(normalizedItems.filter(i => i.id).map(i => i.id as string));
        const idsToDelete = Array.from(existingIds).filter(id0 => !incomingIds.has(id0));

        // Apply deletes
        if (idsToDelete.length > 0) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId: id, id: { in: idsToDelete } } });
        }

        // Upserts for provided items
        for (const item of normalizedItems) {
          if (item.id && (existing.items || []).some(it => it.id === item.id)) {
            await tx.invoiceItem.update({
              where: { id: item.id },
              data: {
                productId: item.productId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                tvaRate: item.tvaRate,
                total: item.total,
                order: item.order,
              },
            });
          } else {
            await tx.invoiceItem.create({
              data: {
                invoiceId: id,
                productId: item.productId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                tvaRate: item.tvaRate,
                total: item.total,
                order: item.order,
              },
            });
          }
        }
      }

      // Build recurrence updates if provided
      const rec: Prisma.InvoiceUpdateInput = {};
      const bodyAny = req.body as any;
      if (typeof bodyAny.estRecurrente !== 'undefined') {
        if (bodyAny.estRecurrente) {
          rec.estRecurrente = true as any;
          if (typeof bodyAny.frequence === 'string') rec.frequence = bodyAny.frequence as any;
          if (typeof bodyAny.prochaineDateRecurrence === 'string') rec.prochaineDateRecurrence = new Date(bodyAny.prochaineDateRecurrence) as any;
          if (typeof bodyAny.dateFinRecurrence === 'string') rec.dateFinRecurrence = new Date(bodyAny.dateFinRecurrence) as any;
          (rec as any).statutRecurrence = 'actif';
        } else {
          rec.estRecurrente = false as any;
          rec.frequence = null as any;
          rec.prochaineDateRecurrence = null as any;
          rec.dateFinRecurrence = null as any;
          (rec as any).statutRecurrence = 'inactif';
        }
      }

      // Finally update invoice header and totals (and optional invoiceNumber)
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes,
          terms,
          status,
          invoiceNumber: normalizedInvoiceNumber || undefined,
          // Only override totals when items were provided; otherwise preserve existing
          ...(itemsProvided ? { subtotal, tvaAmount, total } : {}),
          // Recurrence update
          ...rec,
          updatedAt: new Date(),
        },
        include: {
          client: true,
          items: { orderBy: { order: 'asc' } },
        },
      });

      return inv;
    });

    const response: ApiResponse = {
      success: true,
      data: updatedInvoice,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
      return;
  }
};

// DELETE /api/invoices/:id - Delete invoice
export const deleteInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    await prisma.invoice.delete({
      where: { id },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Facture supprimée avec succès',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error deleting invoice:', error);
    
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
      return;
  }
};

// POST /api/invoices/:id/send - Send invoice by email
export const sendInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Facture envoyée avec succès',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error sending invoice:', error);
    
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
      return;
  }
};

// GET /api/invoices/:id/pdf - Generate PDF for invoice
export const generateInvoicePDF = async (req: Request, res: Response): Promise<void> => {
  // --- DEBUGGING: Log request entry ---
  console.log(`[PDF_DEBUG] ENTERING generateInvoicePDF. req.params available: ${!!req.params}. ID: ${req.params?.id}`);
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { language = 'fr', format = 'A4', template, accentColor, showHeader } = req.query as any;
    // Normalize template aliases (e.g., common typo minimal_moderm -> minimal_modern)
    const templateRaw = typeof template === 'string' ? template.trim() : '';
    const templateAliasMap: Record<string, string> = {
      minimal_moderm: 'minimal_modern',
    };
    const normalizedTemplate = templateAliasMap[templateRaw] || templateRaw;

    // Get invoice with all related data
    const invoice = await prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            street: true,
            city: true,
            postalCode: true,
            country: true,
            vatNumber: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          }
        },
        items: {
          include: {
            product: true,
          },
          orderBy: { order: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            companyName: true,
            firstName: true,
            lastName: true,
            phone: true,
            street: true,
            city: true,
            postalCode: true,
            country: true,
            vatNumber: true,
            iban: true,
            logoUrl: true,
            website: true,
            createdAt: true,
            updatedAt: true,
            quantityDecimals: true,
            pdfPrimaryColor: true,
            pdfTemplate: true,
            pdfShowCompanyNameWithLogo: true,
            pdfShowVAT: true,
            pdfShowPhone: true,
            pdfShowEmail: true,
            pdfShowWebsite: true,
            pdfShowIBAN: true,
          }
        },
      },
    });

    if (!invoice) {
      throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
    }

    // Type assertion to include the relations with all client fields
    interface InvoiceWithRelations extends Prisma.InvoiceGetPayload<{
      include: {
        client: true;
        items: { include: { product: true } };
        user: true;
      };
    }> {}

    const invoiceWithRelations = invoice as unknown as InvoiceWithRelations;

    // Debug log the raw invoice data with client
    // Log detailed client and user data
    console.log('📄 [PDF_DEBUG] Raw invoice data with client:', JSON.stringify({
      invoiceId: invoiceWithRelations.id,
      hasClient: !!invoiceWithRelations.client,
      clientData: invoiceWithRelations.client ? {
        id: invoiceWithRelations.client.id,
        companyName: invoiceWithRelations.client.companyName,
        firstName: invoiceWithRelations.client.firstName,
        lastName: invoiceWithRelations.client.lastName,
        street: invoiceWithRelations.client.street,
        addressLine2: invoiceWithRelations.client.addressLine2,
        city: invoiceWithRelations.client.city,
        postalCode: invoiceWithRelations.client.postalCode,
        country: invoiceWithRelations.client.country,
        email: invoiceWithRelations.client.email,
        phone: invoiceWithRelations.client.phone,
        vatNumber: invoiceWithRelations.client.vatNumber
      } : null,
      userData: invoiceWithRelations.user ? {
        id: invoiceWithRelations.user.id,
        email: invoiceWithRelations.user.email,
        companyName: invoiceWithRelations.user.companyName,
        street: invoiceWithRelations.user.street,
        city: invoiceWithRelations.user.city,
        postalCode: invoiceWithRelations.user.postalCode,
        country: invoiceWithRelations.user.country,
      } : null
    }, null, 2));

    // Convert invoice data to PDF format
    const invoiceData = await convertInvoiceToPDFData(invoiceWithRelations);
    
    // Debug log the converted invoice data
    console.log('Converted invoice data:', JSON.stringify({
      client: invoiceData.client,
      company: invoiceData.company,
      hasClient: !!invoiceData.client,
      hasCompany: !!invoiceData.company
    }, null, 2));
    
    // Generate QR Bill data
    const qrBillData = await createQRBillFromInvoice(invoiceWithRelations);
    
    // Debug log the QR bill data
    console.log('QR Bill data before return:', JSON.stringify({
      hasDebtor: !!qrBillData.debtor,
      debtor: qrBillData.debtor,
      hasCreditor: !!qrBillData.creditor,
      creditor: qrBillData.creditor,
      reference: qrBillData.reference,
      referenceType: qrBillData.referenceType,
      amount: qrBillData.amount,
      currency: qrBillData.currency,
      unstructuredMessage: qrBillData.unstructuredMessage
    }, null, 2));
    
    // Normalize logo path: prefer filesystem absolute path for uploads to avoid HTTP fetch
    try {
      const rawLogo = (invoiceData as any)?.company?.logoUrl as string | undefined;
      if (rawLogo && typeof rawLogo === 'string') {
        const pathMod = require('path');
        const urlMod = require('url');
        let normalized: string | undefined = undefined;

        if (rawLogo.startsWith('/uploads/')) {
          normalized = pathMod.join(process.cwd(), rawLogo.replace(/^\//, ''));
        } else if (rawLogo.startsWith('uploads/')) {
          normalized = pathMod.join(process.cwd(), rawLogo);
        } else if (/^https?:\/\//i.test(rawLogo)) {
          try {
            const u = new urlMod.URL(rawLogo);
            // If URL path points to our uploads directory, use local file path
            if (u.pathname && /^\/uploads\//.test(u.pathname)) {
              normalized = pathMod.join(process.cwd(), u.pathname.replace(/^\//, ''));
            }
          } catch {}
        } else if (rawLogo.startsWith('/')) {
          // Absolute filesystem path already
          normalized = rawLogo;
        }

        if (normalized) {
          (invoiceData as any).company.logoUrl = normalized;
        }
      }
    } catch (e) {
      console.warn('[INVOICE_PDF] Failed to normalize logo path', { error: (e as any)?.message || String(e) });
    }
    try {
      console.info('[INVOICE_PDF] Company logo path', { logo: (invoiceData as any)?.company?.logoUrl || null });
    } catch {}
    
    // Generate PDF with QR Bill using new InvoicePDF component
    // Validate template (include both Puppeteer and PDFKit templates)
    const allowedTemplates = new Set([
      'elegant_classic',
      'minimal_modern',
      'formal_pro',
      'creative_premium',
      'clean_creative',
      'bold_statement',
      // PDFKit templates
      'european_minimal',
      'swiss_classic',
      'swiss_blue',
    ]);
    const tpl = typeof normalizedTemplate === 'string' && allowedTemplates.has(normalizedTemplate) ? (normalizedTemplate as any) : undefined;
    // Normalize and validate accent color more robustly
    const normalizeHexColor = (val: unknown): string | undefined => {
      if (typeof val !== 'string') return undefined;
      let s = val.trim();
      if (s.length === 0) return undefined;
      // Allow values without '#'
      if (!s.startsWith('#')) s = `#${s}`;
      // Uppercase for consistency
      s = `#${s.slice(1).toUpperCase()}`;
      // Handle 8-digit RGBA like #RRGGBBAA -> strip alpha
      if (/^#[0-9A-F]{8}$/.test(s)) s = `#${s.slice(1, 7)}`;
      // Handle 4-digit short RGBA #RGBA -> strip alpha -> #RGB
      if (/^#[0-9A-F]{4}$/.test(s)) s = `#${s[1]}${s[2]}${s[3]}`;
      // Expand short #RGB to #RRGGBB
      if (/^#[0-9A-F]{3}$/.test(s)) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
      // Final validation #RRGGBB
      return /^#[0-9A-F]{6}$/.test(s) ? s : undefined;
    };
    const accColor = normalizeHexColor(accentColor);
    // Parse boolean for showHeader (default true). Accept false-y strings.
    const showHeaderBool = (() => {
      if (typeof showHeader === 'undefined') return true;
      const s = String(showHeader).trim().toLowerCase();
      return !(['false', '0', 'no', 'off'].includes(s));
    })();
    console.log('[INVOICE_PDF] Query params received', { rawTemplate: template, normalizedTemplate, rawAccentColor: accentColor, language, format, showHeader });
    console.log('[INVOICE_PDF] Using options', { template: tpl || '(default)', accentColor: accColor || '(default)', showHeader: showHeaderBool });
    // CRITICAL DEBUG: Confirm we're about to call the updated PDF generator
    console.log('🔥 [CONTROLLER_DEBUG] About to call renderInvoicePDF with template:', tpl, 'and accentColor:', accColor);

    // Prepare data for the new PDF generator (streaming)
    const pdfData: any = {
      invoice: {
        ...invoiceWithRelations,
        items: invoiceWithRelations.items,
        client: invoiceWithRelations.client,
        user: invoiceWithRelations.user,
      },
      client: invoiceWithRelations.client,
      qrData: qrBillData,
      template: tpl,
      accentColor: accColor,
      lang: (language as any) || 'fr',
      showHeader: showHeaderBool,
    };

    // Set basic headers for PDF stream
    res.setHeader('Content-Type', 'application/pdf');
    // Force download to ensure proper browser behavior
    res.setHeader('Content-Disposition', `attachment; filename="facture-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');

    // ALWAYS use PDFKit system (Puppeteer deprecated)
    console.log('[PDF] Using PDFKit system with template:', tpl || '(default)');
    await renderInvoicePDF(pdfData, res as any);
  } catch (error) {
    // Enhanced logging to diagnose PDF/QR Bill generation errors
    const errObj = error as any;
    console.error('[INVOICE_PDF] Error generating invoice PDF', {
      invoiceId: req.params?.id,
      userId: (req as any)?.userId,
      message: errObj?.message || String(error),
      stack: errObj?.stack,
      cause: errObj?.cause?.message || errObj?.cause,
    });
    // If streaming has already started, we cannot change headers or send JSON
    if (res.headersSent) {
      try { res.end(); } catch {}
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

    const devDetails = (process.env.NODE_ENV !== 'production') ? { message: errObj?.message, stack: errObj?.stack } : undefined;
    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur lors de la génération du PDF', ...(devDetails || {}) } as any,
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
};

// POST /api/invoices/:id/duplicate - Duplicate invoice
export const duplicateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    // Get original invoice
    const originalInvoice = await prisma.invoice.findFirst({
      where: { id, userId },
      include: { items: true },
    });

    if (!originalInvoice) {
      throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
    }

    // Create duplicate using configurable numbering in a transaction
    const duplicateInvoice = await prisma.$transaction(async (tx) => {
      // Load user's numbering config
      const userCfg = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!userCfg) {
        throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');
      }

      const makeNumber = (prefix: string | null | undefined, next: number, padding: number): string => {
        const pad = Math.max(0, Number(padding || 0));
        const numeric = String(next);
        const padded = pad > 0 ? numeric.padStart(pad, '0') : numeric;
        const pref = (prefix || '').trim();
        return pref ? `${pref}-${padded}` : padded;
      };

      let attempts = 0;
      while (attempts < 10) {
        attempts++;
        const numberStr = makeNumber(userCfg.invoicePrefix, userCfg.nextInvoiceNumber, userCfg.invoicePadding);
        const qr = computeQRReference({
          mode: ((userCfg as any)?.qrReferenceMode ?? 'auto') as string,
          prefix: ((userCfg as any)?.qrReferencePrefix ?? undefined) as string | undefined,
          invoiceNumber: numberStr,
          iban: userCfg.iban ?? undefined,
          manualReference: originalInvoice.qrReference || undefined,
        });
        try {
          const created = await tx.invoice.create({
            data: {
              userId,
              clientId: originalInvoice.clientId,
              invoiceNumber: numberStr,
              status: 'draft',
              issueDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              language: originalInvoice.language || 'fr',
              currency: originalInvoice.currency,
              subtotal: originalInvoice.subtotal,
              tvaAmount: originalInvoice.tvaAmount,
              total: originalInvoice.total,
              notes: originalInvoice.notes,
              terms: originalInvoice.terms,
              qrReferenceType: qr.type,
              qrReference: qr.reference ?? null,
              items: {
                create: originalInvoice.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  tvaRate: item.tvaRate,
                  total: item.total,
                  order: item.order,
                  // Do not copy productId to avoid FK errors if product was deleted/archived
                  // productId: item.productId,
                })),
              },
            },
            include: {
              client: true,
              items: { orderBy: { order: 'asc' } },
            },
          });
          // Atomically increment the nextInvoiceNumber after successful creation
          await tx.user.update({
            where: { id: userId },
            data: { nextInvoiceNumber: { increment: 1 } },
          });
          return created;
        } catch (e: any) {
          // Unique constraint conflict on invoiceNumber -> retry with incremented counter
          if (e && e.code === 'P2002') {
            await tx.user.update({
              where: { id: userId },
              data: { nextInvoiceNumber: { increment: 1 } },
            });
            const reloaded = await tx.user.findUnique({
              where: { id: userId },
              select: { nextInvoiceNumber: true, invoicePrefix: true, invoicePadding: true },
            });
            if (!reloaded) throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');
            userCfg.nextInvoiceNumber = reloaded.nextInvoiceNumber;
            userCfg.invoicePrefix = reloaded.invoicePrefix;
            userCfg.invoicePadding = reloaded.invoicePadding;
            continue;
          }
          throw e;
        }
      }
      throw new AppError('Échec de génération du numéro de facture après plusieurs tentatives', 500, 'INVOICE_NUMBERING_FAILED');
    });

    const response: ApiResponse = {
      success: true,
      data: duplicateInvoice,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
      return;
  } catch (error) {
    console.error('Error duplicating invoice:', error);
    
    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(error.statusCode).json(response);
      return;
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur interne du serveur',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
      return;
  }
};
/**
 
* Converts Prisma invoice data to PDF format
 */
async function convertInvoiceToPDFData(invoice: any): Promise<any> {
  // Ensure client data is properly formatted
  const clientData = invoice.client ? {
    companyName: invoice.client.companyName || '',
    firstName: invoice.client.firstName || '',
    lastName: invoice.client.lastName || '',
    email: invoice.client.email || '',
    phone: invoice.client.phone || '',
    street: invoice.client.street || '',
    addressLine1: invoice.client.street || invoice.client.addressLine1 || '',
    city: invoice.client.city || '',
    postalCode: invoice.client.postalCode || '',
    country: invoice.client.country || 'CH',
    vatNumber: invoice.client.vatNumber || '',
    addressLine2: invoice.client.addressLine2 || '',
    // Add raw client data for QR bill generation
    ...(invoice.rawClient || {})
  } : null;

  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate),
    dueDate: new Date(invoice.dueDate),
    
    company: {
      name: invoice.user?.companyName || '',
      address: invoice.user?.street || '',
      city: invoice.user?.city || '',
      postalCode: invoice.user?.postalCode || '',
      country: invoice.user?.country || 'Suisse',
      vatNumber: invoice.user?.vatNumber || '',
      phone: invoice.user?.phone || '',
      email: invoice.user?.email || '',
      logoUrl: invoice.user.logoUrl || invoice.user.logo_path || invoice.user.logoPath || undefined,
      website: invoice.user.website,
    },
    
    client: clientData,
    
    // Include raw client data for QR bill generation
    rawClient: {
      ...clientData,
      name: clientData?.companyName || `${clientData?.firstName || ''} ${clientData?.lastName || ''}`.trim()
    },
    
    items: invoice.items.map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      tvaRate: Number(item.tvaRate),
      total: Number(item.total),
      unit: typeof item.unit === 'string' && item.unit.trim().length > 0
        ? item.unit
        : (item.product && typeof item.product.unit === 'string' && item.product.unit.trim().length > 0
            ? item.product.unit
            : undefined),
    })),
    
    subtotal: Number(invoice.subtotal),
    tvaAmount: Number(invoice.tvaAmount),
    total: Number(invoice.total),
    currency: invoice.currency as 'CHF' | 'EUR',
    
    notes: invoice.notes,
    terms: invoice.terms,
  };
}

/**
 * Creates QR Bill data from invoice
 */
// POST /api/invoices/:id/payments - Add a payment to an invoice
export const addPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { amount, paymentDate, method, notes } = req.body;

    if (!amount || !paymentDate) {
      throw new AppError('Montant et date de paiement requis', 400, 'MISSING_DATA');
    }

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, userId },
        include: { payments: true },
      });

      if (!invoice) {
        throw new AppError('Facture non trouvée', 404, 'INVOICE_NOT_FOUND');
      }

      await tx.payment.create({
        data: {
          invoiceId: id,
          amount: Number(amount),
          paymentDate: new Date(paymentDate),
          method: method || 'bank_transfer',
          notes,
        },
      });

      const totalPaid = invoice.payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0)).add(amount);
      
      // Round both values to 2 decimals for comparison (avoid floating point precision issues)
      const totalPaidRounded = Math.round(totalPaid.toNumber() * 100) / 100;
      const invoiceTotalRounded = Math.round(Number(invoice.total) * 100) / 100;
      
      console.log('[Payment] Calculating status:', {
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        previousPayments: invoice.payments.length,
        newPayment: amount,
        totalPaid: totalPaid.toString(),
        totalPaidRounded,
        invoiceTotal: invoice.total.toString(),
        invoiceTotalRounded,
        isPaid: totalPaidRounded >= invoiceTotalRounded,
        currentStatus: invoice.status
      });
      
      // Update payment status based on total paid
      let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
      let status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' = invoice.status as any;
      let paidDate: Date | null = invoice.paidDate;
      
      if (totalPaidRounded >= invoiceTotalRounded) {
        paymentStatus = 'PAID';
        status = 'paid';
        paidDate = new Date(paymentDate); // Set paid date to payment date
        console.log('[Payment] ✅ Setting status to paid');
      } else if (totalPaid.gt(0)) {
        paymentStatus = 'PARTIALLY_PAID';
        // Keep status as SENT if it was sent, or DRAFT if still draft
        if (status === 'draft') {
          status = 'sent'; // Promote to sent if payment received on draft
        }
        console.log('[Payment] ⚠️ Setting status to PARTIALLY_PAID');
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: { 
          paymentStatus, 
          status,
          paidDate 
        },
        include: { client: true, items: true, payments: true },
      });
      
      console.log('[Payment] ✅ Invoice updated:', {
        id: updated.id,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        paidDate: updated.paidDate
      });
      
      return updated;
    });

    res.status(201).json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error('Error adding payment:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
    }
  }
};

// DELETE /api/invoices/:invoiceId/payments/:paymentId - Delete a payment
export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { invoiceId, paymentId } = req.params;

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: true },
      });

      if (!payment || payment.invoice.userId !== userId) {
        throw new AppError('Paiement non trouvé', 404, 'PAYMENT_NOT_FOUND');
      }

      await tx.payment.delete({ where: { id: paymentId } });

      const remainingPayments = await tx.payment.findMany({ where: { invoiceId } });
      const totalPaid = remainingPayments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));

      // Round both values to 2 decimals for comparison
      const totalPaidRounded = Math.round(totalPaid.toNumber() * 100) / 100;
      const invoiceTotalRounded = Math.round(Number(payment.invoice.total) * 100) / 100;

      let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
      let status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' = payment.invoice.status as any;
      let paidDate: Date | null = payment.invoice.paidDate;
      
      if (totalPaidRounded >= invoiceTotalRounded) {
        paymentStatus = 'PAID';
        status = 'paid';
        // Keep existing paidDate if still fully paid
      } else if (totalPaid.gt(0)) {
        paymentStatus = 'PARTIALLY_PAID';
        status = 'sent'; // Change back to sent if partially paid
        paidDate = null; // Clear paid date if not fully paid
      } else {
        // No payments remaining
        status = payment.invoice.status === 'paid' ? 'sent' : payment.invoice.status as any;
        paidDate = null;
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: { 
          paymentStatus,
          status,
          paidDate
        },
        include: { client: true, items: true, payments: true },
      });
    });

    res.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error('Error deleting payment:', error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
    }
  }
};


async function createQRBillFromInvoice(invoice: any): Promise<SwissQRBillData> {
  // Helper: normalize country names/codes to ISO 3166-1 alpha-2 (minimal map, default CH)
  const normalizeCountry = (val: any): string | undefined => {
    if (!val || typeof val !== 'string') return undefined;
    const s = val.trim().toUpperCase();
    // Already ISO-2
    if (/^[A-Z]{2}$/.test(s)) return s;
    // Common names mapping
    const map: Record<string, string> = {
      SUISSE: 'CH',
      SWITZERLAND: 'CH',
      SCHWEIZ: 'CH',
      SVIZZERA: 'CH',
      SUIZA: 'CH',
      FRANCE: 'FR',
      FRANÇA: 'FR',
      FRANÇAIS: 'FR',
      FRANCA: 'FR',
      ALLEMAGNE: 'DE',
      GERMANY: 'DE',
      ITALIE: 'IT',
      ITALIA: 'IT',
    };
    return map[s] || undefined;
  };
  // Sanitize and validate creditor IBAN
  const rawIban: string = (invoice.user?.iban || '').replace(/\s+/g, '').toUpperCase();
  const hasIban = rawIban.length > 0;
  // Use only the user's configured IBAN - no test fallback
  const swissIban = hasIban ? rawIban : '';

  const userSettings = invoice.user || {};
  const qrMode: string = (userSettings.qrReferenceMode || 'auto').toLowerCase();
  const qrPrefix: string | undefined = userSettings.qrReferencePrefix || undefined;

  const qrResult = computeQRReference({
    mode: qrMode,
    prefix: qrPrefix,
    invoiceNumber: invoice.invoiceNumber || '',
    manualReference: invoice.qrReference || undefined,
    iban: swissIban,
  });

  if (qrResult.type === QRReferenceType.NON && swissIban && (!isValidSwissIBAN(swissIban) || !isQRIBAN(swissIban))) {
    console.warn('[QRBILL] Creditor IBAN is not a valid Swiss QR-IBAN. QR reference will not be generated.', {
      ibanPreview: `${swissIban.slice(0, 6)}…${swissIban.slice(-4)}`,
    });
  }

  if (!hasIban) {
    console.warn('[QRBILL] No IBAN configured for creditor. QR Bill will be generated without account information.');
  }

  const reference = qrResult.reference || undefined;
  const referenceType = qrResult.type;

  const qrBillData: SwissQRBillData = {
    creditor: {
      name: invoice.user.companyName,
      addressLine1: invoice.user.street,
      postalCode: invoice.user.postalCode,
      city: invoice.user.city,
      country: normalizeCountry(invoice.user.country) || 'CH',
    },
    // Do not use a hardcoded fallback IBAN; pass user's sanitized IBAN or empty string
    creditorAccount: swissIban,
    amount: Number(invoice.total),
    currency: invoice.currency as 'CHF' | 'EUR',
    referenceType,
    reference,
    unstructuredMessage: `Facture ${invoice.invoiceNumber}${invoice.notes ? ` - ${invoice.notes}` : ''}`,
  };

  // Add debug logging for invoice data
  console.log('Invoice client data:', JSON.stringify({
    hasClient: !!invoice.client,
    client: invoice.client,
    user: {
      companyName: invoice.user?.companyName,
      street: invoice.user?.street,
      postalCode: invoice.user?.postalCode,
      city: invoice.user?.city,
      country: invoice.user?.country,
      iban: invoice.user?.iban
    }
  }, null, 2));

  // Add debtor information if available
  const client = invoice.rawClient || invoice.client;
  if (client) {
    // Enhanced debug logging for client data
    console.log('Client data found:', JSON.stringify({
      clientExists: !!client,
      clientKeys: client ? Object.keys(client) : [],
      clientData: client,
      hasName: !!(client.name || client.companyName || client.firstName || client.lastName),
      hasStreet: !!client.street || !!client.addressLine1,
      hasPostalCode: !!client.postalCode,
      hasCity: !!client.city,
      hasCountry: !!client.country,
      rawClient: invoice.rawClient ? 'present' : 'missing',
      regularClient: invoice.client ? 'present' : 'missing'
    }, null, 2));

    // Handle different client data structures
    const clientName = client.name || client.companyName || 
                      `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
                      'Client Name Not Provided';
    
    // Use addressLine1 if street is not available
    const street = client.street || client.addressLine1 || 'Street Not Provided';
    const postalCode = client.postalCode || 'N/A';
    const city = client.city || 'City Not Provided';
    const country = normalizeCountry(client.country) || 'CH';
    const addressLine2 = client.addressLine2 || '';

    // Validate required fields
    if (!clientName || !street || !postalCode || !city) {
      console.error('Missing required client data:', {
        hasName: !!clientName,
        hasStreet: !!street,
        hasPostalCode: !!postalCode,
        hasCity: !!city,
        hasCountry: !!country,
        client: client
      });
    }

    // Set debtor information
    qrBillData.debtor = {
      name: clientName,
      addressLine1: street,
      addressLine2: addressLine2,
      postalCode: postalCode,
      city: city,
      country: country
    };
    
    // Log the final debtor data being set
    console.log('QR Bill debtor data being set:', JSON.stringify({
      name: qrBillData.debtor.name,
      addressLine1: qrBillData.debtor.addressLine1,
      addressLine2: qrBillData.debtor.addressLine2,
      postalCode: qrBillData.debtor.postalCode,
      city: qrBillData.debtor.city,
      country: qrBillData.debtor.country,
      hasDebtor: !!qrBillData.debtor
    }, null, 2));
  } else {
    console.warn('No client data found for invoice:', {
      invoiceId: invoice.id,
      hasClientProperty: 'client' in invoice,
      hasRawClientProperty: 'rawClient' in invoice,
      clientValue: invoice.client,
      rawClientValue: invoice.rawClient,
      invoiceKeys: Object.keys(invoice)
    });
  }

  return qrBillData;
}

// Export QR Bill function for use in email service
export { createQRBillFromInvoice };

// ===== EMAIL SENDING ENDPOINTS =====

import { sendDocumentByEmail, previewDocumentEmail } from '../services/emailDocumentService';

/**
 * POST /api/invoices/:id/send-email
 * Send invoice by email
 */
export const sendInvoiceEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { recipientEmail, customSubject, customBody } = req.body;

    const result = await sendDocumentByEmail({
      documentId: id,
      documentType: 'invoice',
      recipientEmail,
      customSubject,
      customBody,
      userId,
    });

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: result.error || 'Échec de l\'envoi de l\'email',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Email envoyé avec succès',
        messageId: result.messageId,
        logId: result.logId,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error sending invoice email:', error);

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

/**
 * POST /api/invoices/:id/preview-email
 * Preview invoice email content
 */
export const previewInvoiceEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const preview = await previewDocumentEmail(id, 'invoice', userId);

    if (!preview) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVOICE_NOT_FOUND',
          message: 'Facture non trouvée',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: preview,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error previewing invoice email:', error);

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

/**
 * POST /api/quotes/:id/send-email
 * Send quote by email
 */
export const sendQuoteEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { recipientEmail, customSubject, customBody } = req.body;

    const result = await sendDocumentByEmail({
      documentId: id,
      documentType: 'quote',
      recipientEmail,
      customSubject,
      customBody,
      userId,
    });

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: result.error || 'Échec de l\'envoi de l\'email',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(400).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Email envoyé avec succès',
        messageId: result.messageId,
        logId: result.logId,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error sending quote email:', error);

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

/**
 * POST /api/quotes/:id/preview-email
 * Preview quote email content
 */
export const previewQuoteEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const preview = await previewDocumentEmail(id, 'quote', userId);

    if (!preview) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'QUOTE_NOT_FOUND',
          message: 'Devis non trouvé',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: preview,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Error previewing quote email:', error);

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