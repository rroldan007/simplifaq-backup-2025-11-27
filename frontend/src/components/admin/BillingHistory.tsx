/**
 * 🇨🇭 SimpliFaq - Billing History Component
 * 
 * Component for tracking payment history and billing events in the admin dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface BillingEvent {
  id: string;
  userId: string;
  userEmail: string;
  userCompany: string;
  eventType: string;
  amount?: number;
  currency: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}

interface BillingHistoryProps {
  className?: string;
  userId?: string; // Optional: filter by specific user
}

export const BillingHistory: React.FC<BillingHistoryProps> = ({ 
  className = '', 
  userId 
}) => {
  const [billingEvents, setBillingEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const eventsPerPage = 20;

  const fetchBillingHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: eventsPerPage.toString(),
        search: searchTerm,
        eventType: filterEventType,
        status: filterStatus,
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/admin/billing/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique de facturation');
      }

      const data = await response.json();
      setBillingEvents(data.data.events || []);
      setTotalPages(Math.ceil((data.data.total || 0) / eventsPerPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [currentPage, eventsPerPage, filterEventType, filterStatus, searchTerm, userId]);

  useEffect(() => {
    fetchBillingHistory();
  }, [fetchBillingHistory]);

  const getEventTypeBadge = (eventType: string) => {
    const colors = {
      subscription_created: 'bg-green-100 text-green-800',
      payment_succeeded: 'bg-blue-100 text-blue-800',
      payment_failed: 'bg-red-100 text-red-800',
      subscription_cancelled: 'bg-gray-100 text-gray-800',
      plan_changed: 'bg-purple-100 text-purple-800',
    };

    const labels = {
      subscription_created: 'Abonnement créé',
      payment_succeeded: 'Paiement réussi',
      payment_failed: 'Paiement échoué',
      subscription_cancelled: 'Abonnement annulé',
      plan_changed: 'Plan modifié',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[eventType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[eventType as keyof typeof labels] || eventType}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status === 'success' ? 'Succès' : 
         status === 'failed' ? 'Échec' : 
         status === 'pending' ? 'En attente' : status}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency || 'CHF'
    }).format(amount);
  };

  const exportBillingData = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        eventType: filterEventType,
        status: filterStatus,
        format: 'csv',
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/admin/billing/export?${params}`, {
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
      a.download = `billing_history_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
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

  return (
    <div className={className}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            {userId ? 'Historique de Facturation Utilisateur' : 'Historique de Facturation'}
          </h2>
          <div className="flex space-x-2">
            <Button
              onClick={exportBillingData}
              variant="outline"
              size="sm"
            >
              Exporter CSV
            </Button>
            <Button
              onClick={fetchBillingHistory}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            type="text"
            placeholder="Rechercher par email ou entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les événements</option>
            <option value="subscription_created">Abonnement créé</option>
            <option value="payment_succeeded">Paiement réussi</option>
            <option value="payment_failed">Paiement échoué</option>
            <option value="subscription_cancelled">Abonnement annulé</option>
            <option value="plan_changed">Plan modifié</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="success">Succès</option>
            <option value="failed">Échec</option>
            <option value="pending">En attente</option>
          </select>
          <div className="text-sm text-secondary flex items-center">
            {billingEvents.length} événement{billingEvents.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Événement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Détails
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {billingEvents.map((event) => (
                <tr key={event.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {new Date(event.createdAt).toLocaleString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {event.userEmail}
                      </div>
                      <div className="text-sm text-secondary">{event.userCompany}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getEventTypeBadge(event.eventType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {event.amount ? formatCurrency(event.amount, event.currency) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(event.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {event.errorMessage && (
                      <div className="text-red-600 text-xs">
                        {event.errorMessage}
                      </div>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="text-xs text-secondary">
                        Métadonnées disponibles
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {billingEvents.length === 0 && !loading && (
          <div className="text-center text-secondary py-8">
            <p>Aucun événement de facturation trouvé</p>
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