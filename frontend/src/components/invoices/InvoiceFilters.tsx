import React from 'react';
import { Badge } from '../ui/Badge';

type InvoiceStatus = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface InvoiceFiltersProps {
  selectedStatus: InvoiceStatus;
  onStatusChange: (status: InvoiceStatus) => void;
  statusCounts?: Record<InvoiceStatus, number>;
}

export function InvoiceFilters({ 
  selectedStatus, 
  onStatusChange, 
  statusCounts = { all: 0, draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 } 
}: InvoiceFiltersProps) {
  const statusOptions = [
    {
      value: 'all' as const,
      label: 'Toutes',
      icon: '📄',
      variant: 'secondary' as const
    },
    {
      value: 'draft' as const,
      label: 'Brouillons',
      icon: '📝',
      variant: 'secondary' as const
    },
    {
      value: 'sent' as const,
      label: 'Envoyées',
      icon: '📤',
      variant: 'info' as const
    },
    {
      value: 'paid' as const,
      label: 'Payées',
      icon: '✅',
      variant: 'success' as const
    },
    {
      value: 'overdue' as const,
      label: 'En retard',
      icon: '⚠️',
      variant: 'error' as const
    },
    {
      value: 'cancelled' as const,
      label: 'Annulées',
      icon: '❌',
      variant: 'secondary' as const
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statusOptions.map((option) => {
        const count = statusCounts[option.value] || 0;
        const isSelected = selectedStatus === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
            {count > 0 && (
              <Badge 
                variant={isSelected ? 'info' : 'secondary'} 
                className="ml-2 text-xs"
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}