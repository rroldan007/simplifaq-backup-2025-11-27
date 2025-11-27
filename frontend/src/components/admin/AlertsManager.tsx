/**
 * 🇨🇭 SimpliFaq - Alerts Manager Component
 * 
 * Component for managing system alerts and notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface AlertSummary {
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface AlertsManagerProps {
  className?: string;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({ className = '' }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filterStatus,
        severity: filterSeverity,
      });

      const response = await fetch(`/api/admin/monitoring/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des alertes');
      }

      const data = await response.json();
      setAlerts(data.data.alerts || []);
      setSummary(data.data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      setAcknowledging(alertId);
      const response = await fetch(`/api/admin/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acknowledgedBy: 'Admin User', // Would get from auth context
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'acquittement de l\'alerte');
      }

      await fetchAlerts(); // Refresh alerts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setAcknowledging(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-800 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-800 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-red-800 bg-red-100';
      case 'acknowledged':
        return 'text-yellow-800 bg-yellow-100';
      case 'resolved':
        return 'text-green-800 bg-green-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-CH');
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `il y a ${diffDays}j`;
    if (diffHours > 0) return `il y a ${diffHours}h`;
    if (diffMins > 0) return `il y a ${diffMins}m`;
    return 'à l\'instant';
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
            Alertes Système
          </h2>
          <Button
            onClick={fetchAlerts}
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 font-medium">Actives</div>
              <div className="text-2xl font-bold text-red-900">{summary.active}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-600 font-medium">Acquittées</div>
              <div className="text-2xl font-bold text-yellow-900">{summary.acknowledged}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium">Résolues</div>
              <div className="text-2xl font-bold text-green-900">{summary.resolved}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600 font-medium">Critiques</div>
              <div className="text-2xl font-bold text-purple-900">{summary.bySeverity.critical}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="acknowledged">Acquittées</option>
            <option value="resolved">Résolues</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les sévérités</option>
            <option value="critical">Critique</option>
            <option value="high">Élevée</option>
            <option value="medium">Moyenne</option>
            <option value="low">Faible</option>
          </select>

          <div className="text-sm text-secondary flex items-center">
            {alerts.length} alerte{alerts.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center text-secondary py-8">
              <p>Aucune alerte trouvée</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className={`p-4 border-l-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                      <h3 className="text-lg font-medium text-primary">
                        {alert.ruleName}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(alert.status)}`}>
                        {alert.status === 'active' ? 'Active' :
                         alert.status === 'acknowledged' ? 'Acquittée' : 'Résolue'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity === 'critical' ? 'Critique' :
                         alert.severity === 'high' ? 'Élevée' :
                         alert.severity === 'medium' ? 'Moyenne' : 'Faible'}
                      </span>
                    </div>
                    
                    <p className="text-secondary mb-2">{alert.message}</p>
                    
                    <div className="text-sm text-secondary space-y-1">
                      <div>
                        <span className="font-medium">Métrique:</span> {alert.metric}
                      </div>
                      <div>
                        <span className="font-medium">Valeur actuelle:</span> {alert.currentValue}
                        <span className="mx-2">•</span>
                        <span className="font-medium">Seuil:</span> {alert.threshold}
                      </div>
                      <div>
                        <span className="font-medium">Déclenchée:</span> {formatDateTime(alert.triggeredAt)}
                        <span className="mx-2">•</span>
                        <span>{getTimeSince(alert.triggeredAt)}</span>
                      </div>
                      {alert.acknowledgedAt && (
                        <div>
                          <span className="font-medium">Acquittée:</span> {formatDateTime(alert.acknowledgedAt)}
                          {alert.acknowledgedBy && ` par ${alert.acknowledgedBy}`}
                        </div>
                      )}
                      {alert.resolvedAt && (
                        <div>
                          <span className="font-medium">Résolue:</span> {formatDateTime(alert.resolvedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setShowAlertModal(true);
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Détails
                    </button>
                    {alert.status === 'active' && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        disabled={acknowledging === alert.id}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
                      >
                        {acknowledging === alert.id ? 'Acquittement...' : 'Acquitter'}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Alert Details Modal */}
      {showAlertModal && selectedAlert && (
        <Modal
          isOpen={showAlertModal}
          onClose={() => {
            setShowAlertModal(false);
            setSelectedAlert(null);
          }}
          title={`Détails de l'alerte - ${selectedAlert.ruleName}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary">ID de l'alerte</label>
                <div className="text-sm text-primary font-mono">{selectedAlert.id}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary">Règle</label>
                <div className="text-sm text-primary">{selectedAlert.ruleName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary">Métrique</label>
                <div className="text-sm text-primary">{selectedAlert.metric}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary">Sévérité</label>
                <div className={`inline-flex px-2 py-1 text-xs rounded-full ${getSeverityColor(selectedAlert.severity)}`}>
                  {selectedAlert.severity === 'critical' ? 'Critique' :
                   selectedAlert.severity === 'high' ? 'Élevée' :
                   selectedAlert.severity === 'medium' ? 'Moyenne' : 'Faible'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary">Valeur actuelle</label>
                <div className="text-sm text-primary">{selectedAlert.currentValue}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary">Seuil</label>
                <div className="text-sm text-primary">{selectedAlert.threshold}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">Message</label>
              <div className="p-3 surface-elevated rounded-lg text-sm text-primary">
                {selectedAlert.message}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary">Déclenchée le</label>
                <div className="text-sm text-primary">{formatDateTime(selectedAlert.triggeredAt)}</div>
              </div>
              {selectedAlert.acknowledgedAt && (
                <div>
                  <label className="block text-sm font-medium text-secondary">Acquittée le</label>
                  <div className="text-sm text-primary">
                    {formatDateTime(selectedAlert.acknowledgedAt)}
                    {selectedAlert.acknowledgedBy && ` par ${selectedAlert.acknowledgedBy}`}
                  </div>
                </div>
              )}
              {selectedAlert.resolvedAt && (
                <div>
                  <label className="block text-sm font-medium text-secondary">Résolue le</label>
                  <div className="text-sm text-primary">{formatDateTime(selectedAlert.resolvedAt)}</div>
                </div>
              )}
            </div>

            {selectedAlert.metadata && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">Métadonnées</label>
                <pre className="p-3 surface-elevated rounded-lg text-xs text-primary overflow-auto max-h-40">
                  {JSON.stringify(selectedAlert.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => {
                  setShowAlertModal(false);
                  setSelectedAlert(null);
                }}
                variant="outline"
                size="sm"
              >
                Fermer
              </Button>
              {selectedAlert.status === 'active' && (
                <Button
                  onClick={() => {
                    handleAcknowledgeAlert(selectedAlert.id);
                    setShowAlertModal(false);
                    setSelectedAlert(null);
                  }}
                  variant="primary"
                  size="sm"
                  disabled={acknowledging === selectedAlert.id}
                >
                  {acknowledging === selectedAlert.id ? 'Acquittement...' : 'Acquitter'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};