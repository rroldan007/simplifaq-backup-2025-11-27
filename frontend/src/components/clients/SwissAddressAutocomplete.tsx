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
  placeholder = 'Rue et numéro (Suisse)',
  value = '',
  error,
  onChange,
  onAddressSelected,
  nativeInput,
}: SwissAddressAutocompleteProps & { nativeInput?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userHasSelected, setUserHasSelected] = useState(false);
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

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setOpen(false);
    setItems([]);
    setErrorText(null);
  }, []);

  // Fetch suggestions
  useEffect(() => {
    // Don't fetch if user just selected an address
    if (userHasSelected) {
      setUserHasSelected(false);
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
  }, [debouncedQuery, userHasSelected, closeDropdown]);

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
    onChange?.(newValue);
    setUserHasSelected(false);
    
    // Only open if we have enough characters
    if (newValue.trim().length >= 3) {
      setOpen(true);
    } else {
      closeDropdown();
    }
  };

  const handleInputFocus = () => {
    // Only open if we have results and enough characters
    if (items.length > 0 && value.trim().length >= 3) {
      setOpen(true);
    }
  };

  const handleAddressSelect = (item: GeoResult) => {
    const addr = parseAddress(item);
    setUserHasSelected(true);
    onChange?.(addr.street);
    onAddressSelected?.(addr);
    closeDropdown();
    
    // Remove focus from input
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="autocomplete">
      {label && <label className="block text-sm text-slate-600 mb-1">{label}</label>}
      {nativeInput ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border rounded px-3 py-2"
        />
      ) : (
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          error={error}
          autoComplete="off"
        />
      )}
      {open && (items.length > 0 || loading || errorText) && (
        <div className="autocomplete__panel">
          {loading && (
            <div className="autocomplete__item autocomplete__item--disabled">
              <span className="inline-block animate-spin mr-2">⟳</span>
              Recherche en cours…
            </div>
          )}
          {!loading && items.length > 0 && items.map((it, idx) => {
            const attrs = it?.attrs || {};
            const labelTxt = [attrs.street, attrs.number, attrs.zip, attrs.city].filter(Boolean).join(' ');
            return (
              <button
                key={idx}
                type="button"
                className="autocomplete__item"
                onMouseDown={(e) => {
                  // Prevent input blur before click
                  e.preventDefault();
                }}
                onClick={() => handleAddressSelect(it)}
              >
                <div className="font-medium text-gray-900">{labelTxt}</div>
                {attrs.canton && (
                  <div className="text-xs text-gray-500 mt-0.5">{attrs.canton}, Suisse</div>
                )}
              </button>
            );
          })}
          {!loading && items.length === 0 && errorText && (
            <div className="autocomplete__item autocomplete__item--disabled">
              {errorText}
            </div>
          )}
        </div>
      )}
      <small className="block mt-1 text-xs text-gray-500">
        Tapez au moins 3 caractères pour rechercher une adresse suisse
      </small>
    </div>
  );
}
