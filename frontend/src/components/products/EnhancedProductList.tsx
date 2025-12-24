import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Package, Wrench, Search, X, LayoutGrid, List, ArrowDownAZ, Tag, Clock, Pencil, Copy, Trash2, Plus, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isService?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EnhancedProductListProps {
  products: Product[];
  loading?: boolean;
  error?: string | null;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  onDuplicate?: (productId: string) => void;
  onCreateNew?: () => void;
  currency?: string;
  onOpenImport?: () => void;
  onExport?: () => void;
  showInsights?: boolean;
}

export const EnhancedProductList: React.FC<EnhancedProductListProps> = ({
  products,
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onDuplicate,
  onCreateNew,
  currency = 'CHF',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onOpenImport,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onExport,
  showInsights = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive' | 'products' | 'services'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('products_view_mode') as 'grid' | 'list') || 'grid'
  );
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'created'>('name');

  useEffect(() => {
    try { localStorage.setItem('products_view_mode', viewMode); } catch { /* ignore storage errors */ }
  }, [viewMode]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by type/status
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(product => product.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(product => !product.isActive);
        break;
      case 'products':
        // Products have isService = false
        filtered = filtered.filter(product => !product.isService);
        break;
      case 'services':
        // Services have isService = true
        filtered = filtered.filter(product => product.isService === true);
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.description || '').toLowerCase().includes(query) ||
        product.unit.toLowerCase().includes(query)
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.unitPrice - a.unitPrice; // Descending by price
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Newest first
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, selectedFilter, sortBy]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getProductIcon = (product: Product) => {
    const unit = product.unit.toLowerCase();
    if (['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(unit)) {
      return <Wrench className="w-6 h-6" />; // Service
    }
    return <Package className="w-6 h-6" />; // Product
  };

  const getProductType = (product: Product) => {
    const unit = product.unit.toLowerCase();
    if (['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(unit)) {
      return 'Service';
    }
    return 'Produit';
  };


  const filterOptions = [
    { value: 'all', label: 'Tout le catalogue', icon: <Package className="w-4 h-4" />, count: products.length },
    { value: 'active', label: 'Actifs', icon: <Tag className="w-4 h-4" />, count: products.filter(p => p.isActive).length },
    { value: 'inactive', label: 'Inactifs', icon: <Tag className="w-4 h-4" />, count: products.filter(p => !p.isActive).length },
    { 
      value: 'products', 
      label: 'Produits', 
      icon: <Package className="w-4 h-4" />, 
      count: products.filter(p => !['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(p.unit.toLowerCase())).length 
    },
    { 
      value: 'services', 
      label: 'Services', 
      icon: <Wrench className="w-4 h-4" />, 
      count: products.filter(p => ['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(p.unit.toLowerCase())).length 
    }
  ];

  const sortOptions = [
    { value: 'name', label: 'Nom A-Z', icon: <ArrowDownAZ className="w-4 h-4" /> },
    { value: 'price', label: 'Prix ↓', icon: <Tag className="w-4 h-4" /> },
    { value: 'created', label: 'Plus récent', icon: <Clock className="w-4 h-4" /> }
  ];

  const catalogInsights = useMemo(() => {
    if (!products.length) {
      return {
        total: 0,
        activeRatio: 0,
        averagePrice: 0,
        serviceRatio: 0,
        topProduct: null as string | null,
      };
    }

    const total = products.length;
    const active = products.filter(product => product.isActive).length;
    const services = products.filter(product => ['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(product.unit.toLowerCase())).length;
    const averagePrice = products.reduce((sum, product) => sum + product.unitPrice, 0) / total;
    const topProduct = [...products].sort((a, b) => b.unitPrice - a.unitPrice)[0]?.name ?? null;

    return {
      total,
      activeRatio: Math.round((active / Math.max(total, 1)) * 100),
      averagePrice,
      serviceRatio: Math.round((services / Math.max(total, 1)) * 100),
      topProduct,
    };
  }, [products]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-[var(--color-text-secondary)]">Chargement du catalogue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">Oups ! Une erreur s'est produite</h3>
        <p className="text-[var(--color-text-secondary)] mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} variant="primary">
          🔄 Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showInsights && products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="p-5 card-theme border-l-4 border-l-blue-500">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Activation</p>
            <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-2">{catalogInsights.activeRatio}%</p>
            <p className="text-sm text-[var(--color-text-secondary)]">de votre catalogue est prêt à l'emploi</p>
          </Card>
          <Card className="p-5 card-theme border-l-4 border-l-emerald-500">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Prix moyen</p>
            <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-2">
              {catalogInsights.averagePrice.toLocaleString('fr-CH', { style: 'currency', currency })}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">Optimisez vos marges en gardant ce KPI à jour</p>
          </Card>
          <Card className="p-5 card-theme border-l-4 border-l-orange-500">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Services</p>
            <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-2">{catalogInsights.serviceRatio}%</p>
            <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> {catalogInsights.topProduct || 'Aucun produit premium identifié'}
            </p>
          </Card>
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-5">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-violet-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom, description, unité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 text-base rounded-xl border-2 border-slate-200 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400 transition-all focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </div>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedFilter(option.value as 'all' | 'active' | 'inactive' | 'products' | 'services')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedFilter === option.value
                    ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="inline-flex">{option.icon}</span>
                <span>{option.label}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                  selectedFilter === option.value
                    ? 'bg-violet-200 text-violet-800'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode, Sort and Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              {/* View Mode */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Affichage :</span>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Grille</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>Liste</span>
                  </button>
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Trier :</span>
                <div className="flex gap-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as 'name' | 'price' | 'created')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sortBy === option.value
                          ? 'bg-violet-100 text-violet-700'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <span className="inline-flex">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
              <span className="font-semibold text-slate-700">{filteredProducts.length}</span> produit{filteredProducts.length !== 1 ? 's' : ''}
              {searchQuery && ' trouvé' + (filteredProducts.length !== 1 ? 's' : '')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-6">
                {searchQuery || selectedFilter !== 'all' ? <Search className="w-10 h-10 text-violet-500" /> : <Package className="w-10 h-10 text-violet-500" />}
              </div>
            
              {searchQuery || selectedFilter !== 'all' ? (
                <>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Aucun produit trouvé
                  </h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    Aucun produit ne correspond à vos critères de recherche.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFilter('all');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Effacer les filtres
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Votre catalogue est vide
                  </h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    Commencez par ajouter vos produits et services pour créer votre catalogue.
                  </p>
                  {onCreateNew && (
                    <button
                      onClick={onCreateNew}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter mon premier produit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence>
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                >
                  <div
                    className={`group bg-white rounded-2xl border border-slate-200/60 p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 ${!product.isActive ? 'opacity-60' : 'hover:-translate-y-1 hover:border-violet-200'}`}
                  >
                    <div className="space-y-4">
                      <div className="w-14 h-14 mx-auto bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                        {getProductIcon(product)}
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-slate-800 truncate">{product.name}</h3>
                          {!product.isActive && (<span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">Inactif</span>)}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-2">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-full">{getProductType(product)}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">TVA {product.tvaRate}%</span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-slate-500 mb-2 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-center gap-1 mt-3">
                          <span className="text-xl font-bold text-slate-800">{formatPrice(product.unitPrice)}</span>
                          <span className="text-slate-400 text-sm">/ {product.unit}</span>
                        </div>
                      </div>
                      <div className="flex justify-center gap-2 pt-4 border-t border-slate-100">
                        {onEdit && (
                          <button onClick={() => onEdit(product.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {onDuplicate && (
                          <button onClick={() => onDuplicate(product.id)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Dupliquer">
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(product.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <motion.table
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full text-sm border border-[var(--color-border-primary)] rounded-2xl overflow-hidden shadow-sm table-fixed"
            >
              <thead className="bg-[var(--color-bg-secondary)]/80 text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-3 py-2 text-left w-[35%]">Nom</th>
                  <th className="px-3 py-2 text-left w-[10%]">Type</th>
                  <th className="px-3 py-2 text-left w-[8%]">TVA</th>
                  <th className="px-3 py-2 text-right w-[12%]">Prix</th>
                  <th className="px-3 py-2 text-left w-[8%]">Unité</th>
                  <th className="px-3 py-2 text-left w-[10%]">Statut</th>
                  <th className="px-3 py-2 text-right w-[17%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filteredProducts.map((product) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)]/70"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--color-text-primary)] flex items-center gap-2 min-w-0">
                          <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]">
                            {getProductIcon(product)}
                          </span>
                          <span className="truncate" title={product.name}>{product.name}</span>
                        </div>
                        {product.description && (
                          <div className="text-[11px] text-[var(--color-text-tertiary)] truncate ml-8" title={product.description}>{product.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">{getProductType(product)}</td>
                      <td className="px-3 py-2">{product.tvaRate}%</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatPrice(product.unitPrice)}</td>
                      <td className="px-3 py-2">{product.unit}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${product.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}>
                          {product.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          {onEdit && (
                            <button 
                              onClick={() => onEdit(product.id)} 
                              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {onDuplicate && (
                            <button 
                              onClick={() => onDuplicate(product.id)} 
                              className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-500 transition-colors"
                              title="Dupliquer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              onClick={() => onDelete(product.id)} 
                              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </motion.table>
          </div>
        )
      )}

      {/* FAB removed - use header buttons instead */}
    </div>
  );
};
