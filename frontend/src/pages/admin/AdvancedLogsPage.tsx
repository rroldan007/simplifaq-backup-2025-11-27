/**
 * 🇨🇭 SimpliFaq - Admin Advanced Logs Page
 *
 * Advanced audit logs with search, filtering, and real-time monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'auth' | 'billing' | 'user' | 'system' | 'api' | 'security';
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
}

export const AdvancedLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  // Mock data generation
  const generateMockLogs = useCallback((): LogEntry[] => {
    const categories = ['auth', 'billing', 'user', 'system', 'api', 'security'];
    const levels = ['info', 'warning', 'error', 'critical'];
    const actions = {
      auth: ['login', 'logout', 'password_change', 'session_expired', 'failed_login'],
      billing: ['invoice_created', 'payment_received', 'subscription_updated', 'refund_processed'],
      user: ['user_created', 'user_updated', 'user_deleted', 'profile_changed'],
      system: ['backup_started', 'backup_completed', 'system_restart', 'maintenance_mode'],
      api: ['api_call_success', 'api_call_failed', 'rate_limit_exceeded', 'webhook_sent'],
      security: ['suspicious_activity', 'ip_blocked', 'permission_denied', 'data_access']
    };
    const users = [
      { id: '1', email: 'admin@simplifaq.com' },
      { id: '2', email: 'user1@example.com' },
      { id: '3', email: 'support@simplifaq.com' },
      { id: '4', email: 'finance@simplifaq.com' }
    ];

    const mockLogs: LogEntry[] = [];
    for (let i = 0; i < 500; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)] as LogEntry['category'];
      const level = levels[Math.floor(Math.random() * levels.length)] as LogEntry['level'];
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[category][Math.floor(Math.random() * actions[category].length)];

      const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();

      mockLogs.push({
        id: `log_${i + 1}`,
        timestamp,
        level,
        category,
        userId: user.id,
        userEmail: user.email,
        action,
        resource: `${category}_${Math.floor(Math.random() * 1000)}`,
        details: `Details for ${action} on ${category}`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `session_${Math.floor(Math.random() * 10000)}`
      });
    }

    return mockLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockData = generateMockLogs();
      setLogs(mockData);
      setFilteredLogs(mockData);
      setLoading(false);
    }, 1000);
  }, [generateMockLogs]);

  // Filter logs based on criteria
  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return logDate >= startDate && logDate <= endDate;
      });
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, searchTerm, selectedLevel, selectedCategory, dateRange]);

  const getLevelBadge = (level: string) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      critical: 'bg-red-600 text-white'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {level.toUpperCase()}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      auth: 'bg-purple-100 text-purple-800',
      billing: 'bg-green-100 text-green-800',
      user: 'bg-blue-100 text-blue-800',
      system: 'bg-orange-100 text-orange-800',
      api: 'bg-indigo-100 text-indigo-800',
      security: 'bg-red-100 text-red-800'
    };

    const labels = {
      auth: 'Auth',
      billing: 'Facturation',
      user: 'Utilisateur',
      system: 'Système',
      api: 'API',
      security: 'Sécurité'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[category as keyof typeof labels] || category}
      </span>
    );
  };

  const exportLogs = (format: 'csv' | 'json') => {
    const dataToExport = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      category: log.category,
      user: log.userEmail || 'System',
      action: log.action,
      resource: log.resource,
      details: log.details,
      ipAddress: log.ipAddress
    }));

    if (format === 'csv') {
      const csv = [
        Object.keys(dataToExport[0]).join(','),
        ...dataToExport.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs Avancés</h1>
          <p className="text-gray-600">Surveillance d'audit et sécurité du système</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            variant={realTimeEnabled ? "primary" : "outline"}
            size="sm"
          >
            {realTimeEnabled ? '🔴 Temps Réel' : '⚪ Temps Réel'}
          </Button>
          <div className="flex space-x-2">
            <Button onClick={() => exportLogs('csv')} variant="outline" size="sm">
              CSV
            </Button>
            <Button onClick={() => exportLogs('json')} variant="outline" size="sm">
              JSON
            </Button>
          </div>
        </div>
      </header>

      {realTimeEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800">Streaming de logs en temps réel activé</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Filtres</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="Rechercher dans les logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les niveaux</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les catégories</option>
            <option value="auth">Authentification</option>
            <option value="billing">Facturation</option>
            <option value="user">Utilisateurs</option>
            <option value="system">Système</option>
            <option value="api">API</option>
            <option value="security">Sécurité</option>
          </select>

          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {filteredLogs.length} logs trouvés
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Niveau
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ressource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getLevelBadge(log.level)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCategoryBadge(log.category)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.userEmail || 'Système'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.action.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Aucun log trouvé avec les filtres actuels
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} sur {totalPages} ({filteredLogs.length} logs)
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
