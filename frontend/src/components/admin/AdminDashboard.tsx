import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { SaaSMetrics } from './SaaSMetrics';
import { UserGrowthChart } from './UserGrowthChart';
import { RevenueChart } from './RevenueChart';
import { UsageAnalytics } from './UsageAnalytics';
import { SystemHealth } from './SystemHealth';
import { adminApi } from '../../services/adminApi';
import type {
  AdminDashboardData,
  UsageData,
  HealthData,
  OverviewData
} from '../../types/admin';

export const AdminDashboard: React.FC = () => {
  console.log('[AdminDashboard] Component mounted');
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  // Type guards to ensure API data matches expected shapes
  const isAdminDashboardData = (data: unknown): data is AdminDashboardData => {
    if (!data || typeof data !== 'object') return false;
    const d = data as Partial<AdminDashboardData>;
    return !!d.overview && !!d.charts;
  };

  const isUsageDataArray = (data: unknown): data is UsageData[] => {
    return Array.isArray(data);
  };

  const isHealthData = (data: unknown): data is HealthData => {
    return !!data && typeof data === 'object';
  };

  const fetchAllData = useCallback(async () => {
    console.log('[AdminDashboard] fetchAllData called, period:', selectedPeriod);
    const period: '7d' | '30d' | '90d' | '1y' = selectedPeriod;
    if (!refreshing) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('[AdminDashboard] Fetching data from APIs...');
      const [analyticsRes, usageRes, healthRes] = await Promise.all([
        adminApi.getDashboardAnalytics({ period }),
        adminApi.getUsageAnalytics({ period }),
        adminApi.getSystemHealth(),
      ]);

      console.log('[AdminDashboard] API responses:', { analyticsRes, usageRes, healthRes });
      let fetchError: string | null = null;

      if (analyticsRes.success && isAdminDashboardData(analyticsRes.data)) {
        console.log('[AdminDashboard] ✅ Analytics data received:', analyticsRes.data);
        setDashboardData(analyticsRes.data);
      } else {
        fetchError = analyticsRes.error?.message || 'Failed to fetch dashboard analytics.';
        console.error('[AdminDashboard] ❌ Analytics fetch error:', analyticsRes.error);
      }

      if (usageRes.success && isUsageDataArray(usageRes.data)) {
        setUsageData(usageRes.data);
      } else {
        console.error('Usage analytics fetch error:', usageRes.error);
        // Non-critical, so we don't set a blocking error
        setUsageData([]);
      }

      if (healthRes.success && isHealthData(healthRes.data)) {
        setHealthData(healthRes.data);
      } else {
        console.error('System health fetch error:', healthRes.error);
        // Non-critical
        setHealthData(null);
      }

      if (fetchError) {
        setError(fetchError);
      }
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, selectedPeriod]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const renderContent = () => {
    console.log('[AdminDashboard] renderContent - loading:', loading, 'error:', error, 'hasData:', !!dashboardData);
    
    if (loading && !refreshing) {
      console.log('[AdminDashboard] Rendering loading state');
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (error) {
      console.log('[AdminDashboard] Rendering error state:', error);
      return (
        <div className="p-8">
          <Card className="max-w-md mx-auto p-6 bg-red-50 border-red-200">
            <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-700 my-4">{error}</p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <LoadingSpinner size="sm" /> : 'Retry'}
            </Button>
          </Card>
        </div>
      );
    }

    if (!dashboardData || !dashboardData.overview || !dashboardData.charts) {
      console.log('[AdminDashboard] No data to display, dashboardData:', dashboardData);
      return <div className="p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>No data to display.</div>;
    }

    console.log('[AdminDashboard] Rendering dashboard with data');
    const formatters = {
      formatCurrency: (amount: number) => new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(amount),
      formatNumber: (num: number) => new Intl.NumberFormat('fr-CH').format(num),
      formatPercentage: (num: number) => `${(num * 100).toFixed(1)}%`,
    };

    const overview: OverviewData = dashboardData.overview;

    return (
      <div>
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Platform overview for SimpliFaq</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg shadow-sm">
              {(['7d', '30d', '90d', '1y'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    selectedPeriod === period
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  {period}
                </button>
              ))}
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              {refreshing ? <LoadingSpinner size="sm" /> : 'Refresh'}
            </Button>
          </div>
        </header>

        <div className="space-y-8">
          <Card>
            <CardHeader title="Key Business Metrics" />
            <CardContent>
              <SaaSMetrics overview={overview} period={selectedPeriod} {...formatters} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader title="User Growth" />
                <CardContent>
                  <UserGrowthChart data={dashboardData.charts.userGrowth} loading={loading} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="Revenue Overview" />
                <CardContent>
                  <RevenueChart data={dashboardData.charts.revenueGrowth} loading={loading} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card>
                <CardHeader title="Usage Analytics" />
                <CardContent>
                  <UsageAnalytics data={usageData} loading={loading} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader title="System Health" />
                <CardContent>
                  <SystemHealth data={healthData} loading={loading} error={error} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  };

  console.log('[AdminDashboard] About to return renderContent()');
  const content = renderContent();
  console.log('[AdminDashboard] renderContent() returned:', content);
  return content;
};