import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  TrendingUp,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  ChevronDown,
  RefreshCw,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InvoiceCard } from '../invoices/InvoiceCard';
import { CompactDevisRow } from './CompactDevisRow';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatAmount } from '../../utils/formatters';

type DevisStatus = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

interface Devis {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  issueDate: string;
  dueDate: string;
  currency: string;
  qrBillGenerated?: boolean;
  sentAt?: string;
  paidAt?: string;
  isQuote?: boolean;
}

interface ModernDevisListProps {
  invoices: Devis[];
  loading?: boolean;
  error?: string | null;
  onView?: (devisId: string) => void;
  onEdit?: (devisId: string) => void;
  onDelete?: (devisId: string) => void;
  onSend?: (devisId: string) => void;
  onDuplicate?: (devisId: string) => void;
  onDownloadPdf?: (devisId: string) => void;
  onSendEmail?: (devisId: string) => void;
  onViewEmailHistory?: (devisId: string) => void;
  onConvertToInvoice?: (devisId: string) => void;
  onCreateNew?: () => void;
  onRefresh?: () => void;
  onFilterChange?: (filters: Record<string, unknown>) => void;
  currentFilters?: {
    status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | undefined;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  operationLoading?: {
    delete?: (id: string) => boolean;
    send?: (id: string) => boolean;
    duplicate?: (id: string) => boolean;
    download?: (id: string) => boolean;
    convert?: (id: string) => boolean;
  };
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', icon: FileText, color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  sent: { label: 'Envoyé', icon: Send, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  accepted: { label: 'Accepté', icon: CheckCircle2, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  rejected: { label: 'Refusé', icon: XCircle, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  expired: { label: 'Expiré', icon: AlertCircle, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  converted: { label: 'Converti', icon: CheckCircle2, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
};

export function ModernDevisList({
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
  onRefresh,
  onFilterChange,
  currentFilters
}: ModernDevisListProps) {
  // Note: onConvertToInvoice and operationLoading are available in props but not currently used
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DevisStatus>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('devis_view_mode') as 'grid' | 'list') || 'grid'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('devis_view_mode', viewMode); } catch { /* ignore storage errors */ }
  }, [viewMode]);

  // Initialize/sync local filters from parent-provided currentFilters
  useEffect(() => {
    if (!currentFilters) return;
    // Status
    if (currentFilters.status) {
      setSelectedStatus(currentFilters.status as DevisStatus);
    }
    // Search
    if (currentFilters.search !== undefined) {
      setSearchQuery(currentFilters.search);
    }
  }, [currentFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = invoices.length;
    const draft = invoices.filter(i => i.status === 'draft').length;
    const sent = invoices.filter(i => i.status === 'sent').length;
    const accepted = invoices.filter(i => i.status === 'paid').length; // Using 'paid' as 'accepted'
    const rejected = invoices.filter(i => i.status === 'cancelled').length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const acceptedAmount = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    
    return { total, draft, sent, accepted, rejected, totalAmount, acceptedAmount };
  }, [invoices]);

  // Filter and search devis
  const filteredDevis = useMemo(() => {
    let filtered = [...invoices];

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'accepted') {
        filtered = filtered.filter(devis => devis.status === 'paid');
      } else if (selectedStatus === 'rejected') {
        filtered = filtered.filter(devis => devis.status === 'cancelled');
      } else {
        filtered = filtered.filter(devis => devis.status.toLowerCase() === selectedStatus);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(devis =>
        devis.invoiceNumber.toLowerCase().includes(query) ||
        devis.clientName.toLowerCase().includes(query) ||
        devis.amount.toString().includes(query)
      );
    }

    // Sort devis
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

  // Sync filters with parent component (debounced for search)
  useEffect(() => {
    if (!onFilterChange) return;

    // Debounce search query changes
    const timeoutId = setTimeout(() => {
      const filters = {
        status: selectedStatus === 'all' ? undefined : selectedStatus as 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired',
        search: searchQuery.trim() || undefined,
        sortBy,
        sortOrder
      };
      onFilterChange(filters);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [selectedStatus, searchQuery, sortBy, sortOrder, onFilterChange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto mt-12"
      >
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-red-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Réessayer
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header with Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-theme border-b shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-purple-600" />
                Devis
                <span className="text-lg font-normal text-[var(--color-text-secondary)]">({stats.total})</span>
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-1">Gérez vos devis et suivez vos propositions commerciales</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 transition-colors duration-200"
                title="Actualiser"
              >
                <RefreshCw className={`w-5 h-5 text-purple-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onCreateNew}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Nouveau devis</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-theme rounded-xl p-4 border-l-4 border-l-purple-500"
            >
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-purple-500" />
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">Total</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {formatAmount(stats.totalAmount)} CHF
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-theme rounded-xl p-4 border-l-4 border-l-green-500"
            >
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">Acceptés</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.accepted}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-theme rounded-xl p-4 border-l-4 border-l-blue-500"
            >
              <div className="flex items-center justify-between mb-2">
                <Send className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">Envoyés</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.sent}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-theme rounded-xl p-4 border-l-4 border-l-slate-500"
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">Brouillons</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.draft}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="card-theme rounded-xl p-4 border-l-4 border-l-red-500"
            >
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">Refusés</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.rejected}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-theme rounded-2xl shadow-sm p-6 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par numéro, client, montant..."
                className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 placeholder:text-[var(--color-text-tertiary)]"
              />
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium text-purple-500"
            >
              <Filter className="w-5 h-5" />
              Filtres
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[var(--color-bg-secondary)] rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-[var(--color-bg-tertiary)] shadow-sm text-purple-500'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-bg-tertiary)] shadow-sm text-purple-500'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-6 mt-6 border-t border-[var(--color-border-primary)]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                        Statut
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as DevisStatus)}
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="draft">Brouillons</option>
                        <option value="sent">Envoyés</option>
                        <option value="accepted">Acceptés</option>
                        <option value="rejected">Refusés</option>
                        <option value="expired">Expirés</option>
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                        Trier par
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'client' | 'status')}
                        className="w-full px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="date">Date</option>
                        <option value="amount">Montant</option>
                        <option value="client">Client</option>
                        <option value="status">Statut</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Ordre
                      </label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="w-full px-4 py-2.5 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="desc">Décroissant</option>
                        <option value="asc">Croissant</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Status Tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {(['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                selectedStatus === status
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-purple-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              {status === 'all' ? 'Tous' : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}
            </button>
          ))}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-600">Chargement des devis...</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredDevis.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-purple-200 p-12 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              {searchQuery || selectedStatus !== 'all' ? 'Aucun devis trouvé' : 'Aucun devis'}
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {searchQuery || selectedStatus !== 'all'
                ? 'Essayez de modifier vos filtres ou votre recherche'
                : 'Vous n\'avez pas encore créé de devis. Commencez dès maintenant !'}
            </p>
            {!(searchQuery || selectedStatus !== 'all') && (
              <button
                onClick={onCreateNew}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Créer mon premier devis
              </button>
            )}
          </motion.div>
        )}

        {/* Devis Grid/List */}
        {!loading && filteredDevis.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredDevis.map((devis, index) => (
                    <motion.div
                      key={devis.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      layout
                    >
                      <InvoiceCard
                        invoice={devis}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onSend={onSend}
                        onDuplicate={onDuplicate}
                        onDownloadPdf={onDownloadPdf}
                        onSendEmail={onSendEmail}
                        onViewEmailHistory={onViewEmailHistory}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  {filteredDevis.map((devis) => (
                    <CompactDevisRow
                      key={devis.id}
                      invoice={devis}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onSend={onSend}
                      onDuplicate={onDuplicate}
                      onDownloadPdf={onDownloadPdf}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
