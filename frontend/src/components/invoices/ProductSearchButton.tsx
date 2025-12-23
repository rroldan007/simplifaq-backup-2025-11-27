import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProducts } from '../../hooks/useProducts';
import { normalizeString } from '../../utils/textUtils';

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
  onAddNew?: (name: string, unit: string, isService: boolean) => void;
  // Optional: when parent just created a product, we can inject it to avoid stale cache
  createdProduct?: Product | null;
}

// Units for products (physical goods)
const PRODUCT_UNITS = [
  { value: 'piece', label: 'Pièce' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'liter', label: 'Litre' },
  { value: 'meter', label: 'Mètre' },
];

// Units for services (time-based or intangible)
const SERVICE_UNITS = [
  { value: 'hour', label: 'Heure' },
  { value: 'day', label: 'Jour' },
  { value: 'service', label: 'Forfait' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'project', label: 'Projet' },
];

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
  const [quickCreateUnit, setQuickCreateUnit] = useState('piece');
  const [quickCreateIsService, setQuickCreateIsService] = useState(false);
  const { searchProducts } = useProducts();
  const searchRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Accent/diacritic-insensitive normalizer
  const normalize = normalizeString;

  // Update dropdown position when opened or on scroll/resize
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;

        // Calculate width: on mobile use screen width minus padding, on desktop 500px
        const dropdownWidth = isMobile ? window.innerWidth - 32 : 500;

        // Calculate left position: align with button, but ensure it doesn't overflow screen
        let leftPos = rect.left;
        if (leftPos + dropdownWidth > window.innerWidth) {
          leftPos = window.innerWidth - dropdownWidth - 16;
        }
        if (leftPos < 16) {
          leftPos = 16;
        }

        setDropdownPosition({
          top: rect.bottom + 4,
          left: leftPos,
          width: dropdownWidth
        });
      }
    };

    updatePosition();

    if (isOpen) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        console.log('[ProductSearchButton] Click outside detected, closing dropdown');
        setIsOpen(false);
      }
    };

    // Add listener with a small delay to avoid immediate trigger on open
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue, searchProducts, onMatchCountChange, createdProduct]);

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const safeCurrentValue = currentValue || '';
    const hasQuery = safeCurrentValue.trim().length >= 2;
    // Always open dropdown if we have a query and either results or add-new capability
    const shouldOpen = hasQuery && (searchResults.length > 0 || !!onAddNew);

    console.log('[ProductSearchButton] Click:', {
      hasQuery,
      resultCount: searchResults.length,
      isOpen,
      currentValue: safeCurrentValue,
      shouldOpen,
      onAddNewPresent: !!onAddNew
    });

    if (shouldOpen) {
      // Calculate position immediately before opening
      if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        const dropdownWidth = isMobile ? window.innerWidth - 32 : 500;

        let leftPos = rect.left;
        if (leftPos + dropdownWidth > window.innerWidth) {
          leftPos = window.innerWidth - dropdownWidth - 16;
        }
        if (leftPos < 16) {
          leftPos = 16;
        }

        const position = {
          top: rect.bottom + 4,
          left: leftPos,
          width: dropdownWidth
        };

        console.log('[ProductSearchButton] Setting position:', position, 'Rect:', rect);
        setDropdownPosition(position);
      }

      setIsOpen(prev => !prev);
      console.log('[ProductSearchButton] Toggling dropdown');
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

  const safeCurrentValue = currentValue || '';
  const hasMatches = safeCurrentValue.trim().length >= 2 && searchResults.length > 0;
  const canShowDropdown = safeCurrentValue.trim().length >= 2 && (searchResults.length > 0 || !!onAddNew);

  // UI-side strict filtering: if any item matches all significant tokens as words, show only those
  const tokensSig = normalize(safeCurrentValue).split(' ').filter(t => t.length >= 2);
  const fullMatchesUI = tokensSig.length > 0
    ? searchResults.filter(p => {
      const words = normalize(`${p.name} ${p.description || ''} ${p.unit || ''}`).split(' ').filter(Boolean);
      return tokensSig.every(t => words.includes(t));
    })
    : [];
  const resultsToRender = fullMatchesUI.length > 0 ? fullMatchesUI : searchResults;
  const canQuickCreate = safeCurrentValue.trim().length >= 2 && !!onAddNew;

  console.log('[ProductSearchButton] Render:', {
    isOpen,
    hasMatches,
    canShowDropdown,
    shouldRenderDropdown: isOpen && canShowDropdown,
    resultsToRender: resultsToRender.length,
    dropdownPosition
  });

  const dropdownContent = isOpen && canShowDropdown && (
    <div
      ref={searchRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        maxHeight: 'calc(100vh - 120px)',
        zIndex: 2147483647 // Max z-index to ensure visibility
      }}
      className="bg-white border border-slate-200 rounded-lg shadow-2xl flex flex-col"
    >
      <div className="p-2 border-b border-slate-200 flex-shrink-0">
        <div className="text-sm text-slate-600">
          {resultsToRender.length} correspondance(s) pour "{safeCurrentValue}" :
        </div>
      </div>

      <div className="overflow-y-auto flex-shrink-1">
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
      {onAddNew && safeCurrentValue.trim().length >= 2 && (
        <div className="p-3 border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white flex-shrink-0">
          {/* Type toggle: Produit / Service */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setQuickCreateIsService(false);
                setQuickCreateUnit('piece'); // Reset to default product unit
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                !quickCreateIsService
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span>📦</span>
              <span>Produit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickCreateIsService(true);
                setQuickCreateUnit('hour'); // Reset to default service unit
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                quickCreateIsService
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span>💼</span>
              <span>Service</span>
            </button>
          </div>
          
          {/* Unit selector - different options for products vs services */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {quickCreateIsService ? 'Unité de temps' : 'Unité de mesure'}
            </label>
            <select
              value={quickCreateUnit}
              onChange={(e) => setQuickCreateUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              {(quickCreateIsService ? SERVICE_UNITS : PRODUCT_UNITS).map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Create button */}
          <button
            type="button"
            className="w-full py-2.5 px-3 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreating}
            onClick={async () => {
              setIsCreating(true);
              setIsOpen(false);
              try {
                await onAddNew(currentValue.trim(), quickCreateUnit, quickCreateIsService);
                setTimeout(() => setIsCreating(false), 800);
              } catch {
                setIsCreating(false);
              }
            }}
            title={`Créer un nouveau ${quickCreateIsService ? 'service' : 'produit'} "${safeCurrentValue.trim()}"`}
          >
            {isCreating ? '⏳ Création...' : `➕ Créer "${safeCurrentValue.trim()}" (${(quickCreateIsService ? SERVICE_UNITS : PRODUCT_UNITS).find(u => u.value === quickCreateUnit)?.label || quickCreateUnit})`}
          </button>
          <div className="mt-2 text-xs text-slate-400 text-center">Échap pour fermer</div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isCreating || (!hasMatches && !canQuickCreate)}
        className={`min-w-[2.5rem] h-10 px-2 text-sm font-medium rounded-md transition-colors ${isCreating
          ? 'bg-green-200 text-green-800 border border-green-400 animate-pulse'
          : hasMatches
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
            : isSearching
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              : searchResults.length === 0 && safeCurrentValue.trim().length >= 2
                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                : 'bg-slate-100 text-slate-500 border border-slate-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={getButtonTitle()}
      >
        {getButtonContent()}
      </button>
      {dropdownContent && (typeof document !== 'undefined' && document.body ? createPortal(dropdownContent, document.body) : dropdownContent)}
    </>
  );
}
