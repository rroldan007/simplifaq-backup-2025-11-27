import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../services/database';
import type { Prisma } from '@prisma/client';
import multer from 'multer';
import { AsistenteClient } from '../services/asistenteClient';

const router = Router();

// Configuration de multer pour l'upload de factures/reçus
const storage = multer.memoryStorage(); // Stocker en mémoire pour envoyer directement à l'API
const receiptUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Types de fichiers autorisés: images et PDFs
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Formats acceptés: PNG, JPG, WEBP, PDF'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

const DEFAULT_ACCOUNTS: Array<{ code: string; name: string; type: 'EXPENSE' | 'REVENUE' | 'OTHER' }> = [
  { code: '5200', name: 'Salaires', type: 'EXPENSE' },
  { code: '6000', name: 'Loyer', type: 'EXPENSE' },
  { code: '6200', name: 'Entretien des véhicules', type: 'EXPENSE' },
  { code: '6300', name: 'Assurance', type: 'EXPENSE' },
  { code: '6500', name: "Frais d'administration", type: 'EXPENSE' },
  { code: '6510', name: 'Téléphone / Internet', type: 'EXPENSE' },
  { code: '6700', name: "Autres charges d'exploitation", type: 'EXPENSE' },
  { code: '6900', name: 'Intérêts charges', type: 'EXPENSE' },
  { code: '6940', name: 'Frais bancaires', type: 'EXPENSE' },
];

function parseDate(val: unknown): Date | null {
  if (!val || typeof val !== 'string') return null;
  const d = new Date(val);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function ensureDefaultExpenseAccounts(userId: string) {
  try {
    for (const a of DEFAULT_ACCOUNTS) {
      await prisma.account.upsert({
        where: { userId_code: { userId, code: a.code } },
        update: {},
        create: {
          userId,
          code: a.code,
          name: a.name,
          type: a.type,
          active: true,
        },
      });
    }
  } catch { }
}

// Fonction helper pour trouver le meilleur compte en fonction du label/fournisseur
async function findBestAccountForExpense(userId: string, label: string, supplier?: string): Promise<any> {
  const searchText = `${label} ${supplier || ''}`.toLowerCase();

  // Récupérer tous les comptes de dépenses actifs de l'utilisateur
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      active: true
    },
    orderBy: { code: 'asc' }
  });

  if (accounts.length === 0) {
    throw new Error('Aucun compte de dépenses disponible');
  }

  // Patterns de correspondance pour différentes catégories
  const matchPatterns = [
    { keywords: ['salaire', 'paie', 'rémunération', 'wages', 'salary'], codes: ['5200'] },
    { keywords: ['loyer', 'rent', 'location'], codes: ['6000'] },
    { keywords: ['véhicule', 'voiture', 'essence', 'carburant', 'parking', 'vehicle', 'car'], codes: ['6200'] },
    { keywords: ['assurance', 'insurance'], codes: ['6300'] },
    { keywords: ['administration', 'bureau', 'fourniture', 'office', 'supplies'], codes: ['6500'] },
    { keywords: ['téléphone', 'internet', 'mobile', 'communication', 'phone'], codes: ['6510'] },
    { keywords: ['banque', 'bank', 'frais bancaire'], codes: ['6940'] },
    { keywords: ['intérêt', 'interest', 'emprunt', 'loan'], codes: ['6900'] },
  ];

  // Chercher une correspondance
  for (const pattern of matchPatterns) {
    if (pattern.keywords.some(kw => searchText.includes(kw))) {
      const matchedAccount = accounts.find(acc => pattern.codes.includes(acc.code));
      if (matchedAccount) {
        return matchedAccount;
      }
    }
  }

  // Si aucune correspondance, utiliser le compte "Autres charges" ou le premier compte
  return accounts.find(acc => acc.code === '6700') || accounts[0];
}

// All expenses routes require auth
router.use(authenticateToken);

// POST /api/expenses/analyze-receipt - Analyser une image de facture avec l'assistant ADM
router.post('/analyze-receipt', receiptUpload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const token = req.headers.authorization?.replace('Bearer ', '') || '';

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Aucun fichier fourni' }
      });
    }

    console.log('[Expenses] Analyzing receipt:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // S'assurer que les comptes par défaut existent
    await ensureDefaultExpenseAccounts(userId);

    // Récupérer les comptes existants pour fournir le contexte à l'assistant
    const accounts = await prisma.account.findMany({
      where: { userId, type: 'EXPENSE', active: true },
      select: { id: true, code: true, name: true }
    });

    // Préparer les métadonnées pour l'assistant
    const metadata = {
      userId,
      availableAccounts: accounts,
      language: 'fr',
      currency: 'CHF'
    };

    // Extraer texto con OCR solamente (sin llamar al ADM por ahora)
    const { extractTextFromReceipt } = await import('../services/ocrService');
    const ocrResult = await extractTextFromReceipt(req.file.buffer, req.file.mimetype);

    console.log('[Expenses] OCR result:', {
      textLength: ocrResult.text.length,
      confidence: ocrResult.confidence
    });

    // Parsing simple del texto extraído
    const extractedText = ocrResult.text;

    // Extraer información básica del texto
    const supplier = null; // Usuario lo llenará manualmente
    const label = 'Dépense - Vérifier le texte OCR';

    // Buscar cantidades (números con decimal o coma)
    const amountMatches = extractedText.match(/(\d+[.,]\d{2})/g);
    const amount = amountMatches ? parseFloat(amountMatches[amountMatches.length - 1].replace(',', '.')) : 0;

    // TVA común en Suiza: 8.1%
    const tvaRate = 8.1;

    const dateStr = null; // Usuario lo llenará

    // Parser la date
    let expenseDate = new Date();
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        expenseDate = parsedDate;
      }
    }

    // Trouver le meilleur compte pour cette dépense
    const account = await findBestAccountForExpense(userId, String(label), supplier ? String(supplier) : undefined);

    // Calculer la TVA déductible
    const tvaDeductible = tvaRate > 0 ? amount * (tvaRate / (100 + tvaRate)) : 0;

    // Retourner les données extraites pour confirmation
    return res.json({
      success: true,
      data: {
        summary: `Texte OCR extrait (${extractedText.length} caractères). Vérifiez et complétez les informations.`,
        extractedData: {
          supplier,
          label,
          amount,
          currency: 'CHF',
          tvaRate,
          tvaDeductible: parseFloat(tvaDeductible.toFixed(2)),
          date: expenseDate.toISOString(),
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          notes: extractedText // Le texte OCR complet dans les notes
        },
        ocrText: extractedText, // Texto OCR para mostrar al usuario
        confidence: ocrResult.confidence,
        requiresConfirmation: true
      }
    });

  } catch (error: any) {
    console.error('[Expenses] Error analyzing receipt:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: error.message || 'Erreur lors de l\'analyse de la facture'
      }
    });
  }
});

// GET /api/expenses/accounts - list expense accounts (ensure defaults)
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    await ensureDefaultExpenseAccounts(userId);

    const accounts = await prisma.account.findMany({
      where: { userId, active: true, type: 'EXPENSE' },
      orderBy: [{ code: 'asc' }],
    });

    return res.json({ success: true, data: accounts });
  } catch (e) {
    return res.status(500).json({ success: false, error: { code: 'EXPENSES_ACCOUNTS_ERROR', message: 'Erreur comptes de charges' } });
  }
});

// GET /api/expenses - list expenses in date range
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const dateFrom = parseDate((req.query as any).dateFrom) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let dateTo = parseDate((req.query as any).dateTo) || new Date();

    // Set dateTo to end of day (23:59:59.999) to include all expenses on that day
    dateTo = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: dateFrom, lte: dateTo },
      },
      include: {
        account: true
      },
      orderBy: { date: 'desc' },
    });

    return res.json({ success: true, data: expenses });
  } catch (e) {
    return res.status(500).json({ success: false, error: { code: 'EXPENSES_LIST_ERROR', message: 'Erreur liste des dépenses' } });
  }
});

// POST /api/expenses - create expense
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { accountId, date, label, amount, currency, tvaRate, supplier, notes } = req.body;

    if (!accountId || !date || !label || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Champs requis: accountId, date, label, amount' }
      });
    }

    const expenseDate = parseDate(date);
    if (!expenseDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'Date invalide' }
      });
    }

    // Calculate TVA déductible automatically
    const amountNum = Number(amount);
    const tvaRateNum = tvaRate ? Number(tvaRate) : 0;
    const tvaDeductible = tvaRateNum > 0 ? amountNum * (tvaRateNum / (100 + tvaRateNum)) : 0;

    const expense = await prisma.expense.create({
      data: {
        userId,
        accountId,
        date: expenseDate,
        label: String(label),
        amount: amountNum,
        currency: currency || 'CHF',
        tvaRate: tvaRateNum > 0 ? tvaRateNum : null,
        tvaDeductible,
        supplier: supplier || null,
        notes: notes || null,
      },
      include: {
        account: true
      }
    });

    return res.status(201).json({ success: true, data: expense });
  } catch (e: any) {
    console.error('Create expense error:', e);
    return res.status(500).json({
      success: false,
      error: { code: 'EXPENSE_CREATE_ERROR', message: e.message || 'Erreur création dépense' }
    });
  }
});

// PUT /api/expenses/:id - update expense
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { id } = req.params;
    const { accountId, date, label, amount, currency, tvaRate, supplier, notes } = req.body;

    const existing = await prisma.expense.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Dépense non trouvée' }
      });
    }

    const updateData: any = {};
    if (accountId !== undefined) updateData.accountId = accountId;
    if (date !== undefined) {
      const expenseDate = parseDate(date);
      if (!expenseDate) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_DATE', message: 'Date invalide' }
        });
      }
      updateData.date = expenseDate;
    }
    if (label !== undefined) updateData.label = String(label);
    if (amount !== undefined) updateData.amount = Number(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (tvaRate !== undefined) updateData.tvaRate = tvaRate ? Number(tvaRate) : null;
    if (supplier !== undefined) updateData.supplier = supplier || null;
    if (notes !== undefined) updateData.notes = notes || null;

    // Recalculate TVA déductible if amount or tvaRate changed
    if (amount !== undefined || tvaRate !== undefined) {
      const finalAmount = amount !== undefined ? Number(amount) : existing.amount;
      const finalTvaRate = tvaRate !== undefined ? (tvaRate ? Number(tvaRate) : 0) : (existing.tvaRate || 0);
      updateData.tvaDeductible = finalTvaRate > 0 ? finalAmount * (finalTvaRate / (100 + finalTvaRate)) : 0;
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        account: true
      }
    });

    return res.json({ success: true, data: expense });
  } catch (e: any) {
    console.error('Update expense error:', e);
    return res.status(500).json({
      success: false,
      error: { code: 'EXPENSE_UPDATE_ERROR', message: e.message || 'Erreur mise à jour dépense' }
    });
  }
});

// DELETE /api/expenses/:id - delete expense
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const { id } = req.params;

    const existing = await prisma.expense.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Dépense non trouvée' }
      });
    }

    await prisma.expense.delete({ where: { id } });

    return res.json({ success: true, message: 'Dépense supprimée' });
  } catch (e: any) {
    console.error('Delete expense error:', e);
    return res.status(500).json({
      success: false,
      error: { code: 'EXPENSE_DELETE_ERROR', message: e.message || 'Erreur suppression dépense' }
    });
  }
});

// GET /api/expenses/tva-summary - compute TVA collected vs deductible
router.get('/tva-summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const dateFrom = parseDate((req.query as any).dateFrom) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let dateTo = parseDate((req.query as any).dateTo) || new Date();

    // Set dateTo to end of day (23:59:59.999)
    dateTo = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999);

    const currency = typeof (req.query as any).currency === 'string' ? String((req.query as any).currency) : 'CHF';

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId, issueDate: { gte: dateFrom, lte: dateTo } },
        include: { items: true }
      }),
      prisma.expense.findMany({ where: { userId, date: { gte: dateFrom, lte: dateTo } } }),
    ]);

    // TVA Collected (from paid invoices)
    const paidInvoices = invoices.filter((inv) => String((inv as any).status || '').toUpperCase() === 'PAID');
    const tvaCollected = paidInvoices.reduce((acc, inv) => acc + Number((inv as any).tvaAmount ?? 0), 0);

    // TVA breakdown by rate for INVOICES (collected) - calculate from invoice items
    const tvaCollectedByRate = new Map<number, { count: number; invoiceNumbers: string[]; baseAmount: number; tvaAmount: number; totalGross: number }>();

    paidInvoices.forEach(inv => {
      const items = (inv as any).items || [];
      const invoiceNumber = String((inv as any).invoiceNumber || 'N/A');

      items.forEach((item: any) => {
        const tvaRate = item.tvaRate ?? 0;
        const quantity = item.quantity ?? 1;
        const unitPrice = item.unitPrice ?? 0;
        const baseAmount = quantity * unitPrice;
        const tvaAmount = baseAmount * (tvaRate / 100);
        const totalGross = baseAmount + tvaAmount;

        if (!tvaCollectedByRate.has(tvaRate)) {
          tvaCollectedByRate.set(tvaRate, { count: 0, invoiceNumbers: [], baseAmount: 0, tvaAmount: 0, totalGross: 0 });
        }

        const current = tvaCollectedByRate.get(tvaRate)!;
        if (!current.invoiceNumbers.includes(invoiceNumber)) {
          current.count += 1;
          current.invoiceNumbers.push(invoiceNumber);
        }
        current.baseAmount += baseAmount;
        current.tvaAmount += tvaAmount;
        current.totalGross += totalGross;
      });
    });

    // Convert map to array sorted by rate (descending)
    const tvaCollectedBreakdown = Array.from(tvaCollectedByRate.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, data]) => ({
        rate,
        rateLabel: rate === 8.1 ? 'Taux normal (8.1%)' :
          rate === 2.6 ? 'Taux réduit (2.6%)' :
            rate === 3.8 ? 'Taux spécial hébergement (3.8%)' :
              rate === 0 ? 'Exonéré de TVA' :
                `TVA ${rate}%`,
        invoiceCount: data.count,
        invoices: data.invoiceNumbers,
        totalNet: Math.round(data.baseAmount * 100) / 100,
        totalTva: Math.round(data.tvaAmount * 100) / 100,
        totalGross: Math.round(data.totalGross * 100) / 100
      }));

    // TVA Deductible (from expenses) - use pre-calculated tvaDeductible field
    const tvaDeductible = expenses.reduce((acc, exp) => acc + Number(exp.tvaDeductible ?? 0), 0);

    // TVA breakdown by rate for expenses (deductible)
    const tvaDeductibleByRate = new Map<number, { count: number; baseAmount: number; tvaAmount: number }>();
    expenses.forEach(exp => {
      const rate = exp.tvaRate ?? 0;
      const tva = exp.tvaDeductible ?? 0;
      const base = exp.amount - tva;

      if (!tvaDeductibleByRate.has(rate)) {
        tvaDeductibleByRate.set(rate, { count: 0, baseAmount: 0, tvaAmount: 0 });
      }

      const current = tvaDeductibleByRate.get(rate)!;
      current.count += 1;
      current.baseAmount += base;
      current.tvaAmount += tva;
    });

    // Convert map to array sorted by rate (descending)
    const tvaDeductibleBreakdown = Array.from(tvaDeductibleByRate.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, data]) => ({
        rate,
        rateLabel: rate === 8.1 ? 'Taux normal (8.1%)' :
          rate === 2.6 ? 'Taux réduit (2.6%)' :
            rate === 3.8 ? 'Taux spécial hébergement (3.8%)' :
              rate === 0 ? 'Exonéré de TVA' :
                `TVA ${rate}%`,
        count: data.count,
        baseAmount: Math.round(data.baseAmount * 100) / 100,
        tvaAmount: Math.round(data.tvaAmount * 100) / 100
      }));

    // TVA Net (positive = to pay, negative = to recover)
    const tvaNet = tvaCollected - tvaDeductible;

    return res.json({
      success: true,
      data: {
        tvaCollected: Math.round(tvaCollected * 100) / 100,
        tvaDeductible: Math.round(tvaDeductible * 100) / 100,
        tvaNet: Math.round(tvaNet * 100) / 100,
        tvaCollectedBreakdown,
        tvaDeductibleBreakdown,
        currency,
        period: { from: dateFrom.toISOString(), to: dateTo.toISOString() }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: { code: 'TVA_SUMMARY_ERROR', message: 'Erreur calcul TVA' } });
  }
});

// GET /api/expenses/pnl - compute CA, Charges, Utilité for range
router.get('/pnl', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const dateFrom = parseDate((req.query as any).dateFrom) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let dateTo = parseDate((req.query as any).dateTo) || new Date();

    // Set dateTo to end of day (23:59:59.999) to include all expenses/invoices on that day
    dateTo = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999);

    const currency = typeof (req.query as any).currency === 'string' ? String((req.query as any).currency) : 'CHF';

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({ where: { userId, issueDate: { gte: dateFrom, lte: dateTo } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: dateFrom, lte: dateTo } } }),
    ]);

    // Only count paid invoices as CA
    const paidInvoices = invoices.filter((inv) => String((inv as any).status || '').toUpperCase() === 'PAID');

    const revenue = paidInvoices.reduce((acc, inv) => acc + Number((inv as any).subtotal ?? 0), 0);
    const tva = paidInvoices.reduce((acc, inv) => acc + Number((inv as any).tvaAmount ?? 0), 0);
    const ca = paidInvoices.reduce((acc, inv) => acc + Number((inv as any).total ?? 0), 0);

    const charges = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const utilite = revenue - charges;

    return res.json({
      success: true,
      data: {
        revenue,
        tva,
        charges,
        utilite,
        currency,
        ca,
        period: { from: dateFrom.toISOString(), to: dateTo.toISOString() }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: { code: 'EXPENSES_PNL_ERROR', message: 'Erreur calcul P&L' } });
  }
});

export default router;
