/**
 * 🇨🇭 SimpliFaq - Admin Role Management Page
 *
 * Comprehensive role and permissions management system
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'billing' | 'system' | 'content' | 'analytics' | 'settings';
  level: 'read' | 'write' | 'delete' | 'admin';
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[]; // permission IDs
  userCount: number;
  createdAt: string;
  isSystem: boolean; // cannot be deleted if true
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  permissions: string[];
  status: 'active' | 'inactive';
}

export const RoleManagementPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});

  // Mock data generation
  const generateMockPermissions = (): Permission[] => [
    // Users
    { id: 'users.read', name: 'Voir Utilisateurs', description: 'Accès en lecture aux utilisateurs', category: 'users', level: 'read' },
    { id: 'users.write', name: 'Modifier Utilisateurs', description: 'Créer et modifier utilisateurs', category: 'users', level: 'write' },
    { id: 'users.delete', name: 'Supprimer Utilisateurs', description: 'Supprimer utilisateurs', category: 'users', level: 'delete' },

    // Billing
    { id: 'billing.read', name: 'Voir Facturation', description: 'Accès aux données de facturation', category: 'billing', level: 'read' },
    { id: 'billing.write', name: 'Gérer Facturation', description: 'Créer et modifier factures', category: 'billing', level: 'write' },
    { id: 'billing.delete', name: 'Supprimer Factures', description: 'Supprimer factures', category: 'billing', level: 'delete' },

    // System
    { id: 'system.read', name: 'Voir Métriques Système', description: 'Accès aux métriques système', category: 'system', level: 'read' },
    { id: 'system.write', name: 'Gérer Système', description: 'Configuration système', category: 'system', level: 'write' },
    { id: 'system.admin', name: 'Admin Système', description: 'Contrôle total du système', category: 'system', level: 'admin' },

    // Analytics
    { id: 'analytics.read', name: 'Voir Analytics', description: 'Accès aux données d\'analyse', category: 'analytics', level: 'read' },
    { id: 'analytics.write', name: 'Gérer Analytics', description: 'Configuration des analytics', category: 'analytics', level: 'write' },

    // Content
    { id: 'content.read', name: 'Voir Contenu', description: 'Accès au contenu', category: 'content', level: 'read' },
    { id: 'content.write', name: 'Gérer Contenu', description: 'Créer et modifier contenu', category: 'content', level: 'write' },

    // Settings
    { id: 'settings.read', name: 'Voir Paramètres', description: 'Accès aux paramètres', category: 'settings', level: 'read' },
    { id: 'settings.write', name: 'Gérer Paramètres', description: 'Modifier paramètres système', category: 'settings', level: 'write' },
    { id: 'settings.admin', name: 'Admin Paramètres', description: 'Contrôle total des paramètres', category: 'settings', level: 'admin' },
  ];

  const generateMockRoles = (): Role[] => [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Contrôle total du système',
      color: 'bg-red-500',
      permissions: ['users.read', 'users.write', 'users.delete', 'billing.read', 'billing.write', 'billing.delete', 'system.read', 'system.write', 'system.admin', 'analytics.read', 'analytics.write', 'content.read', 'content.write', 'settings.read', 'settings.write', 'settings.admin'],
      userCount: 2,
      createdAt: '2025-01-01T00:00:00Z',
      isSystem: true
    },
    {
      id: 'support_admin',
      name: 'Admin Support',
      description: 'Gestion du support utilisateur et tickets',
      color: 'bg-blue-500',
      permissions: ['users.read', 'users.write', 'analytics.read', 'content.read', 'content.write'],
      userCount: 5,
      createdAt: '2025-02-15T10:00:00Z',
      isSystem: false
    },
    {
      id: 'finance_admin',
      name: 'Admin Finance',
      description: 'Gestion financière et facturation',
      color: 'bg-green-500',
      permissions: ['billing.read', 'billing.write', 'billing.delete', 'analytics.read', 'users.read'],
      userCount: 3,
      createdAt: '2025-03-01T09:00:00Z',
      isSystem: false
    },
    {
      id: 'technical_admin',
      name: 'Admin Technique',
      description: 'Maintenance système et monitoring',
      color: 'bg-purple-500',
      permissions: ['system.read', 'system.write', 'analytics.read', 'settings.read'],
      userCount: 4,
      createdAt: '2025-03-15T11:00:00Z',
      isSystem: false
    },
    {
      id: 'content_admin',
      name: 'Admin Contenu',
      description: 'Gestion du contenu et communications',
      color: 'bg-orange-500',
      permissions: ['content.read', 'content.write', 'users.read', 'analytics.read'],
      userCount: 6,
      createdAt: '2025-04-01T08:00:00Z',
      isSystem: false
    }
  ];

  const generateMockAdminUsers = (): AdminUser[] => [
    { id: '1', name: 'Jean Dupont', email: 'admin@simplifaq.com', role: 'super_admin', lastActive: '2025-09-17T10:30:00Z', permissions: ['all'], status: 'active' },
    { id: '2', name: 'Marie Martin', email: 'marie@simplifaq.com', role: 'support_admin', lastActive: '2025-09-17T09:15:00Z', permissions: ['users.read', 'users.write'], status: 'active' },
    { id: '3', name: 'Pierre Durand', email: 'pierre@simplifaq.com', role: 'finance_admin', lastActive: '2025-09-16T16:45:00Z', permissions: ['billing.read', 'billing.write'], status: 'active' },
    { id: '4', name: 'Sophie Leroy', email: 'sophie@simplifaq.com', role: 'technical_admin', lastActive: '2025-09-17T08:20:00Z', permissions: ['system.read', 'system.write'], status: 'active' },
    { id: '5', name: 'Lucas Moreau', email: 'lucas@simplifaq.com', role: 'content_admin', lastActive: '2025-09-16T14:10:00Z', permissions: ['content.read', 'content.write'], status: 'inactive' },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setPermissions(generateMockPermissions());
      setRoles(generateMockRoles());
      setAdminUsers(generateMockAdminUsers());
      setLoading(false);
    }, 1000);
  }, []);

  const getCategoryBadge = (category: string) => {
    const colors = {
      users: 'bg-blue-100 text-blue-800',
      billing: 'bg-green-100 text-green-800',
      system: 'bg-purple-100 text-purple-800',
      content: 'bg-orange-100 text-orange-800',
      analytics: 'bg-indigo-100 text-indigo-800',
      settings: 'bg-red-100 text-red-800'
    };

    const labels = {
      users: 'Utilisateurs',
      billing: 'Facturation',
      system: 'Système',
      content: 'Contenu',
      analytics: 'Analytics',
      settings: 'Paramètres'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[category as keyof typeof labels] || category}
      </span>
    );
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      read: 'bg-green-100 text-green-800',
      write: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      admin: 'bg-purple-600 text-white'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {level.toUpperCase()}
      </span>
    );
  };

  const getRoleById = (roleId: string) => roles.find(role => role.id === roleId);

  const handleCreateRole = () => {
    if (!formData.name || !formData.description) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    const newRole: Role = {
      id: `role_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      color: formData.color || 'bg-gray-500',
      permissions: formData.permissions || [],
      userCount: 0,
      createdAt: new Date().toISOString(),
      isSystem: false
    };

    setRoles(prev => [...prev, newRole]);
    setShowCreateRoleModal(false);
    setFormData({});
  };

  const handleEditRole = () => {
    if (!selectedRole || !formData.name || !formData.description) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    setRoles(prev => prev.map(role =>
      role.id === selectedRole.id
        ? { ...role, ...formData }
        : role
    ));
    setShowEditRoleModal(false);
    setSelectedRole(null);
    setFormData({});
  };

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      alert('Impossible de supprimer un rôle système.');
      return;
    }

    if (role?.userCount && role.userCount > 0) {
      alert('Impossible de supprimer un rôle qui a des utilisateurs assignés.');
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
    }
  };

  const handleAssignRole = () => {
    if (!selectedUser || !formData.roleId) {
      alert('Veuillez sélectionner un utilisateur et un rôle.');
      return;
    }

    const role = roles.find(r => r.id === formData.roleId);
    if (!role) return;

    setAdminUsers(prev => prev.map(user =>
      user.id === selectedUser.id
        ? { ...user, role: formData.roleId, permissions: role.permissions }
        : user
    ));

    // Update role user counts
    setRoles(prev => prev.map(r =>
      r.id === formData.roleId
        ? { ...r, userCount: r.userCount + 1 }
        : r.id === selectedUser.role
        ? { ...r, userCount: Math.max(0, r.userCount - 1) }
        : r
    ));

    setShowAssignRoleModal(false);
    setSelectedUser(null);
    setFormData({});
  };

  const toggleUserStatus = (userId: string) => {
    setAdminUsers(prev => prev.map(user =>
      user.id === userId
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Rôles et Permissions</h1>
          <p className="text-gray-600">Administration des accès et autorisations système</p>
        </div>
        <div className="flex space-x-4">
          <Button onClick={() => setShowCreateRoleModal(true)}>Créer Rôle</Button>
          <Button onClick={() => setShowAssignRoleModal(true)} variant="outline">Assigner Rôle</Button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rôles</p>
              <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admins Actifs</p>
              <p className="text-2xl font-bold text-green-600">
                {adminUsers.filter(u => u.status === 'active').length}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Permissions Totales</p>
              <p className="text-2xl font-bold text-purple-600">{permissions.length}</p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rôles Système</p>
              <p className="text-2xl font-bold text-orange-600">
                {roles.filter(r => r.isSystem).length}
              </p>
            </div>
            <div className="text-orange-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Roles Management */}
      <Card>
        <CardHeader title="Gestion des Rôles" />
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full ${role.color}`}></div>
                  <div>
                    <h3 className="font-medium text-gray-900">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs text-gray-400">{role.userCount} utilisateurs</span>
                      {role.isSystem && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Système
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-sm font-medium">{role.permissions.length} permissions</div>
                    <div className="text-xs text-gray-500">
                      Créé le {new Date(role.createdAt).toLocaleDateString('fr-CH')}
                    </div>
                  </div>

                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedRole(role);
                    setFormData({ ...role });
                    setShowEditRoleModal(true);
                  }}>
                    Modifier
                  </Button>

                  {!role.isSystem && role.userCount === 0 && (
                    <Button size="sm" variant="outline" onClick={() => handleDeleteRole(role.id)}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Users */}
      <Card>
        <CardHeader title="Utilisateurs Admin" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière Activité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminUsers.map((user) => {
                  const userRole = getRoleById(user.role);
                  return (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {userRole && (
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${userRole.color}`}></div>
                            <span className="text-sm font-medium">{userRole.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.lastActive).toLocaleString('fr-CH')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedUser(user);
                          setFormData({ roleId: user.role });
                          setShowAssignRoleModal(true);
                        }}>
                          Changer Rôle
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleUserStatus(user.id)}>
                          {user.status === 'active' ? 'Désactiver' : 'Activer'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Overview */}
      <Card>
        <CardHeader title="Aperçu des Permissions" />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-medium text-gray-900 capitalize flex items-center space-x-2">
                  {getCategoryBadge(category)}
                  <span>({perms.length})</span>
                </h3>
                <div className="space-y-2">
                  {perms.slice(0, 3).map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{perm.name}</span>
                      {getLevelBadge(perm.level)}
                    </div>
                  ))}
                  {perms.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{perms.length - 3} autres permissions
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <Modal
          isOpen={showCreateRoleModal}
          onClose={() => setShowCreateRoleModal(false)}
          title="Créer un Nouveau Rôle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du rôle *
              </label>
              <Input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Admin Support"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <Input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du rôle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur
              </label>
              <select
                value={formData.color || 'bg-blue-500'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bg-blue-500">Bleu</option>
                <option value="bg-green-500">Vert</option>
                <option value="bg-purple-500">Violet</option>
                <option value="bg-red-500">Rouge</option>
                <option value="bg-orange-500">Orange</option>
                <option value="bg-yellow-500">Jaune</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="max-h-60 overflow-y-auto space-y-3">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                      {getCategoryBadge(category)}
                    </h4>
                    <div className="ml-4 space-y-2">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={(formData.permissions || []).includes(perm.id)}
                            onChange={(e) => {
                              const current = formData.permissions || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, permissions: [...current, perm.id] });
                              } else {
                                setFormData({ ...formData, permissions: current.filter((p: string) => p !== perm.id) });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm">{perm.name}</span>
                          {getLevelBadge(perm.level)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowCreateRoleModal(false)}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleCreateRole}>
                Créer Rôle
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Role Modal */}
      {showEditRoleModal && selectedRole && (
        <Modal
          isOpen={showEditRoleModal}
          onClose={() => {
            setShowEditRoleModal(false);
            setSelectedRole(null);
            setFormData({});
          }}
          title={`Modifier ${selectedRole.name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du rôle *
              </label>
              <Input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Admin Support"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <Input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du rôle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Couleur
              </label>
              <select
                value={formData.color || 'bg-blue-500'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bg-blue-500">Bleu</option>
                <option value="bg-green-500">Vert</option>
                <option value="bg-purple-500">Violet</option>
                <option value="bg-red-500">Rouge</option>
                <option value="bg-orange-500">Orange</option>
                <option value="bg-yellow-500">Jaune</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="max-h-60 overflow-y-auto space-y-3">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                      {getCategoryBadge(category)}
                    </h4>
                    <div className="ml-4 space-y-2">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={(formData.permissions || []).includes(perm.id)}
                            onChange={(e) => {
                              const current = formData.permissions || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, permissions: [...current, perm.id] });
                              } else {
                                setFormData({ ...formData, permissions: current.filter((p: string) => p !== perm.id) });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm">{perm.name}</span>
                          {getLevelBadge(perm.level)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => {
                  setShowEditRoleModal(false);
                  setSelectedRole(null);
                  setFormData({});
                }}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleEditRole}>
                Enregistrer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Role Modal */}
      {showAssignRoleModal && (
        <Modal
          isOpen={showAssignRoleModal}
          onClose={() => {
            setShowAssignRoleModal(false);
            setSelectedUser(null);
            setFormData({});
          }}
          title="Assigner un Rôle"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisateur
              </label>
              <select
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const user = adminUsers.find(u => u.id === e.target.value);
                  setSelectedUser(user || null);
                }}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un utilisateur...</option>
                {adminUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau Rôle
              </label>
              <select
                value={formData.roleId || ''}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un rôle...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.roleId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Permissions du rôle sélectionné:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {roles.find(r => r.id === formData.roleId)?.permissions.map((permId) => {
                    const permission = permissions.find(p => p.id === permId);
                    return permission ? (
                      <div key={permId} className="flex items-center space-x-1">
                        <span className="text-xs text-blue-700">{permission.name}</span>
                        {getLevelBadge(permission.level)}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => {
                  setShowAssignRoleModal(false);
                  setSelectedUser(null);
                  setFormData({});
                }}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleAssignRole}>
                Assigner Rôle
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
