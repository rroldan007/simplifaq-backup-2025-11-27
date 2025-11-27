/**
 * 🇨🇭 Invoice Form with Centralized TVA System
 * 
 * Example of how to use the new centralized TVA system in invoice forms
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTVA, SwissTVACategory, type InvoiceItem } from '../../hooks/useTVA';
import { CSVImportModal, type CSVInvoiceItem } from './CSVImportModal';

type InvoiceSummary = {
  netTotal: number;
  grossTotal: number;
  isExempt: boolean;
  exemptionReason?: string;
  tvaBreakdown: Array<{ category: SwissTVACategory; tvaAmount: number }>;
};

interface InvoiceFormProps {
  cantonCode?: string;
  onSubmit?: (payload: { items: InvoiceItem[]; summary: InvoiceSummary; cantonCode: string; isExempt: boolean }) => void;
}

export const InvoiceFormWithTVA: React.FC<InvoiceFormProps> = ({
  cantonCode = 'GE',
  onSubmit
}) => {
  // Quantity precision based on user preference (2 or 3 decimals)
  const [quantityDecimals] = useState<2 | 3>(2);
  const quantityStep = quantityDecimals === 3 ? 0.001 : 0.01;
  const quantityMin = quantityDecimals === 3 ? 0.001 : 0.01;
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: '',
      quantity: 1,
      unitPrice: 0,
      tvaCategory: SwissTVACategory.STANDARD
    }
  ]);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  const { 
    availableRates, 
    calculateInvoiceTVA, 
    getRateLabel, 
    isExemptFromTVA,
    exemptionThreshold,
    cantonConfig
  } = useTVA(cantonCode);

  // Calculate invoice totals
  const invoiceSummary = calculateInvoiceTVA(items);

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unitPrice: 0,
      tvaCategory: SwissTVACategory.STANDARD
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: InvoiceItem[keyof InvoiceItem]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        items,
        summary: invoiceSummary,
        cantonCode,
        isExempt: invoiceSummary.isExempt
      });
    }
  };

  const handleCSVImport = (csvItems: CSVInvoiceItem[]) => {
    // Convert CSV items to InvoiceItem format
    const newItems: InvoiceItem[] = csvItems.map(csvItem => ({
      description: csvItem.description,
      quantity: csvItem.quantity,
      unitPrice: csvItem.unitPrice,
      tvaCategory: csvItem.tvaCategory
    }));

    // Replace current items or add to existing ones
    if (items.length === 1 && !items[0].description && items[0].unitPrice === 0) {
      // Replace the empty default item
      setItems(newItems);
    } else {
      // Add to existing items
      setItems([...items, ...newItems]);
    }
  };

  const clearAllItems = () => {
    setItems([{
      description: '',
      quantity: 1,
      unitPrice: 0,
      tvaCategory: SwissTVACategory.STANDARD
    }]);
  };

  return (
    <div className="space-y-6">
      {/* Header with Canton Info */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Nouvelle Facture</h2>
              <p className="text-gray-600">Canton: {cantonConfig.name}</p>
            </div>
            <div className="text-right">
              {isExemptFromTVA && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  ✓ Exonéré de TVA
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Exemption Notice */}
      {isExemptFromTVA && (
        <Card>
          <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Exonération automatique de TVA</strong><br />
                  Votre chiffre d'affaires annuel est inférieur au seuil d'exonération de {exemptionThreshold.toLocaleString('fr-CH')} CHF. 
                  Toutes les factures seront automatiquement exonérées de TVA.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Invoice Items */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Articles</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end">
                  {/* Description */}
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Description de l'article"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantité
                    </label>
                    <Input
                      type="number"
                      min={quantityMin}
                      step={quantityStep}
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        updateItem(index, 'quantity', isNaN(val) ? 0 : val);
                      }}
                      placeholder="Qté"
                      required
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix unitaire (CHF)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice === 0 ? '' : item.unitPrice}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        updateItem(index, 'unitPrice', isNaN(val) ? 0 : val);
                      }}
                      placeholder="PU"
                      required
                    />
                  </div>

                  {/* TVA Category */}
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie TVA
                    </label>
                    <select
                      value={item.tvaCategory}
                      onChange={(e) => updateItem(index, 'tvaCategory', e.target.value as SwissTVACategory)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isExemptFromTVA}
                    >
                      {availableRates.map((rate) => (
                        <option key={rate.category} value={rate.category}>
                          {rate.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => removeItem(index)}
                        className="w-full"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item Buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={addItem}
              >
                + Ajouter un article
              </Button>
              
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCSVModalOpen(true)}
                className="flex items-center"
              >
                📄 Importer CSV
              </Button>
              
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearAllItems}
                  className="text-red-600 hover:text-red-700"
                >
                  🗑️ Vider tout
                </Button>
              )}
            </div>

            {/* Invoice Summary */}
            <div className="mt-8 border-t pt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Récapitulatif</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Montant net:</span>
                    <span>{invoiceSummary.netTotal.toFixed(2)} CHF</span>
                  </div>

                  {/* TVA Breakdown */}
                  {invoiceSummary.tvaBreakdown.map((breakdown) => (
                    <div key={breakdown.category} className="flex justify-between text-sm text-gray-600">
                      <span>TVA {getRateLabel(breakdown.category)}:</span>
                      <span>{breakdown.tvaAmount.toFixed(2)} CHF</span>
                    </div>
                  ))}

                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{invoiceSummary.grossTotal.toFixed(2)} CHF</span>
                  </div>

                  {invoiceSummary.isExempt && invoiceSummary.exemptionReason && (
                    <div className="text-sm text-green-600 mt-2">
                      {invoiceSummary.exemptionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end">
              <Button type="submit">
                Créer la facture
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={handleCSVImport}
        availableTVACategories={availableRates.map(rate => ({
          category: rate.category,
          label: rate.label
        }))}
      />
    </div>
  );
};