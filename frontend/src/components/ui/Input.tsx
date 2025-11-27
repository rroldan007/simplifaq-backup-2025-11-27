import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

// Types pour les variantes d'input
type InputVariant = 'default' | 'error' | 'success';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// Styles pour les variantes
const variantStyles: Record<InputVariant, string> = {
  default: 'focus:border-blue-500 focus:ring-blue-500',
  error: 'focus:border-red-500 focus:ring-red-500',
  success: 'focus:border-green-500 focus:ring-green-500',
};

// Styles pour les tailles
const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    variant = 'default',
    size = 'md',
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);
    const actualVariant = hasError ? 'error' : variant;

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary mb-1"
          >
            {label}
          </label>
        )}

        {/* Container pour l'input avec icônes */}
        <div className="relative">
          {/* Icône de gauche */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{leftIcon}</span>
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Styles de base
              'block w-full rounded-md border shadow-sm transition-colors duration-200 input-theme',
              'focus:outline-none focus:ring-1',
              'disabled:cursor-not-allowed',
              
              // Styles de variante
              variantStyles[actualVariant],
              
              // Styles de taille
              sizeStyles[size],
              
              // Padding pour les icônes
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              
              // Classes personnalisées
              className
            )}
            {...props}
          />

          {/* Icône de droite */}
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{rightIcon}</span>
            </div>
          )}
        </div>

        {/* Message d'erreur ou texte d'aide */}
        {(error || helperText) && (
          <p className={cn(
            'mt-1 text-xs',
            hasError ? 'text-red-600' : 'text-secondary'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Composants d'input spécialisés
interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export function PasswordInput({
  showPassword = false,
  onTogglePassword,
  ...props
}: PasswordInputProps) {
  return (
    <Input
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="text-gray-400 hover:text-gray-600 focus:outline-none pointer-events-auto"
          >
            {showPassword ? (
              <EyeOffIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </button>
        )
      }
      {...props}
    />
  );
}

// Icônes pour le mot de passe
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
      />
    </svg>
  );
}