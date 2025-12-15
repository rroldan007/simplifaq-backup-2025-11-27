/**
 * 🇨🇭 SimpliFaq - Admin Plans Management (Real Data)
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, DollarSign } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  price: number;
  currency: string;
  isActive: boolean;
  maxInvoicesPerMonth: number;
  maxClientsTotal: number;
  maxProductsTotal: number;
  storageLimit: number;
  // Module access - Core modules
  hasInvoices: boolean;
  hasQuotes: boolean;
  hasExpenses: boolean;
  // Module access - Advanced features
  hasAIAssistant: boolean;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  // Module access - Future features
  hasMultiUser: boolean;
  maxUsers: number;
  hasMultiCompany: boolean;
  maxCompanies: number;
  // Support features
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
  // Swiss-specific features
  hasSwissQRBill: boolean;
  hasMultiCurrency: boolean;
  hasMultiLanguage: boolean;
  entitlements?: {
    stripePriceId?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  displayName: string;
  description: string;
  price: string;
  currency: string;
  isActive: boolean;
  maxInvoicesPerMonth: string;
  maxClientsTotal: string;
  maxProductsTotal: string;
  storageLimit: string;
  // Module access - Core modules
  hasInvoices: boolean;
  hasQuotes: boolean;
  hasExpenses: boolean;
  // Module access - Advanced features
  hasAIAssistant: boolean;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  // Module access - Future features
  hasMultiUser: boolean;
  maxUsers: string;
  hasMultiCompany: boolean;
  maxCompanies: string;
  // Support features
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
  // Swiss-specific features
  hasSwissQRBill: boolean;
  hasMultiCurrency: boolean;
  hasMultiLanguage: boolean;
  stripePriceId: string;
}

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    displayName: '',
    description: '',
    price: '0',
    currency: 'CHF',
    isActive: true,
    maxInvoicesPerMonth: '10',
    maxClientsTotal: '50',
    maxProductsTotal: '20',
    storageLimit: '100',
    // Module access - Core modules
    hasInvoices: true,
    hasQuotes: false,
    hasExpenses: false,
    // Module access - Advanced features
    hasAIAssistant: false,
    hasAdvancedReports: false,
    hasApiAccess: false,
    hasCustomBranding: false,
    // Module access - Future features
    hasMultiUser: false,
    maxUsers: '1',
    hasMultiCompany: false,
    maxCompanies: '1',
    // Support features
    hasEmailSupport: false,
    hasPrioritySupport: false,
    // Swiss-specific features
    hasSwissQRBill: true,
    hasMultiCurrency: false,
    hasMultiLanguage: false,
    stripePriceId: '',
  });

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load plans');
      }

      const data = await response.json();
      setPlans(data.success ? data.data : []);
    } catch (err) {
      console.error('Failed to load plans:', err);
      setError('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      setSuccess(null);

      const payload = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        currency: formData.currency,
        isActive: formData.isActive,
        maxInvoicesPerMonth: parseInt(formData.maxInvoicesPerMonth),
        maxClientsTotal: parseInt(formData.maxClientsTotal),
        maxProductsTotal: parseInt(formData.maxProductsTotal),
        storageLimit: parseInt(formData.storageLimit),
        // Module access - Core modules
        hasInvoices: formData.hasInvoices,
        hasQuotes: formData.hasQuotes,
        hasExpenses: formData.hasExpenses,
        // Module access - Advanced features
        hasAIAssistant: formData.hasAIAssistant,
        hasAdvancedReports: formData.hasAdvancedReports,
        hasApiAccess: formData.hasApiAccess,
        hasCustomBranding: formData.hasCustomBranding,
        // Module access - Future features
        hasMultiUser: formData.hasMultiUser,
        maxUsers: parseInt(formData.maxUsers),
        hasMultiCompany: formData.hasMultiCompany,
        maxCompanies: parseInt(formData.maxCompanies),
        // Support features
        hasEmailSupport: formData.hasEmailSupport,
        hasPrioritySupport: formData.hasPrioritySupport,
        // Swiss-specific features
        hasSwissQRBill: formData.hasSwissQRBill,
        hasMultiCurrency: formData.hasMultiCurrency,
        hasMultiLanguage: formData.hasMultiLanguage,
        entitlements: formData.stripePriceId ? [{
          stripePriceId: formData.stripePriceId,
          isActive: true
        }] : []
      };

      const token = localStorage.getItem('adminToken');
      const url = editingPlan 
        ? `/api/admin/plans/${editingPlan.id}`
        : '/api/admin/plans';
      
      const response = await fetch(url, {
        method: editingPlan ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save plan');
      }

      setSuccess(editingPlan ? 'Plan actualizado' : 'Plan creado');
      setShowForm(false);
      setEditingPlan(null);
      await loadPlans();
      resetForm();
    } catch (err: unknown) {
      console.error('Failed to save plan:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar plan');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      price: plan.price.toString(),
      currency: plan.currency,
      isActive: plan.isActive,
      maxInvoicesPerMonth: plan.maxInvoicesPerMonth.toString(),
      maxClientsTotal: plan.maxClientsTotal.toString(),
      maxProductsTotal: plan.maxProductsTotal.toString(),
      storageLimit: plan.storageLimit.toString(),
      // Module access - Core modules
      hasInvoices: plan.hasInvoices,
      hasQuotes: plan.hasQuotes,
      hasExpenses: plan.hasExpenses,
      // Module access - Advanced features
      hasAIAssistant: plan.hasAIAssistant,
      hasAdvancedReports: plan.hasAdvancedReports,
      hasApiAccess: plan.hasApiAccess,
      hasCustomBranding: plan.hasCustomBranding,
      // Module access - Future features
      hasMultiUser: plan.hasMultiUser,
      maxUsers: plan.maxUsers.toString(),
      hasMultiCompany: plan.hasMultiCompany,
      maxCompanies: plan.maxCompanies.toString(),
      // Support features
      hasEmailSupport: plan.hasEmailSupport,
      hasPrioritySupport: plan.hasPrioritySupport,
      // Swiss-specific features
      hasSwissQRBill: plan.hasSwissQRBill,
      hasMultiCurrency: plan.hasMultiCurrency,
      hasMultiLanguage: plan.hasMultiLanguage,
      stripePriceId: plan.entitlements?.[0]?.stripePriceId || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('¿Eliminar este plan?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete plan');
      }

      setSuccess('Plan eliminado');
      await loadPlans();
    } catch (err) {
      console.error('Failed to delete plan:', err);
      setError('Error al eliminar plan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      price: '0',
      currency: 'CHF',
      isActive: true,
      maxInvoicesPerMonth: '10',
      maxClientsTotal: '50',
      maxProductsTotal: '20',
      storageLimit: '100',
      // Module access - Core modules
      hasInvoices: true,
      hasQuotes: false,
      hasExpenses: false,
      // Module access - Advanced features
      hasAIAssistant: false,
      hasAdvancedReports: false,
      hasApiAccess: false,
      hasCustomBranding: false,
      // Module access - Future features
      hasMultiUser: false,
      maxUsers: '1',
      hasMultiCompany: false,
      maxCompanies: '1',
      // Support features
      hasEmailSupport: false,
      hasPrioritySupport: false,
      // Swiss-specific features
      hasSwissQRBill: true,
      hasMultiCurrency: false,
      hasMultiLanguage: false,
      stripePriceId: '',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestion des Plans
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Créer et gérer les plans d'abonnement
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPlan(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau Plan
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingPlan ? 'Modifier le Plan' : 'Nouveau Plan'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom (ID) *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="starter"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom d'affichage *
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                    placeholder="Plan Starter"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Description du plan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prix *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Devise
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="CHF">CHF</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Plan actif</span>
                  </label>
                </div>
              </div>

              {/* ⭐ STRIPE PRICE ID */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Intégration Stripe
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    Ce champ est <strong>OBLIGATOIRE</strong> pour les plans payants. 
                    Créez d'abord un produit dans Stripe et copiez le Price ID (commence par "price_")
                  </p>
                </div>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stripe Price ID ⭐
                </label>
                <input
                  type="text"
                  name="stripePriceId"
                  value={formData.stripePriceId}
                  onChange={handleInputChange}
                  placeholder="price_1234567890abcdef"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Exemple: price_1NZzQgABC123def456GHI
                </p>
              </div>

              {/* Limits */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Limites</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Factures/mois
                    </label>
                    <input
                      type="number"
                      name="maxInvoicesPerMonth"
                      value={formData.maxInvoicesPerMonth}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Clients total
                    </label>
                    <input
                      type="number"
                      name="maxClientsTotal"
                      value={formData.maxClientsTotal}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Produits total
                    </label>
                    <input
                      type="number"
                      name="maxProductsTotal"
                      value={formData.maxProductsTotal}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stockage (MB)
                    </label>
                    <input
                      type="number"
                      name="storageLimit"
                      value={formData.storageLimit}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Modules et Fonctionnalités</h3>
                
                {/* Core Modules */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📦 Modules Principaux</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasInvoices"
                        checked={formData.hasInvoices}
                        onChange={handleInputChange}
                        className="rounded"
                        disabled
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">📄 Facturation (obligatoire)</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasQuotes"
                        checked={formData.hasQuotes}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">📋 Devis / Cotisations</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasExpenses"
                        checked={formData.hasExpenses}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">💰 Dépenses / Charges</span>
                    </label>
                  </div>
                </div>

                {/* Advanced Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">⚡ Fonctionnalités Avancées</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasAIAssistant"
                        checked={formData.hasAIAssistant}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">🤖 Assistant IA</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasAdvancedReports"
                        checked={formData.hasAdvancedReports}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">📊 Rapports Avancés</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasApiAccess"
                        checked={formData.hasApiAccess}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">🔌 Accès API</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasCustomBranding"
                        checked={formData.hasCustomBranding}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">🎨 Branding Personnalisé</span>
                    </label>
                  </div>
                </div>

                {/* Future Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🚀 Fonctionnalités Futures</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                    <div>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          name="hasMultiUser"
                          checked={formData.hasMultiUser}
                          onChange={handleInputChange}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">👥 Multi-utilisateur (à venir)</span>
                      </label>
                      {formData.hasMultiUser && (
                        <input
                          type="number"
                          name="maxUsers"
                          value={formData.maxUsers}
                          onChange={handleInputChange}
                          min="1"
                          placeholder="Nombre d'utilisateurs"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                        />
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          name="hasMultiCompany"
                          checked={formData.hasMultiCompany}
                          onChange={handleInputChange}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">🏢 Multi-entreprise (à venir)</span>
                      </label>
                      {formData.hasMultiCompany && (
                        <input
                          type="number"
                          name="maxCompanies"
                          value={formData.maxCompanies}
                          onChange={handleInputChange}
                          min="1"
                          placeholder="Nombre d'entreprises (ex: 2, 3, 10)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Support & Swiss Features */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🇨🇭 Support & Fonctionnalités Suisses</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasEmailSupport"
                        checked={formData.hasEmailSupport}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">📧 Support Email</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasPrioritySupport"
                        checked={formData.hasPrioritySupport}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">⚡ Support Prioritaire</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasSwissQRBill"
                        checked={formData.hasSwissQRBill}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">🇨🇭 QR-Bill Suisse</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasMultiCurrency"
                        checked={formData.hasMultiCurrency}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">💱 Multi-Devises</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="hasMultiLanguage"
                        checked={formData.hasMultiLanguage}
                        onChange={handleInputChange}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">🌐 Multi-Langues</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  {editingPlan ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun plan créé. Cliquez sur "Nouveau Plan" pour commencer.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {plan.displayName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {plan.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.price} {plan.currency}
                    <span className="text-sm font-normal text-gray-500">/mois</span>
                  </div>
                  {plan.entitlements?.[0]?.stripePriceId && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">
                      ✓ {plan.entitlements[0].stripePriceId}
                    </div>
                  )}
                </div>

                {plan.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {plan.description}
                  </p>
                )}

                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>📄 {plan.maxInvoicesPerMonth} factures/mois</div>
                  <div>👥 {plan.maxClientsTotal} clients</div>
                  <div>📦 {plan.maxProductsTotal} produits</div>
                  <div>💾 {plan.storageLimit} MB</div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      plan.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {plan.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
