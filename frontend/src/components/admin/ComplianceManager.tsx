/**
 * 🇨🇭 SimpliFaq - Compliance Manager Component
 * 
 * Component for managing GDPR compliance, data retention, and regulatory requirements
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface DataRetentionPolicy {
  id: string;
  dataType: 'user_data' | 'audit_logs' | 'billing_data' | 'system_logs';
  retentionPeriodDays: number;
  description: string;
  isActive: boolean;
  lastCleanupAt?: string;
  nextCleanupAt: string;
}

interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  recommendedAction: string;
}

interface GDPRStatus {
  overallCompliance: boolean;
  dataRetention: {
    policiesActive: number;
    policiesTotal: number;
    lastCleanup: string | null;
  };
  violations: {
    totalViolations: number;
    criticalViolations: number;
    highViolations: number;
  };
  recommendations: Array<{
    type: string;
    severity: string;
    action: string;
  }>;
}

interface ComplianceManagerProps {
  className?: string;
}

export const ComplianceManager: React.FC<ComplianceManagerProps> = ({ className = '' }) => {
  const [gdprStatus, setGdprStatus] = useState<GDPRStatus | null>(null);
  const [policies, setPolicies] = useState<DataRetentionPolicy[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'violations' | 'exports'>('overview');
  
  // Modals
  const [showDataExportModal, setShowDataExportModal] = useState(false);
  const [showDataDeletionModal, setShowDataDeletionModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<DataRetentionPolicy | null>(null);
  
  // Form states
  const [exportForm, setExportForm] = useState({
    userId: '',
    requestType: 'gdpr_export' as 'gdpr_export' | 'data_portability' | 'account_closure',
  });
  const [deletionForm, setDeletionForm] = useState({
    userId: '',
    reason: '',
    confirmation: '',
  });
  const [policyForm, setPolicyForm] = useState({
    retentionPeriodDays: 0,
    description: '',
    isActive: true,
  });

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const [statusResponse, policiesResponse, violationsResponse] = await Promise.all([
        fetch('/api/admin/compliance/gdpr-status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        }),
        fetch('/api/admin/compliance/data-retention-policies', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        }),
        fetch('/api/admin/compliance/violations-scan', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        }),
      ]);

      if (!statusResponse.ok || !policiesResponse.ok || !violationsResponse.ok) {
        throw new Error('Erreur lors du chargement des données de conformité');
      }

      const [statusData, policiesData, violationsData] = await Promise.all([
        statusResponse.json(),
        policiesResponse.json(),
        violationsResponse.json(),
      ]);

      setGdprStatus(statusData.data.status);
      setPolicies(policiesData.data.policies || []);
      setViolations(violationsData.data.scanResult.violations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async () => {
    try {
      const response = await fetch('/api/admin/compliance/data-export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportForm),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'export');
      }

      await response.json();
      alert('Export de données créé avec succès');
      setShowDataExportModal(false);
      setExportForm({ userId: '', requestType: 'gdpr_export' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleDataDeletion = async () => {
    try {
      const response = await fetch('/api/admin/compliance/user-data', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...deletionForm,
          confirmation: 'DELETE_USER_DATA',
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression des données');
      }

      alert('Données utilisateur supprimées avec succès');
      setShowDataDeletionModal(false);
      setDeletionForm({ userId: '', reason: '', confirmation: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleUpdatePolicy = async () => {
    if (!selectedPolicy) return;

    try {
      const response = await fetch(`/api/admin/compliance/data-retention-policies/${selectedPolicy.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policyForm),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la politique');
      }

      await fetchComplianceData();
      setShowPolicyModal(false);
      setSelectedPolicy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const handleApplyRetentionPolicies = async () => {
    try {
      const response = await fetch('/api/admin/compliance/apply-retention-policies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'application des politiques');
      }

      const data = await response.json();
      alert(`Politiques appliquées: ${data.data.result.recordsDeleted} enregistrements supprimés`);
      await fetchComplianceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-200';
      case 'high': return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-800 bg-blue-100 border-blue-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CH');
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
            Gestion de la Conformité
          </h2>
          <Button onClick={fetchComplianceData} variant="outline" size="sm">
            Actualiser
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-primary mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Vue d\'ensemble' },
              { id: 'policies', label: 'Politiques de rétention' },
              { id: 'violations', label: 'Violations' },
              { id: 'exports', label: 'Exports GDPR' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'policies' | 'violations' | 'exports')}
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

        {/* Overview Tab */}
        {activeTab === 'overview' && gdprStatus && (
          <div className="space-y-6">
            {/* Compliance Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg border ${
                gdprStatus.overallCompliance 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="text-sm font-medium text-secondary">Conformité Globale</div>
                <div className={`text-2xl font-bold ${
                  gdprStatus.overallCompliance ? 'text-green-900' : 'text-red-900'
                }`}>
                  {gdprStatus.overallCompliance ? '✅ Conforme' : '❌ Non conforme'}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 font-medium">Politiques Actives</div>
                <div className="text-2xl font-bold text-blue-900">
                  {gdprStatus.dataRetention.policiesActive}/{gdprStatus.dataRetention.policiesTotal}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-sm text-yellow-600 font-medium">Violations Critiques</div>
                <div className="text-2xl font-bold text-yellow-900">
                  {gdprStatus.violations.criticalViolations}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Total Violations</div>
                <div className="text-2xl font-bold text-purple-900">
                  {gdprStatus.violations.totalViolations}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {gdprStatus.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">Recommandations Prioritaires</h3>
                <div className="space-y-3">
                  {gdprStatus.recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(rec.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-primary">{rec.type.replace('_', ' ')}</div>
                          <div className="text-sm mt-1 text-secondary">{rec.action}</div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(rec.severity)}`}>
                          {rec.severity === 'critical' ? 'Critique' : 'Élevée'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-medium text-primary mb-4">Actions Rapides</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => setShowDataExportModal(true)}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <div className="text-lg mb-1">📤</div>
                  <div>Export GDPR</div>
                </Button>
                <Button
                  onClick={() => setShowDataDeletionModal(true)}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center text-red-600 border-red-300 hover:bg-red-50"
                >
                  <div className="text-lg mb-1">🗑️</div>
                  <div>Suppression Données</div>
                </Button>
                <Button
                  onClick={handleApplyRetentionPolicies}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <div className="text-lg mb-1">🧹</div>
                  <div>Appliquer Rétention</div>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-primary">Politiques de Rétention</h3>
              <Button onClick={handleApplyRetentionPolicies} variant="primary" size="sm">
                Appliquer Maintenant
              </Button>
            </div>

            <div className="space-y-4">
              {policies.map((policy) => (
                <Card key={policy.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-primary">
                          {policy.dataType.replace('_', ' ')}
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          policy.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-secondary mb-2">{policy.description}</p>
                      <div className="text-sm text-secondary">
                        <div>Période de rétention: {policy.retentionPeriodDays} jours</div>
                        <div>Prochain nettoyage: {formatDate(policy.nextCleanupAt)}</div>
                        {policy.lastCleanupAt && (
                          <div>Dernier nettoyage: {formatDate(policy.lastCleanupAt)}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedPolicy(policy);
                        setPolicyForm({
                          retentionPeriodDays: policy.retentionPeriodDays,
                          description: policy.description,
                          isActive: policy.isActive,
                        });
                        setShowPolicyModal(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Modifier
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Violations Tab */}
        {activeTab === 'violations' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">Violations de Conformité</h3>
            
            {violations.length === 0 ? (
              <div className="text-center text-secondary py-8">
                <div className="text-4xl mb-2">✅</div>
                <p>Aucune violation de conformité détectée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {violations.map((violation, index) => (
                  <Card key={index} className={`p-4 border-l-4 ${getSeverityColor(violation.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-primary">
                            {violation.type.replace('_', ' ')}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(violation.severity)}`}>
                            {violation.severity === 'critical' ? 'Critique' :
                             violation.severity === 'high' ? 'Élevée' :
                             violation.severity === 'medium' ? 'Moyenne' : 'Faible'}
                          </span>
                        </div>
                        <p className="text-sm text-secondary mb-2">{violation.description}</p>
                        <div className="text-sm text-secondary mb-2">
                          Enregistrements affectés: {violation.affectedRecords}
                        </div>
                        <div className="text-sm font-medium text-blue-600">
                          Action recommandée: {violation.recommendedAction}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exports Tab */}
        {activeTab === 'exports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-primary">Exports GDPR</h3>
              <Button onClick={() => setShowDataExportModal(true)} variant="primary" size="sm">
                Nouvel Export
              </Button>
            </div>
            
            <div className="text-center text-secondary py-8">
              <div className="text-4xl mb-2">📤</div>
              <p>Fonctionnalité d'historique des exports à implémenter</p>
            </div>
          </div>
        )}
      </Card>

      {/* Data Export Modal */}
      {showDataExportModal && (
        <Modal
          isOpen={showDataExportModal}
          onClose={() => setShowDataExportModal(false)}
          title="Créer un Export GDPR"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                ID Utilisateur
              </label>
              <Input
                type="text"
                value={exportForm.userId}
                onChange={(e) => setExportForm({ ...exportForm, userId: e.target.value })}
                placeholder="ID de l'utilisateur"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Type d'export
              </label>
              <select
                value={exportForm.requestType}
                onChange={(e) => setExportForm({ ...exportForm, requestType: e.target.value as 'gdpr_export' | 'data_portability' | 'account_closure' })}
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gdpr_export">Export GDPR</option>
                <option value="data_portability">Portabilité des données</option>
                <option value="account_closure">Fermeture de compte</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowDataExportModal(false)}
                variant="outline"
                size="sm"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDataExport}
                variant="primary"
                size="sm"
                disabled={!exportForm.userId}
              >
                Créer Export
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Data Deletion Modal */}
      {showDataDeletionModal && (
        <Modal
          isOpen={showDataDeletionModal}
          onClose={() => setShowDataDeletionModal(false)}
          title="Suppression de Données Utilisateur"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ Cette action est irréversible. Toutes les données de l'utilisateur seront supprimées définitivement.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Utilisateur
              </label>
              <Input
                type="text"
                value={deletionForm.userId}
                onChange={(e) => setDeletionForm({ ...deletionForm, userId: e.target.value })}
                placeholder="ID de l'utilisateur"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Raison de la suppression
              </label>
              <Input
                type="text"
                value={deletionForm.reason}
                onChange={(e) => setDeletionForm({ ...deletionForm, reason: e.target.value })}
                placeholder="Ex: Demande GDPR, fermeture de compte..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Tapez "SUPPRIMER" pour confirmer
              </label>
              <Input
                type="text"
                value={deletionForm.confirmation}
                onChange={(e) => setDeletionForm({ ...deletionForm, confirmation: e.target.value })}
                placeholder="SUPPRIMER"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowDataDeletionModal(false)}
                variant="outline"
                size="sm"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDataDeletion}
                variant="primary"
                size="sm"
                disabled={!deletionForm.userId || !deletionForm.reason || deletionForm.confirmation !== 'SUPPRIMER'}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer Définitivement
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Policy Update Modal */}
      {showPolicyModal && selectedPolicy && (
        <Modal
          isOpen={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
          title={`Modifier la politique - ${selectedPolicy.dataType.replace('_', ' ')}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Période de rétention (jours)
              </label>
              <Input
                type="number"
                value={policyForm.retentionPeriodDays}
                onChange={(e) => setPolicyForm({ ...policyForm, retentionPeriodDays: parseInt(e.target.value) || 0 })}
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                type="text"
                value={policyForm.description}
                onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="policyActive"
                checked={policyForm.isActive}
                onChange={(e) => setPolicyForm({ ...policyForm, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-primary rounded"
              />
              <label htmlFor="policyActive" className="ml-2 block text-sm text-primary">
                Politique active
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                onClick={() => setShowPolicyModal(false)}
                variant="outline"
                size="sm"
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpdatePolicy}
                variant="primary"
                size="sm"
              >
                Mettre à jour
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};