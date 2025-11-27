import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Plus, TrendingUp, Clock, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Product {
  id: string;
  name: string;
  unitPrice: number;
  tvaRate: number;
  score?: number;
  exactMatches?: number;
}

interface EnhancedProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: Product[];
  onSelectProduct: (product: Product) => void;
  currency?: string;
  placeholder?: string;
  recentProducts?: Product[];
  popularProducts?: Product[];
  autoFocus?: boolean;
}

export function EnhancedProductSearch({
  value,
  onChange,
  suggestions,
  onSelectProduct,
  currency = 'CHF',
  placeholder = 'Rechercher un produit ou service...',
  recentProducts = [],
  popularProducts = [],
  autoFocus = false
}: EnhancedProductSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showSuggestions = isFocused && (value.length > 0 || recentProducts.length > 0 || popularProducts.length > 0);
  const hasSuggestions = suggestions.length > 0;
  const showRecent = !value && recentProducts.length > 0;
  const showPopular = !value && !showRecent && popularProducts.length > 0;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions) return;

      const currentList = hasSuggestions ? suggestions : (showRecent ? recentProducts : popularProducts);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % currentList.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + currentList.length) % currentList.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (currentList[selectedIndex]) {
            onSelectProduct(currentList[selectedIndex]);
            onChange('');
            setSelectedIndex(0);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsFocused(false);
          inputRef.current?.blur();
          break;
      }
    };

    if (isFocused) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFocused, showSuggestions, suggestions, recentProducts, popularProducts, selectedIndex, onSelectProduct, onChange]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions, value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency 
    }).format(price);
  };

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    onChange('');
    setIsFocused(false);
    setSelectedIndex(0);
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
          <Search className="w-5 h-5" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full pl-10 pr-10 py-3 rounded-lg',
            'border-2 transition-all duration-200',
            'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
            'placeholder-[var(--color-text-tertiary)]',
            'focus:outline-none',
            isFocused
              ? 'border-[var(--color-primary-600)] ring-4 ring-[var(--color-primary-600)]/10'
              : 'border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)]'
          )}
        />

        {/* Clear button */}
        {value && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}

        {/* Search hint */}
        {isFocused && !value && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded border border-[var(--color-border-primary)]">
              ↵ Entrée pour sélectionner
            </span>
          </motion.div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 w-full max-h-[400px] overflow-auto rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] shadow-2xl"
          >
            {/* Search Results */}
            {hasSuggestions && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                  Résultats de recherche
                </div>
                {suggestions.map((product, idx) => (
                  <motion.button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-150',
                      'group relative overflow-hidden',
                      selectedIndex === idx
                        ? 'bg-[var(--color-primary-600)] text-white shadow-md'
                        : 'hover:bg-[var(--color-bg-secondary)]'
                    )}
                  >
                    {/* Highlight bar for selected item */}
                    {selectedIndex === idx && (
                      <motion.div
                        layoutId="selectedHighlight"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-white"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}

                    <div className="flex items-center gap-3 flex-1 min-w-0 ml-2">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        selectedIndex === idx
                          ? 'bg-white/20'
                          : 'bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-primary-600)]/10'
                      )}>
                        <Package className={cn(
                          'w-5 h-5',
                          selectedIndex === idx ? 'text-white' : 'text-[var(--color-text-tertiary)]'
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'font-medium truncate',
                          selectedIndex === idx ? 'text-white' : 'text-[var(--color-text-primary)]'
                        )}>
                          {product.name}
                        </div>
                        <div className={cn(
                          'text-sm flex items-center gap-2',
                          selectedIndex === idx ? 'text-white/80' : 'text-[var(--color-text-tertiary)]'
                        )}>
                          <span>TVA {product.tvaRate}%</span>
                          {product.score && product.score > 0.8 && (
                            <span className="text-xs">✨ Correspondance exacte</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      'text-right flex-shrink-0',
                      selectedIndex === idx ? 'text-white' : 'text-[var(--color-text-primary)]'
                    )}>
                      <div className="font-semibold">{formatPrice(product.unitPrice)}</div>
                      <div className={cn(
                        'text-xs',
                        selectedIndex === idx ? 'text-white/70' : 'text-[var(--color-text-tertiary)]'
                      )}>
                        Prix unitaire
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Recent Products */}
            {showRecent && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                  <Clock className="w-3 h-3" />
                  Produits récents
                </div>
                {recentProducts.slice(0, 5).map((product, idx) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                      selectedIndex === idx
                        ? 'bg-[var(--color-bg-secondary)]'
                        : 'hover:bg-[var(--color-bg-secondary)]'
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                      <span className="text-sm truncate text-[var(--color-text-primary)]">{product.name}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-secondary)] ml-2">
                      {formatPrice(product.unitPrice)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Products */}
            {showPopular && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                  <TrendingUp className="w-3 h-3" />
                  Produits populaires
                </div>
                {popularProducts.slice(0, 5).map((product, idx) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors',
                      selectedIndex === idx
                        ? 'bg-[var(--color-bg-secondary)]'
                        : 'hover:bg-[var(--color-bg-secondary)]'
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
                      <span className="text-sm truncate text-[var(--color-text-primary)]">{product.name}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-secondary)] ml-2">
                      {formatPrice(product.unitPrice)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {value && !hasSuggestions && (
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center">
                  <Search className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="text-[var(--color-text-secondary)] font-medium mb-1">
                  Aucun produit trouvé
                </p>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Essayez une autre recherche ou ajoutez un article manuellement
                </p>
              </div>
            )}

            {/* Quick Add Option */}
            {value && !hasSuggestions && (
              <div className="p-2 border-t border-[var(--color-border-primary)]">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-600)]/10 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-[var(--color-primary-600)]" />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      Ajouter "{value}" comme article
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      Créer un article personnalisé
                    </div>
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
