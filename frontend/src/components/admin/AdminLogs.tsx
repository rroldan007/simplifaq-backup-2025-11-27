/**
 * 🇨🇭 SimpliFaq - Admin Logs Component
 * 
 * Component for displaying and filtering administrative action audit logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AdminLogsProps {
  className?: string;
}

export const AdminLogs: React.FC<AdminLogsProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResourceType, setFilterResourceType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 50;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: logsPerPage.toString(),
        search: searchTerm,
        action: filterAction,
        resourceType: filterResourceType,
        dateRange,
      });

      const response = await fetch(`/api/admin/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des logs');
      }

      const data = await response.json();
      setLogs(data.data.logs || []);
      setTotalPages(Math.ceil((data.data.total || 0) / logsPerPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterAction, filterResourceType, searchTerm, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        action: filterAction,
        resourceType: filterResourceType,
        dateRange,
        format: 'csv',
      });

      const response = await fetch(`/api/admin/logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `admin_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
    }
  };

  const getActionBadge = (action: string) => {
    const colors = {
      user_created: 'bg-green-100 text-green-800',
      user_updated: 'bg-blue-100 text-blue-800',
      user_deleted: 'bg-red-100 text-red-800',
      subscription_changed: 'bg-purple-100 text-purple-800',
      plan_updated: 'bg-yellow-100 text-yellow-800',
      system_config_updated: 'bg-gray-100 text-gray-800',
      login: 'bg-indigo-100 text-indigo-800',
      logout: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      user_created: 'Utilisateur créé',
      user_updated: 'Utilisateur modifié',
      user_deleted: 'Utilisateur supprimé',
      subscription_changed: 'Abonnement modifié',
      plan_updated: 'Plan mis à jour',
      system_config_updated: 'Config système',
      login: 'Connexion',
      logout: 'Déconnexion',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[action as keyof typeof labels] || action}
      </span>
    );
  };

  const getResourceTypeBadge = (resourceType: string) => {
    const colors = {
      user: 'bg-blue-100 text-blue-800',
      subscription: 'bg-purple-100 text-purple-800',
      plan: 'bg-yellow-100 text-yellow-800',
      system: 'bg-gray-100 text-gray-800',
      admin: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[resourceType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {resourceType}
      </span>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-CH');
  };

  const getUniqueActions = () => {
    const actions = [...new Set(logs.map(log => log.action))];
    return actions.sort();
  };

  const getUniqueResourceTypes = () => {
    const types = [...new Set(logs.map(log => log.resourceType))];
    return types.sort();
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

  return (
    <div className={className}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            Logs d'Administration
          </h2>
          <div className="flex space-x-2">
            <Button
              onClick={exportLogs}
              variant="outline"
              size="sm"
            >
              Exporter CSV
            </Button>
            <Button
              onClick={fetchLogs}
              variant="outline"
              size="sm"
            >
              Actualiser
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les actions</option>
            {getUniqueActions().map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          <select
            value={filterResourceType}
            onChange={(e) => setFilterResourceType(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les types</option>
            {getUniqueResourceTypes().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '1d' | '7d' | '30d' | '90d')}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">Dernières 24h</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>

          <div className="text-sm text-secondary flex items-center">
            {logs.length} log{logs.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Administrateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Ressource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  IP/Agent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {log.adminEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getResourceTypeBadge(log.resourceType)}
                      {log.resourceId && (
                        <span className="text-xs text-secondary">
                          #{log.resourceId.slice(-8)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary max-w-xs truncate">
                    {log.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-secondary">
                    {log.ipAddress && (
                      <div>{log.ipAddress}</div>
                    )}
                    {log.userAgent && (
                      <div className="truncate max-w-32" title={log.userAgent}>
                        {log.userAgent}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !loading && (
          <div className="text-center text-secondary py-8">
            <p>Aucun log trouvé pour les critères sélectionnés</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-secondary">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Précédent
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};