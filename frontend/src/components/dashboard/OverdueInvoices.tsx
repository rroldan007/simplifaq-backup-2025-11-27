import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: string;
  daysPastDue: number;
  currency?: string;
}

interface OverdueInvoicesProps {
  invoices: OverdueInvoice[];
  onViewInvoice?: (invoiceId: string) => void;
  onSendReminder?: (invoiceId: string) => void;
}

export function OverdueInvoices({ 
  invoices, 
  onViewInvoice,
  onSendReminder 
}: OverdueInvoicesProps) {
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

  const getTotalOverdueAmount = () => {
    return invoices.reduce((total, invoice) => total + invoice.amount, 0);
  };

  const getSeverityLevel = (daysPastDue: number) => {
    if (daysPastDue <= 7) return 'warning';
    if (daysPastDue <= 30) return 'error';
    return 'critical';
  };

  const getSeverityColor = (daysPastDue: number) => {
    const level = getSeverityLevel(daysPastDue);
    switch (level) {
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'critical':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-amber-600 bg-amber-50';
    }
  };

  if (invoices.length === 0) {
    return (
      <Card className="p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Factures en retard
          </h2>
        </div>
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Aucune facture en retard
          </h3>
          <p className="text-slate-600">
            Toutes vos factures sont à jour !
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerte de résumé */}
      <Alert variant="error">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">
              {invoices.length} facture{invoices.length > 1 ? 's' : ''} en retard
            </h3>
            <p className="text-sm mt-1">
              Montant total en souffrance : {formatCurrency(getTotalOverdueAmount())}
            </p>
          </div>
          <div className="text-2xl">⚠️</div>
        </div>
      </Alert>

      {/* Liste des factures en retard */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Factures en retard
          </h2>
          <Badge variant="error">
            {invoices.length}
          </Badge>
        </div>

        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-5 border border-red-200 bg-red-50 rounded-2xl"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-slate-900">
                      {invoice.invoiceNumber}
                    </p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(invoice.daysPastDue)}`}>
                      {invoice.daysPastDue} jour{invoice.daysPastDue > 1 ? 's' : ''} de retard
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {invoice.clientName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Échéance : {formatDate(invoice.dueDate)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  {onSendReminder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendReminder(invoice.id);
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      Rappel
                    </button>
                  )}
                  {onViewInvoice && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewInvoice(invoice.id);
                      }}
                      className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                    >
                      Voir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions globales */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Actions recommandées pour les factures en retard
            </p>
            <div className="flex space-x-2">
              <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Envoyer tous les rappels
              </button>
              <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                Exporter la liste
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}