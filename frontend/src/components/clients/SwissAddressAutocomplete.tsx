import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '../ui/Input';

export type SwissAddress = {
  street: string;
  number?: string;
  postalCode?: string;
  city?: string;
  canton?: string;
  country?: string;
};

interface SwissAddressAutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: string;
  error?: string;
  onChange?: (value: string) => void;
  onAddressSelected?: (addr: SwissAddress) => void;
  floatingLabel?: boolean;
}

// Small debounce hook
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function SwissAddressAutocomplete({
  label = 'Rue et numéro *',
  placeholder,
  value = '',
  error,
  onChange,
  onAddressSelected,
  nativeInput,
  floatingLabel = false,
}: SwissAddressAutocompleteProps & { nativeInput?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  type GeoResultAttrs = {
    street?: string;
    number?: string;
    zip?: string;
    city?: string;
    canton?: string;
  };
  type GeoResult = { attrs?: GeoResultAttrs };
  const [items, setItems] = useState<GeoResult[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const debouncedQuery = useDebounced(value, 300);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Track when user just selected - use a ref to persist across renders
  const skipNextFetchRef = useRef(false);
  const selectedValueRef = useRef<string | null>(null);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setOpen(false);
    setItems([]);
    setErrorText(null);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    // Don't fetch if user just selected an address
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    
    // Don't fetch if value matches the last selected address
    if (selectedValueRef.current && value === selectedValueRef.current) {
      return;
    }

    // Clean query
    const query = debouncedQuery?.trim();
    
    // Close if query too short
    if (!query || query.length < 3) {
      closeDropdown();
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorText(null);
        
        const url = new URL('/api/geo/search', window.location.origin);
        url.searchParams.set('query', query);
        url.searchParams.set('lang', 'fr');
        url.searchParams.set('limit', '8');
        
        const res = await fetch(url.toString(), {
          signal: controller.signal
        });

        if (!res.ok) {
          throw new Error('Erreur de recherche');
        }

        const data = await res.json();
        
        if (!data?.success) {
          throw new Error(data?.error?.message || 'Erreur de recherche');
        }

        const results = Array.isArray(data.results) ? (data.results as GeoResult[]) : [];
        
        setItems(results);
        setOpen(results.length > 0);
        
        if (results.length === 0) {
          setErrorText('Aucun résultat trouvé');
        }
        
      } catch (err: unknown) {
        // Ignore abort errors
        const error = err as { name?: string; message?: string };
        if (error.name === 'AbortError') return;
        
        console.debug('SwissAddressAutocomplete fetch error', err);
        setItems([]);
        setErrorText(error.message || 'Erreur réseau');
        setOpen(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, closeDropdown, value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeDropdown]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        closeDropdown();
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, closeDropdown]);

  const parseAddress = (item: GeoResult): SwissAddress => {
    const attrs = item?.attrs || {};
    const street = [attrs?.street, attrs?.number].filter(Boolean).join(' ').trim();
    return {
      street,
      number: attrs?.number,
      postalCode: attrs?.zip,
      city: attrs?.city,
      canton: attrs?.canton,
      country: 'Suisse',
    };
  };

  const handleInputChange = (newValue: string) => {
    // Clear selected value when user types
    if (selectedValueRef.current && newValue !== selectedValueRef.current) {
      selectedValueRef.current = null;
    }
    
    onChange?.(newValue);
    
    // Only open if we have enough characters
    if (newValue.trim().length >= 3) {
      setOpen(true);
    } else {
      closeDropdown();
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    
    // Don't reopen if we just selected an address
    if (selectedValueRef.current && value === selectedValueRef.current) {
      return;
    }
    
    // Only open if we have results and enough characters
    if (items.length > 0 && value.trim().length >= 3) {
      setOpen(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
  };

  const handleAddressSelect = (item: GeoResult) => {
    const addr = parseAddress(item);
    
    // Mark that we just selected - skip next fetch
    skipNextFetchRef.current = true;
    selectedValueRef.current = addr.street;
    
    // Update the street field
    onChange?.(addr.street);
    
    // Notify parent to update all address fields
    onAddressSelected?.(addr);
    
    // Close dropdown immediately
    closeDropdown();
    
    // Remove focus from input
    inputRef.current?.blur();
  };

  // Floating label logic
  const shouldFloat = floatingLabel && (isFocused || value.length > 0);

  return (
    <div ref={containerRef} className="autocomplete relative">
      {floatingLabel ? (
        <div className="relative">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder=""
            autoComplete="off"
            className={`w-full px-4 pt-5 pb-2 border-2 rounded-lg transition-all duration-200 bg-white
              ${error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'}
              focus:outline-none focus:ring-2 focus:border-transparent`}
          />
          <label
            className={`absolute left-4 transition-all duration-200 pointer-events-none bg-white px-1
              ${shouldFloat 
                ? '-top-2 text-xs font-medium' 
                : 'top-3.5 text-sm'}
              ${isFocused 
                ? 'text-blue-600' 
                : shouldFloat 
                  ? 'text-slate-600' 
                  : 'text-slate-400'}`}
          >
            {label}
          </label>
        </div>
      ) : (
        <>
          {label && <label className="block text-sm text-slate-600 mb-1">{label}</label>}
          {nativeInput ? (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              autoComplete="off"
              className="w-full border-2 border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          ) : (
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              error={error}
              autoComplete="off"
            />
          )}
        </>
      )}
      {open && (items.length > 0 || loading || errorText) && (
        <div className="autocomplete__panel absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="autocomplete__item px-4 py-3 text-slate-500 flex items-center">
              <span className="inline-block animate-spin mr-2">⟳</span>
              Recherche en cours…
            </div>
          )}
          {!loading && items.length > 0 && items.map((it, idx) => {
            const attrs = it?.attrs || {};
            const streetPart = [attrs.street, attrs.number].filter(Boolean).join(' ');
            const locationPart = [attrs.zip, attrs.city].filter(Boolean).join(' ');
            return (
              <button
                key={idx}
                type="button"
                className="autocomplete__item w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                onMouseDown={(e) => {
                  // Prevent input blur before click
                  e.preventDefault();
                }}
                onClick={() => handleAddressSelect(it)}
              >
                <div className="font-medium text-gray-900">{streetPart}</div>
                <div className="text-sm text-gray-600">{locationPart}{attrs.canton ? `, ${attrs.canton}` : ''}</div>
              </button>
            );
          })}
          {!loading && items.length === 0 && errorText && (
            <div className="autocomplete__item px-4 py-3 text-slate-500">
              {errorText}
            </div>
          )}
        </div>
      )}
      {!floatingLabel && (
        <small className="block mt-1 text-xs text-gray-500">
          Tapez au moins 3 caractères pour rechercher une adresse suisse
        </small>
      )}
    </div>
  );
}
