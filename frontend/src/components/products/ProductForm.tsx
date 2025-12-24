import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CURRENT_SWISS_TVA_RATES } from '../../config/swissTaxRates';

interface ProductFormData {
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isService: boolean; // true for services, false for physical products
  isActive: boolean;
  discountValue?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountActive: boolean;
  // SKU / Barcode fields
  sku?: string;
  barcodeType?: 'EAN13' | 'EAN8' | 'CODE128' | 'QR';
  isVariableWeight: boolean;
  weightUnit?: 'kg' | 'g' | 'lb';
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
  currency?: string;
}

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create',
  currency = 'CHF'
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    unitPrice: 0,
    tvaRate: 8.1, // Default to normal Swiss TVA rate
    unit: 'piece',
    isService: false,
    isActive: true,
    discountValue: undefined,
    discountType: 'PERCENT',
    discountActive: false,
    // SKU / Barcode defaults
    sku: undefined,
    barcodeType: undefined,
    isVariableWeight: false,
    weightUnit: undefined,
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Mode de saisie du prix: true = TTC (prix avec TVA), false = HT (prix hors taxe)
  const [priceModeIsTTC, setPriceModeIsTTC] = useState<boolean>(false);
  
  // Keep a string buffer for the unit price input to allow '.' and intermediate values
  const [unitPriceInput, setUnitPriceInput] = useState<string>(() => {
    const v = (initialData?.unitPrice ?? 0) as number;
    return v > 0 ? String(v).replace('.', ',') : '';
  });

  // String buffer for discount value input
  const [discountInput, setDiscountInput] = useState<string>(() => {
    const v = (initialData?.discountValue ?? 0) as number;
    return v > 0 ? String(v).replace('.', ',') : '';
  });

  // Units for physical products
  const PRODUCT_UNITS = [
    { value: 'piece', label: 'Pièce' },
    { value: 'kg', label: 'Kilogramme' },
    { value: 'liter', label: 'Litre' },
    { value: 'meter', label: 'Mètre' },
    { value: 'box', label: 'Boîte' },
    { value: 'pack', label: 'Pack' },
  ];

  // Units for services (time-based or intangible)
  const SERVICE_UNITS = [
    { value: 'hour', label: 'Heure' },
    { value: 'day', label: 'Jour' },
    { value: 'month', label: 'Mois' },
    { value: 'year', label: 'Année' },
    { value: 'service', label: 'Forfait' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'project', label: 'Projet' },
    { value: 'license', label: 'Licence' },
  ];

  // Get units based on product type
  const availableUnits = formData.isService ? SERVICE_UNITS : PRODUCT_UNITS;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const updateFormData = (field: keyof ProductFormData, value: ProductFormData[keyof ProductFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Si on change le taux de TVA et qu'on est en mode TTC, recalculer l'affichage
    if (field === 'tvaRate' && priceModeIsTTC && formData.unitPrice > 0) {
      const newRate = value as number;
      const priceTTC = formData.unitPrice * (1 + newRate / 100);
      const roundedTTC = Math.round(priceTTC * 20) / 20;
      setUnitPriceInput(roundedTTC.toFixed(2).replace('.', ','));
    }
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Smart decimal input handler for Swiss format (accepts both comma and dot) and preserves intermediate typing
  const handlePriceInput = (value: string) => {
    // Accept only digits with optional one separator and up to 2 decimals
    const valid = /^\d*(?:[.,]\d{0,2})?$/.test(value);
    if (!valid) return;
    setUnitPriceInput(value);
    // Update numeric value if there is at least one digit
    if (/\d/.test(value)) {
      const normalizedValue = value.replace(',', '.');
      const numericValue = parseFloat(normalizedValue);
      if (!Number.isNaN(numericValue)) {
        // Si le mode est TTC, convertir en HT
        if (priceModeIsTTC) {
          const priceHT = numericValue / (1 + formData.tvaRate / 100);
          updateFormData('unitPrice', priceHT);
        } else {
          updateFormData('unitPrice', numericValue);
        }
      }
    } else {
      // Only separator or empty, keep numeric at 0
      updateFormData('unitPrice', 0);
    }
  };

  // Round to the nearest 0.05 on blur (Swiss 5 cents rule)
  const handlePriceBlur = () => {
    const rounded = Math.round(formData.unitPrice * 20) / 20; // 1/20 = 0.05
    updateFormData('unitPrice', rounded);
    // Normalize displayed input to two decimals with comma
    // Si le mode est TTC, afficher le prix TTC
    if (priceModeIsTTC) {
      const priceTTC = rounded * (1 + formData.tvaRate / 100);
      const roundedTTC = Math.round(priceTTC * 20) / 20;
      setUnitPriceInput(roundedTTC > 0 ? roundedTTC.toFixed(2).replace('.', ',') : '');
    } else {
      setUnitPriceInput(rounded > 0 ? rounded.toFixed(2).replace('.', ',') : '');
    }
  };

  // Removed unused formatPriceForDisplay helper

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du produit est requis';
    }

    if (formData.unitPrice < 0) {
      newErrors.unitPrice = 'Le prix unitaire ne peut pas être négatif';
    }

    if (formData.unitPrice === 0) {
      newErrors.unitPrice = 'Le prix unitaire doit être supérieur à zéro';
    }

    // Swiss pricing increments of 0.05 (5 cents)
    const isMultipleOfFiveCents = Number.isFinite(formData.unitPrice) && Math.round(formData.unitPrice * 20) === formData.unitPrice * 20;
    if (!newErrors.unitPrice && !isMultipleOfFiveCents) {
      newErrors.unitPrice = 'Le prix doit être par pas de 0.05 (ex: 10.00, 10.05)';
    }

    if (!CURRENT_SWISS_TVA_RATES.some(rate => rate.value === formData.tvaRate)) {
      newErrors.tvaRate = 'Taux de TVA invalide';
    }

    // Validate discount
    if (formData.discountActive && formData.discountValue !== undefined) {
      if (formData.discountValue < 0) {
        newErrors.discountValue = 'Le rabais ne peut pas être négatif';
      }
      
      if (formData.discountType === 'PERCENT' && formData.discountValue > 100) {
        newErrors.discountValue = 'Le pourcentage ne peut pas dépasser 100%';
      }
      
      if (formData.discountType === 'AMOUNT' && formData.discountValue > formData.unitPrice) {
        newErrors.discountValue = 'Le montant du rabais ne peut pas dépasser le prix unitaire';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Filter out extra fields before submitting
      const cleanData: ProductFormData = {
        name: formData.name,
        description: formData.description,
        unitPrice: formData.unitPrice,
        tvaRate: formData.tvaRate,
        unit: formData.unit,
        isService: formData.isService,
        isActive: formData.isActive,
        discountValue: formData.discountValue,
        discountType: formData.discountType,
        discountActive: formData.discountActive,
        // SKU / Barcode fields
        sku: formData.sku,
        barcodeType: formData.barcodeType,
        isVariableWeight: formData.isVariableWeight,
        weightUnit: formData.weightUnit,
      };
      onSubmit(cleanData);
    }
  };

  const calculatePriceWithTva = () => {
    return formData.unitPrice * (1 + formData.tvaRate / 100);
  };

  const calculateTvaAmount = () => {
    return formData.unitPrice * (formData.tvaRate / 100);
  };

  // Discount input handler
  const handleDiscountInput = (value: string) => {
    const valid = /^\d*(?:[.,]\d{0,2})?$/.test(value);
    if (!valid) return;
    setDiscountInput(value);
    
    if (/\d/.test(value)) {
      const normalizedValue = value.replace(',', '.');
      const numericValue = parseFloat(normalizedValue);
      if (!Number.isNaN(numericValue)) {
        updateFormData('discountValue', numericValue);
      }
    } else {
      updateFormData('discountValue', 0);
    }
  };

  const handleDiscountBlur = () => {
    const rounded = formData.discountValue ? Math.round(formData.discountValue * 100) / 100 : 0;
    updateFormData('discountValue', rounded);
    setDiscountInput(rounded > 0 ? rounded.toFixed(2).replace('.', ',') : '');
  };

  const calculateDiscountedPrice = () => {
    if (!formData.discountActive || !formData.discountValue) return formData.unitPrice;
    
    if (formData.discountType === 'PERCENT') {
      return formData.unitPrice * (1 - formData.discountValue / 100);
    } else {
      return Math.max(0, formData.unitPrice - formData.discountValue);
    }
  };

  const calculateDiscountAmount = () => {
    return formData.unitPrice - calculateDiscountedPrice();
  };

  // Basculer entre le mode TTC et HT
  const togglePriceMode = () => {
    const newMode = !priceModeIsTTC;
    setPriceModeIsTTC(newMode);
    
    // Actualiser l'affichage du prix selon le nouveau mode
    if (formData.unitPrice > 0) {
      if (newMode) {
        // Passer en mode TTC: afficher le prix avec TVA
        const priceTTC = formData.unitPrice * (1 + formData.tvaRate / 100);
        const roundedTTC = Math.round(priceTTC * 20) / 20;
        setUnitPriceInput(roundedTTC.toFixed(2).replace('.', ','));
      } else {
        // Passer en mode HT: afficher le prix HT actuel
        const rounded = Math.round(formData.unitPrice * 20) / 20;
        setUnitPriceInput(rounded.toFixed(2).replace('.', ','));
      }
    }
  };

  const getUnitLabel = (unit: string) => {
    const allUnits = [...PRODUCT_UNITS, ...SERVICE_UNITS];
    const unitObj = allUnits.find(u => u.value === unit);
    return unitObj ? unitObj.label : unit;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
          </h1>
          <p className="text-slate-600 mt-1">
            {mode === 'create' 
              ? 'Ajoutez un nouveau produit ou service à votre catalogue'
              : 'Modifiez les informations de votre produit'
            }
          </p>
        </div>
        
        <div className="flex space-x-3">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={loading}>
            <span className="mr-2">💾</span>
            {mode === 'create' ? 'Créer le produit' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Informations du produit
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du produit/service *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Consultation en développement web"
                  error={errors.name}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optionnel)
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Description détaillée du produit ou service..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Product/Service Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateFormData('isService', false);
                      // Reset to default product unit if current unit is a service unit
                      if (SERVICE_UNITS.some(u => u.value === formData.unit)) {
                        updateFormData('unit', 'piece');
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                      !formData.isService
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="font-medium">Produit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateFormData('isService', true);
                      // Reset to default service unit if current unit is a product unit
                      if (PRODUCT_UNITS.some(u => u.value === formData.unit)) {
                        updateFormData('unit', 'hour');
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                      formData.isService
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">Service</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {formData.isService 
                    ? 'Un service est une prestation immatérielle (consultation, formation, etc.)'
                    : 'Un produit est un bien physique ou numérique vendable'}
                </p>
              </div>
            </div>
          </Card>

          {/* SKU / Barcode */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              📊 Code produit (SKU / Code-barres)
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    SKU (Code article)
                  </label>
                  <Input
                    value={formData.sku || ''}
                    onChange={(e) => updateFormData('sku', e.target.value || undefined)}
                    placeholder="ABC-12345"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Code unique pour identifier ce produit
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type de code-barres
                  </label>
                  <select
                    value={formData.barcodeType || ''}
                    onChange={(e) => updateFormData('barcodeType', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Aucun</option>
                    <option value="EAN13">EAN-13 (Standard européen)</option>
                    <option value="EAN8">EAN-8 (Compact)</option>
                    <option value="CODE128">Code 128 (Alphanumérique)</option>
                    <option value="QR">QR Code</option>
                  </select>
                </div>
              </div>
              
              {/* Variable Weight Option */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.isVariableWeight}
                    onChange={(e) => {
                      updateFormData('isVariableWeight', e.target.checked);
                      if (e.target.checked) {
                        // Auto-set to EAN13 and kg for variable weight
                        if (!formData.barcodeType) {
                          updateFormData('barcodeType', 'EAN13');
                        }
                        if (!formData.weightUnit) {
                          updateFormData('weightUnit', 'kg');
                        }
                        // Change unit to kg
                        updateFormData('unit', 'kg');
                      }
                    }}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-amber-900">
                      ⚖️ Produit à poids variable
                    </span>
                    <p className="text-xs text-amber-700 mt-1">
                      Pour les produits vendus au poids (fruits, légumes, viande, etc.)
                      <br />
                      Utilise le préfixe EAN-13 (20-29) avec le poids encodé dans le code-barres
                    </p>
                  </div>
                </label>
                
                {formData.isVariableWeight && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-amber-900 mb-1">
                          Unité de poids
                        </label>
                        <select
                          value={formData.weightUnit || 'kg'}
                          onChange={(e) => updateFormData('weightUnit', e.target.value as 'kg' | 'g' | 'lb')}
                          className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        >
                          <option value="kg">Kilogrammes (kg)</option>
                          <option value="g">Grammes (g)</option>
                          <option value="lb">Livres (lb)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-amber-900 mb-1">
                          Code produit (5 chiffres)
                        </label>
                        <Input
                          value={formData.sku || ''}
                          onChange={(e) => {
                            // Only allow 5 digits for variable weight products
                            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                            updateFormData('sku', val || undefined);
                          }}
                          placeholder="12345"
                          maxLength={5}
                          className="border-amber-300 focus:ring-amber-500"
                        />
                        <p className="text-xs text-amber-700 mt-1">
                          Le code final sera: 20{formData.sku?.padStart(5, '0') || '00000'}PPPPC
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-white rounded border border-amber-200">
                      <p className="text-xs text-amber-800 font-medium mb-1">
                        Format du code-barres poids variable (EAN-13):
                      </p>
                      <div className="font-mono text-sm text-amber-900 bg-amber-100 px-2 py-1 rounded">
                        <span className="text-red-600">20</span>
                        <span className="text-blue-600">{formData.sku?.padStart(5, '0') || '00000'}</span>
                        <span className="text-green-600">PPPP</span>
                        <span className="text-purple-600">C</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-xs mt-2">
                        <span className="text-red-600">20 = Préfixe</span>
                        <span className="text-blue-600">5 dig = Produit</span>
                        <span className="text-green-600">4 dig = Prix/Poids</span>
                        <span className="text-purple-600">1 dig = Contrôle</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Tarification
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Prix unitaire {priceModeIsTTC ? 'TTC' : 'HT'} *
                  </label>
                  <button
                    type="button"
                    onClick={togglePriceMode}
                    className="flex items-center space-x-2 px-3 py-1 text-xs font-medium rounded-full transition-colors"
                    style={{
                      backgroundColor: priceModeIsTTC ? '#DBEAFE' : '#F1F5F9',
                      color: priceModeIsTTC ? '#1E40AF' : '#475569'
                    }}
                  >
                    <span>{priceModeIsTTC ? '💰 TTC' : '📝 HT'}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
                <Input
                  type="text"
                  value={unitPriceInput}
                  onChange={(e) => handlePriceInput(e.target.value)}
                  onBlur={handlePriceBlur}
                  placeholder="0,00"
                  error={errors.unitPrice}
                  pattern="[0-9]+([,.][0-9]{1,2})?"
                  inputMode="decimal"
                  title="Utilisez des pas de 0.05 (ex: 10,00 · 10,05 · 10,10)"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {priceModeIsTTC 
                    ? `Prix avec TVA incluse (${formData.tvaRate}%)`
                    : `Prix hors taxes en ${currency} (pas de 0.05)`
                  }
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unité
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => updateFormData('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableUnits.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Tax Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Configuration TVA
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Taux de TVA *
              </label>
              <select
                value={formData.tvaRate}
                onChange={(e) => updateFormData('tvaRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CURRENT_SWISS_TVA_RATES.map((rate) => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Taux de TVA applicable selon la législation suisse
              </p>
              {errors.tvaRate && (
                <p className="text-sm text-red-600 mt-1">{errors.tvaRate}</p>
              )}
            </div>

            {/* Info box about TTC/HT switch */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 text-sm">ℹ️</span>
                <p className="text-xs text-blue-700">
                  <strong>Mode de saisie du prix :</strong> Utilisez le bouton {priceModeIsTTC ? '💰 TTC' : '📝 HT'} au-dessus 
                  pour basculer entre le prix TTC (avec TVA) et HT (hors taxe). 
                  {priceModeIsTTC 
                    ? ' Le prix HT sera calculé automatiquement.' 
                    : ' Vous pouvez aussi saisir le prix TTC si vous le connaissez.'}
                </p>
              </div>
            </div>

            {/* Price breakdown */}
            {formData.unitPrice > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">
                  Calcul du prix par {getUnitLabel(formData.unit).toLowerCase()}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Prix HT :</span>
                    <span className="font-medium">{formatCurrency(formData.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">TVA ({formData.tvaRate}%) :</span>
                    <span className="font-medium">{formatCurrency(calculateTvaAmount())}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                    <span>Prix TTC :</span>
                    <span>{formatCurrency(calculatePriceWithTva())}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Discount */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              💰 Rabais par défaut
            </h2>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.discountActive}
                  onChange={(e) => {
                    updateFormData('discountActive', e.target.checked);
                    if (!e.target.checked) {
                      setErrors(prev => ({ ...prev, discountValue: '' }));
                    }
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-slate-700">
                  Appliquer un rabais par défaut
                </span>
              </label>
              
              {formData.discountActive && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Valeur
                      </label>
                      <Input
                        type="text"
                        value={discountInput}
                        onChange={(e) => handleDiscountInput(e.target.value)}
                        onBlur={handleDiscountBlur}
                        placeholder="0,00"
                        error={errors.discountValue}
                        inputMode="decimal"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Type
                      </label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => updateFormData('discountType', e.target.value as 'PERCENT' | 'AMOUNT')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="PERCENT">% Pourcentage</option>
                        <option value="AMOUNT">{currency} Montant</option>
                      </select>
                    </div>
                  </div>
                  
                  {formData.unitPrice > 0 && formData.discountValue && formData.discountValue > 0 && (
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <p className="text-xs text-slate-600 mb-2">Aperçu du rabais :</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Prix original :</span>
                          <span className="font-medium">{formatCurrency(formData.unitPrice)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Rabais :</span>
                          <span className="font-medium">-{formatCurrency(calculateDiscountAmount())}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-green-600">
                          <span>Prix après rabais :</span>
                          <span>{formatCurrency(calculateDiscountedPrice())}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-slate-500">
                    Ce rabais sera automatiquement appliqué lors de l'ajout du produit à une facture
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Status */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Statut
            </h2>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => updateFormData('isActive', e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-slate-700">
                Produit actif
              </span>
            </label>
            <p className="text-xs text-slate-500 mt-1">
              Les produits inactifs n'apparaissent pas dans les sélecteurs de facture
            </p>
          </Card>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Aperçu
            </h3>
            
            <div className="space-y-4">
              {/* Product preview */}
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">📦</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">
                      {formData.name || 'Nom du produit'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {getUnitLabel(formData.unit)}
                    </p>
                  </div>
                </div>
                
                {formData.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {formData.description}
                  </p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Prix HT :</span>
                    <span className="font-medium">
                      {formatCurrency(formData.unitPrice)}
                    </span>
                  </div>
                  
                  {formData.discountActive && formData.discountValue && formData.discountValue > 0 && (
                    <>
                      <div className="flex justify-between text-red-600">
                        <span>Rabais :</span>
                        <span className="font-medium">-{formatCurrency(calculateDiscountAmount())}</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>Prix après rabais :</span>
                        <span>{formatCurrency(calculateDiscountedPrice())}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600">TVA :</span>
                    <span className="font-medium">
                      {formData.tvaRate}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <span>Prix TTC :</span>
                    <span>{formatCurrency(calculatePriceWithTva())}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Statut :</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  formData.isActive 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {formData.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                💡 Conseils
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Utilisez des noms descriptifs</li>
                <li>• Vérifiez le taux de TVA applicable</li>
                <li>• Utilisez le switch TTC/HT pour saisir le prix avec ou sans TVA</li>
                <li>• Ajoutez une description détaillée</li>
                <li>• Choisissez l'unité appropriée</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}