/**
 * 🇨🇭 SimpliFaq - Admin User Management Page
 *
 * Comprehensive user management with advanced features
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminApi } from '../../services/adminApi';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: 'admin' | 'user' | 'premium';
  status: 'active' | 'inactive' | 'pending';
  plan: string; // free, basic, premium, Beta, etc.
  createdAt: string;
  lastLogin?: string;
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired';
  totalInvoices: number;
  totalRevenue: number;
  emailConfirmed: boolean;
  emailConfirmedAt?: string;
}

type RawUser = { id: string; email: string; firstName?: string; lastName?: string; companyName?: string; subscriptionPlan?: string; isActive?: boolean; createdAt?: string; lastLogin?: string; subscription?: { status?: string }; stats?: { invoiceCount?: number }; emailConfirmed?: boolean; emailConfirmedAt?: string };

interface AdminUsersResponse {
  users: RawUser[];
  pagination?: {
    totalPages?: number;
    totalCount?: number;
  };
}

export const UserManagementPage: React.FC = () => {
  const { isAuthenticated, hasPermission } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [formData, setFormData] = useState<Partial<User>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const usersPerPage = 20;
  
  const [availablePlans, setAvailablePlans] = useState<{ id: string; name: string; price?: number; displayName?: string; currency?: string }[]>([]);

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, filterStatus, searchTerm, currentPage]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await adminApi.getPlans();
        if (!response.success || !response.data) return;

        type RawPlan = { id?: string; name: string; price?: number; displayName?: string; currency?: string };
        const rawData = response.data as { plans?: RawPlan[] } | RawPlan[];
        const plansArray = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData.plans)
            ? rawData.plans
            : [];

        setAvailablePlans(plansArray.map((plan) => ({
          id: plan.id || plan.name,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          displayName: plan.displayName,
        })));
      } catch (err) {
        console.error('Error loading plans:', err);
      }
    };

    loadPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication and permissions
      if (!isAuthenticated) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      if (!hasPermission('users', 'read')) {
        setError('Permissions insuffisantes pour cette action.');
        setLoading(false);
        return;
      }
      
      const params = {
        page: currentPage,
        limit: usersPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
      };

      console.log('[UserManagement] Fetching users with params:', params);

      const response = await adminApi.getUsers(params);

      if (response.success && response.data) {
        const data = response.data as AdminUsersResponse;
        if (!data.users || !Array.isArray(data.users)) {
          setError('Format de réponse invalide pour les utilisateurs');
          return;
        }

        const mappedUsers: User[] = data.users.map((u) => {
          const subStatus = u.subscription?.status;
          const subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired' = 
            (subStatus === 'active' || subStatus === 'trial' || subStatus === 'expired') 
              ? subStatus 
              : (u.subscriptionPlan !== 'free' ? 'active' : 'inactive');
          
          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            company: u.companyName || '',
            role: u.subscriptionPlan === 'premium' ? 'premium' : u.subscriptionPlan === 'admin' ? 'admin' : 'user',
            status: u.isActive ? 'active' : 'inactive',
            plan: u.subscriptionPlan || 'free',
            createdAt: u.createdAt || new Date().toISOString(),
            lastLogin: u.lastLogin || undefined,
            subscriptionStatus,
            totalInvoices: u.stats?.invoiceCount || 0,
            totalRevenue: 0,
            emailConfirmed: u.emailConfirmed || false,
            emailConfirmedAt: u.emailConfirmedAt || undefined,
          };
        });
        
        setUsers(mappedUsers);
        
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.totalCount || 0);
        }
      } else {
        setError(response.error?.message || 'Erreur lors du chargement des utilisateurs');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      premium: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
    };

    const labels = {
      admin: 'Admin',
      premium: 'Premium',
      user: 'Utilisateur',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };

    const labels = {
      active: 'Actif',
      inactive: 'Inactif',
      pending: 'En attente',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    // Normalizar el nombre del plan
    const normalizedPlan = plan.toLowerCase().replace(/\s+/g, '');
    
    const colors: Record<string, string> = {
      'beta': 'bg-yellow-100 text-yellow-800',
      'free': 'bg-gray-100 text-gray-800',
      'plangratuit': 'bg-gray-100 text-gray-800',
      'basic': 'bg-blue-100 text-blue-800',
      'planbasique': 'bg-blue-100 text-blue-800',
      'premium': 'bg-purple-100 text-purple-800',
      'planpremium': 'bg-purple-100 text-purple-800',
    };

    const labels: Record<string, string> = {
      'beta': 'Beta',
      'free': 'Gratuit',
      'plangratuit': 'Gratuit',
      'basic': 'Basique', 
      'planbasique': 'Basique',
      'premium': 'Premium',
      'planpremium': 'Premium',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
        colors[normalizedPlan] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[normalizedPlan] || plan}
      </span>
    );
  };

  const getSubscriptionBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      expired: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      active: 'Actif',
      trial: 'Essai',
      expired: 'Expiré',
      inactive: 'Inactif',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getEmailVerificationBadge = (emailConfirmed: boolean, _emailConfirmedAt?: string) => {
    if (emailConfirmed) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          ✅ Oui
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          ❌ Non
        </span>
      );
    }
  };

  // IMPORTANTE: NO filtrar aquí porque el backend ya filtra
  // El backend ya maneja search, status, y paginación
  // Filtro local solo para 'role' ya que el backend no lo soporta
  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesRole;
  });

  // Usar directamente los usuarios filtrados (el backend ya paginó)
  const paginatedUsers = filteredUsers;

  const handleCreateUser = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    try {
      const userData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        company: formData.company || '',
        subscriptionPlan: formData.plan || 'free',
      };

      const response = await adminApi.createUser(userData);
      
      if (response.success) {
        setShowCreateModal(false);
        setFormData({});
        fetchUsers(); // Refresh the list
        alert('Utilisateur créé avec succès');
      } else {
        alert(response.error?.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Create user error:', error);
      alert('Erreur lors de la création');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formData.firstName || !formData.lastName) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        company: formData.company || '',
        subscriptionPlan: formData.plan || selectedUser.plan,
        isActive: formData.status === 'active',
      };

      const response = await adminApi.updateUser(selectedUser.id, userData);
      
      if (response.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        setFormData({});
        fetchUsers(); // Refresh the list
        alert('Utilisateur mis à jour avec succès');
      } else {
        alert(response.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Update user error:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setFormData({ ...user });
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.')) {
      try {
        const response = await adminApi.deleteUserPermanently(userId);
        
        if (response.success) {
          fetchUsers(); // Refresh the list
          alert('Utilisateur supprimé définitivement avec succès!');
        } else {
          alert('Erreur lors de la suppression: ' + (response.error?.message || 'Erreur inconnue'));
        }
      } catch (error) {
        console.error('Delete user error:', error);
        alert('Erreur lors de la suppression de l\'utilisateur');
      }
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      const response = await adminApi.updateUser(userId, {
        isActive: newStatus === 'active',
      });
      
      if (response.success) {
        fetchUsers(); // Refresh the list
      } else {
        alert('Erreur lors du changement de statut: ' + (response.error?.message || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Gestion des Utilisateurs</h1>
        <Button onClick={() => setShowCreateModal(true)}>Nouvel Utilisateur</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-primary">{totalCount || users.length}</div>
          <div className="text-sm text-secondary">Utilisateurs totaux</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.status === 'active').length}
          </div>
          <div className="text-sm text-secondary">Utilisateurs actifs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.role === 'premium').length}
          </div>
          <div className="text-sm text-secondary">Utilisateurs Premium</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.subscriptionStatus === 'active').length}
          </div>
          <div className="text-sm text-secondary">Abonnements actifs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.emailConfirmed).length}
          </div>
          <div className="text-sm text-secondary">Emails vérifiés</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">
            {users.filter(u => !u.emailConfirmed).length}
          </div>
          <div className="text-sm text-secondary">Emails non vérifiés</div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            Liste des Utilisateurs
          </h2>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            type="text"
            placeholder="Rechercher par email, nom ou entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="premium">Premium</option>
            <option value="user">Utilisateur</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'active' | 'inactive' | 'all')}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="pending">En attente</option>
          </select>
          <div className="text-sm text-secondary flex items-center">
            {totalCount || filteredUsers.length} utilisateur{(totalCount || filteredUsers.length) !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center text-secondary py-8">
            <p>Chargement des utilisateurs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center text-red-600 py-8">
            <p>{error}</p>
            <Button onClick={fetchUsers} variant="outline" size="sm" className="mt-4">
              Réessayer
            </Button>
          </div>
        )}

        {/* Users Table */}
        {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Email Vérifié
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Factures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Revenus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-secondary">{user.email}</div>
                      <div className="text-xs text-secondary">{user.company}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getEmailVerificationBadge(user.emailConfirmed, user.emailConfirmedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlanBadge(user.plan)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {user.totalInvoices}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    CHF {user.totalRevenue.toLocaleString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => handleViewUser(user)}
                    >
                      Voir
                    </button>
                    <button
                      className="text-green-600 hover:text-green-900"
                      onClick={() => handleEditClick(user)}
                    >
                      Modifier
                    </button>
                    <button
                      className="text-purple-600 hover:text-purple-900"
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedPlan(user.plan);
                        setShowChangePlanModal(true);
                      }}
                    >
                      Plan
                    </button>
                    <button
                      className="text-orange-600 hover:text-orange-900"
                      onClick={() => handleToggleStatus(user.id)}
                    >
                      {user.status === 'active' ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {!loading && !error && filteredUsers.length === 0 && (
          <div className="text-center text-secondary py-8">
            <p>Aucun utilisateur trouvé</p>
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

      {/* Create User Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nouvel Utilisateur"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Prénom *
                </label>
                <Input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Nom *
                </label>
                <Input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Nom de famille"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Entreprise
              </label>
              <Input
                type="text"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Rôle
              </label>
              <select
                value={formData.role || 'user'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">Utilisateur</option>
                <option value="premium">Premium</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleCreateUser}>
                Créer Utilisateur
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            setFormData({});
          }}
          title={`Modifier ${selectedUser.firstName} ${selectedUser.lastName}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Prénom *
                </label>
                <Input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Nom *
                </label>
                <Input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Nom de famille"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Entreprise
              </label>
              <Input
                type="text"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Rôle
                </label>
                <select
                  value={formData.role || 'user'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">Utilisateur</option>
                  <option value="premium">Premium</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Statut
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as User['status'] })}
                  className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="pending">En attente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Plan d'abonnement
              </label>
              <select
                value={formData.plan || selectedUser.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="free">Gratuit</option>
                <option value="basic">Basique</option>
                <option value="premium">Premium</option>
                <option value="Beta">Beta</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  setFormData({});
                }}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleEditUser}>
                Enregistrer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedUser(null);
          }}
          title={`${selectedUser.firstName} ${selectedUser.lastName}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-secondary">Email:</span>
                <div className="text-sm text-primary">{selectedUser.email}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Entreprise:</span>
                <div className="text-sm text-primary">{selectedUser.company}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Rôle:</span>
                <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Statut:</span>
                <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Abonnement:</span>
                <div className="mt-1">{getSubscriptionBadge(selectedUser.subscriptionStatus)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-secondary">Créé le:</span>
                <div className="text-sm text-primary">
                  {new Date(selectedUser.createdAt).toLocaleDateString('fr-CH')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{selectedUser.totalInvoices}</div>
                <div className="text-sm text-secondary">Factures</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  CHF {selectedUser.totalRevenue.toLocaleString('fr-CH')}
                </div>
                <div className="text-sm text-secondary">Revenus</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {selectedUser.lastLogin
                    ? new Date(selectedUser.lastLogin).toLocaleDateString('fr-CH')
                    : 'Jamais'
                  }
                </div>
                <div className="text-sm text-secondary">Dernière connexion</div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                variant="outline"
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Plan Modal */}
      {showChangePlanModal && selectedUser && (
        <Modal
          isOpen={showChangePlanModal}
          onClose={() => {
            setShowChangePlanModal(false);
            setSelectedUser(null);
            setSelectedPlan('');
          }}
          title={`Changer le plan de ${selectedUser.firstName} ${selectedUser.lastName}`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Plan actuel:</strong> {getPlanBadge(selectedUser.plan)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Nouveau plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un plan</option>
                {availablePlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.displayName || plan.name}
                    {plan.price != null
                      ? ` - ${new Intl.NumberFormat('fr-CH', { style: 'currency', currency: plan.currency || 'CHF' }).format(plan.price)}/mois`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => {
                  setShowChangePlanModal(false);
                  setSelectedUser(null);
                  setSelectedPlan('');
                }}
                variant="outline"
              >
                Annuler
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    if (!selectedPlan) {
                      alert('Veuillez sélectionner un plan.');
                      return;
                    }

                    const selectedPlanDetails = availablePlans.find(p => p.id === selectedPlan);
                    const planId = selectedPlan;
                    const planName = selectedPlanDetails?.name || selectedPlan;

                    // New endpoint using SubscriptionManagementService (preferred)
                    const response = await adminApi.changeUserPlan(selectedUser.id, {
                      planId,
                      immediate: true,
                    });

                    if (!response.success) {
                      // _old fallback: legacy user update route (remove when new endpoint is stable)
                      const legacyResponse = await adminApi.updateUser(selectedUser.id, {
                        subscriptionPlan: planName,
                      });

                      if (!legacyResponse.success) {
                        alert(legacyResponse.error?.message || 'Erreur lors de la mise à jour du plan');
                        return;
                      }
                    }

                    const updatedUsers = users.map(u => 
                      u.id === selectedUser.id ? { ...u, plan: planName } : u
                    );
                    setUsers(updatedUsers);
                    alert('Plan mis à jour avec succès!');
                  } catch (error) {
                    console.error('Error updating plan:', error);
                    alert('Erreur lors de la mise à jour du plan');
                  } finally {
                    setShowChangePlanModal(false);
                    setSelectedUser(null);
                    setSelectedPlan('');
                  }
                }}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};