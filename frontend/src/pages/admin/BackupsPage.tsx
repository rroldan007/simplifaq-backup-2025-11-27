/**
 * ��🇭 SimpliFaq - Admin Backups Page (NO MOCKS - Real Data Only)
 */

import React, { useState, useEffect } from 'react';
import { Download, Trash2, Database, RefreshCw } from 'lucide-react';

interface Backup {
  filename: string;
  path: string;
  size: number;
  createdAt: string;
  downloadUrl?: string;
}

export const BackupsPage: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/backups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load backups');
      }

      const data = await response.json();
      setBackups(data.success ? data.data : []);
    } catch (err) {
      console.error('Failed to load backups:', err);
      setError('Error al cargar respaldos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Respaldo creado exitosamente');
        await loadBackups();
      } else {
        throw new Error(data.error || 'Error creating backup');
      }
    } catch (err: unknown) {
      console.error('Failed to create backup:', err);
      setError(err instanceof Error ? err.message : 'Error al crear respaldo');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`¿Eliminar respaldo ${filename}?`)) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/backups/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }

      setSuccess('Respaldo eliminado');
      await loadBackups();
    } catch (err) {
      console.error('Failed to delete backup:', err);
      setError('Error al eliminar respaldo');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestionnaire de Sauvegarde
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des sauvegardes de base de données
          </p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Création...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Créer Sauvegarde
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Backups List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sauvegardes Disponibles
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            Chargement...
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucune sauvegarde disponible</p>
            <p className="text-sm mt-1">Cliquez sur "Créer Sauvegarde" pour commencer</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {backups.map((backup) => (
              <div key={backup.filename} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {backup.filename}
                        </h3>
                        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span>📅 {formatDate(backup.createdAt)}</span>
                          <span>💾 {formatBytes(backup.size)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={backup.downloadUrl || `/api/admin/backups/download/${backup.filename}`}
                      download
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Télécharger"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => handleDeleteBackup(backup.filename)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          ℹ️ Information
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Les sauvegardes sont créées automatiquement à partir de la base de données actuelle</li>
          <li>• Les fichiers sont stockés sur le serveur en toute sécurité</li>
          <li>• Téléchargez les sauvegardes régulièrement pour les conserver localement</li>
          <li>• Les sauvegardes peuvent être utilisées pour restaurer la base de données en cas de problème</li>
        </ul>
      </div>
    </div>
  );
};
