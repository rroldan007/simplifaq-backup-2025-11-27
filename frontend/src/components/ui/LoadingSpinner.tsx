import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

// Styles pour les tailles
const sizeStyles = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

// Styles pour les couleurs
const colorStyles = {
  primary: 'text-blue-600',
  white: 'text-white',
  gray: 'text-gray-400',
};

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  className,
}: LoadingSpinnerProps) {
  return (
    <svg
      className={cn(
        'animate-spin',
        sizeStyles[size],
        colorStyles[color],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Composant de chargement avec texte
interface LoadingWithTextProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingWithText({
  text = 'Chargement...',
  size = 'md',
  className,
}: LoadingWithTextProps) {
  const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
      <LoadingSpinner size={spinnerSize} />
      <p className={cn('text-gray-600 font-medium', textSize)}>{text}</p>
    </div>
  );
}

// Composant de chargement en ligne
interface InlineLoadingProps {
  text?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function InlineLoading({
  text = 'Chargement...',
  size = 'sm',
  className,
}: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <LoadingSpinner size={size} />
      <span className="text-gray-600 text-sm">{text}</span>
    </div>
  );
}

// Composant de chargement pour les boutons
interface ButtonLoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
}

export function ButtonLoading({ size = 'sm', color = 'white' }: ButtonLoadingProps) {
  return <LoadingSpinner size={size} color={color} />;
}

// Composant de chargement pleine page
interface FullPageLoadingProps {
  text?: string;
  className?: string;
}

export function FullPageLoading({
  text = 'Chargement de l\'application...',
  className,
}: FullPageLoadingProps) {
  return (
    <div className={cn(
      'fixed inset-0 bg-white flex items-center justify-center z-50',
      className
    )}>
      <div className="text-center">
        <div className="mb-4">
          <LoadingSpinner size="xl" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Simplifaq</h2>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
}

// Composant de chargement pour les cartes/sections
interface SectionLoadingProps {
  lines?: number;
  className?: string;
}

export function SectionLoading({ lines = 3, className }: SectionLoadingProps) {
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

// Composant de chargement pour les tableaux
interface TableLoadingProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableLoading({ rows = 5, columns = 4, className }: TableLoadingProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="space-y-3">
        {/* En-tête du tableau */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-4 bg-gray-300 rounded"></div>
          ))}
        </div>
        
        {/* Lignes du tableau */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook useLoading déplacé vers src/hooks/useLoading.ts pour respecter Fast Refresh