import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, FileText, Timer, AlertTriangle, TrendingUp, PieChart, Download, FileSpreadsheet, ReceiptText } from 'lucide-react';
import { expensesApi, type Currency } from '../services/expensesApi';

export function ReportsPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Mobile-only Header to avoid duplicate with global Header on large screens */}
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
            <button type="button" className="btn-theme-primary inline-flex items-center space-x-2 px-4 py-2 rounded-lg">
              <FileText className="w-4 h-4" />
              <span>Générer rapport</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card-theme overflow-hidden rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[var(--color-text-secondary)] truncate">
                        CA ce mois
                      </dt>
                      <dd className="text-lg font-medium text-[var(--color-text-primary)]">
                        CHF 8,450.00
                      </dd>
                      <dd className="text-sm text-[var(--color-success-600)]">
                        +12% vs mois dernier
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-theme overflow-hidden rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[var(--color-text-secondary)] truncate">
                        Factures émises
                      </dt>
                      <dd className="text-lg font-medium text-[var(--color-text-primary)]">
                        18
                      </dd>
                      <dd className="text-sm text-[var(--color-info-600)]">
                        +3 cette semaine
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-theme overflow-hidden rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                      <Timer className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[var(--color-text-secondary)] truncate">
                        Délai moyen
                      </dt>
                      <dd className="text-lg font-medium text-[var(--color-text-primary)]">
                        12 jours
                      </dd>
                      <dd className="text-sm text-[var(--color-warning-600)]">
                        Délai de paiement
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-theme overflow-hidden rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-[var(--color-text-secondary)] truncate">
                        Impayées
                      </dt>
                      <dd className="text-lg font-medium text-[var(--color-text-primary)]">
                        CHF 1,200.00
                      </dd>
                      <dd className="text-sm text-[var(--color-error-600)]">
                        2 factures
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Évolution du chiffre d'affaires
              </h3>
              <div className="h-64 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center">
                <div className="text-center text-[var(--color-text-secondary)]">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2" />
                  <p>Graphique CA mensuel</p>
                  <p className="text-sm">(Intégration Chart.js à venir)</p>
                </div>
              </div>
            </div>

            <div className="card-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Répartition par client
              </h3>
              <div className="h-64 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center">
                <div className="text-center text-[var(--color-text-secondary)]">
                  <PieChart className="w-10 h-10 mx-auto mb-2" />
                  <p>Graphique en secteurs</p>
                  <p className="text-sm">(Intégration Chart.js à venir)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Exports et rapports + Accès rapide Utilité */}
          <div className="card-theme rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Exports et rapports</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center text-[var(--color-text-secondary)]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">Utilité (P&L)</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Accéder au calcul CA − Charges</p>
                  </div>
                </div>
              </button>

              <button type="button" className="p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center text-[var(--color-text-secondary)]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">Export Excel</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Données brutes</p>
                  </div>
                </div>
              </button>

              <button type="button" className="p-4 border border-[var(--color-border-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center text-[var(--color-text-secondary)]">
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)]">Déclaration TVA</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Format officiel</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- PnL Widget (Utilité) ---
function PnLWidget() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState<string>(startOfMonth.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState<string>(today.toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<Currency>('CHF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ revenue: number; charges: number; utilite: number } | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await expensesApi.getPnL({ dateFrom, dateTo, currency });
      setData({ revenue: res.revenue, charges: res.charges, utilite: res.utilite });
    } catch (e: any) {
      setError(e?.message || 'Erreur P&L');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, currency]);

  const fmt = (n?: number) =>
    typeof n === 'number' ? new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) : '—';

  return (
    <div className="card-theme rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Utilité (P&L)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Du</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border rounded-md px-2 py-2 bg-[var(--color-bg-secondary)]" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Au</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border rounded-md px-2 py-2 bg-[var(--color-bg-secondary)]" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Devise</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-full border rounded-md px-2 py-2 bg-[var(--color-bg-secondary)]">
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={load} className="px-3 py-2 rounded-md border text-sm">Actualiser</button>
          </div>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-[var(--color-bg-secondary)]">
          <div className="text-xs text-[var(--color-text-secondary)]">Chiffre d'Affaires ({currency})</div>
          <div className="text-xl font-semibold">{loading ? '…' : fmt(data?.revenue)}</div>
        </div>
        <div className="p-4 rounded-lg border bg-[var(--color-bg-secondary)]">
          <div className="text-xs text-[var(--color-text-secondary)]">Charges ({currency})</div>
          <div className="text-xl font-semibold">{loading ? '…' : fmt(data?.charges)}</div>
        </div>
        <div className="p-4 rounded-lg border bg-[var(--color-bg-secondary)]">
          <div className="text-xs text-[var(--color-text-secondary)]">Utilité ({currency})</div>
          <div className="text-xl font-semibold">{loading ? '…' : fmt(data?.utilite)}</div>
        </div>
      </div>
    </div>
  );
}