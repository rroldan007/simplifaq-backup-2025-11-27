/**
 * 🇨🇭 SimpliFaq - System Configuration Component
 * 
 * Component for managing SaaS-wide system configuration settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface SystemConfigItem {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  isActive: boolean;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

interface SystemConfigProps {
  className?: string;
}

export const SystemConfig: React.FC<SystemConfigProps> = ({ className = '' }) => {
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfigItem | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    isActive: true,
  });

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la configuration');
      }

      const data = await response.json();
      setConfigs(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSaveConfig = async () => {
    try {
      const url = editingConfig 
        ? `/api/admin/system/config/${editingConfig.id}`
        : '/api/admin/system/config';
      
      const method = editingConfig ? 'PUT' : 'POST';

      let value: unknown = formData.value;
      
      // Try to parse JSON if it looks like JSON
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: formData.key,
          value,
          description: formData.description,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      await fetchConfigs();
      setShowConfigModal(false);
      setEditingConfig(null);
      setFormData({ key: '', value: '', description: '', isActive: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleEditConfig = (config: SystemConfigItem) => {
    setEditingConfig(config);
    setFormData({
      key: config.key,
      value: typeof config.value === 'object' ? JSON.stringify(config.value, null, 2) : String(config.value),
      description: config.description || '',
      isActive: config.isActive,
    });
    setShowConfigModal(true);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/system/config/${configId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleToggleActive = async (config: SystemConfigItem) => {
    try {
      const response = await fetch(`/api/admin/system/config/${config.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          isActive: !config.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const formatValue = (value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getValueType = (value: unknown) => {
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'object' && value !== null) return 'JSON';
    return 'String';
  };

  const filteredConfigs = configs.filter(config =>
    config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (config.description && config.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            Configuration Système
          </h2>
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                setEditingConfig(null);
                setFormData({ key: '', value: '', description: '', isActive: true });
                setShowConfigModal(true);
              }}
              variant="primary"
              size="sm"
            >
              Nouvelle Configuration
            </Button>
            <Button
              onClick={fetchConfigs}
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

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Rechercher une configuration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Configurations List */}
        <div className="space-y-4">
          {filteredConfigs.length === 0 ? (
            <div className="text-center text-secondary py-8">
              <p>Aucune configuration trouvée</p>
            </div>
          ) : (
            filteredConfigs.map((config) => (
              <Card key={config.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-primary">
                        {config.key}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        config.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {config.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {getValueType(config.value)}
                      </span>
                    </div>
                    
                    {config.description && (
                      <p className="text-sm text-secondary mb-3">
                        {config.description}
                      </p>
                    )}
                    
                    <div className="surface-elevated p-3 rounded-lg">
                      <pre className="text-sm text-primary whitespace-pre-wrap">
                        {formatValue(config.value)}
                      </pre>
                    </div>
                    
                    <div className="mt-2 text-xs text-secondary">
                      Mis à jour le {new Date(config.updatedAt).toLocaleString('fr-CH')}
                      {config.updatedBy && ` par ${config.updatedBy}`}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(config)}
                      className={`px-3 py-1 text-sm rounded ${
                        config.isActive
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {config.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleEditConfig(config)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Configuration Modal */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setEditingConfig(null);
            setFormData({ key: '', value: '', description: '', isActive: true });
          }}
          title={editingConfig ? 'Modifier la Configuration' : 'Nouvelle Configuration'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Clé de Configuration
              </label>
              <Input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="ex: maintenance_mode, max_users, etc."
                disabled={!!editingConfig}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Valeur
              </label>
              <textarea
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Valeur de la configuration (JSON, string, number, boolean)"
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <p className="text-xs text-secondary mt-1">
                Vous pouvez utiliser du JSON pour des objets complexes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Description
              </label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de cette configuration"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-primary rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-primary">
                Configuration active
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => {
                  setShowConfigModal(false);
                  setEditingConfig(null);
                  setFormData({ key: '', value: '', description: '', isActive: true });
                }}
                variant="outline"
                size="sm"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveConfig}
                variant="primary"
                size="sm"
                disabled={!formData.key || !formData.value}
              >
                {editingConfig ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};