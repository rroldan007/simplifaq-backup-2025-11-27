import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, Badge, Button } from '../ui';
import { cn } from '../../utils/cn';
import { useMotion } from '../../hooks/useMotion';

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
}

interface ResponsiveInvoiceCardProps {
  invoice: Invoice;
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  className?: string;
}

const statusConfig = {
  draft: {
    label: 'Brouillon',
    color: 'bg-gray-100 text-gray-800',
    icon: '📝',
  },
  sent: {
    label: 'Envoyée',
    color: 'bg-blue-100 text-blue-800',
    icon: '📤',
  },
  paid: {
    label: 'Payée',
    color: 'bg-success-100 text-success-800',
    icon: '✅',
  },
  overdue: {
    label: 'En retard',
    color: 'bg-error-100 text-error-800',
    icon: '⚠️',
  },
};

export const ResponsiveInvoiceCard: React.FC<ResponsiveInvoiceCardProps> = ({
  invoice,
  onView,
  onEdit,
  onSend,
  onDownload,
  className,
}) => {
  const { variants, transition } = useMotion();
  const status = statusConfig[invoice.status];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  // Check if PDF generation is allowed based on invoice status
  const isPdfAllowed = () => {
    const allowedStatuses = ['sent', 'paid', 'overdue'];
    return allowedStatuses.includes(invoice.status);
  };

  return (
    <motion.div
      variants={variants.staggerItem}
      transition={transition}
      className={className}
    >
      <Card
        variant="default"
        hover
        clickable
        onClick={() => onView?.(invoice)}
        className="h-full"
      >
        <CardHeader>
          {/* Mobile-first header layout */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {invoice.number}
                </h3>
                <Badge className={cn('text-xs', status.color)}>
                  <span className="mr-1">{status.icon}</span>
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {invoice.clientName}
              </p>
            </div>
            
            {/* Amount - prominent on mobile */}
            <div className="text-right sm:text-left">
              <div className="text-xl sm:text-lg font-bold text-gray-900">
                {formatCurrency(invoice.amount)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Dates section - stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Créée le
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(invoice.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Échéance
              </p>
              <p className={cn(
                'text-sm font-medium',
                invoice.status === 'overdue' 
                  ? 'text-error-600' 
                  : 'text-gray-900'
              )}>
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          {/* Actions - responsive button layout */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Primary actions */}
            <div className="flex gap-2 flex-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(invoice);
                }}
                className="flex-1 sm:flex-none"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="hidden sm:inline">Voir</span>
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(invoice);
                }}
                className="flex-1 sm:flex-none"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Modifier</span>
              </Button>
            </div>

            {/* Secondary actions */}
            <div className="flex gap-2">
              {invoice.status === 'draft' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSend?.(invoice);
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Envoyer
                </Button>
              )}
              
              {isPdfAllowed() && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.(invoice);
                  }}
                  className="flex-1 sm:flex-none"
                  title="Télécharger le PDF de la facture"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ResponsiveInvoiceCard;