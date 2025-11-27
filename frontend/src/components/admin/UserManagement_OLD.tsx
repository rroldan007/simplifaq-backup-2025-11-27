/**
 * ⚠️ ARCHIVO ARCHIVADO - NO USAR
 * 
 * Este componente fue reemplazado por: /pages/admin/UserManagementPage.tsx
 * Renombrado el: 2025-11-26
 * Razón: Código duplicado, NO se usa en ninguna ruta
 * 
 * Mantener como referencia histórica.
 * Si necesitas restaurarlo, renombra de vuelta a UserManagement.tsx
 * 
 * ---
 * 
 * 🇨🇭 SimpliFaq - User Management Component (OLD VERSION)
 * 
 * Component for managing users, subscriptions, and user details in the admin dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { adminApi } from '../../services/adminApi';

interface User {
  id: string;
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
  subscriptionPlan: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  subscription?: {
    id: string;
    status: string;
    plan: {
      id?: string;
      name: string;
      displayName: string;
      price: number;
    };
    currentPeriodEnd: string;
  };
}

interface PlanItem {
  id: string;
  name: string;
  displayName: string;
}

interface UserManagementProps {
  className?: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const usersPerPage = 20;

  // Load plans for filters and plan change
  const fetchPlans = useCallback(async () => {
    try {
      const resp = await adminApi.getPlans();
      const payload: any = (resp as any).data ?? resp;
      const list = (payload as any) as PlanItem[];
      setPlans(list);
    } catch (e) {
      console.error('Failed to load plans', e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({
        page: currentPage,
        limit: usersPerPage,
        search: searchTerm || undefined,
        status: filterStatus,
        plan: filterPlan === 'all' ? undefined : filterPlan,
      });

      // response is ApiResponse from interceptor
      const payload: any = (response as any).data ?? response;
      const list = payload.users || payload.data?.users || [];
      const totalCount = payload.pagination?.totalCount || payload.data?.pagination?.totalCount || 0;
      setUsers(list);
      setTotalPages(Math.ceil(totalCount / usersPerPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus, filterPlan]);

  useEffect(() => {
    fetchPlans();
    fetchUsers();
  }, [fetchUsers]);

  // Resolve a human-readable plan label for display based on subscription or legacy field
  const resolveUserPlanLabel = (user: User): string => {
    if (user.subscription?.plan?.displayName) return user.subscription.plan.displayName;
    const match = plans.find((p) => p.name === user.subscriptionPlan);
    if (match) return match.displayName;
    return user.subscriptionPlan || '—';
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      if (action === 'delete') {
        await adminApi.deleteUser(userId);
      } else {
        const isActive = action === 'activate';
        await adminApi.updateUser(userId, { isActive });
      }

      await fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleSubscriptionChange = async (user: User, newPlanId: string) => {
    try {
      // If user has a subscription, update Subscription with planId
      if (user.subscription?.id) {
        await adminApi.changeSubscriptionPlan(user.subscription.id, {
          planId: newPlanId,
          immediate: true,
          prorated: false,
          reason: 'admin_granted',
        });
      } else {
        // Fallback: update user's subscriptionPlan with plan name for legacy support
        const planName = plans.find(p => p.id === newPlanId)?.name;
        if (planName) {
          await adminApi.updateUser(user.id, { subscriptionPlan: planName });
        }
      }

      await fetchUsers(); // Refresh the list
      setShowUserModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[plan as keyof typeof colors] || colors.free}`}>
        {plan === 'free' ? 'Gratuit' : plan === 'basic' ? 'Basique' : 'Premium'}
      </span>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    const matchesPlan = filterPlan === 'all'
      || user.subscription?.plan?.name === filterPlan
      || user.subscriptionPlan === filterPlan;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

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
            Gestion des Utilisateurs
          </h2>
          <Button
            onClick={fetchUsers}
            variant="outline"
            size="sm"
          >
            Actualiser
          </Button>
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
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.name}>{p.displayName}</option>
            ))}
          </select>
          <div className="text-sm text-secondary flex items-center">
            {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-secondary">{user.email}</div>
                      <div className="text-sm text-secondary">{user.companyName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {resolveUserPlanLabel(user)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {new Date(user.createdAt).toLocaleDateString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        // Preselect current plan in selector
                        const currentPlanId = user.subscription?.plan?.id
                          || plans.find(p => p.name === user.subscriptionPlan)?.id
                          || '';
                        setSelectedPlanId(currentPlanId);
                        setShowUserModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Détails
                    </button>
                    <button
                      onClick={() => handleUserAction(user.id, user.isActive ? 'deactivate' : 'activate')}
                      className={user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                    >
                      {user.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title={`Détails - ${selectedUser.firstName} ${selectedUser.lastName}`}
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-primary mb-2">Informations Utilisateur</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Email:</span>
                  <div className="font-medium">{selectedUser.email}</div>
                </div>
                <div>
                  <span className="text-secondary">Entreprise:</span>
                  <div className="font-medium">{selectedUser.companyName}</div>
                </div>
                <div>
                  <span className="text-secondary">Inscription:</span>
                  <div className="font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString('fr-CH')}
                  </div>
                </div>
                <div>
                  <span className="text-secondary">Dernière connexion:</span>
                  <div className="font-medium">
                    {selectedUser.lastLoginAt 
                      ? new Date(selectedUser.lastLoginAt).toLocaleDateString('fr-CH')
                      : 'Jamais'
                    }
                  </div>
                </div>
              </div>
            </div>

            {selectedUser.subscription && (
              <div>
                <h4 className="font-medium text-primary mb-2">Abonnement</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">Plan:</span>
                    <div className="font-medium">{selectedUser.subscription.plan.displayName}</div>
                  </div>
                  <div>
                    <span className="text-secondary">Prix:</span>
                    <div className="font-medium">{selectedUser.subscription.plan.price} CHF/mois</div>
                  </div>
                  <div>
                    <span className="text-secondary">Statut:</span>
                    <div className="font-medium">{selectedUser.subscription.status}</div>
                  </div>
                  <div>
                    <span className="text-secondary">Fin de période:</span>
                    <div className="font-medium">
                      {new Date(selectedUser.subscription.currentPeriodEnd).toLocaleDateString('fr-CH')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <select
                className="px-3 py-2 rounded-md input-theme"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="">Sélectionner un plan…</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.displayName}</option>
                ))}
              </select>
              <Button
                onClick={() => selectedPlanId && handleSubscriptionChange(selectedUser, selectedPlanId)}
                variant="outline"
                size="sm"
                disabled={!selectedPlanId}
              >
                Appliquer le plan
              </Button>
              <Button
                onClick={() => handleUserAction(selectedUser.id, selectedUser.isActive ? 'deactivate' : 'activate')}
                variant={selectedUser.isActive ? 'outline' : 'primary'}
                size="sm"
              >
                {selectedUser.isActive ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};