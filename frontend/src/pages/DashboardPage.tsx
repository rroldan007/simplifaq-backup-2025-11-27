import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { secureStorage } from '../utils/security';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { RecentInvoices } from '../components/dashboard/RecentInvoices';
import { OverdueInvoices } from '../components/dashboard/OverdueInvoices';
import { EmailVerificationAlert } from '../components/auth/EmailVerificationAlert';
import { reportsApi, type Currency, type KpisResponse } from '../services/reportsApi';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  ReferenceLine,
} from 'recharts';

export function DashboardPage() {
  const navigate = useNavigate();
  const { financialSummary, recentInvoices = [], overdueInvoices = [], loading, error } = useDashboardData();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Filters persisted in URL
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('from') || startOfMonth.toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState<string>(searchParams.get('to') || today.toISOString().slice(0,10));
  const [currency, setCurrency] = useState<Currency>((searchParams.get('ccy') as Currency) || 'CHF');
  const [granularity, setGranularity] = useState<'daily'|'weekly'|'monthly'|'yearly'>(
    (searchParams.get('g') as any) || 'monthly'
  );

  // Dashboard data from new endpoints
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [series, setSeries] = useState<Array<{ period: string; caPaid: number; charges: number; utilite: number }>>([]);
  const [status, setStatus] = useState<{ draft: number; sent: number; paid: number; overdue: number } | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [chartExportOpen, setChartExportOpen] = useState(false);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

  async function downloadExport(format: 'csv' | 'xlsx' | 'pdf') {
    try {
      const qs = new URLSearchParams({
        format,
        dateFrom,
        dateTo,
        currency,
        granularity,
      }).toString();
      const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);
      const res = await fetch(`${API_BASE_URL}/reports/export?${qs}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error((data as any)?.error?.message || 'Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard_${new Date().toISOString().slice(0,10)}.${format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('downloadExport error', e);
      setDashError((e as any)?.message || 'Erreur export');
    }
  }

  async function downloadExportInvoices(format: 'csv' | 'xlsx') {
    try {
      const qs = new URLSearchParams({
        format,
        dateFrom,
        dateTo,
        currency,
      }).toString();
      const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);
      const res = await fetch(`${API_BASE_URL}/reports/export/invoices?${qs}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error((data as any)?.error?.message || 'Export factures échoué');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices_${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('downloadExportInvoices error', e);
      setDashError((e as any)?.message || 'Erreur export factures');
    }
  }

  async function downloadExportExpenses(format: 'csv' | 'xlsx') {
    try {
      const qs = new URLSearchParams({
        format,
        dateFrom,
        dateTo,
        currency,
      }).toString();
      const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);
      const res = await fetch(`${API_BASE_URL}/reports/export/expenses?${qs}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error((data as any)?.error?.message || 'Export charges échoué');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('downloadExportExpenses error', e);
      setDashError((e as any)?.message || 'Erreur export charges');
    }
  }

  // Persist filters in URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('from', dateFrom);
    next.set('to', dateTo);
    next.set('ccy', currency);
    next.set('g', granularity);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, currency, granularity]);

  // Load dashboard data
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setDashLoading(true);
        setDashError(null);
        console.log('[Dashboard] Loading data...', { dateFrom, dateTo, currency, granularity });
        const [k, s, b] = await Promise.all([
          reportsApi.getKpis({ dateFrom, dateTo, currency }),
          reportsApi.getRevenueSeries({ dateFrom, dateTo, currency, granularity }),
          reportsApi.getInvoiceStatusBreakdown({ dateFrom, dateTo }),
        ]);
        console.log('[Dashboard] Data loaded:', { kpis: k, series: s, breakdown: b });
        if (!mounted) return;
        setKpis(k);
        setSeries(s.series);
        setStatus({ draft: b.draft ?? 0, sent: b.sent ?? 0, paid: b.paid ?? 0, overdue: b.overdue ?? 0 } as any);
      } catch (e: any) {
        console.error('[Dashboard] Error loading data:', e);
        if (!mounted) return;
        setDashError(e?.message || 'Erreur chargement dashboard');
      } finally {
        if (mounted) setDashLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [dateFrom, dateTo, currency, granularity]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportOpen || chartExportOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('[role="menu"]')) {
          setExportOpen(false);
          setChartExportOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen, chartExportOpen]);

  const pieData = useMemo(() => (
    status ? [
      { name: 'Brouillon', value: status.draft, color: '#94a3b8' },
      { name: 'Envoyée', value: status.sent, color: '#60a5fa' },
      { name: 'Payée', value: status.paid, color: '#34d399' },
      { name: 'En retard', value: status.overdue, color: '#f59e0b' },
    ] : []
  ), [status]);
  
  const handleViewInvoice = (invoiceId: string) => navigate(`/invoices/${invoiceId}`);
  const handleCreateInvoice = () => navigate('/invoices/new');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Recharger
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Email Verification Alert */}
          <EmailVerificationAlert />
          
          {/* Mobile-only page title (Header shows title on lg+) */}
          <h1 className="text-2xl font-bold lg:hidden">Tableau de bord</h1>
          {/* Quick Actions Bar - Improved */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 rounded-full p-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Actions rapides</h3>
                  <p className="text-xs text-gray-600">Créez facilement des documents</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/invoices/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle facture</span>
                </button>
                <button
                  onClick={() => navigate('/quotes/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau devis</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setExportOpen((v) => !v)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 transition-colors font-medium"
                  >
                    <span>Plus</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                      <button onClick={() => { setExportOpen(false); navigate('/expenses'); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-2">
                        <span>💳</span> Enregistrer charge
                      </button>
                      <button onClick={() => { setExportOpen(false); navigate('/clients'); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-2">
                        <span>👥</span> Ajouter client
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* KPI row with deltas - Improved Design */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Vue d'ensemble</h2>
              {dashLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Chargement...</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* CA */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 opacity-10">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="relative">
                  <p className="text-blue-100 text-sm font-medium mb-2">Chiffre d'affaires</p>
                  <p className="text-white text-3xl font-bold mb-2">
                    {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: currency }).format(kpis?.ca ?? 0)}
                  </p>
                  {kpis?.comparePrev?.caDeltaPct !== undefined && (
                    <div className={`inline-flex items-center gap-1 text-sm font-semibold ${kpis.comparePrev.caDeltaPct >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      <span>{kpis.comparePrev.caDeltaPct >= 0 ? '↗' : '↘'}</span>
                      <span>{Math.abs(kpis.comparePrev.caDeltaPct).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Charges */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 opacity-10">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="relative">
                  <p className="text-orange-100 text-sm font-medium mb-2">Charges</p>
                  <p className="text-white text-3xl font-bold mb-2">
                    {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: currency }).format(kpis?.charges ?? 0)}
                  </p>
                  {kpis?.comparePrev?.chargesDeltaPct !== undefined && (
                    <div className={`inline-flex items-center gap-1 text-sm font-semibold ${kpis.comparePrev.chargesDeltaPct <= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      <span>{kpis.comparePrev.chargesDeltaPct >= 0 ? '↗' : '↘'}</span>
                      <span>{Math.abs(kpis.comparePrev.chargesDeltaPct).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Utilité */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 opacity-10">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="relative">
                  <p className="text-green-100 text-sm font-medium mb-2">Utilité</p>
                  <p className="text-white text-3xl font-bold mb-2">
                    {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: currency }).format(kpis?.utilite ?? 0)}
                  </p>
                  {kpis?.comparePrev?.utiliteDeltaPct !== undefined && (
                    <div className={`inline-flex items-center gap-1 text-sm font-semibold ${kpis.comparePrev.utiliteDeltaPct >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      <span>{kpis.comparePrev.utiliteDeltaPct >= 0 ? '↗' : '↘'}</span>
                      <span>{Math.abs(kpis.comparePrev.utiliteDeltaPct).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Factures émises */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 opacity-10">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="relative">
                  <p className="text-purple-100 text-sm font-medium mb-2">Factures émises</p>
                  <p className="text-white text-3xl font-bold mb-2">
                    {kpis?.invoicesIssued ?? 0}
                  </p>
                  <p className="text-purple-200 text-xs">Période sélectionnée</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters - Improved Design */}
          <div className="surface p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h3 className="font-semibold text-gray-800">Filtres de période</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e)=>setDateFrom(e.target.value)} 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e)=>setDateTo(e.target.value)} 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                <select 
                  value={currency} 
                  onChange={(e)=>setCurrency(e.target.value as Currency)} 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="CHF">🇨🇭 CHF</option>
                  <option value="EUR">🇪🇺 EUR</option>
                  <option value="USD">🇺🇸 USD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Granularité</label>
                <select 
                  value={granularity} 
                  onChange={(e)=>setGranularity(e.target.value as any)} 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="daily">📅 Quotidien</option>
                  <option value="weekly">📆 Hebdomadaire</option>
                  <option value="monthly">📊 Mensuel</option>
                  <option value="yearly">📈 Annuel</option>
                </select>
              </div>
            </div>
            {/* Quick date range buttons */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button 
                onClick={() => {
                  const today = new Date();
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  setDateFrom(startOfMonth.toISOString().slice(0,10));
                  setDateTo(today.toISOString().slice(0,10));
                }}
                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Ce mois
              </button>
              <button 
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                  const endLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                  setDateFrom(lastMonth.toISOString().slice(0,10));
                  setDateTo(endLastMonth.toISOString().slice(0,10));
                }}
                className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                Mois dernier
              </button>
              <button 
                onClick={() => {
                  const today = new Date();
                  const startOfYear = new Date(today.getFullYear(), 0, 1);
                  setDateFrom(startOfYear.toISOString().slice(0,10));
                  setDateTo(today.toISOString().slice(0,10));
                }}
                className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Cette année
              </button>
            </div>
          </div>

          {/* Error message if dashboard data failed to load */}
          {dashError && (
            <div className="surface p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Erreur de chargement</h3>
                  <p className="text-sm">{dashError}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Recharger la page
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Smart hints and tips */}
          {kpis && (
            <div className="space-y-3">
              {kpis.ca === 0 && !dashError && (
                <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50">
                  <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 mb-1">Aucun chiffre d'affaires</h4>
                    <p className="text-sm text-amber-800">Vérifiez que la période inclut des factures payées, ou ajustez la devise sélectionnée.</p>
                  </div>
                </div>
              )}
              {kpis.invoicesIssued === 0 && !dashError && (
                <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">Aucune facture dans cette période</h4>
                    <p className="text-sm text-blue-800">Créez votre première facture ou ajustez la période de filtrage.</p>
                    <button 
                      onClick={() => navigate('/invoices/new')}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                      <Plus className="w-4 h-4" />
                      Créer une facture
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Charts row: side-by-side on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main chart */}
            <div className="surface p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-gray-800">Performance ({currency})</h3>
                <div className="relative">
                  <button
                    onClick={() => setChartExportOpen((v) => !v)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm"
                  >
                    <span>📤</span> Exporter
                  </button>
                  {chartExportOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                      <button onClick={() => { setChartExportOpen(false); downloadExport('pdf'); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">Exporter PDF</button>
                      <button onClick={() => { setChartExportOpen(false); downloadExport('csv'); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">Exporter CSV</button>
                      <button onClick={() => { setChartExportOpen(false); downloadExport('xlsx'); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">Exporter Excel</button>
                      <div className="border-t border-slate-200 my-1" />
                      <button onClick={() => { setChartExportOpen(false); downloadExportInvoices('csv'); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">Export factures (CSV)</button>
                      <button onClick={() => { setChartExportOpen(false); downloadExportInvoices('xlsx'); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">Export factures (Excel)</button>
                      <button onClick={() => { setChartExportOpen(false); downloadExportExpenses('csv'); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">Export charges (CSV)</button>
                      <button onClick={() => { setChartExportOpen(false); downloadExportExpenses('xlsx'); }} className="w-full text-left px-4 py-2 hover:bg-slate-50">Export charges (Excel)</button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">CA HT vs Charges par période</p>
              {dashError && <div className="text-red-600 text-sm mb-2">{dashError}</div>}
              {series.length === 0 && !dashLoading && (
                <div className="h-80 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-lg font-medium">Aucune donnée</p>
                    <p className="text-sm">Ajustez la période ou créez des factures</p>
                  </div>
                </div>
              )}
              {series.length > 0 && (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.7}/>
                        </linearGradient>
                        <linearGradient id="colorCharges" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.9}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        stroke="#6B7280" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#6B7280" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        formatter={(v: any) => new Intl.NumberFormat('fr-CH', { style: 'currency', currency: currency }).format(Number(v))}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <ReferenceLine y={0} stroke="#D1D5DB" strokeDasharray="3 3" />
                      <Bar dataKey="caPaid" name="CA HT" fill="url(#colorCA)" radius={[8,8,0,0]} maxBarSize={48} />
                      <Bar dataKey="charges" name="Charges" fill="url(#colorCharges)" radius={[8,8,0,0]} maxBarSize={48} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Analytics donut */}
            <div className="surface p-6 rounded-2xl shadow-lg border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Répartition des factures</h3>
              <div className="relative h-72">
                {pieData.every(d => d.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">Aucune facture</p>
                      <p className="text-sm">Créez votre première facture</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <filter id="shadow" height="130%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                            <feOffset dx="0" dy="3" result="offsetblur"/>
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.2"/>
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        <Pie 
                          data={pieData} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={100} 
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'Payée' ? '#10B981' : entry.name === 'En retard' ? '#F59E0B' : entry.name === 'Envoyée' ? '#3B82F6' : '#9CA3AF'}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: string) => [`${value} factures`, name]}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {status && (() => {
                        const total = (status.draft||0)+(status.sent||0)+(status.paid||0)+(status.overdue||0);
                        const pct = total>0 ? Math.round((status.paid/total)*100) : 0;
                        return (
                          <div className="text-center">
                            <div className="text-4xl font-bold text-gray-800">{pct}%</div>
                            <div className="text-sm text-gray-500 font-medium mt-1">Payées</div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <OverdueInvoices invoices={overdueInvoices} onViewInvoice={handleViewInvoice} />
          <RecentInvoices invoices={recentInvoices} onViewInvoice={handleViewInvoice} onCreateInvoice={handleCreateInvoice} />
        </div>
        {/* Subtle success notice placed at the end of the dashboard content */}
        <div className="mt-8">
          <SuccessMessage />
        </div>
      </main>
    </div>
  );
}

function LoadingView() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 surface-elevated rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="surface p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorView({ error }: { error: string }) {
  const { refreshData } = useDashboardData();
  
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={refreshData}
                className="text-sm font-medium text-red-700 hover:text-red-600"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessMessage() {
  return (
    <div className="mb-6 surface-elevated border-l-4 border-green-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <strong>Connexion réussie !</strong> Vous êtes maintenant connecté à SimpliFaq.
          </p>
        </div>
      </div>
    </div>
  );
}

type FinancialSummaryLite = {
  totalRevenue: number;
  monthlyRevenue?: number;
  totalInvoices: number;
  paidInvoices?: number;
  pendingInvoices?: number;
  overdueInvoices: number;
  overdueAmount?: number;
  activeClients: number;
  currency: string;
  revenueGrowthRate?: number;
  invoiceGrowthRate?: number;
  clientGrowthRate?: number;
} | null;

function SummaryCards({ financialSummary }: { financialSummary: FinancialSummaryLite }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-primary mb-6">Vue d'ensemble</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Chiffre d'affaires" 
          value={financialSummary?.totalRevenue || 0} 
          change={financialSummary?.revenueGrowthRate}
          icon="💰" 
          color="blue"
          isCurrency={true}
          currency={financialSummary?.currency || 'CHF'}
        />
        <SummaryCard 
          title="Factures" 
          value={financialSummary?.totalInvoices || 0}
          change={financialSummary?.invoiceGrowthRate}
          icon="📄" 
          color="green"
        />
        <SummaryCard 
          title="Clients" 
          value={financialSummary?.activeClients || 0}
          change={financialSummary?.clientGrowthRate}
          icon="👥" 
          color="yellow"
        />
        <SummaryCard 
          title="En retard" 
          value={financialSummary?.overdueInvoices || 0}
          amount={financialSummary?.overdueAmount}
          icon="⏰" 
          color="red"
          isCurrency={false}
          currency={financialSummary?.currency || 'CHF'}
        />
      </div>
    </div>
  );
}
