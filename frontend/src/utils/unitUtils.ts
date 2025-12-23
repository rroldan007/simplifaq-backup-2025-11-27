/**
 * Unit Utilities - Normalization and formatting for product units
 */

// List of unit variations that should be treated as kilograms
const KG_VARIATIONS = [
  'kg',
  'kilogramme',
  'kilogrammes',
  'kilogram',
  'kilograms',
  'kilo',
  'kilos',
];

/**
 * Check if a unit is a kilogram variant
 */
export function isKilogramUnit(unit?: string | null): boolean {
  if (!unit) return false;
  const normalized = unit.toLowerCase().trim();
  return KG_VARIATIONS.some(v => normalized === v || normalized.includes(v));
}

/**
 * Normalize unit to standard format
 * - kilogramme, Kilogramme, KILOGRAMME, kilo -> kg
 * - litre, Litre -> liter
 * - unité, Unité -> unité
 */
export function normalizeUnit(unit?: string | null): string {
  if (!unit) return 'unité';
  const lower = unit.toLowerCase().trim();
  
  // Kilogram variations
  if (KG_VARIATIONS.some(v => lower === v || lower.includes(v))) {
    return 'kg';
  }
  
  // Liter variations
  if (['litre', 'litres', 'liter', 'liters', 'l'].includes(lower)) {
    return 'liter';
  }
  
  // Meter variations
  if (['mètre', 'metre', 'meter', 'mètres', 'metres', 'meters', 'm'].includes(lower)) {
    return 'meter';
  }
  
  // Piece/unit variations
  if (['piece', 'pièce', 'pieces', 'pièces', 'pc', 'pcs', 'unité', 'unite', 'unit'].includes(lower)) {
    return 'unité';
  }
  
  return unit; // Return original if no match
}

/**
 * Get the number of decimal places for quantity based on unit
 * - kg: 3 decimals (e.g., 3.678 kg)
 * - others: 2 decimals
 */
export function getQuantityDecimals(unit?: string | null): 2 | 3 {
  return isKilogramUnit(unit) ? 3 : 2;
}

/**
 * Format quantity for display with correct decimals based on unit
 * For kg: always show 3 decimals (e.g., 3.670 not 3.67)
 * For others: show up to 2 decimals, removing trailing zeros
 */
export function formatQuantity(quantity: number, unit?: string | null): string {
  const decimals = getQuantityDecimals(unit);
  
  if (isKilogramUnit(unit)) {
    // For kg, always show exactly 3 decimals
    return quantity.toFixed(3);
  }
  
  // For other units, show up to 2 decimals, remove trailing zeros
  const formatted = quantity.toFixed(decimals);
  // Remove unnecessary trailing zeros but keep at least one decimal for non-integers
  return parseFloat(formatted).toString();
}

/**
 * Format quantity with unit label for display
 */
export function formatQuantityWithUnit(quantity: number, unit?: string | null): string {
  const formattedQty = formatQuantity(quantity, unit);
  const displayUnit = unit || 'unité';
  return `${formattedQty} ${displayUnit}`;
}

/**
 * Get step value for quantity input based on unit
 */
export function getQuantityStep(unit?: string | null): string {
  return isKilogramUnit(unit) ? '0.001' : '0.01';
}

/**
 * Round quantity to appropriate precision based on unit
 */
export function roundQuantity(quantity: number, unit?: string | null): number {
  const decimals = getQuantityDecimals(unit);
  const factor = Math.pow(10, decimals);
  return Math.round(quantity * factor) / factor;
}
