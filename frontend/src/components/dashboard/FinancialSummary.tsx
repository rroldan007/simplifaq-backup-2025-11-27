import React from 'react';
import { Card } from '../ui/Card';

interface FinancialSummaryProps {
  totalRevenue: number;
  monthlyRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  activeClients: number;
  currency?: string;
}

export function FinancialSummary({
  totalRevenue,
  monthlyRevenue,
  totalInvoices,
  paidInvoices,
  pendingInvoices,
  overdueInvoices,
  activeClients,
  currency = 'CHF'
}: FinancialSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const summaryCards = [
    {
      title: 'Chiffre d\'affaires mensuel',
      value: formatCurrency(monthlyRevenue),
      icon: '💰',
      color: 'bg-blue-50 text-blue-600',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Chiffre d\'affaires total',
      value: formatCurrency(totalRevenue),
      icon: '📈',
      color: 'bg-green-50 text-green-600',
      change: '+8%',
      changeType: 'positive' as const
    },
    {
      title: 'Factures ce mois',
      value: totalInvoices.toString(),
      icon: '📄',
      color: 'bg-purple-50 text-purple-600',
      change: '+3',
      changeType: 'positive' as const
    },
    {
      title: 'Clients actifs',
      value: activeClients.toString(),
      icon: '👥',
      color: 'bg-indigo-50 text-indigo-600',
      change: '+2',
      changeType: 'positive' as const
    }
  ];

  const statusCards = [
    {
      title: 'Factures payées',
      value: paidInvoices.toString(),
      color: 'bg-green-50 text-green-600 border-green-200',
      percentage: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0
    },
    {
      title: 'En attente de paiement',
      value: pendingInvoices.toString(),
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      percentage: totalInvoices > 0 ? Math.round((pendingInvoices / totalInvoices) * 100) : 0
    },
    {
      title: 'Factures en retard',
      value: overdueInvoices.toString(),
      color: 'bg-red-50 text-red-600 border-red-200',
      percentage: totalInvoices > 0 ? Math.round((overdueInvoices / totalInvoices) * 100) : 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* Résumé financier principal */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Résumé financier
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {card.value}
                  </p>
                  {card.change && (
                    <div className="flex items-center mt-2">
                      <span className={`text-sm font-medium ${
                        card.changeType === 'positive' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {card.changeType === 'positive' ? '↗' : '↘'} {card.change}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">
                        vs mois dernier
                      </span>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
                  <span className="text-xl">{card.icon}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Statut des factures */}
      <div>
        <h3 className="text-md font-semibold text-slate-900 mb-4">
          Statut des factures
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusCards.map((card, index) => (
            <Card key={index} className={`p-4 border-l-4 ${card.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    {card.title}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-400">
                    {card.percentage}%
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}