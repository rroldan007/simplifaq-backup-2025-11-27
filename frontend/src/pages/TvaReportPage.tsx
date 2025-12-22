import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Printer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { expensesApi, type Currency, type TvaSummary } from '../services/expensesApi';

const formatAmount = (n: number) => new Intl.NumberFormat('fr-CH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(n);

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// Quarters for Swiss TVA reporting
const getQuarters = () => {
  const currentYear = new Date().getFullYear();
  const quarters = [];

  for (let year = currentYear; year >= currentYear - 2; year--) {
    quarters.push(
      { label: `Q4 ${year}`, from: `${year}-10-01`, to: `${year}-12-31`, year },
      { label: `Q3 ${year}`, from: `${year}-07-01`, to: `${year}-09-30`, year },
      { label: `Q2 ${year}`, from: `${year}-04-01`, to: `${year}-06-30`, year },
      { label: `Q1 ${year}`, from: `${year}-01-01`, to: `${year}-03-31`, year }
    );
  }

  return quarters;
};

export function TvaReportPage() {
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const quarters = getQuarters();
    return quarters[0];
  });
  const [currency, setCurrency] = useState<Currency>('CHF');
  const [tvaSummary, setTvaSummary] = useState<TvaSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTvaSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await expensesApi.getTvaSummary({
        dateFrom: selectedQuarter.from,
        dateTo: selectedQuarter.to,
        currency
      });
      setTvaSummary(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [selectedQuarter, currency]);

  useEffect(() => {
    loadTvaSummary();
  }, [loadTvaSummary]);

  const handleExportPDF = () => {
    if (!tvaSummary) return;

    // Create a simple text report
    let report = `
RAPPORT TVA - ${selectedQuarter.label}
Période: ${formatDate(selectedQuarter.from)} - ${formatDate(selectedQuarter.to)}
Devise: ${currency}

═══════════════════════════════════════════════════════

TVA COLLECTÉE (Factures payées)
Montant Total: ${formatAmount(tvaSummary.tvaCollected)} ${currency}

Détail par taux:
`;

    if (tvaSummary.tvaCollectedBreakdown && tvaSummary.tvaCollectedBreakdown.length > 0) {
      tvaSummary.tvaCollectedBreakdown.forEach(b => {
        report += `- ${b.rateLabel}: ${formatAmount(b.totalTva)} ${currency} (Base: ${formatAmount(b.totalNet)})\n`;
        if (b.invoices && b.invoices.length > 0) {
          report += `  Factures: ${b.invoices.join(', ')}\n`;
        }
      });
    } else {
      report += `Aucune donnée détaillée disponible.\n`;
    }

    report += `
TVA DÉDUCTIBLE (Impôt préalable)
Montant: ${formatAmount(tvaSummary.tvaDeductible)} ${currency}

───────────────────────────────────────────────────────

TVA NETTE ${tvaSummary.tvaNet >= 0 ? 'À PAYER' : 'À RÉCUPÉRER'}
Montant: ${formatAmount(Math.abs(tvaSummary.tvaNet))} ${currency}

═══════════════════════════════════════════════════════

Généré le: ${new Date().toLocaleString('fr-CH')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-tva-${selectedQuarter.label.replace(' ', '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Rapport TVA</h1>
              <p className="text-[var(--color-text-secondary)]">Déclaration trimestrielle de la TVA</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-theme rounded-2xl shadow-sm p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Trimestre
              </label>
              <select
                value={JSON.stringify(selectedQuarter)}
                onChange={(e) => setSelectedQuarter(JSON.parse(e.target.value))}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getQuarters().map((q) => (
                  <option key={q.label} value={JSON.stringify(q)}>
                    {q.label} ({formatDate(q.from)} - {formatDate(q.to)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Devise</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={loadTvaSummary}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </motion.div>
        )}

        {/* TVA Summary Cards */}
        {tvaSummary && !loading && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
            >
              {/* TVA Collectée */}
              <div className="card-theme rounded-2xl p-6 border-l-4 border-l-green-500 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm text-green-500 font-medium uppercase tracking-wide mb-2">
                  TVA Collectée
                </p>
                <p className="text-3xl font-bold text-[var(--color-text-primary)] mb-1">
                  {formatAmount(tvaSummary.tvaCollected)}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">{currency}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
                  TVA facturée aux clients (facturas pagadas)
                </p>
              </div>

              {/* TVA Déductible */}
              <div className="card-theme rounded-2xl p-6 border-l-4 border-l-amber-500 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <TrendingDown className="w-8 h-8 text-amber-500" />
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-sm text-amber-500 font-medium uppercase tracking-wide mb-2">
                  TVA Déductible
                </p>
                <p className="text-3xl font-bold text-[var(--color-text-primary)] mb-1">
                  {formatAmount(tvaSummary.tvaDeductible)}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">{currency}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
                  Impôt préalable (compte 1170)
                </p>
              </div>

              {/* TVA Nette */}
              <div className={`card-theme rounded-2xl p-6 border-l-4 shadow-sm ${tvaSummary.tvaNet >= 0
                ? 'border-l-red-500'
                : 'border-l-teal-500'
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className={`w-8 h-8 ${tvaSummary.tvaNet >= 0 ? 'text-red-500' : 'text-teal-500'}`} />
                  <AlertCircle className={`w-5 h-5 ${tvaSummary.tvaNet >= 0 ? 'text-red-400' : 'text-teal-400'}`} />
                </div>
                <p className={`text-sm font-medium uppercase tracking-wide mb-2 ${tvaSummary.tvaNet >= 0 ? 'text-red-500' : 'text-teal-500'
                  }`}>
                  TVA Nette {tvaSummary.tvaNet >= 0 ? 'à payer' : 'à récupérer'}
                </p>
                <p className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">
                  {formatAmount(Math.abs(tvaSummary.tvaNet))}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {currency}
                </p>
                <p className="text-xs mt-3 text-[var(--color-text-tertiary)]">
                  {tvaSummary.tvaNet >= 0
                    ? 'Montant à verser à l\'AFC'
                    : 'Montant à récupérer de l\'AFC'}
                </p>
              </div>
            </motion.div>

            {/* Detailed Report */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-theme rounded-2xl shadow-sm p-8 mb-6 print:shadow-none"
            >
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Détail de la déclaration TVA
              </h2>

              <div className="space-y-6">
                {/* Period */}
                <div className="pb-4 border-b border-[var(--color-border-primary)]">
                  <p className="text-sm text-[var(--color-text-secondary)] mb-1">Période de déclaration</p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {selectedQuarter.label} - {formatDate(selectedQuarter.from)} au {formatDate(selectedQuarter.to)}
                  </p>
                </div>

                {/* Calculations */}
                <div className="space-y-4">
                  <div className="bg-green-500/10 rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center p-4">
                      <span className="font-medium text-[var(--color-text-primary)]">TVA Collectée (chiffre 200)</span>
                      <span className="text-lg font-bold text-green-500">
                        {formatAmount(tvaSummary.tvaCollected)} {currency}
                      </span>
                    </div>

                    {/* Breakdown inside the Detail section */}
                    {tvaSummary.tvaCollectedBreakdown && tvaSummary.tvaCollectedBreakdown.length > 0 && (
                      <div className="px-4 pb-4 space-y-2 border-t border-green-100 pt-2">
                        {tvaSummary.tvaCollectedBreakdown.map((breakdown, idx) => (
                          <div key={idx} className="bg-white bg-opacity-60 rounded p-2 text-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-green-800">{breakdown.rateLabel}</span>
                              <span className="font-bold text-green-700">{formatAmount(breakdown.totalTva)} {currency}</span>
                            </div>
                            <div className="flex justify-between text-xs text-green-600">
                              <span>Base: {formatAmount(breakdown.totalNet)} {currency}</span>
                              <span>{breakdown.invoiceCount} facture(s)</span>
                            </div>
                            {breakdown.invoices && breakdown.invoices.length > 0 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-green-600 hover:text-green-800">
                                  Voir factures
                                </summary>
                                <div className="pl-2 mt-1 text-xs text-slate-500">
                                  {breakdown.invoices.join(', ')}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-lg">
                    <span className="font-medium text-[var(--color-text-primary)]">TVA Déductible (chiffre 400)</span>
                    <span className="text-lg font-bold text-amber-500">
                      -{formatAmount(tvaSummary.tvaDeductible)} {currency}
                    </span>
                  </div>

                  <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${tvaSummary.tvaNet >= 0
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-teal-500/10 border-teal-500/30'
                    }`}>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      Montant {tvaSummary.tvaNet >= 0 ? 'à payer' : 'à récupérer'} (chiffre 500)
                    </span>
                    <span className={`text-2xl font-bold ${tvaSummary.tvaNet >= 0 ? 'text-red-500' : 'text-teal-500'
                      }`}>
                      {formatAmount(Math.abs(tvaSummary.tvaNet))} {currency}
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="text-sm text-[var(--color-text-primary)] font-medium mb-2">
                    📋 Instructions pour la déclaration
                  </p>
                  <ul className="text-sm text-[var(--color-text-secondary)] space-y-1 list-disc list-inside">
                    <li>Connectez-vous au portail de l'AFC (www.estv.admin.ch)</li>
                    <li>Sélectionnez "Décompte TVA" puis "{selectedQuarter.label}"</li>
                    <li>Reportez les montants ci-dessus dans les chiffres correspondants</li>
                    <li>Vérifiez et soumettez votre déclaration avant la date limite</li>
                    {tvaSummary.tvaNet >= 0 && (
                      <li className="font-semibold">
                        ⚠️ N'oubliez pas d'effectuer le paiement avant la date d'échéance
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-4 print:hidden"
            >
              <button
                onClick={handleExportPDF}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Exporter le rapport
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Imprimer
              </button>
            </motion.div>
          </>
        )
        }

        {/* Loading */}
        {
          loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-[var(--color-text-secondary)]">Chargement du rapport TVA...</p>
            </div>
          )
        }
      </div >
    </div >
  );
}
