import React, { useState, useEffect, useRef } from 'react';
import { useProducts } from '../../hooks/useProducts';

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

interface ProductSearchButtonProps {
  currentValue: string;
  onProductSelect: (product: Product) => void;
  onMatchCountChange?: (count: number) => void;
  disabled?: boolean;
  onAddNew?: (name: string) => void;
  // Optional: when parent just created a product, we can inject it to avoid stale cache
  createdProduct?: Product | null;
}

export function ProductSearchButton({ 
  currentValue, 
  onProductSelect, 
  onMatchCountChange,
  disabled = false,
  onAddNew,
  createdProduct = null,
}: ProductSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { searchProducts } = useProducts();
  const searchRef = useRef<HTMLDivElement>(null);

  // Accent/diacritic-insensitive normalizer (mirrors hooks/useProducts.ts)
  const normalize = (s: string): string => {
    try {
      return s
        .normalize('NFKD')
        .replace(/[œŒ]/g, 'oe')
        .replace(/[æÆ]/g, 'ae')
        .replace(/ß/g, 'ss')
        .replace(/[’‘`´']/g, ' ')
        .replace(/[–—]/g, '-')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9%\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return s.toLowerCase();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search products when currentValue changes
  useEffect(() => {
    const performSearch = async () => {
      if (currentValue.trim().length < 2) {
        setSearchResults([]);
        onMatchCountChange?.(0);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchProducts(currentValue, 10);
        // If backend/cache doesn't yet include a newly created product, inject it when it matches
        let finalResults = results;
        const q = normalize(currentValue.trim());
        if (createdProduct && createdProduct.name) {
          const normalizedProductName = normalize(createdProduct.name.trim());
          // Inject if the search query matches the product name (partial match)
          const matches = normalizedProductName.includes(q) || q.split(' ').every(word => 
            word.length > 0 && normalizedProductName.includes(word)
          );
          if (matches) {
            const exists = results.some(r => r.id === createdProduct!.id);
            if (!exists) {
              finalResults = [createdProduct, ...results];
            }
          }
        }
        setSearchResults(finalResults);
        onMatchCountChange?.(finalResults.length);
      } catch (error) {
        console.error('Error searching products:', error);
        setSearchResults([]);
        onMatchCountChange?.(0);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [currentValue, searchProducts, onMatchCountChange, createdProduct]);

  const handleButtonClick = async () => {
    const hasQuery = currentValue.trim().length >= 2;
    const hasResults = searchResults.length > 0;
    if (hasQuery && hasResults) {
      setIsOpen(true);
      return;
    }
    // Quick-create when no suggestions and handler provided
    if (hasQuery && !hasResults && onAddNew) {
      setIsCreating(true);
      try {
        await onAddNew(currentValue.trim());
        // Show success state briefly
        setTimeout(() => setIsCreating(false), 800);
      } catch (e) {
        setIsCreating(false);
      }
    }
  };

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getButtonContent = () => {
    if (isCreating) {
      return '⏳';
    }
    
    if (isSearching) {
      return '🔍';
    }
    
    if (currentValue.trim().length < 2) {
      return '📦';
    }
    
    if (searchResults.length === 0) {
      return '➕';
    }
    
    return searchResults.length.toString();
  };

  const getButtonTitle = () => {
    if (isCreating) {
      return 'Création du produit en cours...';
    }
    
    if (isSearching) {
      return 'Recherche de produits...';
    }
    
    if (currentValue.trim().length < 2) {
      return 'Tapez au moins 2 caractères pour rechercher des produits';
    }
    
    if (searchResults.length === 0) {
      return 'Cliquez pour créer comme nouveau produit';
    }
    
    return `${searchResults.length} correspondances trouvées - Cliquez pour voir`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(price);
  };

  const canShowResults = currentValue.trim().length >= 2 && searchResults.length > 0;

  // UI-side strict filtering: if any item matches all significant tokens as words, show only those
  const tokensSig = normalize(currentValue).split(' ').filter(t => t.length >= 2);
  const fullMatchesUI = tokensSig.length > 0
    ? searchResults.filter(p => {
        const words = normalize(`${p.name} ${p.description || ''} ${p.unit || ''}`).split(' ').filter(Boolean);
        return tokensSig.every(t => words.includes(t));
      })
    : [];
  const resultsToRender = fullMatchesUI.length > 0 ? fullMatchesUI : searchResults;
  const canQuickCreate = currentValue.trim().length >= 2 && searchResults.length === 0 && !!onAddNew;

  return (
    <div className="relative" ref={searchRef}>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isCreating || (!canShowResults && !canQuickCreate)}
        className={`min-w-[2.5rem] h-10 px-2 text-sm font-medium rounded-md transition-colors ${
          isCreating
            ? 'bg-green-200 text-green-800 border border-green-400 animate-pulse'
            : canShowResults 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' 
            : isSearching
            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            : searchResults.length === 0 && currentValue.trim().length >= 2
            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
            : 'bg-slate-100 text-slate-500 border border-slate-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={getButtonTitle()}
      >
        {getButtonContent()}
      </button>

      {isOpen && canShowResults && (
        <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-slate-200">
            <div className="text-sm text-slate-600">
              {resultsToRender.length} correspondance(s) pour "{currentValue}" :
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {resultsToRender.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleProductSelect(product)}
                className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                onKeyDown={handleKeyDown}
              >
                <div className="font-medium text-slate-900">{product.name}</div>
                {product.description && (
                  <div className="text-sm text-slate-600 mt-1">{product.description}</div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-green-600">
                    {formatPrice(product.unitPrice)} / {product.unit}
                  </span>
                  <span className="text-xs text-slate-500">
                    TVA {product.tvaRate}%
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Quick-create action even when there are matches */}
          {onAddNew && currentValue.trim().length >= 2 && (
            <div className="p-2 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                className="w-full py-2 px-3 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCreating}
                onClick={async () => { 
                  setIsCreating(true);
                  setIsOpen(false);
                  try {
                    await onAddNew(currentValue.trim());
                    setTimeout(() => setIsCreating(false), 800);
                  } catch (e) {
                    setIsCreating(false);
                  }
                }}
                title={`Créer un nouveau produit "${currentValue.trim()}"`}
              >
                {isCreating ? '⏳ Création...' : `➕ Créer un nouveau produit "${currentValue.trim()}"`}
              </button>
              <div className="mt-1 text-xs text-slate-500 text-center">Appuyez sur Échap pour fermer</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
