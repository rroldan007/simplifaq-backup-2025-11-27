import { secureStorage } from '../utils/security';

export type Currency = 'CHF' | 'EUR' | 'USD';

export interface KpisResponse {
  ca: number;
  charges: number;
  utilite: number;
  invoicesIssued: number;
  collectionRate: number; // %
  overdueAmount: number;
  currency: Currency;
  period: { from: string | Date; to: string | Date };
  comparePrev?: {
    caDeltaPct: number;
    chargesDeltaPct: number;
    utiliteDeltaPct: number;
  };
}

export interface RevenuePoint {
  period: string; // YYYY-MM or YYYY-MM-DD
  caPaid: number;
  charges: number;
  utilite: number;
}

export interface RevenueSeriesResponse {
  series: RevenuePoint[];
  currency: Currency;
  period: { from: string | Date; to: string | Date };
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface StatusBreakdownResponse {
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  period: { from: string | Date; to: string | Date };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function authHeaders() {
  const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as Record<string, string>;
}

/**
 * Retrieves key performance indicators (KPIs) for a given period.
 * 
 * @param params - Optional parameters to filter KPIs by date range and currency.
 * @returns A promise resolving to the KPIs response data.
 */
async function getKpis(params: { dateFrom?: string; dateTo?: string; currency?: Currency }) {
  const headers = await authHeaders();
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE_URL}/reports/kpis${qs ? `?${qs}` : ''}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erreur KPIs');
  return data.data as KpisResponse;
}

/**
 * Retrieves revenue series data for a given period.
 * 
 * @param params - Optional parameters to filter revenue series by date range, currency, and granularity.
 * @returns A promise resolving to the revenue series response data.
 */
async function getRevenueSeries(params: { dateFrom?: string; dateTo?: string; currency?: Currency; granularity?: 'daily' | 'weekly' | 'monthly' | 'yearly' }) {
  const headers = await authHeaders();
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE_URL}/reports/revenue-series${qs ? `?${qs}` : ''}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erreur séries');
  return data.data as RevenueSeriesResponse;
}

/**
 * Retrieves invoice status breakdown data for a given period.
 * 
 * @param params - Optional parameters to filter invoice status breakdown by date range.
 * @returns A promise resolving to the invoice status breakdown response data.
 */
async function getInvoiceStatusBreakdown(params: { dateFrom?: string; dateTo?: string }) {
  const headers = await authHeaders();
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE_URL}/reports/invoice-status-breakdown${qs ? `?${qs}` : ''}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erreur breakdown');
  return data.data as StatusBreakdownResponse;
}

export const reportsApi = {
  getKpis,
  getRevenueSeries,
  getInvoiceStatusBreakdown,
};

export default reportsApi;
