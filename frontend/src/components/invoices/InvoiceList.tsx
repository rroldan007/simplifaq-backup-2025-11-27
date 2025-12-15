import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Copy } from 'lucide-react';
import { InvoiceCard } from './InvoiceCard';
import { SearchBar } from './SearchBar';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { api } from '../../services/api';

type InvoiceStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid' | 'unpaid';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  issueDate: string;
  dueDate: string;
  currency: string;
  qrBillGenerated?: boolean;
  sentAt?: string;
  paidAt?: string;
}

interface InvoiceListProps {
  invoices: Invoice[];
  loading?: boolean;
  error?: string | null;
  onView?: (invoiceId: string) => void;
  onEdit?: (invoiceId: string) => void;
  onDelete?: (invoiceId: string) => void;
  onSend?: (invoiceId: string) => void;
  onDuplicate?: (invoiceId: string) => void;
  onDownloadPdf?: (invoiceId: string) => void;
  onSendEmail?: (invoiceId: string) => void;
  onViewEmailHistory?: (invoiceId: string) => void;
  onCreateNew?: () => void;
  operationLoading?: {
    delete?: (id: string) => boolean;
    send?: (id: string) => boolean;
    duplicate?: (id: string) => boolean;
    download?: (id: string) => boolean;
  };
  labels?: {
    searchPlaceholder?: string;
    noneFoundTitle?: string;
    noneFoundSubtitle?: string;
    emptyTitle?: string;
    emptySubtitle?: string;
    emptyCtaLabel?: string;
    newAriaLabel?: string;
    newTitle?: string;
  };
}

export function InvoiceList({
  invoices = [],
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDuplicate,
  onDownloadPdf,
  onSendEmail,
  onViewEmailHistory,
  onCreateNew,
  labels
}: InvoiceListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('invoices_view_mode') as 'grid' | 'list') || 'grid'
  );
  useEffect(() => {
    try { localStorage.setItem('invoices_view_mode', viewMode); } catch { /* ignore storage errors */ }
  }, [viewMode]);

  // Export modal state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const handleExport = async (): Promise<void> => {
    try {
      setExportLoading(true);
      const params: { clientId?: string; from?: string; to?: string } = {};
      if (clientId.trim()) params.clientId = clientId.trim();
      if (dateFrom) params.from = new Date(dateFrom).toISOString();
      if (dateTo) params.to = new Date(dateTo).toISOString();
      const blob = await api.exportInvoicesZip(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().slice(0,10).replace(/-/g,'');
      a.href = url;
      a.download = `factures_export_${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (e) {
      console.error('[EXPORT] Failed to export ZIP', e);
      alert(e instanceof Error ? e.message : 'Échec de l\'export');
    } finally {
      setExportLoading(false);
    }
  };

  // Brief FAB highlight on mount
  const [highlightFab, setHighlightFab] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setHighlightFab(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Speed-dial open state
  const [fabOpen, setFabOpen] = useState(false);

  // Compute last invoice (by issueDate)
  const lastInvoice = useMemo(() => {
    if (!invoices || invoices.length === 0) return undefined;
    return [...invoices].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
  }, [invoices]);

  // Filter and search invoices
  const filteredInvoices = useMemo(() => {
    // Start from a shallow copy to avoid mutating props/state arrays
    let filtered = [...invoices];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.clientName.toLowerCase().includes(query) ||
        invoice.amount.toString().includes(query)
      );
    }

    // Sort invoices on a copy to avoid in-place mutations
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'client':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [invoices, searchQuery, selectedStatus, sortBy, sortOrder]);

  // Removed unused statusCounts, handleSort, and getSortIcon helpers

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Erreur de chargement
        </h3>
        <p className="text-slate-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6 relative">
      {/* Filtros y búsqueda */}
      <div className="surface shadow rounded-lg overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-primary">
          <div className="flex flex-col gap-3">
            <div className="w-full">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={labels?.searchPlaceholder || "Rechercher des factures..."}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'client' | 'status')}
                className="w-full rounded-md input-theme shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
              >
                <option value="date">Trier par date</option>
                <option value="amount">Trier par montant</option>
                <option value="client">Trier par client</option>
                <option value="status">Trier par statut</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full rounded-md input-theme shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
              {/* View mode toggle */}
              <div className="inline-flex shrink-0 whitespace-nowrap rounded-md border border-[var(--color-border-primary)] divide-x divide-[var(--color-border-primary)]">
                <button
                  type="button"
                  onClick={() => viewMode !== 'grid' && setViewMode('grid')}
                  className={`px-3 py-2 text-sm w-20 ${viewMode==='grid' ? 'btn-theme-primary' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}
                  title="Grille"
                  aria-label="Afficher en grille"
                >
                  Grille
                </button>
                <button
                  type="button"
                  onClick={() => viewMode !== 'list' && setViewMode('list')}
                  className={`px-3 py-2 text-sm w-20 ${viewMode==='list' ? 'btn-theme-primary' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}
                  title="Liste"
                  aria-label="Afficher en liste"
                >
                  Liste
                </button>
              </div>
              {/* Export ZIP button */}
              <button
                onClick={() => setExportOpen(true)}
                className="w-full sm:w-auto px-3 py-2 btn-theme-primary rounded-md text-sm"
                title="Télécharger (ZIP)"
              >
                Télécharger (ZIP)
              </button>
              
              {/* Filtro de estado para móviles */}
              <div className="col-span-2 sm:hidden">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as InvoiceStatus)}
                  className="w-full rounded-md input-theme shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyée</option>
                  <option value="paid">Payée</option>
                  <option value="overdue">En retard</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>
            </div>
            
            {/* Filtros de estado para desktop */}
            <div className="hidden sm:flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  selectedStatus === 'all' 
                    ? 'chip-active' 
                    : 'chip-neutral'
                }`}
              >
                Tous
              </button>
              {(['draft', 'sent', 'paid', 'partially_paid', 'unpaid', 'overdue', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status as InvoiceStatus)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    selectedStatus === status
                      ? 'chip-active'
                      : 'chip-neutral'
                  }`}
                >
                  {status === 'draft' && 'Brouillon'}
                  {status === 'sent' && 'Envoyée'}
                  {status === 'paid' && 'Payée'}
                  {status === 'partially_paid' && 'Partiellement payée'}
                  {status === 'unpaid' && 'Non payée'}
                  {status === 'overdue' && 'En retard'}
                  {status === 'cancelled' && 'Annulée'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de facturas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-20 h-20 chip-neutral rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">📄</span>
          </div>
          {searchQuery || selectedStatus !== 'all' ? (
            <>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {labels?.noneFoundTitle || 'Aucune facture trouvée'}
              </h3>
              <p className="text-secondary mb-6">
                {labels?.noneFoundSubtitle || 'Aucune facture ne correspond à vos critères de recherche.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                }}
                className="px-4 py-2 chip-neutral rounded-lg transition-colors"
              >
                Effacer les filtres
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {labels?.emptyTitle || 'Aucune facture'}
              </h3>
              <p className="text-secondary mb-6">
                {labels?.emptySubtitle || "Vous n'avez pas encore créé de factures."}
              </p>
              {onCreateNew && (
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {labels?.emptyCtaLabel || 'Créer ma première facture'}
                </button>
              )}
            </>
          )}
        </Card>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onSend={onSend}
                onDuplicate={onDuplicate}
                onDownloadPdf={onDownloadPdf}
                onSendEmail={onSendEmail}
                onViewEmailHistory={onViewEmailHistory}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-[var(--color-border-primary)] rounded-lg overflow-hidden">
              <thead className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-3 py-2 text-left">Numéro</th>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Émise</th>
                  <th className="px-3 py-2 text-left">Échéance</th>
                  <th className="px-3 py-2 text-left">Statut</th>
                  <th className="px-3 py-2 text-right">Total TTC</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const issued = new Date(invoice.issueDate).toLocaleDateString('fr-CH');
                  const due = new Date(invoice.dueDate).toLocaleDateString('fr-CH');
                  const total = (invoice as unknown as { total?: number }).total ?? invoice.amount;
                  const currency = invoice.currency;
                  const fmt = new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(total);
                  return (
                    <tr key={invoice.id} className="border-t border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)]">
                      <td className="px-3 py-2">#{invoice.invoiceNumber}</td>
                      <td className="px-3 py-2">{invoice.clientName}</td>
                      <td className="px-3 py-2">{issued}</td>
                      <td className="px-3 py-2">{due}</td>
                      <td className="px-3 py-2 capitalize">{invoice.status}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          {onView && (
                            <button onClick={() => onView(invoice.id)} className="px-2 py-1 text-xs chip-neutral rounded-md">Voir</button>
                          )}
                          {onEdit && invoice.status==='draft' && (
                            <button onClick={() => onEdit(invoice.id)} className="px-2 py-1 text-xs chip-neutral rounded-md">Modifier</button>
                          )}
                          {onDownloadPdf && (
                            <button onClick={() => onDownloadPdf(invoice.id)} className="px-2 py-1 text-xs chip-neutral rounded-md">PDF</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Speed-dial Floating Action Button */}
      {(onCreateNew || onDuplicate) && (
        <>
          {fabOpen && (
            <div className="fixed inset-0 z-30 bg-black/10" onClick={() => setFabOpen(false)} />
          )}

          <div className="fixed bottom-6 right-3 sm:right-4 md:right-5 z-40 flex flex-col items-end gap-3">
            {/* Duplicate last invoice */}
            {onDuplicate && lastInvoice && (
              <button
                onClick={() => { onDuplicate(lastInvoice.id); setFabOpen(false); }}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label="Dupliquer la dernière facture"
                title="Dupliquer la dernière"
              >
                <Copy className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Dupliquer la dernière</span>
              </button>
            )}

            {/* New invoice */}
            {onCreateNew && (
              <button
                onClick={() => { onCreateNew(); setFabOpen(false); }}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label={labels?.newAriaLabel || 'Nouvelle facture'}
                title={labels?.newTitle || 'Nouvelle facture'}
              >
                <Plus className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Nouvelle</span>
              </button>
            )}

            {/* Main FAB */}
            <button
              onClick={() => setFabOpen(v => !v)}
              className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all relative
                         btn-theme-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                         ${highlightFab && !fabOpen ? 'animate-bounce ring-4 ring-blue-300/60 shadow-blue-400/40' : ''}`}
              aria-label="Actions"
              title="Actions"
            >
              {highlightFab && !fabOpen && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-30 animate-ping" />
              )}
              <Plus className={`w-5 h-5 transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </>
      )}

      {/* Export modal */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !exportLoading && setExportOpen(false)} />
          <div className="relative z-10 w-[92%] max-w-lg rounded-lg surface shadow p-5">
            <h3 className="text-lg font-semibold mb-4">Exporter les factures (ZIP)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">ID Client (optionnel)</label>
                <input type="text" className="w-full input-theme rounded-md" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Saisir l'ID du client" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Du (optionnel)</label>
                  <input type="date" className="w-full input-theme rounded-md" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Au (optionnel)</label>
                  <input type="date" className="w-full input-theme rounded-md" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 chip-neutral rounded-md" onClick={() => !exportLoading && setExportOpen(false)} disabled={exportLoading}>Annuler</button>
              <button className="px-4 py-2 btn-theme-primary rounded-md" onClick={handleExport} disabled={exportLoading}>
                {exportLoading ? 'Préparation…' : 'Télécharger'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}