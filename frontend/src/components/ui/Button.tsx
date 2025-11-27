import React from 'react';
import { cn } from '../../utils/cn';

// Types pour les variantes de bouton
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// Styles pour les variantes (pilotés por variables CSS del tema)
// Notas:
// - Usamos valores arbitrarios de Tailwind para mapear a variables CSS.
// - Esto asegura coherencia en light/dark sin necesitar overrides específicos.
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary-600)] text-[var(--color-text-inverse)] border border-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] hover:border-[var(--color-primary-700)] focus:ring-[var(--color-border-focus)] shadow-sm',
  secondary:
    'bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-secondary)] focus:ring-[var(--color-border-focus)]',
  success:
    'bg-[var(--color-success-600)] text-[var(--color-text-inverse)] border border-[var(--color-success-600)] hover:bg-[var(--color-success-700)] focus:ring-[var(--color-success-600)] shadow-sm',
  outline:
    'border border-[var(--color-border-primary)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] focus:ring-[var(--color-border-focus)]',
  ghost:
    'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] focus:ring-[var(--color-border-secondary)]',
  danger:
    'bg-[var(--color-error-600)] text-[var(--color-text-inverse)] border border-[var(--color-error-600)] hover:bg-[var(--color-error-700)] focus:ring-[var(--color-error-600)] shadow-sm',
};

// Styles pour les tailles
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

// Composant Spinner pour le loading
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
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

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const effectiveLoading = typeof loading === 'boolean' ? loading : isLoading;
  const isDisabled = disabled || effectiveLoading;

  return (
    <button
      className={cn(
        // Styles de base
        'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Styles de variante
        variantStyles[variant],
        
        // Styles de taille
        sizeStyles[size],
        
        // Largeur complète
        fullWidth && 'w-full',
        
        // Classes personnalisées
        className
      )}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {/* Icône de gauche ou spinner de loading */}
      {effectiveLoading ? (
        <Spinner className="w-4 h-4 mr-2" />
      ) : leftIcon ? (
        <span className="mr-2">{leftIcon}</span>
      ) : null}
      
      {/* Contenu du bouton */}
      {children}
      
      {/* Icône de droite */}
      {rightIcon && !effectiveLoading && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
}

// Composants de bouton spécialisés
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}

export function OutlineButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="outline" {...props} />;
}

export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="ghost" {...props} />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />;
}