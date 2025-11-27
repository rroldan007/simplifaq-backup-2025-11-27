import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { api } from '../services/api';

// Generic API response types used by this hook
type ApiSuccessResponse<T> = { success: true; data: T };
type ApiErrorResponse = { success: false; error?: { message?: string } };
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    // Try axios-like error shape
    const maybeAxios = err as { response?: { data?: { error?: { message?: string } } } };
    const msg = maybeAxios.response?.data?.error?.message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) return maybeMessage;
  }
  return fallback;
}

export interface TVAReportData {
  period: {
    from: string;
    to: string;
    label: string;
  };
  company: {
    companyName: string;
    firstName: string;
    lastName: string;
    vatNumber: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton: string;
  };
  tvaRates: Array<{
    rate: number;
    rateLabel: string;
    itemCount: number;
    totalNet: number;
    totalTva: number;
    totalGross: number;
    invoices: string[];
  }>;
  summary: {
    totalNet: number;
    totalTva: number;
    totalGross: number;
    totalInvoices: number;
    totalItems: number;
  };
  generatedAt: string;
  currency: string;
}

export interface IncomeReportData {
  period: {
    type: string;
    from: string;
    to: string;
    label: string;
  };
  summary: {
    totalInvoices: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    averageInvoiceValue: number;
  };
  invoicesByStatus: {
    draft: { count: number; revenue: number };
    sent: { count: number; revenue: number };
    paid: { count: number; revenue: number };
    overdue: { count: number; revenue: number };
    cancelled: { count: number; revenue: number };
  };
  topClients: Array<{
    clientId: string;
    clientName: string;
    invoiceCount: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
  }>;
  monthlyBreakdown?: Array<{
    month: number;
    monthName: string;
    invoiceCount: number;
    totalRevenue: number;
    paidRevenue: number;
  }>;
  generatedAt: string;
  currency: string;
}

export interface ClientReportData {
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  selectedClient?: {
    id: string;
    name: string;
    email: string;
    address: string;
  };
  summary: {
    totalRevenue: number;
    totalInvoices: number;
    averageInvoiceAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    paymentDelayAverage: number;
  };
  invoiceHistory: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue' | 'draft';
    paymentDate?: string;
    paymentDelay?: number;
  }>;
  paymentBehavior: {
    onTimePayments: number;
    latePayments: number;
    averagePaymentDelay: number;
    longestPaymentDelay: number;
  };
  monthlyActivity: Array<{
    month: string;
    revenue: number;
    invoiceCount: number;
  }>;
  generatedAt: string;
  currency: string;
}

export interface FinancialSummaryData {
  period: {
    from: string;
    to: string;
  };
  invoices: {
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
  };
  revenue: {
    total: number;
    pending: number;
    overdue: number;
  };
  tva: {
    breakdown: Array<{
      rate: number;
      netAmount: number;
      tvaAmount: number;
      totalAmount: number;
      itemCount: number;
    }>;
    totalTva: number;
    totalNet: number;
  };
}

export function useReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const generateTVAReport = useCallback(async (startDate: string, endDate: string): Promise<TVAReportData | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/reports/tva-report', {
        params: { from: startDate, to: endDate } as { from: string; to: string },
      });

      const data = response.data as ApiResponse<TVAReportData>;
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Erreur lors de la génération du rapport TVA');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la génération du rapport TVA'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateIncomeReport = useCallback(async (
    period: 'month' | 'quarter' | 'year' = 'month',
    year?: number,
    month?: number
  ): Promise<IncomeReportData | null> => {
    try {
      setLoading(true);
      setError(null);

      const params: { period: 'month' | 'quarter' | 'year'; year?: number; month?: number } = { period };
      if (typeof year === 'number') params.year = year;
      if (typeof month === 'number') params.month = month;

      const response = await api.get('/reports/income-report', { params });

      const data = response.data as ApiResponse<IncomeReportData>;
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Erreur lors de la génération du rapport de revenus');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la génération du rapport de revenus'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateClientReport = useCallback(async (
    startDate: string,
    endDate: string,
    clientId?: string
  ): Promise<ClientReportData | null> => {
    try {
      setLoading(true);
      setError(null);

      const params: { from: string; to: string; clientId?: string } = { from: startDate, to: endDate };
      if (clientId) params.clientId = clientId;

      const response = await api.get('/reports/client-report', { params });

      const data = response.data as ApiResponse<ClientReportData>;
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Erreur lors de la génération du rapport client');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la génération du rapport client'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFinancialSummary = useCallback(async (
    startDate?: string,
    endDate?: string
  ): Promise<FinancialSummaryData | null> => {
    try {
      setLoading(true);
      setError(null);

      const params: { from?: string; to?: string } = {};
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;

      const isAdmin = user?.role === 'admin';
      const endpoint = isAdmin ? '/admin/reports/financial-summary' : '/reports/financial-summary';

      const response = await api.get(endpoint, { params });

      const data = response.data as ApiResponse<FinancialSummaryData>;
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Erreur lors de la récupération du résumé financier');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la récupération du résumé financier'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const exportReportPDF = useCallback(async (reportType: string, params: Record<string, unknown>): Promise<Blob | null> => {
    try {
      setLoading(true);
      setError(null);

      // This would be implemented when we add PDF export functionality
      // For now, we'll just return null
      console.log('PDF export not yet implemented', { reportType, params });
      return null;
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de l\'export PDF'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportReportExcel = useCallback(async (reportType: string, params: Record<string, unknown>): Promise<Blob | null> => {
    try {
      setLoading(true);
      setError(null);

      // This would be implemented when we add Excel export functionality
      // For now, we'll just return null
      console.log('Excel export not yet implemented', { reportType, params });
      return null;
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de l\'export Excel'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    generateTVAReport,
    generateIncomeReport,
    generateClientReport,
    getFinancialSummary,
    exportReportPDF,
    exportReportExcel,
  };
}