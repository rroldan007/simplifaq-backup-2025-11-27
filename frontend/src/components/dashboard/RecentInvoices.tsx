import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  currency?: string;
}

interface RecentInvoicesProps {
  invoices: Invoice[];
  onViewInvoice?: (invoiceId: string) => void;
  onCreateInvoice?: () => void;
}

export function RecentInvoices({ 
  invoices, 
  onViewInvoice,
  onCreateInvoice 
}: RecentInvoicesProps) {
  const formatCurrency = (amount: number, currency = 'CHF') => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const statusLower = status?.toLowerCase() as string;
    
    const statusConfig: Record<string, { label: string; variant: 'secondary' | 'info' | 'success' | 'error' }> = {
      draft: {
        label: 'Brouillon',
        variant: 'secondary' as const
      },
      sent: {
        label: 'Envoyée',
        variant: 'info' as const
      },
      paid: {
        label: 'Payée',
        variant: 'success' as const
      },
      overdue: {
        label: 'En retard',
        variant: 'error' as const
      },
      cancelled: {
        label: 'Annulée',
        variant: 'secondary' as const
      }
    };

    const config = statusConfig[statusLower] || {
      label: status || 'Inconnu',
      variant: 'secondary' as const
    };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: Invoice['status']) => {
    const statusLower = status?.toLowerCase() as string;
    const icons: Record<string, string> = {
      draft: '📝',
      sent: '📤',
      paid: '✅',
      overdue: '⚠️',
      cancelled: '❌'
    };
    return icons[statusLower] || '📄';
  };

  return (
    <Card className="p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Factures récentes
        </h2>
        {onCreateInvoice && (
          <button
            onClick={onCreateInvoice}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Voir toutes →
          </button>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📄</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Aucune facture
          </h3>
          <p className="text-slate-600 mb-4">
            Vous n'avez pas encore créé de factures.
          </p>
          {onCreateInvoice && (
            <button
              onClick={onCreateInvoice}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer ma première facture
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-5 border border-slate-200 rounded-2xl hover:shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
              onClick={() => onViewInvoice?.(invoice.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <span className="text-lg">
                    {getStatusIcon(invoice.status)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-slate-900">
                      {invoice.invoiceNumber}
                    </p>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-sm text-slate-600">
                    {invoice.clientName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Émise le {formatDate(invoice.issueDate)} • 
                    Échéance le {formatDate(invoice.dueDate)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </p>
                {invoice.status === 'overdue' && (
                  <p className="text-xs text-red-600 font-medium">
                    En retard
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}