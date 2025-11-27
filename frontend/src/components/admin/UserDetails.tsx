/**
 * 🇨🇭 SimpliFaq - User Details Component
 * 
 * Component for displaying detailed user information and subscription details
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { BillingHistory } from './BillingHistory';

interface UserDetails {
  id: string;
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
  vatNumber?: string;
  phone?: string;
  website?: string;
  language: string;
  currency: string;
  subscriptionPlan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  
  // Address
  street: string;
  city: string;
  postalCode: string;
  country: string;
  canton?: string;
  iban?: string;

  // Subscription details
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    cancelledAt?: string;
    trialStart?: string;
    trialEnd?: string;
    invoicesThisMonth: number;
    storageUsed: number;
    plan: {
      id: string;
      name: string;
      displayName: string;
      price: number;
      currency: string;
      maxInvoicesPerMonth: number;
      maxClientsTotal: number;
      maxProductsTotal: number;
      storageLimit: number;
    };
  };

  // Usage statistics
  usage?: {
    invoicesThisMonth: number;
    clientsTotal: number;
    productsTotal: number;
    storageUsed: number;
  };
}

interface UserDetailsProps {
  userId: string;
  onClose?: () => void;
  className?: string;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ 
  userId, 
  onClose, 
  className = '' 
}) => {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'subscription' | 'usage' | 'billing'>('details');

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails utilisateur');
      }

      const data = await response.json();
      setUser(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleUserAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l'action ${action}`);
      }

      await fetchUserDetails(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleSubscriptionAction = async (action: 'cancel' | 'reactivate') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l'action ${action} sur l'abonnement`);
      }

      await fetchUserDetails(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-CH');
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return limit > 0 ? Math.round((current / limit) * 100) : 0;
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

  if (error || !user) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Erreur</p>
          <p>{error || 'Utilisateur non trouvé'}</p>
          <div className="mt-4 space-x-2">
            <Button onClick={fetchUserDetails} variant="outline" size="sm">
              Réessayer
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="outline" size="sm">
                Fermer
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-secondary">{user.email}</p>
            <p className="text-sm text-secondary">{user.companyName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-sm rounded-full ${
              user.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {user.isActive ? 'Actif' : 'Inactif'}
            </span>
            {onClose && (
              <Button onClick={onClose} variant="outline" size="sm">
                Fermer
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-primary mb-6">
          <nav className="-mb-px flex space-x-8">
            {(
              [
                { id: 'details', label: 'Détails' },
                { id: 'subscription', label: 'Abonnement' },
                { id: 'usage', label: 'Utilisation' },
                { id: 'billing', label: 'Facturation' },
              ] as Array<{ id: 'details' | 'subscription' | 'usage' | 'billing'; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-secondary hover:text-primary hover:border-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">Informations Personnelles</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-secondary">Nom complet</dt>
                    <dd className="text-sm text-primary">{user.firstName} {user.lastName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Email</dt>
                    <dd className="text-sm text-primary">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Téléphone</dt>
                    <dd className="text-sm text-primary">{user.phone || 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Site web</dt>
                    <dd className="text-sm text-primary">{user.website || 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Langue</dt>
                    <dd className="text-sm text-primary">{user.language}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Devise</dt>
                    <dd className="text-sm text-primary">{user.currency}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-primary mb-4">Entreprise</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-secondary">Nom de l'entreprise</dt>
                    <dd className="text-sm text-primary">{user.companyName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Numéro TVA</dt>
                    <dd className="text-sm text-primary">{user.vatNumber || 'Non renseigné'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Adresse</dt>
                    <dd className="text-sm text-primary">
                      {user.street}<br />
                      {user.postalCode} {user.city}<br />
                      {user.canton && `${user.canton}, `}{user.country}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">IBAN</dt>
                    <dd className="text-sm text-primary">{user.iban || 'Non renseigné'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-primary mb-4">Informations Compte</h3>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-secondary">Date d'inscription</dt>
                  <dd className="text-sm text-primary">{formatDateTime(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-secondary">Dernière mise à jour</dt>
                  <dd className="text-sm text-primary">{formatDateTime(user.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-secondary">Dernière connexion</dt>
                  <dd className="text-sm text-primary">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Jamais'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex space-x-2 pt-4 border-t border-primary">
              <Button
                onClick={() => handleUserAction(user.isActive ? 'deactivate' : 'activate')}
                variant={user.isActive ? 'outline' : 'primary'}
                size="sm"
              >
                {user.isActive ? 'Désactiver' : 'Activer'}
              </Button>
              <Button
                onClick={() => handleUserAction('delete')}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Supprimer
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && user.subscription && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">Plan Actuel</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-secondary">Plan</dt>
                    <dd className="text-sm text-primary">{user.subscription.plan.displayName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Prix</dt>
                    <dd className="text-sm text-primary">
                      {formatCurrency(user.subscription.plan.price, user.subscription.plan.currency)}/mois
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Statut</dt>
                    <dd className="text-sm text-primary capitalize">{user.subscription.status}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Période actuelle</dt>
                    <dd className="text-sm text-primary">
                      {formatDate(user.subscription.currentPeriodStart)} - {formatDate(user.subscription.currentPeriodEnd)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-primary mb-4">Limites du Plan</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-secondary">Factures par mois</dt>
                    <dd className="text-sm text-primary">{user.subscription.plan.maxInvoicesPerMonth}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Clients maximum</dt>
                    <dd className="text-sm text-primary">{user.subscription.plan.maxClientsTotal}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Produits maximum</dt>
                    <dd className="text-sm text-primary">{user.subscription.plan.maxProductsTotal}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-secondary">Stockage</dt>
                    <dd className="text-sm text-primary">{user.subscription.plan.storageLimit} MB</dd>
                  </div>
                </dl>
              </div>
            </div>

            {user.subscription.cancelAtPeriodEnd && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Cet abonnement sera annulé à la fin de la période actuelle ({formatDate(user.subscription.currentPeriodEnd)})
                </p>
              </div>
            )}

            <div className="flex space-x-2 pt-4 border-t border-primary">
              {user.subscription.status === 'active' && !user.subscription.cancelAtPeriodEnd && (
                <Button
                  onClick={() => handleSubscriptionAction('cancel')}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Annuler l'abonnement
                </Button>
              )}
              {user.subscription.cancelAtPeriodEnd && (
                <Button
                  onClick={() => handleSubscriptionAction('reactivate')}
                  variant="primary"
                  size="sm"
                >
                  Réactiver l'abonnement
                </Button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'usage' && user.usage && user.subscription && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Utilisation Actuelle</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Factures ce mois</div>
                <div className="text-2xl font-bold text-blue-900">
                  {user.usage.invoicesThisMonth}
                </div>
                <div className="text-xs text-blue-600">
                  sur {user.subscription.plan.maxInvoicesPerMonth} max
                </div>
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${getUsagePercentage(user.usage.invoicesThisMonth, user.subscription.plan.maxInvoicesPerMonth)}%`
                    }}
                  />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Clients</div>
                <div className="text-2xl font-bold text-green-900">
                  {user.usage.clientsTotal}
                </div>
                <div className="text-xs text-green-600">
                  sur {user.subscription.plan.maxClientsTotal} max
                </div>
                <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${getUsagePercentage(user.usage.clientsTotal, user.subscription.plan.maxClientsTotal)}%`
                    }}
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Produits</div>
                <div className="text-2xl font-bold text-purple-900">
                  {user.usage.productsTotal}
                </div>
                <div className="text-xs text-purple-600">
                  sur {user.subscription.plan.maxProductsTotal} max
                </div>
                <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${getUsagePercentage(user.usage.productsTotal, user.subscription.plan.maxProductsTotal)}%`
                    }}
                  />
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Stockage</div>
                <div className="text-2xl font-bold text-orange-900">
                  {user.usage.storageUsed} MB
                </div>
                <div className="text-xs text-orange-600">
                  sur {user.subscription.plan.storageLimit} MB max
                </div>
                <div className="mt-2 w-full bg-orange-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{
                      width: `${getUsagePercentage(user.usage.storageUsed, user.subscription.plan.storageLimit)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div>
            <BillingHistory userId={userId} />
          </div>
        )}
      </Card>
    </div>
  );
};