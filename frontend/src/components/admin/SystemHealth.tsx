/**
 * 🇨🇭 SimpliFaq - System Health Component
 * 
 * Component for displaying system health monitoring and status in the admin dashboard
 */

import React from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { HealthData } from '../../types/admin';

interface SystemHealthProps {
  data: HealthData | null;
  loading: boolean;
  error: string | null;
  className?: string;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ data: healthData, loading, error, className = '' }) => {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
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

  if (error || !healthData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Erreur de chargement</p>
          <p>{error || 'Les données de l\'état du système ne sont pas disponibles.'}</p>
          {/* The parent component will handle the retry logic */}
        </div>
      </Card>
    );
  }

  const overallStatus = healthData.status;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-primary">
          État du Système
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(overallStatus)}`}>
          {getStatusIcon(overallStatus)} {overallStatus === 'healthy' ? 'Opérationnel' : 
                                         overallStatus === 'warning' ? 'Attention' : 'Problème'}
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-sm text-secondary">Uptime</div>
          <div className="text-lg font-semibold text-green-600">
            {formatUptime(healthData.uptime)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-secondary">Mémoire</div>
          <div className={`text-lg font-semibold ${getUsageColor(healthData.resources.memory.percentage)}`}>
            {healthData.resources.memory.percentage.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-secondary">CPU</div>
          <div className={`text-lg font-semibold ${getUsageColor(healthData.resources.cpu.usage)}`}>
            {healthData.resources.cpu.usage.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-secondary">Utilisateurs</div>
          <div className="text-lg font-semibold text-blue-600">
            {healthData.users.active}/{healthData.users.total}
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="space-y-3">
        <h4 className="font-medium text-primary">Services</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 surface-elevated rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-lg">
                {getStatusIcon(healthData.services.database.status)}
              </span>
              <div>
                <div className="font-medium text-primary">Base de données</div>
                <div className="text-sm text-secondary">
                  {healthData.services.database.connectionCount} connexions
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getStatusColor(healthData.services.database.status).split(' ')[0]}`}>
                {healthData.services.database.status === 'healthy' ? 'Opérationnel' : 
                 healthData.services.database.status === 'warning' ? 'Attention' : 'Erreur'}
              </div>
              <div className="text-xs text-secondary">
                {healthData.services.database.responseTime.toFixed(0)}ms
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 surface-elevated rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-lg">
                {getStatusIcon(healthData.services.api.status)}
              </span>
              <div>
                <div className="font-medium text-primary">API</div>
                <div className="text-sm text-secondary">
                  {healthData.services.api.requestCount} requêtes
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${getStatusColor(healthData.services.api.status).split(' ')[0]}`}>
                {healthData.services.api.status === 'healthy' ? 'Opérationnel' : 
                 healthData.services.api.status === 'warning' ? 'Attention' : 'Erreur'}
              </div>
              <div className="text-xs text-secondary">
                {healthData.services.api.responseTime.toFixed(0)}ms • {healthData.services.api.errorRate.toFixed(1)}% erreurs
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-primary">
        <div className="flex items-center justify-between text-sm text-secondary">
          <span>Dernière vérification:</span>
          <span>{new Date(healthData.timestamp).toLocaleString('fr-CH')}</span>
        </div>
      </div>
    </Card>
  );
};