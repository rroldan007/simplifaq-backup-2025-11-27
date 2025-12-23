import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { DEFAULT_TVA_RATE } from '../../config/swissTaxRates';
import { CSVImportModal } from './CSVImportModal';
import type { CSVInvoiceItem } from './CSVImportModal';
import { useTVA } from '../../hooks/useTVA';
import type { SwissTVACategory } from '../../hooks/useTVA';
import { SortableInvoiceItem } from './SortableInvoiceItem';
import { useAuth } from '../../hooks/useAuth';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';


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

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onItemsChange: (items: InvoiceItem[]) => void;
  currency?: string;
  readOnly?: boolean;
}

export function InvoiceItemsTable({ 
  items, 
  onItemsChange, 
  currency = 'CHF',
  readOnly = false,
}: InvoiceItemsTableProps) {
  // Use Swiss TVA rates from configuration (2025 rates)
  const { availableRates, getTVARate } = useTVA();
  const [showImportModal, setShowImportModal] = useState(false);
  const { user } = useAuth();
  const quantityDecimals: 2 | 3 = ((user as { quantityDecimals?: number } | null | undefined)?.quantityDecimals === 3) ? 3 : 2;
  const roundQty = (val: number) => {
    const factor = Math.pow(10, quantityDecimals);
    return Math.round((Number.isFinite(val) ? val : 0) * factor) / factor;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over?.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      
      // Update order numbers
      reorderedItems.forEach((item, i) => {
        item.order = i;
      });
      
      onItemsChange(reorderedItems);
    }
  };

  const calculateItemTotal = (quantity: number, unitPrice: number, tvaRate: number, lineDiscountValue?: number, lineDiscountType?: 'PERCENT' | 'AMOUNT') => {
    const subtotalBefore = quantity * unitPrice;
    let discountAmt = 0;
    
    if (lineDiscountValue && lineDiscountValue > 0) {
      if (lineDiscountType === 'PERCENT') {
        discountAmt = subtotalBefore * (lineDiscountValue / 100);
      } else {
        discountAmt = Math.min(lineDiscountValue, subtotalBefore);
      }
    }
    
    const subtotalAfter = subtotalBefore - discountAmt;
    const tvaAmount = subtotalAfter * (tvaRate / 100);
    return subtotalAfter + tvaAmount;
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: InvoiceItem[keyof InvoiceItem]) => {
    if (readOnly) return;
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total if quantity, unitPrice, tvaRate, or discount changed
    if (['quantity', 'unitPrice', 'tvaRate', 'lineDiscountValue', 'lineDiscountType', 'lineDiscountSource'].includes(field)) {
      const item = updatedItems[index];
      updatedItems[index].total = calculateItemTotal(item.quantity, item.unitPrice, item.tvaRate, item.lineDiscountValue, item.lineDiscountType);
      
      // Update discount calculation fields
      const subtotalBefore = item.quantity * item.unitPrice;
      let discountAmt = 0;
      
      if (item.lineDiscountValue && item.lineDiscountValue > 0) {
        if (item.lineDiscountType === 'PERCENT') {
          discountAmt = subtotalBefore * (item.lineDiscountValue / 100);
        } else {
          discountAmt = Math.min(item.lineDiscountValue, subtotalBefore);
        }
      }
      
      updatedItems[index].subtotalBeforeDiscount = subtotalBefore;
      updatedItems[index].discountAmount = discountAmt;
      updatedItems[index].subtotalAfterDiscount = subtotalBefore - discountAmt;
    }
    
    onItemsChange(updatedItems);
  };

  const updateMultipleFields = (index: number, updates: Partial<InvoiceItem>) => {
    if (readOnly) return;
    const updatedItems = [...items];
    
    console.log('[InvoiceItemsTable] updateMultipleFields - BEFORE:', {
      index,
      currentTvaRate: updatedItems[index].tvaRate,
      updatesTvaRate: updates.tvaRate,
      updates
    });
    
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    // Always recalculate total when updating multiple fields
    const item = updatedItems[index];
    
    console.log('[InvoiceItemsTable] updateMultipleFields - AFTER spread:', {
      index,
      itemTvaRate: item.tvaRate,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscountValue: item.lineDiscountValue,
      lineDiscountType: item.lineDiscountType
    });
    
    updatedItems[index].total = calculateItemTotal(item.quantity, item.unitPrice, item.tvaRate, item.lineDiscountValue, item.lineDiscountType);
    
    console.log('[InvoiceItemsTable] updateMultipleFields - Final total:', updatedItems[index].total);
    
    // Update discount calculation fields
    const subtotalBefore = item.quantity * item.unitPrice;
    let discountAmt = 0;
    
    if (item.lineDiscountValue && item.lineDiscountValue > 0) {
      if (item.lineDiscountType === 'PERCENT') {
        discountAmt = subtotalBefore * (item.lineDiscountValue / 100);
      } else {
        discountAmt = Math.min(item.lineDiscountValue, subtotalBefore);
      }
    }
    
    updatedItems[index].subtotalBeforeDiscount = subtotalBefore;
    updatedItems[index].discountAmount = discountAmt;
    updatedItems[index].subtotalAfterDiscount = subtotalBefore - discountAmt;
    
    onItemsChange(updatedItems);
  };

  const addItem = () => {
    if (readOnly) return;
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      tvaRate: DEFAULT_TVA_RATE, // Default to normal Swiss TVA rate (2025)
      total: 0,
      order: items.length,
      productId: undefined,
      lineDiscountValue: undefined,
      lineDiscountType: undefined,
      lineDiscountSource: 'NONE',
      subtotalBeforeDiscount: 0,
      discountAmount: 0,
      subtotalAfterDiscount: 0,
    };
    
    onItemsChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (readOnly) return;
    const updatedItems = items.filter((_, i) => i !== index);
    // Update order numbers
    updatedItems.forEach((item, i) => {
      item.order = i;
    });
    onItemsChange(updatedItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }
    
    const updatedItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap items
    [updatedItems[index], updatedItems[targetIndex]] = 
    [updatedItems[targetIndex], updatedItems[index]];
    
    // Update order numbers
    updatedItems.forEach((item, i) => {
      item.order = i;
    });
    
    onItemsChange(updatedItems);
  };

  const calculateTotals = () => {
    // Calculate subtotal AFTER line discounts
    const subtotal = items.reduce((sum, item) => {
      const itemSubtotalBefore = item.quantity * item.unitPrice;
      let itemDiscount = 0;
      
      if (item.lineDiscountValue && item.lineDiscountValue > 0) {
        if (item.lineDiscountType === 'PERCENT') {
          itemDiscount = itemSubtotalBefore * (item.lineDiscountValue / 100);
        } else {
          itemDiscount = Math.min(item.lineDiscountValue, itemSubtotalBefore);
        }
      }
      
      return sum + (itemSubtotalBefore - itemDiscount);
    }, 0);
    
    const tvaByRate = items.reduce((acc, item) => {
      // Calculate TVA on amount AFTER line discount
      const itemSubtotalBefore = item.quantity * item.unitPrice;
      let itemDiscount = 0;
      
      if (item.lineDiscountValue && item.lineDiscountValue > 0) {
        if (item.lineDiscountType === 'PERCENT') {
          itemDiscount = itemSubtotalBefore * (item.lineDiscountValue / 100);
        } else {
          itemDiscount = Math.min(item.lineDiscountValue, itemSubtotalBefore);
        }
      }
      
      const itemSubtotal = itemSubtotalBefore - itemDiscount;
      const tvaAmount = itemSubtotal * (item.tvaRate / 100);
      
      if (!acc[item.tvaRate]) {
        acc[item.tvaRate] = { subtotal: 0, tva: 0 };
      }
      
      acc[item.tvaRate].subtotal += itemSubtotal;
      acc[item.tvaRate].tva += tvaAmount;
      
      return acc;
    }, {} as Record<number, { subtotal: number; tva: number }>);
    
    const totalTva = Object.values(tvaByRate).reduce((sum, rate) => sum + rate.tva, 0);
    const total = subtotal + totalTva;
    
    return { subtotal, tvaByRate, totalTva, total };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4 overflow-visible">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            Articles et services
          </h3>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowImportModal(true)} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              CSV
            </button>
            <button 
              onClick={addItem} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative text-center py-12 px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-slate-800 mb-1">
              Aucun article ajouté
            </h4>
            <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
              Recherchez un produit ci-dessus ou ajoutez manuellement vos articles
            </p>
            {!readOnly && (
              <button 
                onClick={addItem} 
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter le premier article
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden md:block">
            <div className="p-4 bg-slate-50 rounded-lg text-sm font-medium text-slate-700">
              <div className="mb-2">Description</div>
              <div className="grid grid-cols-7 gap-4">
                <div className="col-span-1 text-center">Qté</div>
                <div className="col-span-2 text-right">Prix unitaire</div>
                <div className="col-span-2 text-center">TVA</div>
                <div className="col-span-1 text-right">Total</div>
                {!readOnly && <div className="col-span-1 text-center">Actions</div>}
              </div>
            </div>
          </div>

          {/* Drag and Drop Context */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4 overflow-visible">
                {items.map((item, index) => (
                  <SortableInvoiceItem
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updateItem}
                    onUpdateMultiple={updateMultipleFields}
                    onRemove={removeItem}
                    onMove={moveItem}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {/* Totals summary */}
          <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-800 flex flex-col items-end gap-1">
            <div>
              <span className="mr-2 text-slate-600">Sous-total:</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div>
              <span className="mr-2 text-slate-600">TVA totale:</span>
              <span className="font-medium">{formatCurrency(totals.totalTva)}</span>
            </div>
            <div>
              <span className="mr-2 text-slate-700">Total:</span>
              <span className="font-semibold">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </>
      )}

    {/* Modal d'import CSV */}
    {showImportModal && (
      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(imported: CSVInvoiceItem[]) => {
          // Coerce and validate imported rows
          const safeMapped = imported
            .map((it, idx) => {
              const desc = (it.description || '').trim();
              const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity));
              const p = typeof it.unitPrice === 'number' ? it.unitPrice : parseFloat(String(it.unitPrice));
              const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
              const quantity = isFiniteNumber(q) ? roundQty(q) : 0;
              const unitPrice = isFiniteNumber(p) ? p : 0;
              let tvaRate = getTVARate(it.tvaCategory);
              if (!Number.isFinite(tvaRate)) {
                tvaRate = DEFAULT_TVA_RATE; // fallback to sensible Swiss default
              }
              const total = calculateItemTotal(quantity, unitPrice, tvaRate);
              return {
                id: `item-import-${Date.now()}-${idx}`,
                description: desc,
                quantity,
                unitPrice,
                tvaRate,
                total,
                order: items.length + idx,
                productId: undefined,
              } as InvoiceItem;
            })
            // Filter out invalid lines (must have description and positive quantity)
            .filter((row) => row.description.length > 0 && row.quantity > 0);

          if (safeMapped.length === 0) return setShowImportModal(false);
          onItemsChange([...items, ...safeMapped]);
          setShowImportModal(false);
        }}
        availableTVACategories={availableRates.map((r) => ({ category: r.category as SwissTVACategory, label: r.label }))}
      />
    )}
  </div>
);
}