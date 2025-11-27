import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  LayoutGrid, 
  List, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  FileText,
  RefreshCw,
  Sparkles,
  Calendar,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModernExpenseCard } from './ModernExpenseCard';
import { CompactExpenseRow } from './CompactExpenseRow';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { Expense, Account, Currency, TvaSummary } from '../../services/expensesApi';

interface ModernExpensesListProps {
  expenses: Expense[];
  accounts: Account[];
  loading?: boolean;
  error?: string | null;
  onEdit?: (expenseId: string) => void;
  onDelete?: (expenseId: string) => void;
  onCreateNew?: () => void;
  onRefresh?: () => void;
  onFilterChange?: (filters: any) => void;
  currentFilters?: {
    dateFrom?: string;
    dateTo?: string;
    accountId?: string;
    currency?: Currency;
    search?: string;
  };
  pnlData?: {
    revenue: number;
    charges: number;
    utilite: number;
    tva: number;
  } | null;
  pnlLoading?: boolean;
  tvaSummary?: TvaSummary | null;
  tvaLoading?: boolean;
}

const formatAmount = (n: number) => new Intl.NumberFormat('fr-CH', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
}).format(n);

export function ModernExpensesList({
  expenses = [],
  accounts = [],
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onCreateNew,
  onRefresh,
  onFilterChange,
  currentFilters,
  pnlData,
  pnlLoading = false,
  tvaSummary,
  tvaLoading = false
}: ModernExpensesListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<Currency>('CHF');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('expenses_view_mode') as 'grid' | 'list') || 'list'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('expenses_view_mode', viewMode); } catch {}
  }, [viewMode]);

  // Initialize from currentFilters
  useEffect(() => {
    if (!currentFilters) return;
    if (currentFilters.dateFrom) setDateFrom(currentFilters.dateFrom);
    if (currentFilters.dateTo) setDateTo(currentFilters.dateTo);
    if (currentFilters.accountId) setSelectedAccount(currentFilters.accountId);
    if (currentFilters.currency) setCurrency(currentFilters.currency);
    if (currentFilters.search) setSearchQuery(currentFilters.search);
  }, [currentFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = expenses.length;
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const avgAmount = total > 0 ? totalAmount / total : 0;
    const accountsUsed = new Set(expenses.map(e => e.accountId)).size;
    
    return { total, totalAmount, avgAmount, accountsUsed };
  }, [expenses]);

  // Filter and search expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Filter by account
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(exp => exp.accountId === selectedAccount);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.label.toLowerCase().includes(query) ||
        (exp.supplier || '').toLowerCase().includes(query) ||
        (exp.notes || '').toLowerCase().includes(query) ||
        exp.amount.toString().includes(query)
      );
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [expenses, selectedAccount, searchQuery]);

  // Sync filters with parent component (debounced for search)
  useEffect(() => {
    if (!onFilterChange) return;

    const timeoutId = setTimeout(() => {
      const filters = {
        dateFrom,
        dateTo,
        accountId: selectedAccount === 'all' ? undefined : selectedAccount,
        currency,
        search: searchQuery.trim() || undefined
      };
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [selectedAccount, searchQuery, dateFrom, dateTo, currency, onFilterChange]);

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

  const profitability = pnlData && pnlData.revenue > 0 
    ? (pnlData.utilite / pnlData.revenue) * 100 
    : 0;
  const isProfitable = pnlData && pnlData.utilite >= 0;

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header with Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-indigo-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Receipt className="w-8 h-8 text-indigo-600" />
                Charges
                <span className="text-lg font-normal text-slate-500">({stats.total})</span>
              </h1>
              <p className="text-slate-600 mt-1">Gérez vos dépenses et suivez votre utilité</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/tva-report')}
                className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors duration-200 flex items-center gap-2 font-medium"
                title="Rapport TVA"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden md:inline">Rapport TVA</span>
              </button>
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-3 rounded-xl bg-indigo-100 hover:bg-indigo-200 transition-colors duration-200"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-5 h-5 text-indigo-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onCreateNew && (
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Nouvelle charge</span>
                </button>
              )}
            </div>
          </div>

          {/* P&L Dashboard */}
          {pnlData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 border border-green-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">CA HT</p>
                <p className="text-2xl font-bold text-green-900">{formatAmount(pnlData.revenue)}</p>
                <p className="text-xs text-green-600 mt-1">{currency}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-4 border border-red-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Charges</p>
                <p className="text-2xl font-bold text-red-900">{formatAmount(pnlData.charges)}</p>
                <p className="text-xs text-red-600 mt-1">{currency}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`rounded-xl p-4 border-2 ${
                  isProfitable 
                    ? 'bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-300' 
                    : 'bg-gradient-to-br from-orange-50 to-red-100 border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className={`w-5 h-5 ${isProfitable ? 'text-emerald-600' : 'text-orange-600'}`} />
                  <Sparkles className={`w-4 h-4 ${isProfitable ? 'text-emerald-500' : 'text-orange-500'}`} />
                </div>
                <p className={`text-xs font-medium uppercase tracking-wide ${isProfitable ? 'text-emerald-700' : 'text-orange-700'}`}>
                  Utilité
                </p>
                <p className={`text-2xl font-bold ${isProfitable ? 'text-emerald-900' : 'text-orange-900'}`}>
                  {formatAmount(pnlData.utilite)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-xs ${isProfitable ? 'text-emerald-600' : 'text-orange-600'}`}>{currency}</p>
                  {pnlData.revenue > 0 && (
                    <p className={`text-xs font-semibold ${isProfitable ? 'text-emerald-700' : 'text-orange-700'}`}>
                      {profitability.toFixed(1)}%
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* TVA Summary */}
          {tvaSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 border border-green-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide">TVA Collectée</p>
                <p className="text-2xl font-bold text-green-900">{formatAmount(tvaSummary.tvaCollected)}</p>
                <p className="text-xs text-green-600 mt-1">{currency}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl p-4 border border-orange-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-xs text-orange-700 font-medium uppercase tracking-wide">TVA Déductible</p>
                <p className="text-2xl font-bold text-orange-900">{formatAmount(tvaSummary.tvaDeductible)}</p>
                <p className="text-xs text-orange-600 mt-1">{currency}</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`rounded-xl p-4 border-2 ${
                  tvaSummary.tvaNet >= 0 
                    ? 'bg-gradient-to-br from-red-50 to-rose-100 border-red-300' 
                    : 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className={`w-5 h-5 ${tvaSummary.tvaNet >= 0 ? 'text-red-600' : 'text-green-600'}`} />
                  <Sparkles className={`w-4 h-4 ${tvaSummary.tvaNet >= 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <p className={`text-xs font-medium uppercase tracking-wide ${tvaSummary.tvaNet >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                  TVA Nette {tvaSummary.tvaNet >= 0 ? 'à payer' : 'à récupérer'}
                </p>
                <p className={`text-2xl font-bold ${tvaSummary.tvaNet >= 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {formatAmount(Math.abs(tvaSummary.tvaNet))}
                </p>
                <p className={`text-xs mt-1 ${tvaSummary.tvaNet >= 0 ? 'text-red-600' : 'text-green-600'}`}>{currency}</p>
              </motion.div>
            </div>
          )}

          {/* Expenses Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200"
            >
              <div className="flex items-center justify-between mb-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm text-indigo-700 font-medium">Total charges</p>
              <p className="text-2xl font-bold text-indigo-900">{stats.total}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200"
            >
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 font-medium">Montant total</p>
              <p className="text-2xl font-bold text-purple-900">{formatAmount(stats.totalAmount)}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200"
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-pink-600" />
              </div>
              <p className="text-sm text-pink-700 font-medium">Comptes utilisés</p>
              <p className="text-2xl font-bold text-pink-900">{stats.accountsUsed}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6"
        >
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par libellé, fournisseur, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Du
              </label>
              <input 
                type="date" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Au
              </label>
              <input 
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Compte</label>
              <select 
                value={selectedAccount} 
                onChange={e => setSelectedAccount(e.target.value)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les comptes</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Devise</label>
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value as Currency)} 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* View Mode */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{filteredExpenses.length}</span> charge{filteredExpenses.length !== 1 ? 's' : ''}
              {searchQuery && ' trouvée' + (filteredExpenses.length !== 1 ? 's' : '')}
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vue grille"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vue liste"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Expenses List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <p className="text-slate-600 mt-4">Chargement des charges...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Receipt className="w-10 h-10 text-slate-400" />
            </div>
            {searchQuery || selectedAccount !== 'all' ? (
              <>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucune charge trouvée
                </h3>
                <p className="text-slate-600 mb-6">
                  Aucune charge ne correspond à vos critères de recherche.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAccount('all');
                  }}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Effacer les filtres
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucune charge
                </h3>
                <p className="text-slate-600 mb-6">
                  Commencez par ajouter votre première charge.
                </p>
                {onCreateNew && (
                  <button
                    onClick={onCreateNew}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Ajouter ma première charge
                  </button>
                )}
              </>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredExpenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ModernExpenseCard
                    expense={expense}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Libellé</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Compte</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">TVA</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <AnimatePresence mode="popLayout">
                    {filteredExpenses.map((expense, index) => (
                      <motion.tr
                        key={expense.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <CompactExpenseRow
                          expense={expense}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
                {filteredExpenses.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700" colSpan={3}>Total</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                        {formatAmount(filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0))}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{currency}</td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
