/**
 * 🇨🇭 SimpliFaq - Admin Audit Logs Page
 *
 * View security and activity logs
 */

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  ip: string;
  timestamp: string;
  details?: string;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: '1',
      userId: 'user1',
      userEmail: 'user1@example.com',
      action: 'login',
      resource: 'auth',
      ip: '192.168.1.100',
      timestamp: '2025-09-17T10:00:00Z',
      details: 'Login successful',
    },
    {
      id: '2',
      userId: 'user2',
      userEmail: 'user2@example.com',
      action: 'create_invoice',
      resource: 'invoice',
      ip: '192.168.1.101',
      timestamp: '2025-09-17T09:30:00Z',
      details: 'Created invoice INV-2025-002',
    },
    {
      id: '3',
      userId: 'admin',
      userEmail: 'admin@example.com',
      action: 'delete_user',
      resource: 'user',
      ip: '192.168.1.1',
      timestamp: '2025-09-16T14:20:00Z',
      details: 'Deleted user account',
    },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const getActionBadge = (action: string) => {
    const colors = {
      login: 'bg-green-100 text-green-800',
      logout: 'bg-gray-100 text-gray-800',
      create_invoice: 'bg-blue-100 text-blue-800',
      update_invoice: 'bg-yellow-100 text-yellow-800',
      delete_invoice: 'bg-red-100 text-red-800',
      delete_user: 'bg-red-100 text-red-800',
      update_user: 'bg-orange-100 text-orange-800',
    };

    const labels = {
      login: 'Connexion',
      logout: 'Déconnexion',
      create_invoice: 'Créer Facture',
      update_invoice: 'Modifier Facture',
      delete_invoice: 'Supprimer Facture',
      delete_user: 'Supprimer Utilisateur',
      update_user: 'Modifier Utilisateur',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[action as keyof typeof labels] || action}
      </span>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || log.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Logs d'Audit</h1>
        <Button variant="outline">Exporter</Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            Historique d'Activité
          </h2>
          <Button variant="outline" size="sm">
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Input
            type="text"
            placeholder="Rechercher par email, action ou ressource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les actions</option>
            <option value="login">Connexion</option>
            <option value="create_invoice">Créer Facture</option>
            <option value="update_invoice">Modifier Facture</option>
            <option value="delete_invoice">Supprimer Facture</option>
            <option value="update_user">Modifier Utilisateur</option>
            <option value="delete_user">Supprimer Utilisateur</option>
          </select>
          <div className="text-sm text-secondary flex items-center">
            {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Ressource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Détails
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {new Date(log.timestamp).toLocaleString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">
                      {log.userEmail}
                    </div>
                    <div className="text-sm text-secondary">ID: {log.userId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {log.ip}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center text-secondary py-8">
            <p>Aucun log trouvé</p>
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
