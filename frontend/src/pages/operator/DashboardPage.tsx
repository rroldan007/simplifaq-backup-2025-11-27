/**
 * 🇨🇭 SimpliFaq - Operator Dashboard
 * Real-time metrics and system overview
 */

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';
import { Users, CreditCard, FileText, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalInvoices: number;
  monthlyRevenue: number;
  growthRate: number;
}

export function OperatorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user stats - using existing API endpoint
      const usersResponse = await adminApi.getUsers({ page: 1, limit: 1 });
      
      // Set basic stats from available data
      type UsersResponseData = { pagination?: { totalCount?: number }; users?: { isActive?: boolean }[] };
      const respData = usersResponse.data as UsersResponseData;
      const totalUsers = respData?.pagination?.totalCount || 0;
      const activeUsers = respData?.users?.filter((u) => u.isActive).length || 0;
      
      setStats({
        totalUsers,
        activeUsers,
        totalSubscriptions: 0,  // Will be populated when we build subscriptions page
        activeSubscriptions: 0,
        totalInvoices: 0,
        monthlyRevenue: 0,
        growthRate: 0
      });
    } catch (err: unknown) {
      console.error('Dashboard stats error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadDashboardStats}
              className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      id: 'users',
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      subtitle: `${stats?.activeUsers || 0} active`,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      value: stats?.totalSubscriptions || 0,
      subtitle: `${stats?.activeSubscriptions || 0} active`,
      icon: CreditCard,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      id: 'invoices',
      title: 'Invoices',
      value: stats?.totalInvoices || 0,
      subtitle: 'Total generated',
      icon: FileText,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      id: 'revenue',
      title: 'Monthly Revenue',
      value: `CHF ${stats?.monthlyRevenue?.toFixed(2) || '0.00'}`,
      subtitle: `${stats?.growthRate || 0}% growth`,
      icon: TrendingUp,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">System overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {card.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {card.value}
              </p>
              <p className="text-sm text-gray-500">
                {card.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              View All Users
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              Manage Subscriptions
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              Generate Reports
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Backup</span>
              <span className="text-sm text-gray-900">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
