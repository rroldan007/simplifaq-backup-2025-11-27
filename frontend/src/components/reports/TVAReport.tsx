import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface TVAReportData {
  period: {
    from: string;
    to: string;
    label: string;
  };
  company: {
    companyName: string;
    firstName: string;
    lastName: string;
    vatNumber: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton: string;
  };
  tvaRates: Array<{
    rate: number;
    rateLabel: string;
    itemCount: number;
    totalNet: number;
    totalTva: number;
    totalGross: number;
    invoices: string[];
  }>;
  summary: {
    totalNet: number;
    totalTva: number;
    totalGross: number;
    totalInvoices: number;
    totalItems: number;
  };
  generatedAt: string;
  currency: string;
}

interface TVAReportProps {
  data?: TVAReportData;
  loading?: boolean;
  onGenerateReport: (startDate: string, endDate: string) => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  currency?: string;
}

export function TVAReport({
  data,
  loading = false,
  onGenerateReport,
  onExportPDF,
  onExportExcel,
  currency = 'CHF'
}: TVAReportProps) {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDayOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return firstDayOfQuarter.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDayOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
    return lastDayOfQuarter.toISOString().split('T')[0];
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

  const setQuickPeriod = (period: 'current-quarter' | 'last-quarter' | 'current-year' | 'last-year') => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (period) {
      case 'current-quarter':
        {
          const currentQuarterStart = new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1);
          const currentQuarterEnd = new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0);
          setStartDate(currentQuarterStart.toISOString().split('T')[0]);
          setEndDate(currentQuarterEnd.toISOString().split('T')[0]);
        }
        break;
      case 'last-quarter':
        {
          const lastQuarterStart = new Date(currentYear, Math.floor(currentMonth / 3) * 3 - 3, 1);
          const lastQuarterEnd = new Date(currentYear, Math.floor(currentMonth / 3) * 3, 0);
          setStartDate(lastQuarterStart.toISOString().split('T')[0]);
          setEndDate(lastQuarterEnd.toISOString().split('T')[0]);
        }
        break;
      case 'current-year':
        setStartDate(`${currentYear}-01-01`);
        setEndDate(`${currentYear}-12-31`);
        break;
      case 'last-year':
        setStartDate(`${currentYear - 1}-01-01`);
        setEndDate(`${currentYear - 1}-12-31`);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rapport TVA</h2>
          <p className="text-slate-600 mt-1">
            Déclaration TVA pour les autorités fiscales suisses
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
                onClick={() => setQuickPeriod('current-quarter')}
              >
                Trimestre actuel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setQuickPeriod('last-quarter')}
              >
                Trimestre précédent
              </Button>
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
            </div>
          </div>
        </div>
      </Card>

      {/* Report Results */}
      {data && (
        <>
          {/* Summary */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Résumé TVA - {data.period.label}
              </h3>
              <div className="text-sm text-slate-500">
                Du {formatDate(data.period.from)} au {formatDate(data.period.to)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(data.summary.totalNet)}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Chiffre d'affaires HT
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(data.summary.totalTva)}
                </div>
                <div className="text-sm text-green-700 mt-1">
                  TVA collectée
                </div>
              </div>
              
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(data.summary.totalGross)}
                </div>
                <div className="text-sm text-slate-700 mt-1">
                  Total TTC
                </div>
              </div>
            </div>
          </Card>

          {/* TVA by Rate - Card View */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Détail par taux de TVA
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.tvaRates.map((rate, index) => {
                const getTVAInfo = (rateValue: number) => {
                  if (rateValue === 8.1) {
                    return {
                      color: 'red',
                      icon: '🔴',
                      label: 'Taux normal',
                      description: 'Services et biens standard',
                      bgClass: 'bg-red-50',
                      borderClass: 'border-red-200',
                      textClass: 'text-red-900',
                      accentClass: 'text-red-600'
                    };
                  } else if (rateValue === 2.6) {
                    return {
                      color: 'blue',
                      icon: '🔵',
                      label: 'Taux réduit',
                      description: 'Denrées alimentaires, médicaments, etc.',
                      bgClass: 'bg-blue-50',
                      borderClass: 'border-blue-200',
                      textClass: 'text-blue-900',
                      accentClass: 'text-blue-600'
                    };
                  } else if (rateValue === 3.8) {
                    return {
                      color: 'purple',
                      icon: '🟣',
                      label: 'Taux spécial hébergement',
                      description: 'Prestations d\'hébergement',
                      bgClass: 'bg-purple-50',
                      borderClass: 'border-purple-200',
                      textClass: 'text-purple-900',
                      accentClass: 'text-purple-600'
                    };
                  } else if (rateValue === 0) {
                    return {
                      color: 'gray',
                      icon: '⚪',
                      label: 'Exonéré de TVA',
                      description: 'Exportations, services financiers, etc.',
                      bgClass: 'bg-gray-50',
                      borderClass: 'border-gray-200',
                      textClass: 'text-gray-900',
                      accentClass: 'text-gray-600'
                    };
                  } else {
                    return {
                      color: 'green',
                      icon: '🟢',
                      label: `Taux ${rateValue}%`,
                      description: 'Autre taux',
                      bgClass: 'bg-green-50',
                      borderClass: 'border-green-200',
                      textClass: 'text-green-900',
                      accentClass: 'text-green-600'
                    };
                  }
                };
                
                const info = getTVAInfo(rate.rate);
                
                return (
                  <Card key={index} className={`p-6 ${info.bgClass} border-2 ${info.borderClass}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{info.icon}</span>
                        <div>
                          <h4 className={`font-bold text-lg ${info.textClass}`}>
                            {info.label}
                          </h4>
                          <p className={`text-sm ${info.accentClass}`}>
                            TVA {rate.rate}% - {info.description}
                          </p>
                        </div>
                      </div>
                      <div className={`text-right ${info.accentClass} font-bold text-2xl`}>
                        {rate.rate}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className={`text-xs ${info.accentClass} mb-1`}>
                          Montant HT facturé
                        </div>
                        <div className={`text-xl font-bold ${info.textClass}`}>
                          {formatCurrency(rate.totalNet)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs ${info.accentClass} mb-1`}>
                          TVA collectée
                        </div>
                        <div className={`text-xl font-bold ${info.textClass}`}>
                          {formatCurrency(rate.totalTva)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs ${info.accentClass} mb-1`}>
                          Total TTC
                        </div>
                        <div className={`text-lg font-semibold ${info.textClass}`}>
                          {formatCurrency(rate.totalGross)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs ${info.accentClass} mb-1`}>
                          Nombre de factures
                        </div>
                        <div className={`text-lg font-semibold ${info.textClass}`}>
                          {rate.invoices.length} facture{rate.invoices.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    
                    {rate.invoices.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-opacity-30" style={{ borderColor: info.accentClass.replace('text-', '') }}>
                        <details className="cursor-pointer">
                          <summary className={`text-sm font-medium ${info.accentClass} hover:underline`}>
                            Voir les {rate.invoices.length} facture{rate.invoices.length > 1 ? 's' : ''}
                          </summary>
                          <div className="mt-2 space-y-1">
                            {rate.invoices.map((invoice, idx) => (
                              <div key={idx} className={`text-xs ${info.textClass} bg-white bg-opacity-50 px-2 py-1 rounded`}>
                                {invoice}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Summary Table */}
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              📊 Tableau récapitulatif
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left py-3 px-4 font-medium">
                      Type de TVA
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      Factures
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      CA HT
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      Montant TVA
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      Total TTC
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      % du CA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.tvaRates.map((rate, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-medium">{rate.rateLabel}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {rate.invoices.length}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(rate.totalNet)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(rate.totalTva)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(rate.totalGross)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {((rate.totalNet / data.summary.totalNet) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-400 bg-slate-800 text-white font-bold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="py-3 px-4 text-right">
                      {data.tvaRates.reduce((sum, rate) => sum + rate.invoices.length, 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(data.summary.totalNet)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(data.summary.totalTva)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(data.summary.totalGross)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>



          {/* Legal Notice */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <span className="text-blue-600 text-xl">ℹ️</span>
              <div>
                <h4 className="font-medium text-blue-900 mb-2">
                  Information importante
                </h4>
                <p className="text-sm text-blue-800">
                  Ce rapport est généré automatiquement à partir de vos données de facturation. 
                  Veuillez vérifier l'exactitude des informations avant de soumettre votre déclaration TVA 
                  aux autorités fiscales suisses. En cas de doute, consultez votre comptable ou 
                  l'Administration fédérale des contributions (AFC).
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}