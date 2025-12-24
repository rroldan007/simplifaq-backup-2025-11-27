import React, { useState, useEffect, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '../ui/Input';
import { ProductSearchButton } from './ProductSearchButton';
import { formatCurrency } from '../../utils/formatters';
import { CURRENT_SWISS_TVA_RATES } from '../../config/swissTaxRates';
import { useProducts } from '../../hooks/useProducts';
import { NotificationContainer } from '../ui/Notification';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_DISCOUNT_VALUE, DEFAULT_DISCOUNT_TYPE } from '../../constants/discounts';
import { isKilogramUnit, getQuantityStep, roundQuantity } from '../../utils/unitUtils';

// Helper to check if unit is hour-based (for time calculator)
const isHourUnit = (unit?: string): boolean => {
  if (!unit) return false;
  const normalized = unit.toLowerCase().trim();
  return ['hour', 'heure', 'h', 'hrs', 'hours', 'heures'].includes(normalized);
};

// Calculate hours between two times (HH:MM format)
const calculateHours = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  
  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Handle overnight (e.g., 22:00 to 02:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const diffMinutes = endMinutes - startMinutes;
  // Round to 2 decimal places (e.g., 1.5 hours, 2.25 hours)
  return Math.round((diffMinutes / 60) * 100) / 100;
};

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total: number;
  order: number;
  productId?: string;
  unit?: string; // Unit of measurement (e.g., 'kg', 'Kilogramme', 'piece')
  // Discount fields
  lineDiscountValue?: number;
  lineDiscountType?: 'PERCENT' | 'AMOUNT';
  lineDiscountSource?: 'FROM_PRODUCT' | 'MANUAL' | 'NONE';
  subtotalBeforeDiscount?: number;
  discountAmount?: number;
  subtotalAfterDiscount?: number;
}

interface Product {
  id: string;
  name: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Discount fields
  discountValue?: number;
  discountType?: 'PERCENT' | 'AMOUNT';
  discountActive?: boolean;
}

interface SortableInvoiceItemProps {
  item: InvoiceItem;
  index: number;
  onUpdate: (index: number, field: keyof InvoiceItem, value: InvoiceItem[keyof InvoiceItem]) => void;
  onUpdateMultiple: (index: number, updates: Partial<InvoiceItem>) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
  readOnly?: boolean;
}

export const SortableInvoiceItem: React.FC<SortableInvoiceItemProps> = ({
  item,
  index,
  onUpdate,
  onUpdateMultiple,
  onRemove,
  onMove,
  isFirst,
  isLast,
  readOnly = false,
}) => {
  const { createProduct, notifications, removeNotification, products } = useProducts();
  const [lastCreatedProduct, setLastCreatedProduct] = useState<Product | null>(null);
  const { user } = useAuth();
  
  // Time calculator state (for hour-based services)
  const [showTimeCalc, setShowTimeCalc] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Determine unit: if not in item, try to get it from the product (for old invoices)
  const itemUnit = useMemo(() => {
    console.log('[useMemo] item:', item.description, 'item.unit:', item.unit, 'item.productId:', item.productId, 'products.length:', products.length);

    if (item.unit) {
      console.log('[useMemo] Using item.unit:', item.unit);
      return item.unit;
    }

    if (item.productId) {
      const product = products.find(p => p.id === item.productId);
      console.log('[useMemo] Looking for product with id:', item.productId, 'found:', product ? `YES (unit: ${product.unit})` : 'NO');
      if (product) {
        console.log('[useMemo] Product found:', product.name, 'unit:', product.unit);
      }
      return product?.unit;
    }

    console.log('[useMemo] No unit found for:', item.description);
    return undefined;
  }, [item.unit, item.productId, products, item.description]);

  // Determine decimals based on unit: 3 decimals for kg/Kilogramme, 2 for others
  const isKgUnit = isKilogramUnit(itemUnit);
  const userDecimals = ((user as { quantityDecimals?: number } | null | undefined)?.quantityDecimals === 3) ? 3 : 2;
  const quantityDecimals: 2 | 3 = isKgUnit ? 3 : userDecimals;
  const quantityStep = getQuantityStep(itemUnit);
  const roundQty = (val: number) => roundQuantity(Number.isFinite(val) ? val : 0, itemUnit);

  // Log for debugging
  useEffect(() => {
    if (item.description && item.description.toLowerCase().includes('côte')) {
      console.log('[SortableInvoiceItem DEBUG]', item.description, '- item.unit:', item.unit, '- resolved itemUnit:', itemUnit, '- decimals:', quantityDecimals, '- step:', quantityStep);
    }
  }, [item.unit, item.description, itemUnit, quantityDecimals, quantityStep]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Removed unused calculateItemTotal to satisfy no-unused-vars

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-item-id={item.id}
      className="p-4 border border-slate-200 rounded-lg bg-white overflow-visible"
    >
      {/* Description Row */}
      <div className="mb-4 w-full overflow-visible">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <div className="flex items-center gap-2 w-full overflow-visible relative z-10">
          {/* Drag Handle */}
          <div
            {...(!readOnly ? { ...attributes, ...listeners } : {})}
            className={`p-2 ${readOnly ? 'text-slate-300' : 'cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 hover:bg-slate-50'} rounded transition-colors flex-shrink-0`}
            title={readOnly ? 'Réorganisation verrouillée' : 'Faire glisser pour réorganiser'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z" />
            </svg>
          </div>

          <Input
            value={item.description}
            onChange={(e) => { if (!readOnly) onUpdate(index, 'description', e.target.value); }}
            placeholder="Description de l'article ou service"
            fullWidth
            className="flex-1 min-w-0"
            style={{ width: '100%', minWidth: '300px' }}
            disabled={readOnly}
          />
          {!readOnly && (
            <ProductSearchButton
              currentValue={item.description}
              onProductSelect={(product: Product) => {
                console.log('[SortableInvoiceItem] Product selected:', {
                  productName: product.name,
                  productTvaRate: product.tvaRate,
                  productUnitPrice: product.unitPrice,
                  productDiscountActive: product.discountActive,
                  productDiscountValue: product.discountValue,
                  productDiscountType: product.discountType
                });

                // Update all fields at once, including discount from product
                const updates: Partial<InvoiceItem> = {
                  description: product.name,
                  unitPrice: product.unitPrice,
                  tvaRate: product.tvaRate,
                  productId: product.id,
                  unit: product.unit,
                };

                console.log('[SortableInvoiceItem] DEBUG TVA: Selected product:', {
                  name: product.name,
                  tvaRate: product.tvaRate,
                  typeOfTva: typeof product.tvaRate
                });

                // Apply product discount if active
                if (product.discountActive && product.discountValue && product.discountValue > 0) {
                  updates.lineDiscountValue = product.discountValue;
                  updates.lineDiscountType = product.discountType || 'PERCENT';
                  updates.lineDiscountSource = 'FROM_PRODUCT';
                } else {
                  updates.lineDiscountValue = undefined;
                  updates.lineDiscountType = undefined;
                  updates.lineDiscountSource = 'NONE';
                }

                console.log('[SortableInvoiceItem] Updates to apply:', updates);

                onUpdateMultiple(index, updates);
                setLastCreatedProduct(null); // clear any hint once user selects
              }}
              createdProduct={lastCreatedProduct}
              onAddNew={async (name: string, unit: string, isService: boolean) => {
                const description = name.trim();
                const unitPrice = Number(item.unitPrice) || 0;
                const hasDescription = description.length >= 2;
                const hasPrice = Number.isFinite(unitPrice) && unitPrice > 0;
                // Require description and price only; TVA may be set later
                if (!hasDescription || !hasPrice) {
                  try { console.debug('[QuickCreate] blocked: missing fields', { hasDescription, hasPrice, descriptionLen: description.length, unitPrice }); } catch { /* noop */ }
                  return; // silently ignore as requested (only create if both provided)
                }

                try {
                  // Ensure a valid TVA rate for creation
                  const validRates = CURRENT_SWISS_TVA_RATES.map(r => r.value);
                  const currentTva = Number(item.tvaRate);
                  const tvaToUse = Number.isFinite(currentTva) && validRates.includes(currentTva)
                    ? currentTva
                    : validRates[0];
                  try { console.debug('[QuickCreate] creating product', { description, unitPrice, tvaToUse, unit, isService }); } catch { /* noop */ }
                  const created = await createProduct({
                    name: description,
                    description: description,
                    unitPrice: unitPrice,
                    tvaRate: tvaToUse,
                    unit: unit || 'piece',
                    isService: isService,
                    isActive: true,
                    discountActive: false,
                  });
                  if (created) {
                    try { console.debug('[QuickCreate] created OK', { id: created.id, name: created.name }); } catch { /* noop */ }
                    // Ensure required timestamps for type alignment and immediate suggestion injection
                    const nowIso = new Date().toISOString();
                    setLastCreatedProduct({
                      ...created,
                      createdAt: created.createdAt || nowIso,
                      updatedAt: created.updatedAt || nowIso,
                    } as Product);
                    const updates: Partial<InvoiceItem> = {
                      description: created.name,
                      unitPrice: Number.isFinite(created.unitPrice) ? created.unitPrice : unitPrice,
                      tvaRate: Number.isFinite(created.tvaRate) ? created.tvaRate : item.tvaRate,
                      productId: created.id,
                      unit: created.unit,
                    };
                    try { console.debug('[QuickCreate] applying updates to line', updates); } catch { /* noop */ }
                    onUpdateMultiple(index, updates);
                  }
                } catch (e) {
                  try { console.debug('[QuickCreate] createProduct failed', e); } catch { /* noop */ }
                  // createProduct already shows notifications; no-op here
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Fields Row */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">

        {/* Quantity with optional Time Calculator for hour-based services */}
        <div className="col-span-1 md:col-span-1 relative">
          <label className="block text-sm font-medium text-slate-700 mb-1 md:hidden">
            Quantité
          </label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              step={quantityStep}
              inputMode="decimal"
              value={(function () {
                const qtyRaw: unknown = item.quantity ?? 0;
                const qtyStr: string = typeof qtyRaw === 'string' ? qtyRaw : String(qtyRaw);
                const qtyNum = parseFloat(qtyStr.replace(',', '.'));
                const finalQty = Number.isFinite(qtyNum) ? qtyNum : 0;
                return finalQty === 0 ? '' : finalQty;
              })()}
              onChange={(e) => {
                if (readOnly) return;
                const raw = e.target.value;
                if (raw === '') {
                  onUpdate(index, 'quantity', 0);
                  return;
                }
                const normalized = raw.replace(',', '.');
                const parsed = parseFloat(normalized);
                onUpdate(index, 'quantity', roundQty(isNaN(parsed) ? 0 : parsed));
              }}
              placeholder="Qté"
              className="w-full text-center"
              disabled={readOnly}
            />
            {/* Clock button for hour-based services */}
            {isHourUnit(itemUnit) && !readOnly && (
              <button
                type="button"
                onClick={() => setShowTimeCalc(!showTimeCalc)}
                className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
                  showTimeCalc 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'
                }`}
                title="Calculer les heures"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Time Calculator Popover - Minimalist */}
          {showTimeCalc && isHourUnit(itemUnit) && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-3 min-w-[220px]">
              {/* Time inputs */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Début"
                />
                <span className="text-slate-300">→</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Fin"
                />
              </div>
              
              {/* Result + Actions */}
              <div className="flex items-center gap-2">
                {startTime && endTime && calculateHours(startTime, endTime) > 0 ? (
                  <div className="flex-1 text-center py-1.5 bg-blue-50 rounded-lg">
                    <span className="text-sm font-semibold text-blue-600">
                      = {calculateHours(startTime, endTime)}h
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 text-center py-1.5 text-slate-400 text-xs">
                    Sélectionnez les heures
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const hours = calculateHours(startTime, endTime);
                    if (hours > 0) {
                      onUpdate(index, 'quantity', hours);
                      setShowTimeCalc(false);
                      setStartTime('');
                      setEndTime('');
                    }
                  }}
                  disabled={!startTime || !endTime || calculateHours(startTime, endTime) <= 0}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTimeCalc(false);
                    setStartTime('');
                    setEndTime('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Unit Price */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1 md:hidden">
            Prix unitaire
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unitPrice === 0 ? '' : item.unitPrice}
            onChange={(e) => {
              if (readOnly) return;
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              onUpdate(index, 'unitPrice', isNaN(val) ? 0 : val);
            }}
            placeholder="PU"
            className="w-full text-right"
            disabled={readOnly}
          />
        </div>

        {/* TVA Rate */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1 md:hidden">
            Taux TVA
          </label>
          <select
            key={`tva-${item.id}-${item.tvaRate}`}
            value={item.tvaRate}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              console.log('[SortableInvoiceItem] Manual TVA change:', val);
              if (!readOnly) onUpdate(index, 'tvaRate', val);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={readOnly}
          >
            {CURRENT_SWISS_TVA_RATES.map((rate) => (
              <option key={rate.value} value={rate.value}>
                {rate.label}
              </option>
            ))}
          </select>
        </div>

        {/* Total */}
        <div className="col-span-1 md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1 md:hidden">
            Total
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-slate-50 rounded-md text-right font-medium">
              {formatCurrency(item.total)}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer cet article"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discount Section */}
      {!readOnly && (!item.lineDiscountSource || item.lineDiscountSource === 'NONE') && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              console.log('[SortableInvoiceItem] Adding discount, index:', index);
              onUpdateMultiple(index, {
                lineDiscountValue: DEFAULT_DISCOUNT_VALUE,
                lineDiscountType: DEFAULT_DISCOUNT_TYPE,
                lineDiscountSource: 'MANUAL',
              });
            }}
            className="text-sm px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
          >
            💰 Ajouter un rabais
          </button>
        </div>
      )}

      {item.lineDiscountSource && item.lineDiscountSource !== 'NONE' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg relative z-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-yellow-900">
                  💰 Rabais:
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.lineDiscountSource === 'FROM_PRODUCT'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                  }`}>
                  {item.lineDiscountSource === 'FROM_PRODUCT' ? '🏷️ De produit' : '✏️ Manuel'}
                </span>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      console.log('[SortableInvoiceItem] Removing discount, index:', index);
                      onUpdateMultiple(index, {
                        lineDiscountValue: undefined,
                        lineDiscountType: undefined,
                        lineDiscountSource: 'NONE',
                        discountAmount: 0,
                        subtotalBeforeDiscount: item.quantity * item.unitPrice,
                        subtotalAfterDiscount: item.quantity * item.unitPrice,
                      });
                    }}
                    className="text-xs px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Retirer le rabais de cette ligne"
                  >
                    ❌ Retirer
                  </button>
                </div>
              )}
            </div>

            {/* Editable discount inputs */}
            {!readOnly && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-yellow-800 mb-1">Valeur</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.lineDiscountValue || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const finalVal = isNaN(val) ? 0 : val;
                      console.log('[SortableInvoiceItem] Discount value changed:', {
                        index,
                        oldValue: item.lineDiscountValue,
                        newValue: finalVal,
                        rawInput: e.target.value
                      });
                      onUpdate(index, 'lineDiscountValue', finalVal);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-yellow-800 mb-1">Type</label>
                  <select
                    value={item.lineDiscountType || 'PERCENT'}
                    onChange={(e) => onUpdate(index, 'lineDiscountType', e.target.value as 'PERCENT' | 'AMOUNT')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="PERCENT">% Pourcentage</option>
                    <option value="AMOUNT">CHF Montant</option>
                  </select>
                </div>
              </div>
            )}

            {readOnly && (
              <div className="text-sm text-yellow-700 font-medium">
                {item.lineDiscountValue} {item.lineDiscountType === 'PERCENT' ? '%' : 'CHF'}
              </div>
            )}
          </div>

          {item.subtotalBeforeDiscount && item.discountAmount && (
            <div className="mt-2 text-xs text-yellow-800 space-y-0.5">
              <div className="flex justify-between">
                <span>Sous-total avant rabais:</span>
                <span className="font-medium">{formatCurrency(item.subtotalBeforeDiscount)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Rabais:</span>
                <span className="font-medium">-{formatCurrency(item.discountAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-700">
                <span>Sous-total après rabais:</span>
                <span>{formatCurrency(item.subtotalAfterDiscount || 0)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4" style={{ display: 'none' }}>

        {/* Actions */}
        <div className="col-span-1 md:col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1 md:hidden">
            Actions
          </label>
          {!readOnly && (
            <div className="flex items-center justify-center space-x-1">
              <button
                onClick={() => onMove(index, 'up')}
                disabled={isFirst}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Déplacer vers le haut"
              >
                ↑
              </button>
              <button
                onClick={() => onMove(index, 'down')}
                disabled={isLast}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Déplacer vers le bas"
              >
                ↓
              </button>
              <button
                onClick={() => onRemove(index)}
                className="p-1 text-red-400 hover:text-red-600"
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Notification container for product actions */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />
    </div>
  );
};
