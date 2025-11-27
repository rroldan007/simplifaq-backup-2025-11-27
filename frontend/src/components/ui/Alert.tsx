import React from 'react';
import { cn } from '../../utils/cn';
import type { AlertItem } from '../../hooks/useAlert';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

// Styles pour les variantes
const variantStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    content: 'text-blue-700',
    button: 'text-blue-400 hover:text-blue-600',
    iconSymbol: 'ℹ️',
  },
  success: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-400',
    title: 'text-green-800',
    content: 'text-green-700',
    button: 'text-green-400 hover:text-green-600',
    iconSymbol: '✅',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-400',
    title: 'text-amber-800',
    content: 'text-amber-700',
    button: 'text-amber-400 hover:text-amber-600',
    iconSymbol: '⚠️',
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-400',
    title: 'text-red-800',
    content: 'text-red-700',
    button: 'text-red-400 hover:text-red-600',
    iconSymbol: '❌',
  },
};

export function Alert({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        styles.container,
        className
      )}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span className={cn('text-lg', styles.icon)}>
            {styles.iconSymbol}
          </span>
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium mb-1', styles.title)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', styles.content)}>
            {children}
          </div>
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  styles.button
                )}
                aria-label="Fermer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Alert avec action
interface AlertWithActionProps extends Omit<AlertProps, 'dismissible' | 'onDismiss'> {
  action: {
    label: string;
    onClick: () => void;
  };
}

export function AlertWithAction({
  children,
  variant = 'info',
  title,
  action,
  className,
}: AlertWithActionProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        styles.container,
        className
      )}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span className={cn('text-lg', styles.icon)}>
            {styles.iconSymbol}
          </span>
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium mb-1', styles.title)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm mb-3', styles.content)}>
            {children}
          </div>
          <div>
            <button
              onClick={action.onClick}
              className={cn(
                'text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
                styles.button
              )}
            >
              {action.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alert de liste (pour plusieurs messages)
interface AlertListProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  items: string[];
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function AlertList({
  variant = 'info',
  title,
  items,
  dismissible = false,
  onDismiss,
  className,
}: AlertListProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        styles.container,
        className
      )}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span className={cn('text-lg', styles.icon)}>
            {styles.iconSymbol}
          </span>
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium mb-2', styles.title)}>
              {title}
            </h3>
          )}
          <ul className={cn('text-sm list-disc list-inside space-y-1', styles.content)}>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onDismiss}
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  styles.button
                )}
                aria-label="Fermer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook useAlert déplacé vers src/hooks/useAlert.ts pour respecter Fast Refresh

// Conteneur pour afficher les alertes
interface AlertContainerProps {
  alerts: AlertItem[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export function AlertContainer({
  alerts,
  onRemove,
  position = 'top-right',
  className,
}: AlertContainerProps) {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (alerts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 space-y-2 max-w-sm w-full',
        positionStyles[position],
        className
      )}
    >
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.variant}
          title={alert.title}
          dismissible={alert.dismissible}
          onDismiss={() => onRemove(alert.id)}
        >
          {alert.message}
        </Alert>
      ))}
    </div>
  );
}

// Icône de fermeture
function CloseIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}