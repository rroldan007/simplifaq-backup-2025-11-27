import React, { useState, useRef } from 'react';

interface FloatingLabelInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  error?: string;
}

export function FloatingLabelInput({
  label,
  value,
  error,
  className = '',
  onFocus,
  onBlur,
  ...props
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Determine if label should float (input has value or is focused)
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const shouldFloat = isFocused || hasValue;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleLabelClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          w-full px-4 border-2 rounded-lg transition-all duration-200 bg-white
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'}
          focus:outline-none focus:ring-2 focus:border-transparent
          pt-5 pb-2
          ${className}
        `}
        placeholder=""
        {...props}
      />
      <label
        onClick={handleLabelClick}
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none bg-white px-1
          ${shouldFloat 
            ? '-top-2 text-xs font-medium' 
            : 'top-3.5 text-sm'}
          ${isFocused 
            ? 'text-blue-600' 
            : shouldFloat 
              ? 'text-slate-600' 
              : 'text-slate-400'}
        `}
      >
        {label}
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
