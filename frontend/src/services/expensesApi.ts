import { secureStorage } from '../utils/security';

export type Currency = 'CHF' | 'EUR' | 'USD';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

export interface Expense {
  id: string;
  accountId: string;
  date: string;
  label: string;
  amount: number;
  currency: Currency;
  tvaRate?: number | null;
  tvaDeductible?: number | null;
  supplier?: string | null;
  notes?: string | null;
  account?: Account;
}

export interface TvaSummary {
  tvaCollected: number;
  tvaDeductible: number;
  tvaNet: number;
  tvaCollectedBreakdown: Array<{
    rate: number;
    rateLabel: string;
    invoiceCount: number;
    invoices: string[];
    totalNet: number;
    totalTva: number;
    totalGross: number;
  }>;
  tvaDeductibleBreakdown: Array<{
    rate: number;
    rateLabel: string;
    count: number;
    baseAmount: number;
    tvaAmount: number;
  }>;
  currency: Currency;
  period: {
    from: string;
    to: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function authHeaders() {
  const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as Record<string, string>;
}

export const expensesApi = {
  async listAccounts(): Promise<Account[]> {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/expenses/accounts`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erreur comptes');
    return data.data || [];
  },
  async listExpenses(params?: { dateFrom?: string; dateTo?: string; accountId?: string }): Promise<Expense[]> {
    const headers = await authHeaders();
    const qs = new URLSearchParams();
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    if (params?.accountId) qs.set('accountId', params.accountId);
    const url = `${API_BASE_URL}/expenses${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erreur charges');
    return data.data || [];
  },
  async createExpense(payload: Omit<Expense, 'id' | 'account' >): Promise<Expense> {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erreur création');
    return data.data;
  },
  async updateExpense(id: string, payload: Partial<Omit<Expense, 'id' | 'account'>>): Promise<Expense> {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erreur mise à jour');
    return data.data;
  },
  async deleteExpense(id: string): Promise<void> {
    const headers = await authHeaders();
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE', headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as { error?: { message?: string } }));
      throw new Error(data?.error?.message || 'Erreur suppression');
    }
  },
  async getPnL(params: { dateFrom: string; dateTo: string; currency: Currency }): Promise<{ revenue: number; charges: number; utilite: number; tva: number; currency: Currency }> {
    const headers = await authHeaders();
    const qs = new URLSearchParams(params);
    const res = await fetch(`${API_BASE_URL}/expenses/pnl?${qs.toString()}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erreur P&L');
    const raw = (data?.data || {}) as { revenue?: number; ca?: number; charges?: number; tva?: number; utilite?: number; currency?: Currency };
    const revenue = Number(raw.revenue ?? raw.ca ?? 0);
    const charges = Number(raw.charges ?? 0);
    const tva = Number(raw.tva ?? 0);
    const utilite = Number(
      raw.utilite ?? (Number.isFinite(revenue) && Number.isFinite(charges) ? revenue - charges : 0)
    );
    const currency = raw.currency || params.currency;
    return { revenue, charges, utilite, tva, currency };
  },
  async getTvaSummary(params: { dateFrom: string; dateTo: string; currency: Currency }): Promise<TvaSummary> {
    const headers = await authHeaders();
    const qs = new URLSearchParams(params);
    const res = await fetch(`${API_BASE_URL}/expenses/tva-summary?${qs.toString()}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erreur TVA');
    return data.data;
  },
  async analyzeReceipt(file: File): Promise<{
    summary: string;
    extractedData: {
      supplier: string | null;
      label: string;
      amount: number;
      currency: string;
      tvaRate: number;
      tvaDeductible: number;
      date: string;
      accountId: string;
      accountCode: string;
      accountName: string;
      notes: string | null;
    };
    confidence: number;
    requiresConfirmation: boolean;
  }> {
    const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);
    const formData = new FormData();
    formData.append('receipt', file);
    
    const res = await fetch(`${API_BASE_URL}/expenses/analyze-receipt`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erreur analyse facture');
    return data.data;
  },
};
