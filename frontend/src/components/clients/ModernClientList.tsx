import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  LayoutGrid, 
  List, 
  TrendingUp,
  Users,
  Building2,
  User,
  RefreshCw,
  Upload,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModernClientCard } from './ModernClientCard';
import { CompactClientRow } from './CompactClientRow';
import { LoadingSpinner } from '../ui/LoadingSpinner';

type ClientStatus = 'all' | 'active' | 'inactive' | 'companies' | 'individuals';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  canton?: string;
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModernClientListProps {
  clients: Client[];
  loading?: boolean;
  error?: string | null;
  onView?: (clientId: string) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  onCreateInvoice?: (clientId: string) => void;
  onCreateNew?: () => void;
  onRefresh?: () => void;
  onImportCsv?: (file: File) => void;
  onExport?: () => void;
  onFilterChange?: (filters: Record<string, unknown>) => void;
  currentFilters?: {
    status?: 'active' | 'inactive' | undefined;
    type?: 'company' | 'individual' | undefined;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  operationLoading?: {
    delete?: (id: string) => boolean;
    edit?: (id: string) => boolean;
    invoice?: (id: string) => boolean;
  };
}

export function ModernClientList({
  clients = [],
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice,
  onCreateNew,
  onRefresh,
  onImportCsv,
  onExport,
  onFilterChange,
  currentFilters
}: ModernClientListProps) {
  // Note: operationLoading is available in props but not currently used
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'city' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('clients_view_mode') as 'grid' | 'list') || 'grid'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('clients_view_mode', viewMode); } catch { /* ignore storage errors */ }
  }, [viewMode]);

  // Initialize/sync local filters from parent-provided currentFilters
  useEffect(() => {
    if (!currentFilters) return;
    // Search
    setSearchQuery(currentFilters.search || '');
  }, [currentFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.isActive).length;
    const inactive = clients.filter(c => !c.isActive).length;
    const companies = clients.filter(c => !!c.companyName).length;
    const individuals = clients.filter(c => !c.companyName).length;
    
    return { total, active, inactive, companies, individuals };
  }, [clients]);

  // Filter and search clients
  const filteredClients = useMemo(() => {
    let filtered = [...clients];

    // Filter by status/type
    switch (selectedStatus) {
      case 'active':
        filtered = filtered.filter(client => client.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(client => !client.isActive);
        break;
      case 'companies':
        filtered = filtered.filter(client => !!client.companyName);
        break;
      case 'individuals':
        filtered = filtered.filter(client => !client.companyName);
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => {
        const name = (client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ')).toLowerCase();
        return (
          name.includes(query) ||
          client.email.toLowerCase().includes(query) ||
          (client.city || '').toLowerCase().includes(query) ||
          (client.vatNumber || '').toLowerCase().includes(query) ||
          (client.phone || '').includes(query)
        );
      });
    }

    // Sort clients
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name': {
          const nameA = (a.companyName || [a.firstName, a.lastName].filter(Boolean).join(' '));
          const nameB = (b.companyName || [b.firstName, b.lastName].filter(Boolean).join(' '));
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'city':
          comparison = (a.city || '').localeCompare(b.city || '');
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [clients, searchQuery, selectedStatus, sortBy, sortOrder]);

  // Sync filters with parent component (debounced for search)
  useEffect(() => {
    if (!onFilterChange) return;

    // Debounce search query changes
    const timeoutId = setTimeout(() => {
      const filters = {
        status: selectedStatus === 'active' ? 'active' as const : selectedStatus === 'inactive' ? 'inactive' as const : undefined,
        type: selectedStatus === 'companies' ? 'company' as const : selectedStatus === 'individuals' ? 'individual' as const : undefined,
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header with Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-emerald-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-emerald-600" />
                Clients
                <span className="text-lg font-normal text-slate-500">({stats.total})</span>
              </h1>
              <p className="text-slate-600 mt-1">Gérez vos clients et leurs informations</p>
            </div>
            <div className="flex items-center gap-3">
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 transition-colors duration-200"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-5 h-5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors duration-200"
                  title="Exporter"
                >
                  <Download className="w-5 h-5 text-slate-700" />
                </button>
              )}
              {onImportCsv && (
                <label className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors duration-200 cursor-pointer" title="Importer CSV">
                  <Upload className="w-5 h-5 text-slate-700" />
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onImportCsv) {
                        onImportCsv(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
              {onCreateNew && (
                <button
                  onClick={onCreateNew}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Nouveau client</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200"
            >
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-sm text-emerald-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.total}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200"
            >
              <div className="flex items-center justify-between mb-2">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-green-700 font-medium">Actifs</p>
              <p className="text-2xl font-bold text-green-900">{stats.active}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
            >
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-blue-700 font-medium">Entreprises</p>
              <p className="text-2xl font-bold text-blue-900">{stats.companies}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200"
            >
              <div className="flex items-center justify-between mb-2">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-purple-700 font-medium">Particuliers</p>
              <p className="text-2xl font-bold text-purple-900">{stats.individuals}</p>
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
              placeholder="Rechercher par nom, email, ville, TVA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { value: 'all' as const, label: 'Tous', count: stats.total, icon: Users },
              { value: 'active' as const, label: 'Actifs', count: stats.active, icon: User },
              { value: 'inactive' as const, label: 'Inactifs', count: stats.inactive, icon: User },
              { value: 'companies' as const, label: 'Entreprises', count: stats.companies, icon: Building2 },
              { value: 'individuals' as const, label: 'Particuliers', count: stats.individuals, icon: User }
            ].map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedStatus === filter.value
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    selectedStatus === filter.value
                      ? 'bg-emerald-200 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode and Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Trier par:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'city' | 'created')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="name">Nom</option>
                <option value="email">Email</option>
                <option value="city">Ville</option>
                <option value="created">Date création</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-emerald-600 shadow-sm'
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
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vue liste"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
              <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                {filteredClients.length} résultat{filteredClients.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Client List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <p className="text-slate-600 mt-4">Chargement des clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            {searchQuery || selectedStatus !== 'all' ? (
              <>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucun client trouvé
                </h3>
                <p className="text-slate-600 mb-6">
                  Aucun client ne correspond à vos critères de recherche.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('all');
                  }}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Effacer les filtres
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucun client
                </h3>
                <p className="text-slate-600 mb-6">
                  Commencez par ajouter votre premier client.
                </p>
                {onCreateNew && (
                  <button
                    onClick={onCreateNew}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Ajouter mon premier client
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
              {filteredClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ModernClientCard
                    client={client}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCreateInvoice={onCreateInvoice}
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Localisation</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <AnimatePresence mode="popLayout">
                    {filteredClients.map((client, index) => (
                      <motion.tr
                        key={client.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <CompactClientRow
                          client={client}
                          onView={onView}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onCreateInvoice={onCreateInvoice}
                        />
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
