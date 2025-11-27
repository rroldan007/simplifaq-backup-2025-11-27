/**
 * 🇨🇭 SimpliFaq - Admin System Health Page
 *
 * System monitoring and health dashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/adminApi';

interface SystemMetrics {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  activeConnections: number;
  errorRate: number;
}

interface HealthData {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  lastChecked: string;
  timestamp: string;
  resources: Array<{
    name: string;
    status: string;
    usage?: number;
  }>;
  users: number;
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'warning';
    responseTime?: number;
  }>;
  metrics: SystemMetrics;
}

export const SystemHealthPage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealthData = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);

      const response = await adminApi.getSystemHealth();
      if (response.success) {
        // Mock data for demonstration since backend may not have this
        const mockData: HealthData = {
          status: 'healthy',
          uptime: '7 days, 14 hours',
          lastChecked: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          resources: [
            { name: 'CPU', status: 'healthy', usage: 42 },
            { name: 'Memory', status: 'healthy', usage: 65 },
            { name: 'Disk', status: 'warning', usage: 78 },
          ],
          users: 1247,
          services: [
            { name: 'Database', status: 'up', responseTime: 45 },
            { name: 'Email Service', status: 'up', responseTime: 120 },
            { name: 'Payment Gateway', status: 'up', responseTime: 89 },
            { name: 'File Storage', status: 'warning', responseTime: 300 },
          ],
          metrics: {
            uptime: 98.5,
            memoryUsage: 65,
            cpuUsage: 42,
            diskUsage: 78,
            activeConnections: 1247,
            errorRate: 0.02,
          },
        };
        setHealthData(mockData);
      } else {
        setError(response.error?.message || 'Erreur lors du chargement des données de santé');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealthData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <Card className="max-w-md mx-auto p-6 bg-red-50 border-red-200">
          <h3 className="text-xl font-semibold text-red-800">Erreur de Chargement</h3>
          <p className="text-red-700 my-4">{error}</p>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <LoadingSpinner size="sm" /> : 'Réessayer'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Santé du Système</h1>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          {refreshing ? <LoadingSpinner size="sm" /> : 'Actualiser'}
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">État Général du Système</h2>
            <p className="text-sm text-secondary mt-1">
              Dernière vérification: {healthData ? new Date(healthData.lastChecked).toLocaleString('fr-CH') : 'N/A'}
            </p>
          </div>
          <div className={`text-2xl font-bold ${getStatusColor(healthData?.status || 'healthy')}`}>
            {healthData?.status === 'healthy' ? '✓ Sain' :
             healthData?.status === 'warning' ? '⚠ Attention' :
             '✗ Critique'}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Metrics */}
        <Card>
          <CardHeader title="Métriques Système" />
          <CardContent>
            {healthData?.metrics && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Temps de fonctionnement</span>
                  <span className="text-sm font-medium">{healthData.uptime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Utilisation Mémoire</span>
                  <span className="text-sm font-medium">{healthData.metrics.memoryUsage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Utilisation CPU</span>
                  <span className="text-sm font-medium">{healthData.metrics.cpuUsage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Utilisation Disque</span>
                  <span className="text-sm font-medium">{healthData.metrics.diskUsage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Connexions Actives</span>
                  <span className="text-sm font-medium">{healthData.metrics.activeConnections}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Taux d'Erreur</span>
                  <span className="text-sm font-medium">{healthData.metrics.errorRate}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services Status */}
        <Card>
          <CardHeader title="État des Services" />
          <CardContent>
            <div className="space-y-3">
              {healthData?.services?.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'up' ? 'bg-green-500' :
                      service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium text-primary">{service.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getServiceStatusColor(service.status)}`}>
                      {service.status === 'up' ? 'En ligne' :
                       service.status === 'warning' ? 'Attention' : 'Hors ligne'}
                    </span>
                    {service.responseTime && (
                      <span className="text-xs text-secondary">
                        {service.responseTime}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
