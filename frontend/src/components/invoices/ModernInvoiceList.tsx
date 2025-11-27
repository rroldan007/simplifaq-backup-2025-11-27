import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  LayoutGrid, 
  List, 
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InvoiceCard } from './InvoiceCard';
import { CompactInvoiceRow } from './CompactInvoiceRow';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { type Invoice } from '../../hooks/useInvoices';

type InvoiceStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid' | 'unpaid';

interface ModernInvoiceListProps {
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
  onRefresh?: () => void;
  onFilterChange?: (filters: any) => void;
  currentFilters?: {
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | undefined;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  operationLoading?: {
    delete?: (id: string) => boolean;
    send?: (id: string) => boolean;
    duplicate?: (id: string) => boolean;
    download?: (id: string) => boolean;
  };
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', icon: FileText, color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  sent: { label: 'Envoyée', icon: Send, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  paid: { label: 'Payée', icon: CheckCircle2, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  overdue: { label: 'En retard', icon: AlertCircle, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  cancelled: { label: 'Annulée', icon: XCircle, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  partially_paid: { label: 'Partiellement payée', icon: Clock, color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  unpaid: { label: 'Non payée', icon: AlertCircle, color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
};

export function ModernInvoiceList({
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
  currentFilters,
  operationLoading
}: ModernInvoiceListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('invoices_view_mode') as 'grid' | 'list') || 'grid'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('invoices_view_mode', viewMode); } catch {}
  }, [viewMode]);

  // Initialize/sync local filters from parent-provided currentFilters
  useEffect(() => {
    if (!currentFilters) return;
    // Status
    setSelectedStatus((currentFilters.status as any) || 'all');
    // Search
    setSearchQuery(currentFilters.search || '');
    // Note: sortBy/sortOrder mapping differs between components; keep local controls authoritative
  }, [currentFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = invoices.length;
    const draft = invoices.filter(i => i.status === 'draft').length;
    const sent = invoices.filter(i => i.status === 'sent').length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    
    return { total, draft, sent, paid, overdue, totalAmount, paidAmount };
  }, [invoices]);

  // Filter and search invoices
  const filteredInvoices = useMemo(() => {
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

    // Sort invoices
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
        status: selectedStatus === 'all' ? undefined : selectedStatus as 'draft' | 'sent' | 'paid' | 'overdue',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header with Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Factures
                <span className="text-lg font-normal text-slate-500">({stats.total})</span>
              </h1>
              <p className="text-slate-600 mt-1">Gérez vos factures et suivez vos paiements</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors duration-200"
                title="Actualiser"
              >
                <RefreshCw className={`w-5 h-5 text-slate-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onCreateNew}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Nouvelle facture</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
            >
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-sm text-blue-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.totalAmount.toLocaleString('fr-CH')} CHF
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200"
            >
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-green-700 font-medium">Payées</p>
              <p className="text-2xl font-bold text-green-900">{stats.paid}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200"
            >
              <div className="flex items-center justify-between mb-2">
                <Send className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-orange-700 font-medium">Envoyées</p>
              <p className="text-2xl font-bold text-orange-900">{stats.sent}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-sm text-slate-700 font-medium">Brouillons</p>
              <p className="text-2xl font-bold text-slate-900">{stats.draft}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200"
            >
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-sm text-red-700 font-medium">En retard</p>
              <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
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
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6"
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
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium text-slate-700"
            >
              <Filter className="w-5 h-5" />
              Filtres
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
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
                <div className="pt-6 mt-6 border-t border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Statut
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as InvoiceStatus)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="draft">Brouillons</option>
                        <option value="sent">Envoyées</option>
                        <option value="paid">Payées</option>
                        <option value="overdue">En retard</option>
                        <option value="cancelled">Annulées</option>
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Trier par
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50'
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
            <p className="mt-4 text-slate-600">Chargement des factures...</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredInvoices.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              {searchQuery || selectedStatus !== 'all' ? 'Aucune facture trouvée' : 'Aucune facture'}
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {searchQuery || selectedStatus !== 'all'
                ? 'Essayez de modifier vos filtres ou votre recherche'
                : 'Vous n\'avez pas encore créé de factures. Commencez dès maintenant !'}
            </p>
            {!(searchQuery || selectedStatus !== 'all') && (
              <button
                onClick={onCreateNew}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Créer ma première facture
              </button>
            )}
          </motion.div>
        )}

        {/* Invoice Grid/List */}
        {!loading && filteredInvoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredInvoices.map((invoice, index) => (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      layout
                    >
                      <InvoiceCard
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
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  {filteredInvoices.map((invoice, index) => (
                    <CompactInvoiceRow
                      key={invoice.id}
                      invoice={invoice}
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
