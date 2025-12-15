/**
 * 🇨🇭 SimpliFaq - Admin User Subscriptions Management
 */

import React, { useState, useEffect } from 'react';
import { Users, CreditCard, Calendar, AlertCircle } from 'lucide-react';
// adminApi reserved for future use
// import { adminApi } from '../../services/adminApi';

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  user: {
    id: string;
    email: string;
    companyName: string;
    firstName: string;
    lastName: string;
  };
  plan: {
    id: string;
    name: string;
    displayName: string;
    price: number;
    currency: string;
  };
}

export const UserSubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar USUARIOS con sus planes en lugar de solo suscripciones formales
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/users?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Mapear usuarios a formato de suscripción
        type RawUserSub = { id: string; subscription?: { id?: string; planId?: string; status?: string; currentPeriodStart?: string; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean; stripeCustomerId?: string; stripeSubscriptionId?: string }; createdAt?: string; email?: string; companyName?: string; subscriptionPlan?: string };
        const userSubscriptions = result.data.users.map((u: RawUserSub) => ({
          id: u.subscription?.id || u.id,
          userId: u.id,
          planId: u.subscription?.planId || 'none',
          status: u.subscription?.status || 'active',
          currentPeriodStart: u.subscription?.currentPeriodStart || u.createdAt,
          currentPeriodEnd: u.subscription?.currentPeriodEnd || null,
          cancelAtPeriodEnd: u.subscription?.cancelAtPeriodEnd || false,
          stripeCustomerId: u.subscription?.stripeCustomerId || null,
          stripeSubscriptionId: u.subscription?.stripeSubscriptionId || null,
          user: {
            id: u.id,
            email: u.email,
            companyName: u.companyName || '',
            firstName: u.firstName || '',
            lastName: u.lastName || '',
          },
          plan: {
            id: u.subscription?.plan?.id || 'free',
            name: u.subscriptionPlan || 'free',
            displayName: u.subscription?.plan?.displayName || u.subscriptionPlan || 'Gratuit',
            price: u.subscription?.plan?.price || 0,
            currency: 'CHF',
          },
        }));
        
        setSubscriptions(userSubscriptions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.user.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.plan.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Annulation prévue
        </span>
      );
    }

    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Actif' },
      past_due: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'En retard' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulé' },
      trialing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Essai' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Abonnements des Utilisateurs</h1>
        <p className="text-gray-600">Gérez les abonnements et les plans des utilisateurs</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{subscriptions.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-green-600">
                {subscriptions.filter(s => s.status === 'active').length}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-orange-600">
                {subscriptions.filter(s => s.status === 'past_due').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Annulés</p>
              <p className="text-2xl font-bold text-red-600">
                {subscriptions.filter(s => s.status === 'cancelled').length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher par email, entreprise ou plan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stripe
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'Aucun abonnement trouvé' : 'Aucun abonnement'}
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {sub.user.firstName?.[0]}{sub.user.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sub.user.companyName}
                          </div>
                          <div className="text-sm text-gray-500">{sub.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sub.plan.displayName}
                      </div>
                      <div className="text-sm text-gray-500">{sub.plan.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {sub.plan.price} {sub.plan.currency}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sub.plan.price === 0 ? 'Gratuit' : '/mois'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Début: {formatDate(sub.currentPeriodStart)}</div>
                      <div>Fin: {formatDate(sub.currentPeriodEnd)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.stripeCustomerId ? (
                        <div className="flex items-center text-green-600">
                          <CreditCard className="w-4 h-4 mr-1" />
                          Connecté
                        </div>
                      ) : (
                        <span className="text-gray-400">Non connecté</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 text-sm text-gray-600">
        Affichage de {filteredSubscriptions.length} sur {subscriptions.length} abonnement(s)
      </div>
    </div>
  );
};
