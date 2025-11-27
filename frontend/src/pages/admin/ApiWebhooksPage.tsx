/**
 * 🇨🇭 SimpliFaq - Admin API/Webhooks Page
 *
 * Manage API keys and webhooks
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  userEmail: string;
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
  active: boolean;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export const ApiWebhooksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api' | 'webhooks'>('api');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Integration App',
      key: 'sk_test_1234567890abcdef',
      userEmail: 'user1@example.com',
      permissions: ['read_invoices', 'write_invoices'],
      createdAt: '2025-09-10T08:00:00Z',
      lastUsed: '2025-09-17T10:00:00Z',
      active: true,
    },
  ]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    {
      id: '1',
      name: 'Invoice Created',
      url: 'https://example.com/webhook/invoice',
      events: ['invoice.created', 'invoice.updated'],
      secret: 'wh_sec_test_abcdef123456',
      active: true,
      createdAt: '2025-09-10T08:00:00Z',
      lastTriggered: '2025-09-17T10:00:00Z',
    },
  ]);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiKey | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState<any>({});

  const handleCreateApiKey = () => {
    if (!formData.name || !formData.userEmail) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    const newApiKey: ApiKey = {
      id: (apiKeys.length + 1).toString(),
      name: formData.name,
      key: `sk_test_${Math.random().toString(36).substr(2, 16)}`,
      userEmail: formData.userEmail,
      permissions: formData.permissions || [],
      createdAt: new Date().toISOString(),
      active: true,
    };

    setApiKeys(prev => [...prev, newApiKey]);
    setShowApiModal(false);
    setFormData({});
  };

  const handleCreateWebhook = () => {
    if (!formData.name || !formData.url) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }

    const newWebhook: Webhook = {
      id: (webhooks.length + 1).toString(),
      name: formData.name,
      url: formData.url,
      events: formData.events || [],
      secret: `wh_sec_test_${Math.random().toString(36).substr(2, 16)}`,
      active: true,
      createdAt: new Date().toISOString(),
    };

    setWebhooks(prev => [...prev, newWebhook]);
    setShowWebhookModal(false);
    setFormData({});
  };

  const handleToggleApiActive = (id: string) => {
    setApiKeys(prev => prev.map(key =>
      key.id === id ? { ...key, active: !key.active } : key
    ));
  };

  const handleToggleWebhookActive = (id: string) => {
    setWebhooks(prev => prev.map(webhook =>
      webhook.id === id ? { ...webhook, active: !webhook.active } : webhook
    ));
  };

  const handleDeleteApiKey = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette clé API ?')) {
      setApiKeys(prev => prev.filter(key => key.id !== id));
    }
  };

  const handleDeleteWebhook = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce webhook ?')) {
      setWebhooks(prev => prev.filter(webhook => webhook.id !== id));
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">API & Webhooks</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('api')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Clés API
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Webhooks
          </button>
        </nav>
      </div>

      {activeTab === 'api' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-primary">
              Clés API
            </h2>
            <Button onClick={() => setShowApiModal(true)}>Nouvelle Clé API</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
              <thead className="surface-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-primary)]">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-[var(--color-bg-secondary)]">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-primary">
                          {key.name}
                        </div>
                        <div className="text-sm text-secondary font-mono">
                          {key.key.substring(0, 20)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {key.userEmail}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      {key.permissions.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        key.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {key.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => handleToggleApiActive(key.id)}
                      >
                        {key.active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteApiKey(key.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {apiKeys.length === 0 && (
            <div className="text-center text-secondary py-8">
              <p>Aucune clé API trouvée</p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'webhooks' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-primary">
              Webhooks
            </h2>
            <Button onClick={() => setShowWebhookModal(true)}>Nouveau Webhook</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
              <thead className="surface-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Événements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-primary)]">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-[var(--color-bg-secondary)]">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-primary">
                          {webhook.name}
                        </div>
                        <div className="text-sm text-secondary font-mono">
                          {webhook.secret.substring(0, 15)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      {webhook.url}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      {webhook.events.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        webhook.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {webhook.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => handleToggleWebhookActive(webhook.id)}
                      >
                        {webhook.active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteWebhook(webhook.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {webhooks.length === 0 && (
            <div className="text-center text-secondary py-8">
              <p>Aucun webhook trouvé</p>
            </div>
          )}
        </Card>
      )}

      {/* Create API Key Modal */}
      {showApiModal && (
        <Modal
          isOpen={showApiModal}
          onClose={() => setShowApiModal(false)}
          title="Nouvelle Clé API"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Nom *
              </label>
              <Input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom de la clé API"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Email de l'utilisateur *
              </label>
              <Input
                type="email"
                value={formData.userEmail || ''}
                onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Permissions
              </label>
              <div className="space-y-2">
                {['read_invoices', 'write_invoices', 'read_clients', 'write_clients'].map((perm) => (
                  <label key={perm} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.permissions || []).includes(perm)}
                      onChange={(e) => {
                        const current = formData.permissions || [];
                        if (e.target.checked) {
                          setFormData({ ...formData, permissions: [...current, perm] });
                        } else {
                          setFormData({ ...formData, permissions: current.filter((p: string) => p !== perm) });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm">{perm}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowApiModal(false)}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleCreateApiKey}>
                Créer Clé API
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Webhook Modal */}
      {showWebhookModal && (
        <Modal
          isOpen={showWebhookModal}
          onClose={() => setShowWebhookModal(false)}
          title="Nouveau Webhook"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Nom *
              </label>
              <Input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                URL *
              </label>
              <Input
                type="url"
                value={formData.url || ''}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Événements
              </label>
              <div className="space-y-2">
                {['invoice.created', 'invoice.updated', 'invoice.paid', 'client.created'].map((event) => (
                  <label key={event} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.events || []).includes(event)}
                      onChange={(e) => {
                        const current = formData.events || [];
                        if (e.target.checked) {
                          setFormData({ ...formData, events: [...current, event] });
                        } else {
                          setFormData({ ...formData, events: current.filter((e: string) => e !== event) });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowWebhookModal(false)}
                variant="outline"
              >
                Annuler
              </Button>
              <Button onClick={handleCreateWebhook}>
                Créer Webhook
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
