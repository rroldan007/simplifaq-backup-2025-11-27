import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../services/api';

interface FinancialSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  overdueAmount?: number;
  activeClients: number;
  currency: string;
  revenueGrowthRate?: number;
  invoiceGrowthRate?: number;
  clientGrowthRate?: number;
}

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  currency: string;
}

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: string;
  daysPastDue: number;
  currency: string;
}

interface DashboardData {
  financialSummary: FinancialSummary | null;
  recentInvoices: RecentInvoice[];
  overdueInvoices: OverdueInvoice[];
}

interface DashboardState extends DashboardData {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useDashboardData(autoRefresh = true, refreshInterval = 30000) {
  const [state, setState] = useState<DashboardState>({
    financialSummary: null,
    recentInvoices: [],
    overdueInvoices: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  type ApiInvoice = {
    id: string;
    invoiceNumber: string;
    client?: { companyName?: string; name?: string };
    clientName?: string;
    amount?: number;
    dueDate: string;
    status?: string;
    currency?: string;
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch financial summary, recent invoices and all invoices (to compute overdue locally)
      const [financialSummary, recentInvoices, allInvoicesResp] = await Promise.all([
        api.getFinancialSummary(),
        api.getRecentInvoices(5),
        api.getInvoices({ limit: 200, sortBy: 'dueDate', sortOrder: 'asc' }),
      ]);

      const today = new Date();
      const overdueInvoices = (allInvoicesResp?.invoices as ApiInvoice[] | undefined || [])
        .filter((inv) => {
          const due = new Date(inv.dueDate);
          const status = (inv.status || '').toLowerCase();
          return Number.isFinite(due.getTime()) && due < today && status !== 'paid' && status !== 'cancelled';
        })
        .map((inv) => {
          const due = new Date(inv.dueDate);
          const diffMs = Math.max(0, today.getTime() - due.getTime());
          const daysPastDue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.client?.companyName || inv.client?.name || inv.clientName || 'Client',
            amount: typeof inv.amount === 'number' && Number.isFinite(inv.amount) ? inv.amount : 0,
            dueDate: inv.dueDate,
            daysPastDue,
            currency: inv.currency || 'CHF',
          };
        });

      // api.getFinancialSummary() already returns the front-end shape
      // { totalRevenue, totalInvoices, activeClients, overdueInvoices, overdueAmount, currency, ... }
      const transformedFinancialSummary = financialSummary ?? null;

      setState({
        financialSummary: transformedFinancialSummary,
        recentInvoices,
        overdueInvoices,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors du chargement des données';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const sendReminder = useCallback(async (invoiceId: string) => {
    try {
      await api.sendInvoiceReminder(invoiceId);
      
      // Refresh data after sending reminder
      await fetchDashboardData();
      
      return { success: true, message: 'Rappel envoyé avec succès' };
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de l\'envoi du rappel';
      
      return { success: false, message: errorMessage };
    }
  }, [fetchDashboardData]);

  const refreshData = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchDashboardData]);

  // Visibility change handler for real-time updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && autoRefresh) {
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoRefresh, fetchDashboardData]);

  return {
    ...state,
    refreshData,
    sendReminder,
  };
}