import React, { useState, useMemo } from 'react';
import { ProductCard } from './ProductCard';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

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

interface ProductListProps {
  products: Product[];
  loading?: boolean;
  error?: string | null;
  onView?: (productId: string) => void;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  onDuplicate?: (productId: string) => void;
  onCreateNew?: () => void;
  currency?: string;
}

type ProductFilter = 'all' | 'active' | 'inactive';
type TvaFilter = 'all' | '0' | '2.6' | '3.8' | '8.1';
type SortBy = 'name' | 'price' | 'tva' | 'unit' | 'created';

export function ProductList({
  products,
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onCreateNew,
  currency = 'CHF'
}: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ProductFilter>('all');
  const [selectedTvaFilter, setSelectedTvaFilter] = useState<TvaFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by status
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(product => product.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(product => !product.isActive);
        break;
    }

    // Filter by TVA rate
    if (selectedTvaFilter !== 'all') {
      const tvaRate = parseFloat(selectedTvaFilter);
      filtered = filtered.filter(product => product.tvaRate === tvaRate);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query)) ||
        product.unit.toLowerCase().includes(query)
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.unitPrice - b.unitPrice;
          break;
        case 'tva':
          comparison = a.tvaRate - b.tvaRate;
          break;
        case 'unit':
          comparison = a.unit.localeCompare(b.unit);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [products, searchQuery, selectedFilter, selectedTvaFilter, sortBy, sortOrder]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      all: products.length,
      active: products.filter(p => p.isActive).length,
      inactive: products.filter(p => !p.isActive).length
    };
  }, [products]);

  // Calculate TVA filter counts
  const tvaFilterCounts = useMemo(() => {
    return {
      all: products.length,
      '0': products.filter(p => p.tvaRate === 0).length,
      '2.6': products.filter(p => p.tvaRate === 2.6).length,
      '3.8': products.filter(p => p.tvaRate === 3.8).length,
      '8.1': products.filter(p => p.tvaRate === 8.1).length
    };
  }, [products]);

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortBy) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↗️' : '↘️';
  };

  const statusFilterOptions = [
    { value: 'all' as const, label: 'Tous les produits', count: filterCounts.all },
    { value: 'active' as const, label: 'Actifs', count: filterCounts.active },
    { value: 'inactive' as const, label: 'Inactifs', count: filterCounts.inactive }
  ];

  const tvaFilterOptions = [
    { value: 'all' as const, label: 'Tous les taux', count: tvaFilterCounts.all },
    { value: '0' as const, label: '0% (Exonéré)', count: tvaFilterCounts['0'] },
    { value: '2.6' as const, label: '2.6% (Réduit)', count: tvaFilterCounts['2.6'] },
    { value: '3.8' as const, label: '3.8% (Réduit spécial)', count: tvaFilterCounts['3.8'] },
    { value: '8.1' as const, label: '8.1% (Normal)', count: tvaFilterCounts['8.1'] }
  ];

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--color-bg-secondary)]">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
          Erreur de chargement
        </h3>
        <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-theme-primary"
        >
          Réessayer
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Produits et services</h1>
          <p className="text-[var(--color-text-secondary)]">
            Gérez votre catalogue de produits et services
          </p>
        </div>
        
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center btn-theme-primary"
          >
            <span className="mr-2">➕</span>
            Nouveau produit
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-[var(--color-text-tertiary)] text-sm">🔍</span>
        </div>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, description ou unité..."
          className="pl-10"
        />
      </div>

      {/* Filtres par statut */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Statut</h3>
        <div className="flex flex-wrap gap-2">
          {statusFilterOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFilter === option.value
                  ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border border-[var(--color-primary-200)]'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-primary)]'
              }`}
            >
              {option.label}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                selectedFilter === option.value
                  ? 'bg-[var(--color-primary-200)] text-[var(--color-primary-800)]'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }`}>
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtres par taux TVA */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Taux de TVA</h3>
        <div className="flex flex-wrap gap-2">
          {tvaFilterOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setSelectedTvaFilter(option.value)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTvaFilter === option.value
                  ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border border-[var(--color-primary-200)]'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-primary)]'
              }`}
            >
              {option.label}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                selectedTvaFilter === option.value
                  ? 'bg-[var(--color-primary-200)] text-[var(--color-primary-800)]'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }`}>
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Options de tri */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-[var(--color-text-secondary)]">Trier par :</span>
          <div className="flex space-x-2">
            {[
              { key: 'name' as const, label: 'Nom' },
              { key: 'price' as const, label: 'Prix' },
              { key: 'tva' as const, label: 'TVA' },
              { key: 'unit' as const, label: 'Unité' },
              { key: 'created' as const, label: 'Date création' }
            ].map(({ key, label }) => (
              <button
                type="button"
                key={key}
                onClick={() => handleSort(key)}
                className={`inline-flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                  sortBy === key
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                {label}
                <span className="ml-1">{getSortIcon(key)}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-sm text-[var(--color-text-secondary)]">
          {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
          {searchQuery && ` trouvé${filteredProducts.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Liste des produits */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--color-bg-secondary)]">
            <span className="text-3xl">📦</span>
          </div>
          
          {searchQuery || selectedFilter !== 'all' || selectedTvaFilter !== 'all' ? (
            <>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Aucun produit trouvé
              </h3>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Aucun produit ne correspond à vos critères de recherche.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                  setSelectedTvaFilter('all');
                }}
                className="px-4 py-2 rounded-lg transition-colors bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-primary)]"
              >
                Effacer les filtres
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                Aucun produit
              </h3>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Vous n'avez pas encore ajouté de produits ou services.
              </p>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="px-6 py-3 font-medium rounded-lg btn-theme-primary"
                >
                  Ajouter votre premier produit
                </button>
              )}
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              currency={currency}
            />
          ))}
        </div>
      )}
    </div>
  );
}