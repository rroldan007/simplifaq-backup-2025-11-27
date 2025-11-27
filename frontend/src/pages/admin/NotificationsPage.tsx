/**
 * 🇨🇭 SimpliFaq - Admin Notifications Page
 *
 * Send broadcast messages and email campaigns to users
 */

import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface Notification {
  id: string;
  type: 'broadcast' | 'email_campaign';
  title: string;
  message: string;
  recipients: string;
  status: 'draft' | 'sent' | 'scheduled';
  createdAt: string;
  sentAt?: string;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'broadcast',
      title: 'Maintenance Programmée',
      message: 'Le système sera en maintenance ce soir de 22h à 24h.',
      recipients: 'Tous les utilisateurs',
      status: 'sent',
      createdAt: '2025-09-10T08:00:00Z',
      sentAt: '2025-09-10T09:00:00Z',
    },
    {
      id: '2',
      type: 'email_campaign',
      title: 'Nouvelles Fonctionnalités',
      message: 'Découvrez les nouvelles fonctionnalités de SimpliFaq...',
      recipients: 'Utilisateurs du plan Premium',
      status: 'scheduled',
      createdAt: '2025-09-15T10:30:00Z',
    },
  ]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'broadcast' as 'broadcast' | 'email_campaign',
    title: '',
    message: '',
    recipients: 'all',
    scheduledFor: '',
  });

  const getTypeBadge = (type: string) => {
    const colors = {
      broadcast: 'bg-blue-100 text-blue-800',
      email_campaign: 'bg-purple-100 text-purple-800',
    };

    const labels = {
      broadcast: 'Diffusion',
      email_campaign: 'Campagne Email',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[type as keyof typeof labels] || type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-green-100 text-green-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
    };

    const labels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      scheduled: 'Programmée',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const handleCreateNotification = () => {
    if (!formData.title || !formData.message) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    const recipientsLabel = formData.recipients === 'all' ? 'Tous les utilisateurs' :
                           formData.recipients === 'premium' ? 'Utilisateurs Premium' :
                           'Utilisateurs sélectionnés';

    const newNotification: Notification = {
      id: (notifications.length + 1).toString(),
      type: formData.type,
      title: formData.title,
      message: formData.message,
      recipients: recipientsLabel,
      status: formData.scheduledFor ? 'scheduled' : 'draft',
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [...prev, newNotification]);
    setShowCreateModal(false);
    setFormData({
      type: 'broadcast',
      title: '',
      message: '',
      recipients: 'all',
      scheduledFor: '',
    });
  };

  const handleSendNow = (notification: Notification) => {
    setNotifications(prev => prev.map(n =>
      n.id === notification.id
        ? { ...n, status: 'sent', sentAt: new Date().toISOString() }
        : n
    ));
    alert(`Notification "${notification.title}" envoyée!`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Notifications</h1>
        <Button onClick={() => setShowCreateModal(true)}>Nouvelle Notification</Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary">
            Historique des Notifications
          </h2>
          <Button variant="outline" size="sm">
            Actualiser
          </Button>
        </div>

        {/* Notifications Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="surface-elevated">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Destinataires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Créée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {notifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(notification.type)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {notification.title}
                      </div>
                      <div className="text-sm text-secondary line-clamp-2">
                        {notification.message}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {notification.recipients}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(notification.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {new Date(notification.createdAt).toLocaleDateString('fr-CH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {notification.status === 'draft' && (
                      <button
                        className="text-green-600 hover:text-green-900"
                        onClick={() => handleSendNow(notification)}
                      >
                        Envoyer
                      </button>
                    )}
                    <button className="text-blue-600 hover:text-blue-900">
                      Modifier
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {notifications.length === 0 && (
          <div className="text-center text-secondary py-8">
            <p>Aucune notification trouvée</p>
          </div>
        )}
      </Card>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nouvelle Notification"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Type de Notification
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'broadcast' | 'email_campaign' })}
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="broadcast">Diffusion (message in-app)</option>
                <option value="email_campaign">Campagne Email</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Titre *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de la notification"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Contenu de la notification"
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Destinataires
              </label>
              <select
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les utilisateurs</option>
                <option value="premium">Utilisateurs Premium</option>
                <option value="basic">Utilisateurs Basic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Programmer pour (optionnel)
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleCreateNotification}>
                {formData.scheduledFor ? 'Programmer' : 'Créer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
