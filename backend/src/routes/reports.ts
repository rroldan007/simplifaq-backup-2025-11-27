import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../services/database';

const router = Router();

function parseDateParam(val: unknown): Date | null {
  if (!val || typeof val !== 'string') return null;
  const d = new Date(val);
  return Number.isFinite(d.getTime()) ? d : null;
}

// Helpers
async function getInvoicesForUser(userId: string, from?: Date | null, to?: Date | null) {
  // Get all invoices for user, we'll filter by issueDate in memory
  // This is more reliable than DB filtering since issueDate can be null
  const allInvoices = await prisma.invoice.findMany({ where: { userId } });
  
  // If no date filter, return all
  if (!from && !to) return allInvoices;
  
  // Filter by issueDate (fallback to createdAt if issueDate is null)
  return allInvoices.filter(inv => {
    const dateToCheck = inv.issueDate ? new Date(inv.issueDate) : new Date(inv.createdAt);
    if (from && dateToCheck < from) return false;
    if (to && dateToCheck > to) return false;
    return true;
  });
}

router.get('/financial-summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const invoices = await getInvoicesForUser(userId, oneYearAgo, now);

    const totals = {
      total: 0,
      pending: 0,
      overdue: 0,
    };
    let draft = 0, sent = 0, paid = 0, overdue = 0;

    for (const inv of invoices) {
      const amount = Number(inv.total || 0);
      totals.total += amount;
      const status = String(inv.status || '').toLowerCase();
      if (status === 'draft') draft++;
      else if (status === 'sent') { sent++; totals.pending += amount; }
      else if (status === 'paid') paid++;
      else if (status === 'overdue') { overdue++; totals.overdue += amount; }
    }

    const activeClients = await prisma.client.count({ where: { userId } });

    return res.json({
      success: true,
      data: {
        period: { from: oneYearAgo.toISOString(), to: now.toISOString() },
        invoices: { total: invoices.length, draft, sent, paid, overdue },
        revenue: totals,
        tva: { breakdown: [], totalTva: 0, totalNet: 0 },
        activeClients,
        currency: 'CHF',
        revenueGrowthRate: 0,
        invoiceGrowthRate: 0,
        clientGrowthRate: 0,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: { code: 'REPORT_ERROR', message: 'Erreur résumé financier' } });
  }
});

router.get('/kpis', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const dateFrom = parseDateParam(req.query.dateFrom);
    let dateTo = parseDateParam(req.query.dateTo) || new Date();
    const from = dateFrom || new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);
    
    // Set dateTo to end of day (23:59:59.999) to include all invoices from that day
    dateTo = new Date(dateTo);
    dateTo.setHours(23, 59, 59, 999);

    console.log('[KPIs] Fetching data for period:', { from: from.toISOString(), to: dateTo.toISOString(), userId });

    // Get ALL invoices for the user (we'll filter by issueDate later)
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
      }
    });

    console.log('[KPIs] Total invoices found:', invoices.length);

    // Get expenses in the same period
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: from, lte: dateTo }
      }
    });

    let ca = 0; // CA payé (factures with status = paid)
    let overdueAmount = 0;
    let paidCount = 0;

    // Filter invoices by issueDate and calculate metrics
    const invoicesInPeriod = invoices.filter(inv => {
      const issueDate = inv.issueDate ? new Date(inv.issueDate) : new Date(inv.createdAt);
      return issueDate >= from && issueDate <= dateTo;
    });

    console.log('[KPIs] Invoices in period (by issueDate):', invoicesInPeriod.length);

    // Count invoices issued (excluding quotes)
    const invoicesIssued = invoicesInPeriod.filter(inv => !inv.isQuote).length;
    console.log('[KPIs] Invoices issued (excluding quotes):', invoicesIssued);

    // Calculate CA from invoices in period
    for (const inv of invoicesInPeriod) {
      const amount = Number(inv.total || 0);
      const status = String(inv.status || '').toUpperCase(); // Use uppercase for consistency
      
      if (status === 'PAID') { 
        ca += amount; 
        paidCount++; 
      }
      if (status === 'OVERDUE') overdueAmount += amount;
    }

    console.log('[KPIs] Calculated:', { ca, paidCount, overdueAmount, invoicesIssued });

    // Calculate charges from expenses
    const charges = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const utilite = ca - charges;
    const totalConsidered = invoicesInPeriod.reduce((acc, i) => acc + Number(i.total || 0), 0);
    const collectionRate = totalConsidered > 0 ? Math.round((ca / totalConsidered) * 100) : 0;

    const result = {
      ca,
      charges,
      utilite,
      invoicesIssued,
      collectionRate,
      overdueAmount,
      currency: 'CHF',
      period: { from: from.toISOString(), to: dateTo.toISOString() },
    };

    console.log('[KPIs] Returning:', result);

    return res.json({
      success: true,
      data: result,
    });
  } catch (e) {
    console.error('[KPIs] Error:', e);
    return res.status(500).json({ success: false, error: { code: 'REPORT_KPIS_ERROR', message: 'Erreur KPIs' } });
  }
});

router.get('/revenue-series', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const dateFrom = parseDateParam(req.query.dateFrom);
    let dateTo = parseDateParam(req.query.dateTo) || new Date();
    const from = dateFrom || new Date(dateTo.getFullYear(), dateTo.getMonth() - 5, 1);
    
    // Set dateTo to end of day
    dateTo = new Date(dateTo);
    dateTo.setHours(23, 59, 59, 999);

    const invoices = await getInvoicesForUser(userId, from, dateTo);
    
    // Get expenses in the same period
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: from, lte: dateTo }
      }
    });

    // Group by YYYY-MM
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const map = new Map<string, { caPaid: number; charges: number; utilite: number }>();

    // Add invoice revenue
    for (const inv of invoices) {
      const issueDate = inv.issueDate ? new Date(inv.issueDate) : new Date(inv.createdAt);
      const k = fmt(issueDate);
      if (!map.has(k)) map.set(k, { caPaid: 0, charges: 0, utilite: 0 });
      const row = map.get(k)!;
      const amount = Number(inv.total || 0);
      const status = String(inv.status || '').toUpperCase(); // Use uppercase for consistency
      if (status === 'PAID') row.caPaid += amount;
    }

    // Add expenses
    for (const exp of expenses) {
      const k = fmt(new Date(exp.date));
      if (!map.has(k)) map.set(k, { caPaid: 0, charges: 0, utilite: 0 });
      const row = map.get(k)!;
      row.charges += Number(exp.amount || 0);
    }

    // Calculate utilite for each period
    for (const [_, row] of map) {
      row.utilite = row.caPaid - row.charges;
    }

    // Ensure continuous months between from and to
    const series: Array<{ period: string; caPaid: number; charges: number; utilite: number }> = [];
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= dateTo) {
      const key = fmt(cur);
      const v = map.get(key) || { caPaid: 0, charges: 0, utilite: 0 };
      series.push({ period: key, ...v });
      cur.setMonth(cur.getMonth() + 1);
    }

    return res.json({
      success: true,
      data: {
        series,
        currency: 'CHF',
        period: { from: from.toISOString(), to: dateTo.toISOString() },
        granularity: 'monthly',
      },
    });
  } catch (e) {
    console.error('[Revenue Series] Error:', e);
    return res.status(500).json({ success: false, error: { code: 'REPORT_SERIES_ERROR', message: 'Erreur séries' } });
  }
});

router.get('/invoice-status-breakdown', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const dateFrom = parseDateParam(req.query.dateFrom);
    let dateTo = parseDateParam(req.query.dateTo) || new Date();
    const from = dateFrom || new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);
    
    // Set dateTo to end of day
    dateTo = new Date(dateTo);
    dateTo.setHours(23, 59, 59, 999);

    const invoices = await getInvoicesForUser(userId, from, dateTo);

    // Count only invoices (not quotes)
    const invoicesOnly = invoices.filter(inv => !inv.isQuote);

    const counters = { draft: 0, sent: 0, paid: 0, overdue: 0 };
    for (const inv of invoicesOnly) {
      const status = String(inv.status || 'DRAFT').toUpperCase();
      const statusKey = status.toLowerCase();
      if (statusKey in counters) (counters as any)[statusKey]++;
    }

    console.log('[Invoice Status Breakdown]', counters);

    return res.json({ success: true, data: { ...counters, period: { from: from.toISOString(), to: dateTo.toISOString() } } });
  } catch (e) {
    return res.status(500).json({ success: false, error: { code: 'REPORT_BREAKDOWN_ERROR', message: 'Erreur breakdown' } });
  }
});

export default router;
