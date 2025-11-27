/**
 * 🇨🇭 TVA Configuration Component
 * 
 * Admin interface for managing Swiss TVA rates by canton
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useTVA, SwissTVACategory } from '../../hooks/useTVA';

interface TVARateUpdate {
  category: SwissTVACategory;
  rate: number;
  label: string;
  description: string;
}

export const TVAConfiguration: React.FC = () => {
  const [selectedCanton, setSelectedCanton] = useState('GE');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<TVARateUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { cantonConfig, availableRates, getSupportedCantons } = useTVA(selectedCanton);
  const supportedCantons = getSupportedCantons();

  const handleEditRate = (category: SwissTVACategory) => {
    const rate = availableRates.find(r => r.category === category);
    if (rate) {
      setEditingRate({
        category,
        rate: rate.rate,
        label: rate.label,
        description: rate.description
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveRate = async () => {
    if (!editingRate) return;

    setIsLoading(true);
    try {
      // Here you would call your API to update the TVA rate
      const response = await fetch('/api/admin/tva/rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          cantonCode: selectedCanton,
          category: editingRate.category,
          rate: editingRate.rate,
          label: editingRate.label,
          description: editingRate.description
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Taux TVA mis à jour avec succès' });
        setIsEditModalOpen(false);
        setEditingRate(null);
        // Refresh the data
        window.location.reload();
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du taux TVA' });
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (category: SwissTVACategory): string => {
    switch (category) {
      case SwissTVACategory.STANDARD:
        return 'Taux Normal';
      case SwissTVACategory.REDUCED:
        return 'Taux Réduit';
      case SwissTVACategory.SPECIAL:
        return 'Taux Spécial';
      case SwissTVACategory.EXEMPT:
        return 'Non applicable';
      case SwissTVACategory.NOT_SUBJECT:
        return 'Non Assujetti';
      default:
        return 'Inconnu';
    }
  };

  const getCategoryColor = (category: SwissTVACategory): string => {
    switch (category) {
      case SwissTVACategory.STANDARD:
        return 'bg-blue-100 text-blue-800';
      case SwissTVACategory.REDUCED:
        return 'bg-green-100 text-green-800';
      case SwissTVACategory.SPECIAL:
        return 'bg-yellow-100 text-yellow-800';
      case SwissTVACategory.EXEMPT:
        return 'bg-gray-100 text-gray-800';
      case SwissTVACategory.NOT_SUBJECT:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Configuration TVA</h1>
          <p className="text-secondary">Gérer les taux de TVA par canton</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="ml-2 text-sm underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Canton Selector */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Sélectionner le Canton</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supportedCantons.map((canton) => (
              <button
                key={canton.code}
                onClick={() => setSelectedCanton(canton.code)}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedCanton === canton.code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-primary hover:bg-[var(--color-bg-secondary)]'
                }`}
              >
                <div className="font-semibold">{canton.code}</div>
                <div className="text-sm text-secondary">{canton.name}</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Current Configuration */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-primary">
              Configuration Actuelle - {cantonConfig.name}
            </h2>
            <div className="text-sm text-secondary">
              Seuil d'exonération: {cantonConfig.exemptionThreshold.toLocaleString('fr-CH')} CHF/an
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableRates.map((rate) => (
              <div
                key={rate.category}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(rate.category)}`}>
                    {getCategoryName(rate.category)}
                  </span>
                  <button
                    onClick={() => handleEditRate(rate.category)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Modifier
                  </button>
                </div>
                
                <div className="text-2xl font-bold text-primary mb-1">
                  {rate.rate}%
                </div>
                
                <div className="text-sm text-secondary mb-2">
                  {rate.label}
                </div>
                
                <div className="text-xs text-secondary">
                  {rate.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Information Card */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-primary mb-3">ℹ️ Informations Importantes</h3>
          <div className="space-y-2 text-sm text-secondary">
            <p>
              • <strong>Seuil d'exonération:</strong> Les entreprises avec un chiffre d'affaires annuel 
              inférieur à {cantonConfig.exemptionThreshold.toLocaleString('fr-CH')} CHF sont automatiquement exonérées de TVA.
            </p>
            <p>
              • <strong>Taux réduit:</strong> Appliqué aux biens de première nécessité, médicaments, livres, journaux.
            </p>
            <p>
              • <strong>Taux spécial:</strong> Appliqué aux prestations d'hébergement (hôtels, restaurants).
            </p>
            <p>
              • <strong>Taux normal:</strong> Appliqué à la plupart des biens et services.
            </p>
            <p>
              • <strong>Modification des taux:</strong> Les changements prennent effet immédiatement pour toutes les nouvelles factures.
            </p>
          </div>
        </div>
      </Card>

      {/* Edit Rate Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRate(null);
        }}
        title={`Modifier le ${editingRate ? getCategoryName(editingRate.category) : ''}`}
      >
        {editingRate && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Taux (%)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editingRate.rate}
                onChange={(e) => setEditingRate({
                  ...editingRate,
                  rate: parseFloat(e.target.value) || 0
                })}
                placeholder="Ex: 8.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Libellé
              </label>
              <Input
                type="text"
                value={editingRate.label}
                onChange={(e) => setEditingRate({
                  ...editingRate,
                  label: e.target.value
                })}
                placeholder="Ex: 8.1% (Taux normal)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-md input-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={editingRate.description}
                onChange={(e) => setEditingRate({
                  ...editingRate,
                  description: e.target.value
                })}
                placeholder="Description du taux de TVA"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingRate(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveRate}
                disabled={isLoading}
              >
                {isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};