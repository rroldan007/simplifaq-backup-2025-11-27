import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Styles pour les variantes
const variantStyles = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  outline: 'border border-gray-300 text-gray-700 bg-white',
  secondary: 'bg-gray-200 text-gray-700',
};

// Styles pour les tailles
const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// Badge avec icône
interface BadgeWithIconProps extends BadgeProps {
  icon: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function BadgeWithIcon({
  children,
  icon,
  iconPosition = 'left',
  ...props
}: BadgeWithIconProps) {
  return (
    <Badge {...props}>
      {iconPosition === 'left' && <span className="mr-1">{icon}</span>}
      {children}
      {iconPosition === 'right' && <span className="ml-1">{icon}</span>}
    </Badge>
  );
}

// Badge de statut pour les factures
interface InvoiceStatusBadgeProps {
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          variant: 'default' as const,
          label: 'Brouillon',
          icon: '📝',
        };
      case 'sent':
        return {
          variant: 'info' as const,
          label: 'Envoyée',
          icon: '📤',
        };
      case 'paid':
        return {
          variant: 'success' as const,
          label: 'Payée',
          icon: '✅',
        };
      case 'overdue':
        return {
          variant: 'error' as const,
          label: 'En retard',
          icon: '⚠️',
        };
      case 'cancelled':
        return {
          variant: 'outline' as const,
          label: 'Annulée',
          icon: '❌',
        };
      default:
        return {
          variant: 'default' as const,
          label: status,
          icon: '❓',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <BadgeWithIcon
      variant={config.variant}
      icon={config.icon}
      className={className}
    >
      {config.label}
    </BadgeWithIcon>
  );
}

// Badge de priorité
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'low':
        return {
          variant: 'default' as const,
          label: 'Faible',
          icon: '🔵',
        };
      case 'medium':
        return {
          variant: 'info' as const,
          label: 'Moyenne',
          icon: '🟡',
        };
      case 'high':
        return {
          variant: 'warning' as const,
          label: 'Élevée',
          icon: '🟠',
        };
      case 'urgent':
        return {
          variant: 'error' as const,
          label: 'Urgente',
          icon: '🔴',
        };
      default:
        return {
          variant: 'default' as const,
          label: priority,
          icon: '❓',
        };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <BadgeWithIcon
      variant={config.variant}
      icon={config.icon}
      className={className}
    >
      {config.label}
    </BadgeWithIcon>
  );
}

// Badge numérique (pour les notifications)
interface NumericBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
}

export function NumericBadge({
  count,
  max = 99,
  showZero = false,
  className,
}: NumericBadgeProps) {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant="error"
      size="sm"
      className={cn('min-w-[1.25rem] justify-center', className)}
    >
      {displayCount}
    </Badge>
  );
}

// Badge de devise
interface CurrencyBadgeProps {
  currency: 'CHF' | 'EUR' | 'USD';
  className?: string;
}

export function CurrencyBadge({ currency, className }: CurrencyBadgeProps) {
  const getCurrencyConfig = (currency: string) => {
    switch (currency) {
      case 'CHF':
        return {
          label: 'CHF',
          icon: '🇨🇭',
        };
      case 'EUR':
        return {
          label: 'EUR',
          icon: '🇪🇺',
        };
      case 'USD':
        return {
          label: 'USD',
          icon: '🇺🇸',
        };
      default:
        return {
          label: currency,
          icon: '💱',
        };
    }
  };

  const config = getCurrencyConfig(currency);

  return (
    <BadgeWithIcon
      variant="outline"
      icon={config.icon}
      size="sm"
      className={className}
    >
      {config.label}
    </BadgeWithIcon>
  );
}