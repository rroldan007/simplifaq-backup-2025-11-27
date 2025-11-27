import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ClientReportData {
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  selectedClient?: {
    id: string;
    name: string;
    email: string;
    address: string;
  };
  summary: {
    totalRevenue: number;
    totalInvoices: number;
    averageInvoiceAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    paymentDelayAverage: number;
  };
  invoiceHistory: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue' | 'draft';
    paymentDate?: string;
    paymentDelay?: number;
  }>;
  paymentBehavior: {
    onTimePayments: number;
    latePayments: number;
    averagePaymentDelay: number;
    longestPaymentDelay: number;
  };
  monthlyActivity: Array<{
    month: string;
    revenue: number;
    invoiceCount: number;
  }>;
}

interface ClientReportProps {
  data?: ClientReportData;
  loading?: boolean;
  clients?: Array<{ id: string; name: string; email: string }>;
  onGenerateReport: (startDate: string, endDate: string, clientId?: string) => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  currency?: string;
}

export function ClientReport({
  data,
  loading = false,
  clients = [],
  onGenerateReport,
  onExportPDF,
  onExportExcel,
  currency = 'CHF'
}: ClientReportProps) {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    return firstDayOfYear.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const formatCurrency = (amount: number) => {
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

  const formatMonth = (monthString: string) => {
    return new Intl.DateTimeFormat('fr-CH', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(monthString));
  };

  const handleGenerateReport = () => {
    if (startDate && endDate) {
      onGenerateReport(startDate, endDate, selectedClientId || undefined);
    }
  };

  const setQuickPeriod = (period: 'current-year' | 'last-year' | 'last-6-months' | 'last-12-months') => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    switch (period) {
      case 'current-year':
        setStartDate(`${currentYear}-01-01`);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'last-year':
        setStartDate(`${currentYear - 1}-01-01`);
        setEndDate(`${currentYear - 1}-12-31`);
        break;
      case 'last-6-months':
        {
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          setStartDate(sixMonthsAgo.toISOString().split('T')[0]);
          setEndDate(now.toISOString().split('T')[0]);
        }
        break;
      case 'last-12-months':
        {
          const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
          setStartDate(twelveMonthsAgo.toISOString().split('T')[0]);
          setEndDate(now.toISOString().split('T')[0]);
        }
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente';
      case 'overdue':
        return 'En retard';
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rapport clients</h2>
          <p className="text-slate-600 mt-1">
            Analyse détaillée de la performance par client
          </p>
        </div>
        
        {data && (
          <div className="flex space-x-2">
            {onExportPDF && (
              <Button variant="secondary" onClick={onExportPDF}>
                <span className="mr-2">📄</span>
                Exporter PDF
              </Button>
            )}
            {onExportExcel && (
              <Button variant="secondary" onClick={onExportExcel}>
                <span className="mr-2">📊</span>
                Exporter Excel
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Filtres et période
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Client (optionnel)
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Période personnalisée</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Début
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fin
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Quick Periods */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Périodes prédéfinies</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('current-year')}
              >
                Année en cours
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('last-year')}
              >
                Année précédente
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('last-6-months')}
              >
                6 derniers mois
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('last-12-months')}
              >
                12 derniers mois
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button 
            onClick={handleGenerateReport} 
            loading={loading}
            variant="primary"
          >
            <span className="mr-2">📊</span>
            Générer le rapport
          </Button>
        </div>
      </Card>

      {/* Report Results */}
      {data && (
        <>
          {/* Client Info & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Information */}
            {data.selectedClient && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Informations client
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-slate-700">Nom:</span>
                    <p className="text-slate-900">{data.selectedClient.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">Email:</span>
                    <p className="text-slate-900">{data.selectedClient.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">Adresse:</span>
                    <p className="text-slate-900">{data.selectedClient.address}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Résumé - {data.period.label}
                </h3>
                <div className="text-sm text-slate-500">
                  Du {formatDate(data.period.startDate)} au {formatDate(data.period.endDate)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-900">
                    {formatCurrency(data.summary.totalRevenue)}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Chiffre d'affaires
                  </div>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-900">
                    {data.summary.totalInvoices}
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Factures
                  </div>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-900">
                    {formatCurrency(data.summary.averageInvoiceAmount)}
                  </div>
                  <div className="text-xs text-purple-700 mt-1">
                    Montant moyen
                  </div>
                </div>
                
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-xl font-bold text-amber-900">
                    {data.summary.paymentDelayAverage}j
                  </div>
                  <div className="text-xs text-amber-700 mt-1">
                    Délai moyen
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Behavior */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Comportement de paiement
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border border-slate-200 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {data.paymentBehavior.onTimePayments}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Paiements à temps
                </div>
              </div>
              
              <div className="text-center p-4 border border-slate-200 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {data.paymentBehavior.latePayments}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Paiements en retard
                </div>
              </div>
              
              <div className="text-center p-4 border border-slate-200 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">
                  {data.paymentBehavior.averagePaymentDelay}j
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Délai moyen
                </div>
              </div>
              
              <div className="text-center p-4 border border-slate-200 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">
                  {data.paymentBehavior.longestPaymentDelay}j
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Plus long délai
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Activité mensuelle
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Mois
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      Chiffre d'affaires
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      Nb. factures
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyActivity.map((month, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-3 px-4 font-medium">
                        {formatMonth(month.month)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(month.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {month.invoiceCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Invoice History */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Historique des factures ({data.invoiceHistory.length})
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      N° Facture
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">
                      Échéance
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      Montant
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-slate-700">
                      Statut
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-slate-700">
                      Délai
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoiceHistory.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {invoice.paymentDelay !== undefined ? (
                          <span className={`font-medium ${
                            invoice.paymentDelay <= 0 ? 'text-green-600' : 
                            invoice.paymentDelay <= 30 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {invoice.paymentDelay > 0 ? '+' : ''}{invoice.paymentDelay}j
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Insights */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 text-xl">💡</span>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">
                  Analyses et recommandations
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {data.selectedClient ? (
                    <>
                      <li>• Ce client représente {formatCurrency(data.summary.totalRevenue)} de chiffre d'affaires</li>
                      <li>• Montant moyen par facture: {formatCurrency(data.summary.averageInvoiceAmount)}</li>
                      <li>• Délai de paiement moyen: {data.summary.paymentDelayAverage} jours</li>
                      {data.paymentBehavior.latePayments > 0 && (
                        <li>• ⚠️ {data.paymentBehavior.latePayments} paiement(s) en retard - considérez un suivi</li>
                      )}
                    </>
                  ) : (
                    <>
                      <li>• Analyse globale de tous vos clients sur la période sélectionnée</li>
                      <li>• Chiffre d'affaires total: {formatCurrency(data.summary.totalRevenue)}</li>
                      <li>• {data.summary.totalInvoices} factures émises au total</li>
                      <li>• Sélectionnez un client spécifique pour une analyse détaillée</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}