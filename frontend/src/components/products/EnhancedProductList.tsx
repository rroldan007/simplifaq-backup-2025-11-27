import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Package, Wrench, Search, X, LayoutGrid, List, ArrowDownAZ, Tag, Clock, Pencil, Copy, Trash2, Plus, Upload, Download, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
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
  onOpenImport,
  onExport,
  showInsights = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive' | 'products' | 'services'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('products_view_mode') as 'grid' | 'list') || 'grid'
  );
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'created'>('name');

  // FAB visual
  const [fabOpen, setFabOpen] = useState(false);
  const [highlightFab, setHighlightFab] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setHighlightFab(false), 4000);
    return () => clearTimeout(t);
  }, []);

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
        // Assuming products have physical units like "pcs", "kg", etc.
        filtered = filtered.filter(product => 
          !['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(product.unit.toLowerCase())
        );
        break;
      case 'services':
        // Assuming services have time-based or service units
        filtered = filtered.filter(product => 
          ['heure', 'h', 'hour', 'service', 'consultation', 'forfait'].includes(product.unit.toLowerCase())
        );
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

  const getTvaColor = () => {
    // Use neutral badge with theme-aware text; intensity differences are removed for consistent theming
    return 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]';
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
        <Card className="p-6 card-theme">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </div>
              <Input
                type="text"
                placeholder="Rechercher par nom, description, unité..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg input-theme"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedFilter(option.value as 'all' | 'active' | 'inactive' | 'products' | 'services')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedFilter === option.value
                      ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-700)] border-2 border-[var(--color-accent-200)]'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent'
                  }`}
                >
                  <span className="inline-flex">{option.icon}</span>
                  <span>{option.label}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    selectedFilter === option.value
                      ? 'bg-[var(--color-accent-200)] text-[var(--color-accent-800)]'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                  }`}>
                    {option.count}
                  </span>
                </button>
              ))}
            </div>

            {/* View Mode, Sort and Results Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* View Mode */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[var(--color-text-secondary)]">Affichage :</span>
                  <div className="flex bg-[var(--color-bg-secondary)] rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 rounded text-sm ${
                        viewMode === 'grid'
                          ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      <span className="inline-flex items-center space-x-1"><LayoutGrid className="w-4 h-4" /><span>Grille</span></span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 rounded text-sm ${
                        viewMode === 'list'
                          ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      <span className="inline-flex items-center space-x-1"><List className="w-4 h-4" /><span>Liste</span></span>
                    </button>
                  </div>
                </div>

                {/* Sort Options */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[var(--color-text-secondary)]">Trier :</span>
                  <div className="flex space-x-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as 'name' | 'price' | 'created')}
                        className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                          sortBy === option.value
                            ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-700)]'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        <span className="inline-flex">{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-3 py-1 rounded-full">
                <span className="font-medium">{filteredProducts.length}</span> produit{filteredProducts.length !== 1 ? 's' : ''}
                {searchQuery && ' trouvé' + (filteredProducts.length !== 1 ? 's' : '')}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-12 text-center card-theme">
            <div className="text-8xl mb-6">
              {searchQuery || selectedFilter !== 'all' ? <Search className="w-16 h-16 mx-auto" /> : <Package className="w-16 h-16 mx-auto" />}
            </div>
          
          {searchQuery || selectedFilter !== 'all' ? (
            <>
              <h3 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-3">
                Aucun produit trouvé
              </h3>
              <p className="text-[var(--color-text-secondary)] mb-8 text-lg">
                Aucun produit ne correspond à vos critères de recherche.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                }}
                variant="secondary"
                className="text-lg px-6 py-3"
              >
                <span className="inline-flex items-center space-x-2"><Trash2 className="w-4 h-4" /><span>Effacer les filtres</span></span>
              </Button>
            </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">
                  Votre catalogue est vide
                </h3>
                <p className="text-slate-600 mb-8 text-lg">
                  Commencez par ajouter vos produits et services pour créer votre catalogue.
                </p>
                {onCreateNew && (
                  <Button
                    onClick={onCreateNew}
                    variant="primary"
                    className="text-lg px-8 py-4"
                  >
                    <span className="inline-flex items-center space-x-2"><Copy className="w-4 h-4" /><span>Ajouter mon premier produit</span></span>
                  </Button>
                )}
              </>
            )}
          </Card>
        </motion.div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  <Card
                    className={`p-6 card-theme hover:shadow-xl transition-all duration-200 ${!product.isActive ? 'opacity-75' : 'hover:-translate-y-1'}`}
                  >
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center text-[var(--color-text-secondary)]">
                        {getProductIcon(product)}
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">{product.name}</h3>
                          {!product.isActive && (<span className="px-2 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs rounded-full">Inactif</span>)}
                        </div>
                        <div className="flex items-center justify-center space-x-2 text-sm text-[var(--color-text-secondary)] mb-2">
                          <span>{getProductType(product)}</span><span>•</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getTvaColor()}`}>TVA {product.tvaRate}%</span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-[var(--color-text-secondary)] mb-2 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-center space-x-1">
                          <span className="text-2xl font-bold text-[var(--color-text-primary)]">{formatPrice(product.unitPrice)}</span>
                          <span className="text-[var(--color-text-secondary)]">/ {product.unit}</span>
                        </div>
                      </div>
                      <div className="flex justify-center space-x-2 pt-4 border-t border-[var(--color-border-primary)]">
                        {onEdit && (<Button onClick={() => onEdit(product.id)} variant="secondary" size="sm" className="text-xs"><span className="inline-flex items-center space-x-1"><Pencil className="w-4 h-4" /><span>Modifier</span></span></Button>)}
                        {onDuplicate && (<Button onClick={() => onDuplicate(product.id)} variant="secondary" size="sm" className="text-xs"><span className="inline-flex items-center space-x-1"><Copy className="w-4 h-4" /><span>Dupliquer</span></span></Button>)}
                        {onDelete && (<Button onClick={() => onDelete(product.id)} variant="danger" size="sm" className="text-xs"><Trash2 className="w-4 h-4" /></Button>)}
                      </div>
                    </div>
                  </Card>
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

      {/* Speed-dial Floating Action Button */}
      {(onCreateNew || onOpenImport || onExport) && (
        <>
          {fabOpen && (
            <div className="fixed inset-0 z-30 bg-black/10" onClick={() => setFabOpen(false)} />
          )}

          <div className="fixed bottom-6 right-3 sm:right-4 md:right-5 z-40 flex flex-col items-end gap-3">
            {/* Exporter */}
            {onExport && (
              <button
                onClick={() => { onExport(); setFabOpen(false); }}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label="Exporter le catalogue"
                title="Exporter le catalogue"
              >
                <Download className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Exporter</span>
              </button>
            )}

            {/* Importer CSV */}
            {onOpenImport && (
              <button
                onClick={() => { onOpenImport(); setFabOpen(false); }}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label="Importer CSV"
                title="Importer CSV"
              >
                <Upload className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Importer CSV</span>
              </button>
            )}

            {/* Nouveau produit */}
            {onCreateNew && (
              <button
                onClick={() => { onCreateNew(); setFabOpen(false); }}
                className={`h-10 px-3 rounded-full shadow-md flex items-center gap-2 transition-all origin-bottom-right
                           ${fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                           btn-theme-primary`}
                aria-label="Nouveau produit"
                title="Nouveau produit"
              >
                <Plus className="w-4 h-4 hidden sm:inline-block" />
                <span className="text-sm">Nouveau</span>
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
    </div>
  );
};
