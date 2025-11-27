import React, { useState, useMemo, useEffect } from 'react';
import { Plus, FileText, Download, Trash2, Edit, Eye, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { Quote } from '../../services/quotesApi';

interface QuoteListProps {
  quotes: Quote[];
  loading?: boolean;
  error?: string | null;
  onView?: (quoteId: string) => void;
  onEdit?: (quoteId: string) => void;
  onDelete?: (quoteId: string) => void;
  onDownloadPdf?: (quoteId: string) => void;
  onConvertToInvoice?: (quoteId: string) => void;
  onCreateNew?: () => void;
  operationLoading?: {
    delete?: (id: string) => boolean;
    download?: (id: string) => boolean;
    convert?: (id: string) => boolean;
  };
}

export function QuoteList({
  quotes = [],
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  onConvertToInvoice,
  onCreateNew,
  operationLoading
}: QuoteListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'>('all');
  const [fabOpen, setFabOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('quotes_view_mode') as 'grid' | 'list') || 'grid'
  );
  useEffect(() => { try { localStorage.setItem('quotes_view_mode', viewMode); } catch {} }, [viewMode]);

  // Filter quotes
  const filteredQuotes = useMemo(() => {
    let filtered = [...quotes];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(quote => quote.status === selectedStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(quote =>
        quote.quoteNumber.toLowerCase().includes(query) ||
        (quote.client?.companyName?.toLowerCase().includes(query)) ||
        (quote.client?.firstName?.toLowerCase().includes(query)) ||
        (quote.client?.lastName?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [quotes, selectedStatus, searchQuery]);

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      rejected: 'Refusé',
      expired: 'Expiré'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges] || badges.draft}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="font-medium">Erreur</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Devis</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {quotes.length} devis au total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex shrink-0 whitespace-nowrap rounded-md border border-gray-300 overflow-hidden min-w-[160px]">
            <button type="button" onClick={() => viewMode!=='grid' && setViewMode('grid')} className={`px-3 py-2 text-sm w-[80px] ${viewMode==='grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Grille</button>
            <button type="button" onClick={() => viewMode!=='list' && setViewMode('list')} className={`px-3 py-2 text-sm w-[80px] border-l border-gray-300 ${viewMode==='list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Liste</button>
          </div>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau devis
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher un devis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500"
              style={{
                borderColor: 'var(--color-border-primary)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-4 py-2 border rounded-md focus:ring-blue-500"
            style={{
              borderColor: 'var(--color-border-primary)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)'
            }}
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="accepted">Accepté</option>
            <option value="rejected">Refusé</option>
            <option value="expired">Expiré</option>
          </select>
        </div>
      </Card>

      {/* Quotes list */}
      {filteredQuotes.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Aucun devis</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {searchQuery || selectedStatus !== 'all'
                ? 'Aucun devis ne correspond à vos critères.'
                : 'Commencez par créer un nouveau devis.'}
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouveau devis
                </button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid gap-4">
            {filteredQuotes.map((quote) => (
              <Card key={quote.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {quote.quoteNumber}
                      </h3>
                      {getStatusBadge(quote.status)}
                      {quote.convertedInvoiceId && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          Converti
                        </span>
                      )}
                    </div>
                    <div className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                      <p>
                        <span className="font-medium">Client:</span>{' '}
                        {quote.client?.companyName || `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim()}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(quote.issueDate).toLocaleDateString('fr-CH')}
                      </p>
                      {quote.validUntil && (
                        <p>
                          <span className="font-medium">Valide jusqu'au:</span>{' '}
                          {new Date(quote.validUntil).toLocaleDateString('fr-CH')}
                        </p>
                      )}
                      <p className="text-lg font-semibold mt-2" style={{ color: 'var(--color-text-primary)' }}>
                        {quote.total.toFixed(2)} {quote.currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {onView && (
                      <button onClick={() => onView(quote.id)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Voir">
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    {onEdit && !quote.convertedInvoiceId && (
                      <button onClick={() => onEdit(quote.id)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Modifier">
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    {onDownloadPdf && (
                      <button onClick={() => onDownloadPdf(quote.id)} disabled={operationLoading?.download?.(quote.id)} className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50" title="Télécharger PDF">
                        <Download className="h-5 w-5" />
                      </button>
                    )}
                    {onConvertToInvoice && !quote.convertedInvoiceId && quote.status !== 'rejected' && (
                      <button onClick={() => onConvertToInvoice(quote.id)} disabled={operationLoading?.convert?.(quote.id)} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50" title="Convertir en facture">
                        <ArrowRight className="h-5 w-5" />
                      </button>
                    )}
                    {onDelete && !quote.convertedInvoiceId && (
                      <button onClick={() => onDelete(quote.id)} disabled={operationLoading?.delete?.(quote.id)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50" title="Supprimer">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table 
              className="min-w-full text-sm rounded-lg overflow-hidden"
              style={{ 
                borderColor: 'var(--color-border-primary)',
                border: '1px solid'
              }}
            >
              <thead style={{ backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}>
                <tr>
                  <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-secondary)' }}>Numéro</th>
                  <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-secondary)' }}>Client</th>
                  <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-secondary)' }}>Date</th>
                  <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-secondary)' }}>Valide jusqu'au</th>
                  <th className="px-3 py-2 text-left" style={{ color: 'var(--color-text-secondary)' }}>Statut</th>
                  <th className="px-3 py-2 text-right" style={{ color: 'var(--color-text-secondary)' }}>Total</th>
                  <th className="px-3 py-2 text-right" style={{ color: 'var(--color-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((quote) => {
                  const issued = new Date(quote.issueDate).toLocaleDateString('fr-CH');
                  const until = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('fr-CH') : '—';
                  const fmt = new Intl.NumberFormat('fr-CH', { style: 'currency', currency: quote.currency }).format(quote.total);
                  return (
                    <tr 
                      key={quote.id} 
                      className="border-t transition-colors cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border-primary)',
                        color: 'var(--color-text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>{quote.quoteNumber}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>{quote.client?.companyName || `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim()}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>{issued}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-primary)' }}>{until}</td>
                      <td className="px-3 py-2 capitalize" style={{ color: 'var(--color-text-primary)' }}>{quote.status}</td>
                      <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>{fmt}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          {onView && <button onClick={() => onView(quote.id)} className="px-2 py-1 text-xs border rounded-md">Voir</button>}
                          {onEdit && !quote.convertedInvoiceId && <button onClick={() => onEdit(quote.id)} className="px-2 py-1 text-xs border rounded-md">Modifier</button>}
                          {onDownloadPdf && <button onClick={() => onDownloadPdf(quote.id)} className="px-2 py-1 text-xs border rounded-md">PDF</button>}
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
      {onCreateNew && (
        <>
          {fabOpen && (
            <div className="fixed inset-0 z-30 bg-black/10" onClick={() => setFabOpen(false)} />
          )}

          <div className="fixed bottom-6 right-3 sm:right-4 md:right-5 z-40 flex flex-col items-end gap-3">
            {/* Main FAB */}
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all btn-theme-primary"
              aria-label="Actions"
            >
              <Plus className={`h-6 w-6 transition-transform ${fabOpen ? 'rotate-45' : ''}`} />
            </button>

            {/* New quote action */}
            <button
              onClick={() => { onCreateNew(); setFabOpen(false); }}
              className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                         ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                         btn-theme-primary`}
              style={{ transitionDelay: fabOpen ? '0ms' : '0ms' }}
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium whitespace-nowrap">Nouveau devis</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
