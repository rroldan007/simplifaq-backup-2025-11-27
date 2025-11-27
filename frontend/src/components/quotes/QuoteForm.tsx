import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';

export interface QuoteFormData {
  client: { id: string; name: string } | null;
  validUntil?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    order: number;
    productId?: string;
  }>;
  globalDiscountValue?: number;
  globalDiscountType?: 'PERCENT' | 'AMOUNT';
  globalDiscountNote?: string;
  notes?: string;
  terms?: string;
  language?: 'fr' | 'de' | 'it' | 'en';
  currency?: 'CHF' | 'EUR';
}

interface QuoteFormProps {
  initialData?: Partial<QuoteFormData>;
  onSubmit: (data: QuoteFormData) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function QuoteForm({
  initialData,
  onSubmit,
  onCancel,
  submitting = false
}: QuoteFormProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    client: initialData?.client || null,
    validUntil: initialData?.validUntil || '',
    items: initialData?.items || [
      { description: '', quantity: 1, unitPrice: 0, tvaRate: 8.1, order: 0 }
    ],
    notes: initialData?.notes || '',
    terms: initialData?.terms || '',
    language: initialData?.language || 'fr',
    currency: initialData?.currency || 'CHF',
  });

  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        // TODO: Replace with actual API call
        // const response = await api.getClients();
        // setClients(response.map(c => ({ id: c.id, name: c.companyName || `${c.firstName} ${c.lastName}` })));
        setClients([]);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, []);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { description: '', quantity: 1, unitPrice: 0, tvaRate: 8.1, order: prev.items.length }
      ]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateTotal = () => {
    let subtotal = 0;
    let tvaAmount = 0;

    formData.items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemTva = itemTotal * (item.tvaRate / 100);
      subtotal += itemTotal;
      tvaAmount += itemTva;
    });

    // Apply global discount
    let globalDiscount = 0;
    if (formData.globalDiscountValue && formData.globalDiscountValue > 0) {
      if (formData.globalDiscountType === 'PERCENT') {
        globalDiscount = subtotal * (formData.globalDiscountValue / 100);
      } else {
        globalDiscount = Math.min(formData.globalDiscountValue, subtotal);
      }
    }

    const subtotalAfterDiscount = subtotal - globalDiscount;
    const tvaAfterDiscount = subtotalAfterDiscount * (tvaAmount / subtotal || 0);

    return {
      subtotal,
      globalDiscount,
      subtotalAfterDiscount,
      tvaAmount: tvaAfterDiscount,
      total: subtotalAfterDiscount + tvaAfterDiscount
    };
  };

  const totals = calculateTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client) {
      alert('Veuillez sélectionner un client');
      return;
    }
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour
        </button>
        
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {submitting ? 'Enregistrement...' : 'Enregistrer le devis'}
        </button>
      </div>

      {/* Client Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              required
              value={formData.client?.id || ''}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value);
                setFormData(prev => ({ ...prev, client: client || null }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loadingClients}
            >
              <option value="">Sélectionner un client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valide jusqu'au
            </label>
            <input
              type="date"
              value={formData.validUntil || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Lignes du devis</h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une ligne
          </button>
        </div>

        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Qté"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      handleItemChange(index, 'quantity', isNaN(val) ? 0 : val);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="Prix"
                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      handleItemChange(index, 'unitPrice', isNaN(val) ? 0 : val);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    placeholder="TVA %"
                    value={item.tvaRate === 0 ? '' : item.tvaRate}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      handleItemChange(index, 'tvaRate', isNaN(val) ? 0 : val);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    step="0.1"
                    min="0"
                    required
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <span className="text-sm font-medium text-gray-900">
                    {(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Global Discount */}
        <div className="mt-6 pt-6 border-t">
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(formData.globalDiscountValue && formData.globalDiscountValue > 0)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, globalDiscountValue: 0, globalDiscountType: 'PERCENT' }));
                  } else {
                    setFormData(prev => ({ ...prev, globalDiscountValue: undefined, globalDiscountType: undefined, globalDiscountNote: undefined }));
                  }
                }}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Appliquer un rabais global</span>
            </label>
          </div>

          {formData.globalDiscountValue !== undefined && (
            <div className="space-y-3 mb-4 pl-6">
              <div className="flex gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.globalDiscountValue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, globalDiscountValue: parseFloat(e.target.value) || 0 }))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Montant"
                />
                <select
                  value={formData.globalDiscountType || 'PERCENT'}
                  onChange={(e) => setFormData(prev => ({ ...prev, globalDiscountType: e.target.value as 'PERCENT' | 'AMOUNT' }))}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="PERCENT">%</option>
                  <option value="AMOUNT">{formData.currency}</option>
                </select>
              </div>
              <textarea
                value={formData.globalDiscountNote || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, globalDiscountNote: e.target.value }))}
                placeholder="Note pour le rabais (optionnel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sous-total HT:</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)} {formData.currency}</span>
              </div>
              {totals.globalDiscount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Rabais global {formData.globalDiscountValue && `(${formData.globalDiscountValue}${formData.globalDiscountType === 'PERCENT' ? '%' : ' ' + formData.currency})`}:</span>
                  <span>-{totals.globalDiscount.toFixed(2)} {formData.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA:</span>
                <span className="font-medium">{totals.tvaAmount.toFixed(2)} {formData.currency}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total TTC:</span>
                <span>{totals.total.toFixed(2)} {formData.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes & Terms */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes internes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conditions
            </label>
            <textarea
              value={formData.terms || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Conditions de paiement..."
            />
          </div>
        </div>
      </Card>
    </form>
  );
}
