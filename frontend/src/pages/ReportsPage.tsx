import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  FileText, 
  Timer, 
  AlertTriangle, 
  TrendingUp, 
  PieChart, 
  FileSpreadsheet, 
  ReceiptText,
  Download,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { reportsApi, type KpisResponse, type RevenueSeriesResponse, type StatusBreakdownResponse } from '../services/reportsApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function ReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date filters
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState<string>(startOfMonth.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState<string>(today.toISOString().slice(0, 10));
  
  // Data states
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<RevenueSeriesResponse | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdownResponse | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [kpisData, seriesData, breakdownData] = await Promise.all([
        reportsApi.getKpis({ dateFrom, dateTo }),
        reportsApi.getRevenueSeries({ dateFrom, dateTo, granularity: 'monthly' }),
        reportsApi.getInvoiceStatusBreakdown({ dateFrom, dateTo })
      ]);
      
      setKpis(kpisData);
      setRevenueSeries(seriesData);
      setStatusBreakdown(breakdownData);
      
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'CHF') => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    navigate('/reports/export?format=csv');
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    navigate('/reports/export?format=pdf');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Quick date presets
  const setPreset = (preset: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear') => {
    const now = new Date();
    let from: Date;
    let to: Date = now;
    
    switch (preset) {
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'thisYear':
        from = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  };

  // Calculate total invoices for pie chart percentages
  const totalInvoices = statusBreakdown 
    ? statusBreakdown.draft + statusBreakdown.sent + statusBreakdown.paid + statusBreakdown.overdue 
    : 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Mobile-only Header */}
      <header className="shadow lg:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center space-x-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Retour</span>
              </button>
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                Rapports & Statistiques
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          {/* Date Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">Période:</span>
                </div>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border-primary)] rounded-lg bg-[var(--color-bg-secondary)] text-sm"
                />
                <span className="text-[var(--color-text-secondary)]">→</span>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border-primary)] rounded-lg bg-[var(--color-bg-secondary)] text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreset('thisMonth')}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  Ce mois
                </button>
                <button
                  onClick={() => setPreset('lastMonth')}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  Mois dernier
                </button>
                <button
                  onClick={() => setPreset('thisQuarter')}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  Ce trimestre
                </button>
                <button
                  onClick={() => setPreset('thisYear')}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  Cette année
                </button>
                <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Chiffre d'Affaires
                    </p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {loading ? '...' : formatCurrency(kpis?.ca || 0, kpis?.currency)}
                    </p>
                    {kpis?.comparePrev && (
                      <p className={`text-sm font-medium ${kpis.comparePrev.caDeltaPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(kpis.comparePrev.caDeltaPct)} vs période précédente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Factures émises
                    </p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {loading ? '...' : kpis?.invoicesIssued || 0}
                    </p>
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      Sur la période
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                      <Timer className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Taux de recouvrement
                    </p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {loading ? '...' : `${kpis?.collectionRate || 0}%`}
                    </p>
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      Factures payées
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100 text-red-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Impayées
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {loading ? '...' : formatCurrency(kpis?.overdueAmount || 0, kpis?.currency)}
                    </p>
                    <p className="text-sm text-red-500">
                      {statusBreakdown?.overdue || 0} factures en retard
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* P&L Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Résultat (Utilité)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">Revenus (CA payé)</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? '...' : formatCurrency(kpis?.ca || 0, kpis?.currency)}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 mb-1">Charges</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? '...' : formatCurrency(kpis?.charges || 0, kpis?.currency)}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${(kpis?.utilite || 0) >= 0 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">Utilité (Résultat)</p>
                <p className={`text-2xl font-bold ${(kpis?.utilite || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {loading ? '...' : formatCurrency(kpis?.utilite || 0, kpis?.currency)}
                </p>
              </div>
            </div>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Évolution du chiffre d'affaires
              </h3>
              {loading ? (
                <div className="h-64 bg-[var(--color-bg-secondary)] rounded-lg animate-pulse"></div>
              ) : revenueSeries && revenueSeries.series.length > 0 ? (
                <div className="space-y-3">
                  {revenueSeries.series.map((point, index) => {
                    const maxValue = Math.max(...revenueSeries.series.map(p => p.caPaid), 1);
                    const barWidth = (point.caPaid / maxValue) * 100;
                    return (
                      <div key={point.period} className="flex items-center gap-3">
                        <span className="w-20 text-sm text-[var(--color-text-secondary)]">
                          {point.period}
                        </span>
                        <div className="flex-1 bg-[var(--color-bg-secondary)] rounded-full h-6 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-end px-2"
                            style={{ width: `${Math.max(barWidth, 5)}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {formatCurrency(point.caPaid)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center">
                  <div className="text-center text-[var(--color-text-secondary)]">
                    <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Aucune donnée pour cette période</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Status Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Répartition par statut
              </h3>
              {loading ? (
                <div className="h-64 bg-[var(--color-bg-secondary)] rounded-lg animate-pulse"></div>
              ) : statusBreakdown && totalInvoices > 0 ? (
                <div className="space-y-4">
                  {/* Visual pie-like display */}
                  <div className="flex justify-center mb-6">
                    <div className="w-40 h-40 rounded-full border-8 border-[var(--color-bg-secondary)] relative flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-[var(--color-text-primary)]">{totalInvoices}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">factures</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status bars */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-sm">Brouillon</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{statusBreakdown.draft}</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          ({totalInvoices > 0 ? Math.round((statusBreakdown.draft / totalInvoices) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Envoyée</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{statusBreakdown.sent}</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          ({totalInvoices > 0 ? Math.round((statusBreakdown.sent / totalInvoices) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Payée</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{statusBreakdown.paid}</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          ({totalInvoices > 0 ? Math.round((statusBreakdown.paid / totalInvoices) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm">En retard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-600">{statusBreakdown.overdue}</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          ({totalInvoices > 0 ? Math.round((statusBreakdown.overdue / totalInvoices) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center">
                  <div className="text-center text-[var(--color-text-secondary)]">
                    <PieChart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Aucune facture pour cette période</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Exports Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Exports et rapports</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">Charges & Dépenses</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Gérer vos charges</p>
                  </div>
                </div>
              </button>

              <button 
                type="button" 
                onClick={handleExportCSV}
                className="p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">Export Excel</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Données brutes CSV</p>
                  </div>
                </div>
              </button>

              <button 
                type="button" 
                onClick={() => navigate('/tva-report')}
                className="p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">Déclaration TVA</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Rapport TVA suisse</p>
                  </div>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default ReportsPage;
