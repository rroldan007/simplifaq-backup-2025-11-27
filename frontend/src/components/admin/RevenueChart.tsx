/**
 * 🇨🇭 SimpliFaq - Revenue Chart Component
 * 
 * This is a props-driven component for displaying revenue charts.
 * It receives data and loading state from its parent.
 */

import React from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { RevenueChartDataPoint } from '../../types/admin';

interface RevenueChartProps {
  data: RevenueChartDataPoint[];
  loading: boolean;
  className?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading, className = '' }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className} flex items-center justify-center h-96`}>
        <LoadingSpinner />
      </Card>
    );
  }

  const safeData = Array.isArray(data) ? data : [];
  const totalRevenue = safeData.reduce((sum, item) => sum + item.revenue, 0);
  const maxRevenue = Math.max(...safeData.map(item => item.revenue), 0);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Évolution des Revenus</h3>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="text-sm text-blue-600 font-medium">Revenus Totaux (Période)</div>
        <div className="text-2xl font-bold text-blue-900">
          {formatCurrency(totalRevenue)}
        </div>
      </div>

      {safeData.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <p>Aucune donnée de revenus à afficher.</p>
        </div>
      ) : (
        <div className="h-64 flex items-end space-x-2">
          {safeData.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center group">
              <div
                className="w-full bg-blue-400 rounded-t transition-all duration-300 hover:bg-blue-600"
                style={{
                  height: `${maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0}%`,
                  minHeight: '2px',
                }}
                title={`${item.month}: ${formatCurrency(item.revenue)}`}
              />
              <div className="text-xs text-gray-500 mt-2 text-center whitespace-nowrap group-hover:font-semibold">
                {item.month}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};