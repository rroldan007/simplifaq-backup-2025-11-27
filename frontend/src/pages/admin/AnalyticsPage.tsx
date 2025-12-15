/**
 * 🇨🇭 SimpliFaq - Admin Analytics Page (Real Data Only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, DollarSign, Activity, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AnalyticsData {
  users: {
    total: number;
    active: number;
    new: number;
    churnRate: number;
  };
  subscriptions: {
    total: number;
    active: number;
    cancelled: number;
    revenue: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    growth: number;
  };
  engagement: {
    dau: number;
    mau: number;
    avgSessionDuration: number;
  };
}

type StatCardProps = {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color: string;
};

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/analytics/dashboard?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Error al cargar analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Aperçu des métriques clés</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="90d">90 jours</option>
            <option value="1y">1 an</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Utilisateurs Totaux"
          value={data.users?.total || 0}
          change={data.users?.new}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Utilisateurs Actifs"
          value={data.users?.active || 0}
          icon={Activity}
          color="bg-green-500"
        />
        <StatCard
          title="Abonnements Actifs"
          value={data.subscriptions?.active || 0}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatCard
          title="Revenue (MRR)"
          value={`CHF ${(data.revenue?.mrr || 0).toLocaleString()}`}
          change={data.revenue?.growth}
          icon={DollarSign}
          color="bg-emerald-500"
        />
      </div>

      {/* Details Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Utilisateurs
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.users?.total || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actifs</span>
              <span className="font-semibold text-green-600">{data.users?.active || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Nouveaux</span>
              <span className="font-semibold text-blue-600">{data.users?.new || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Taux de désabonnement</span>
              <span className="font-semibold text-red-600">
                {(data.users?.churnRate || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">MRR</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                CHF {(data.revenue?.mrr || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">ARR</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                CHF {(data.revenue?.arr || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Croissance</span>
              <span className={`font-semibold ${(data.revenue?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(data.revenue?.growth || 0) >= 0 ? '+' : ''}{(data.revenue?.growth || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Abonnements
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.subscriptions?.total || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actifs</span>
              <span className="font-semibold text-green-600">
                {data.subscriptions?.active || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Annulés</span>
              <span className="font-semibold text-red-600">
                {data.subscriptions?.cancelled || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Engagement
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">DAU</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.engagement?.dau || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">MAU</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.engagement?.mau || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Session moyenne</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.round((data.engagement?.avgSessionDuration || 0) / 60)} min
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
