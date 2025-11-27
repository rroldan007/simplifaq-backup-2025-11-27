import React from 'react';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ 
  status, 
  size = 'md' 
}) => {
  const statusConfig = {
    draft: { 
      label: 'Brouillon', 
      className: 'chip-neutral',
      icon: '📝'
    },
    sent: { 
      label: 'Envoyée', 
      className: 'chip-active',
      icon: '📤'
    },
    paid: { 
      label: 'Payée', 
      className: 'chip-success',
      icon: '✅'
    },
    overdue: { 
      label: 'En retard', 
      className: 'chip-error',
      icon: '⚠️'
    },
    cancelled: { 
      label: 'Annulée', 
      className: 'chip-neutral',
      icon: '❌'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const config = statusConfig[status] || statusConfig.draft;
  const sizeClass = sizeClasses[size];

  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded-full font-medium border
        ${config.className} ${sizeClass}
      `}
      title={`Statut: ${config.label}`}
    >
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
};

export default InvoiceStatusBadge;
