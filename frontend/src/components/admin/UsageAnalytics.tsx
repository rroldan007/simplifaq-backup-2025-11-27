/**
 * 🇨🇭 SimpliFaq - Usage Analytics Component
 * 
 * Component for displaying usage analytics and charts in the admin dashboard
 */

import React from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { UsageData } from '../../types/admin';

interface UsageAnalyticsProps {
  data: UsageData[];
  loading: boolean;
  className?: string;
}

export const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({ data, loading, className = '' }) => {

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      default:
        return '➡️';
    }
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }



  // Ensure data is always a valid array
  const safeUsageData = Array.isArray(data) ? data : [];

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Analyse d'Utilisation
        </h3>
        {/* Refresh functionality can be handled by the parent component */}
      </div>

      {safeUsageData.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>Aucune donnée d'utilisation disponible</p>
        </div>
      ) : (
        <div className="space-y-6">
          {safeUsageData.map((usage, index) => (
            <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 capitalize">
                    {usage.resourceType.replace('_', ' ')}
                  </span>
                  <span className="text-sm">
                    {getTrendIcon(usage.trend)}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${getUsageColor(usage.percentage)}`}>
                    {usage.percentage.toFixed(1)}%
                  </span>
                  <div className="text-xs text-gray-500">
                    {usage.currentUsage.toLocaleString()} / {usage.limit.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(usage.percentage)}`}
                  style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                />
              </div>
              
              {usage.percentage >= 80 && (
                <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  ⚠️ Limite bientôt atteinte - Considérer une mise à niveau
                </div>
              )}
            </div>
          ))}
        </div>
      )}


    </Card>
  );
};