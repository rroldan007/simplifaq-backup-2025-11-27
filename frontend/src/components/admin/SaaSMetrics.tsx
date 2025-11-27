import React from 'react';
import { Card } from '../ui/Card';

interface SaaSMetricsProps {
  overview: {
    totalUsers: number;
    activeUsers: number;
    connectedUsers?: number;
    newUsersInPeriod: number;
    userGrowthRate: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    monthlyRecurringRevenue: number;
    totalInvoices: number;
    invoicesInPeriod: number;
    totalRevenue: number;
    revenueInPeriod: number;
    revenueGrowthRate: number;
  };
  period: string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
  formatPercentage: (num: number) => string;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function MetricCard({ title, value, change, changeType, icon, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  const changeColorClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-secondary',
  } as const;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-secondary">{title}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-primary">{value}</p>
              {change && (
                <span className={`ml-2 text-sm font-medium ${changeColorClasses[changeType || 'neutral']}`}>
                  {change}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-secondary mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SaaSMetrics({ overview, period, formatCurrency, formatNumber, formatPercentage }: SaaSMetricsProps) {
  const metrics: MetricCardProps[] = [
    {
      title: 'Utilisateurs totaux',
      value: formatNumber(overview.totalUsers),
      change: formatPercentage(overview.userGrowthRate),
      changeType: overview.userGrowthRate >= 0 ? 'positive' : 'negative' as const,
      subtitle: `${formatNumber(overview.activeUsers)} actifs`,
      color: 'blue' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
    {
      title: 'Utilisateurs connectés',
      value: formatNumber(overview.connectedUsers ?? 0),
      subtitle: 'En ce moment',
      color: 'red' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A2 2 0 0122 9.618v4.764a2 2 0 01-2.447 1.894L15 14m0-4l-4.553 2.276A2 2 0 008 9.618V4.382a2 2 0 012.447-1.894L15 4m0 6v4m-6-2H4m0 0L5.5 9.5M4 12l1.5 2.5" />
        </svg>
      ),
    },
    {
      title: 'Revenus récurrents (MRR)',
      value: formatCurrency(overview.monthlyRecurringRevenue),
      change: formatPercentage(overview.revenueGrowthRate),
      changeType: overview.revenueGrowthRate >= 0 ? 'positive' : 'negative' as const,
      subtitle: `${formatNumber(overview.activeSubscriptions)} abonnements actifs`,
      color: 'green' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
    },
    {
      title: 'Factures générées',
      value: formatNumber(overview.totalInvoices),
      change: `+${formatNumber(overview.invoicesInPeriod)}`,
      changeType: 'positive' as const,
      subtitle: `${period.toLowerCase()}`,
      color: 'purple' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: 'Revenus totaux',
      value: formatCurrency(overview.totalRevenue),
      change: `+${formatCurrency(overview.revenueInPeriod)}`,
      changeType: 'positive' as const,
      subtitle: `${period.toLowerCase()}`,
      color: 'orange' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium text-primary">Métriques clés</h2>
        <p className="text-sm text-secondary">Vue d'ensemble des performances de votre SaaS</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Additional Metrics Row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Taux de conversion</p>
                <p className="text-2xl font-semibold text-primary">
                  {overview.totalUsers > 0 
                    ? ((overview.activeSubscriptions / overview.totalUsers) * 100).toFixed(1)
                    : '0.0'
                  }%
                </p>
                <p className="text-xs text-secondary mt-1">
                  Utilisateurs → Abonnés payants
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">ARPU (Revenu par utilisateur)</p>
                <p className="text-2xl font-semibold text-primary">
                  {formatCurrency(
                    overview.activeSubscriptions > 0 
                      ? overview.monthlyRecurringRevenue / overview.activeSubscriptions
                      : 0
                  )}
                </p>
                <p className="text-xs text-secondary mt-1">
                  Par mois et par utilisateur
                </p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Nouveaux utilisateurs</p>
                <p className="text-2xl font-semibold text-primary">
                  {formatNumber(overview.newUsersInPeriod)}
                </p>
                <p className="text-xs text-secondary mt-1">
                  {period.toLowerCase()}
                </p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}