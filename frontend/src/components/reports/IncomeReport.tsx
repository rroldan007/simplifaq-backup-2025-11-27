import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface IncomeReportData {
  period: {
    type: string;
    from: string;
    to: string;
    label: string;
  };
  summary: {
    totalInvoices: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    averageInvoiceValue: number;
  };
  invoicesByStatus: {
    draft: { count: number; revenue: number };
    sent: { count: number; revenue: number };
    paid: { count: number; revenue: number };
    overdue: { count: number; revenue: number };
    cancelled: { count: number; revenue: number };
  };
  topClients: Array<{
    clientId: string;
    clientName: string;
    invoiceCount: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
  }>;
  monthlyBreakdown?: Array<{
    month: number;
    monthName: string;
    invoiceCount: number;
    totalRevenue: number;
    paidRevenue: number;
  }>;
  generatedAt: string;
  currency: string;
}

interface IncomeReportProps {
  data?: IncomeReportData;
  loading?: boolean;
  onGenerateReport: (startDate: string, endDate: string) => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  currency?: string;
}

export function IncomeReport({
  data,
  loading = false,
  onGenerateReport,
  onExportPDF,
  onExportExcel,
  currency = 'CHF'
}: IncomeReportProps) {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDayOfMonth.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDayOfMonth.toISOString().split('T')[0];
  });

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

  const handleGenerateReport = () => {
    if (startDate && endDate) {
      onGenerateReport(startDate, endDate);
    }
  };

  const setQuickPeriod = (period: 'current-month' | 'last-month' | 'current-quarter' | 'current-year') => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (period) {
      case 'current-month':
        setStartDate(new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]);
        setEndDate(new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]);
        break;
      case 'last-month':
        setStartDate(new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]);
        setEndDate(new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]);
        break;
      case 'current-quarter':
        {
          const quarterStart = new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1);
          const quarterEnd = new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0);
          setStartDate(quarterStart.toISOString().split('T')[0]);
          setEndDate(quarterEnd.toISOString().split('T')[0]);
        }
        break;
      case 'current-year':
        setStartDate(`${currentYear}-01-01`);
        setEndDate(`${currentYear}-12-31`);
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
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rapport de revenus</h2>
          <p className="text-slate-600 mt-1">
            Analyse détaillée de vos revenus et performances commerciales
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

      {/* Period Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Sélection de la période
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Période personnalisée</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de début
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de fin
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button 
                onClick={handleGenerateReport} 
                loading={loading}
                variant="primary"
              >
                <span className="mr-2">📊</span>
                Générer le rapport
              </Button>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Périodes prédéfinies</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('current-month')}
              >
                Mois actuel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('last-month')}
              >
                Mois précédent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('current-quarter')}
              >
                Trimestre actuel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('current-year')}
              >
                Année en cours
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Report Results */}
      {data && (
        <>
          {/* Summary */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Résumé - {data.period.label}
              </h3>
              <div className="text-sm text-slate-500">
                Du {formatDate(data.period.from)} au {formatDate(data.period.to)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(data.summary.totalRevenue)}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Chiffre d'affaires total
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {data.summary.totalInvoices}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Factures émises
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency(data.summary.averageInvoiceValue)}
                </div>
                <div className="text-sm text-purple-700 mt-1">
                  Montant moyen
                </div>
              </div>
              
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.summary.paidRevenue)}
                </div>
                <div className="text-sm text-slate-700 mt-1">
                  Montant encaissé
                </div>
              </div>
            </div>
          </Card>

          {/* Revenue by Status */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Répartition par statut
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.invoicesByStatus).map(([status, statusData]) => {
                const percentage = data.summary.totalRevenue > 0 ? (statusData.revenue / data.summary.totalRevenue) * 100 : 0;
                const statusLabel = status === 'draft' ? 'Brouillons' :
                                  status === 'sent' ? 'Envoyées' :
                                  status === 'paid' ? 'Payées' :
                                  status === 'overdue' ? 'En retard' :
                                  'Annulées';
                
                return (
                  <div key={status} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                        {statusLabel}
                      </span>
                      <span className="text-sm text-slate-500">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {formatCurrency(statusData.revenue)}
                    </div>
                    <div className="text-sm text-slate-600">
                      {statusData.count} facture{statusData.count > 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Monthly Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Évolution mensuelle
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
                    <th className="text-right py-3 px-4 font-medium text-slate-700">
                      Montant moyen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyBreakdown?.map((month, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-3 px-4 font-medium">
                        {month.monthName}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(month.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {month.invoiceCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(month.invoiceCount > 0 ? month.totalRevenue / month.invoiceCount : 0)}
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Clients */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Meilleurs clients
            </h3>
            
            <div className="space-y-4">
              {data.topClients.map((client, index) => (
                <div key={client.clientId} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {client.clientName}
                      </div>
                      <div className="text-sm text-slate-600">
                        {client.invoiceCount} facture{client.invoiceCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      {formatCurrency(client.totalRevenue)}
                    </div>
                    <div className="text-sm text-slate-600">
                      {((client.totalRevenue / data.summary.totalRevenue) * 100).toFixed(1)}% du CA
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Insights */}
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-start space-x-3">
              <span className="text-green-600 text-xl">💡</span>
              <div>
                <h4 className="font-medium text-green-900 mb-2">
                  Analyses et recommandations
                </h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Votre montant moyen par facture est de {formatCurrency(data.summary.averageInvoiceValue)}</li>
                  <li>• {((data.summary.paidRevenue / data.summary.totalRevenue) * 100).toFixed(1)}% de vos revenus ont été encaissés</li>
                  {data.invoicesByStatus.overdue.revenue > 0 && (
                    <li>• {formatCurrency(data.invoicesByStatus.overdue.revenue)} en factures en retard nécessitent un suivi</li>
                  )}
                  <li>• Vos {Math.min(3, data.topClients.length)} meilleurs clients représentent {data.topClients.slice(0, 3).reduce((sum, client) => sum + ((client.totalRevenue / data.summary.totalRevenue) * 100), 0).toFixed(1)}% de votre chiffre d'affaires</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}