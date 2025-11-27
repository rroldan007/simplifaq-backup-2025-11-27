import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';

interface SearchBarProps {
  placeholder?: string;
  // New optional controlled props for compatibility with existing usage
  value?: string;
  onChange?: (value: string) => void;
  // Keep onSearch but make it optional to avoid runtime errors
  onSearch?: (query: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchBar({ 
  placeholder = "Rechercher des factures...", 
  value,
  onChange,
  onSearch, 
  debounceMs = 300,
  className = ""
}: SearchBarProps) {
  // Support controlled and uncontrolled modes
  const [internalQuery, setInternalQuery] = useState(value ?? '');
  const query = value !== undefined ? value : internalQuery;

  useEffect(() => {
    // Debounce search callback if provided
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(query);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, onSearch, debounceMs]);

  const handleClear = () => {
    if (onChange) onChange('');
    if (value === undefined) setInternalQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-slate-400 text-sm">🔍</span>
        </div>
        
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            onChange?.(e.target.value);
            if (value === undefined) setInternalQuery(e.target.value);
          }}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="text-sm">✕</span>
          </button>
        )}
      </div>
      
      {query && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-slate-500">
          Recherche : "{query}"
        </div>
      )}
    </div>
  );
}