import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
  clickable?: boolean;
  onClick?: () => void;
}

// Styles pour le padding
const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

// Styles pour l'ombre
const shadowStyles = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export function Card({
  children,
  className,
  padding = 'md',
  shadow = 'sm',
  border = true,
  hover = false,
  variant = 'default',
  clickable = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={cn(
        'surface rounded-lg',
        paddingStyles[padding],
        // Variant styles
        variant === 'elevated' && shadowStyles['md'],
        variant === 'outlined' && 'border border-primary',
        variant === 'default' && shadowStyles[shadow],
        // Border handling for default variant
        variant === 'default' && border && 'border border-primary',
        // Hover and clickable styles
        (hover || clickable) && 'hover:shadow-md transition-shadow duration-200',
        (clickable || !!onClick) && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Composants spécialisés pour les cartes
interface CardHeaderBaseProps {
  action?: React.ReactNode;
  className?: string;
}

type CardHeaderProps =
  | (CardHeaderBaseProps & { title: string; subtitle?: string; children?: never })
  | (CardHeaderBaseProps & { title?: never; subtitle?: never; children: React.ReactNode });

export function CardHeader({ title, subtitle, action, className, children }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children ? (
        <div className="flex-1">{children}</div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('text-secondary', className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-primary', className)}>
      {children}
    </div>
  );
}

// Carte de statistique
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return '↗️';
      case 'decrease':
        return '↘️';
      default:
        return '→';
    }
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow duration-200', className)} hover>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary">{title}</p>
          <p className="text-2xl font-bold text-primary mt-1">{value}</p>
          {change && (
            <div className={cn('flex items-center mt-2 text-sm', getChangeColor(change.type))}>
              <span className="mr-1">{getChangeIcon(change.type)}</span>
              <span>{change.value}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-2xl text-secondary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// Carte d'action
interface ActionCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ActionCard({ title, description, icon, onClick, className }: ActionCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 chip-active rounded-lg flex items-center justify-center">
            <div className="text-xl">{icon}</div>
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-primary mb-1">{title}</h3>
          <p className="text-sm text-secondary">{description}</p>
        </div>
      </div>
    </Card>
  );
}

// Carte de liste
interface ListCardProps {
  title: string;
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    value?: string;
    status?: 'success' | 'warning' | 'error' | 'info';
    onClick?: () => void;
  }>;
  emptyMessage?: string;
  className?: string;
}

export function ListCard({ title, items, emptyMessage = 'Aucun élément', className }: ListCardProps) {
  const getStatusColor = (status?: 'success' | 'warning' | 'error' | 'info') => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-amber-100 text-amber-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader title={title} />
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-secondary text-center py-4">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border border-primary',
                item.onClick && 'cursor-pointer'
              )}
              onClick={item.onClick}
            >
              <div className="flex-1">
                <p className="font-medium text-primary">{item.title}</p>
                {item.subtitle && (
                  <p className="text-sm text-secondary">{item.subtitle}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {item.value && (
                  <span className="font-medium text-primary">{item.value}</span>
                )}
                {item.status && (
                  <span className={cn(
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full border',
                    getStatusColor(item.status)
                  )}>
                    {item.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}