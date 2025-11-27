/**
 * Swiss TVA (VAT) Tax Rates Configuration
 * 
 * This file contains the current Swiss TVA rates and can be easily updated
 * when rates change in the future.
 * 
 * Last updated: 2025 - Current rates effective from January 1, 2025
 * Previous rates (until Dec 31, 2024): 2.5%, 3.7%, 7.7%
 * Current rates (from Jan 1, 2025): 2.6%, 3.8%, 8.1%
 */

export interface TaxRate {
  value: number;
  label: string;
  description?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export const SWISS_TVA_RATES_2025: TaxRate[] = [
  {
    value: 0,
    label: '0% (Non applicable)',
    description: 'Prestations exonérées de TVA',
    effectiveFrom: '2025-01-01'
  },
  {
    value: 2.6,
    label: '2.6% (Taux réduit)',
    description: 'Biens de première nécessité, médicaments, livres, journaux',
    effectiveFrom: '2025-01-01'
  },
  {
    value: 3.8,
    label: '3.8% (Taux réduit)',
    description: 'Prestations d\'hébergement (hôtels, restaurants)',
    effectiveFrom: '2025-01-01'
  },
  {
    value: 8.1,
    label: '8.1% (Taux normal)',
    description: 'Taux standard pour la plupart des biens et services',
    effectiveFrom: '2025-01-01'
  }
];

// Historical rates for reference
export const SWISS_TVA_RATES_2024: TaxRate[] = [
  {
    value: 0,
    label: '0% (Non applicable)',
    effectiveFrom: '2024-01-01',
    effectiveTo: '2024-12-31'
  },
  {
    value: 2.5,
    label: '2.5% (Taux réduit)',
    effectiveFrom: '2024-01-01',
    effectiveTo: '2024-12-31'
  },
  {
    value: 3.7,
    label: '3.7% (Taux réduit spécial)',
    effectiveFrom: '2024-01-01',
    effectiveTo: '2024-12-31'
  },
  {
    value: 7.7,
    label: '7.7% (Taux normal)',
    effectiveFrom: '2024-01-01',
    effectiveTo: '2024-12-31'
  }
];

// Current active rates (easy to update for future changes)
export const CURRENT_SWISS_TVA_RATES = SWISS_TVA_RATES_2025;

// Default TVA rate (normal rate)
export const DEFAULT_TVA_RATE = 8.1;

// Helper function to get rates for a specific date (future enhancement)
export function getTaxRatesForDate(): TaxRate[] {
  // For now, return current rates
  // In the future, this could check the date and return appropriate historical rates
  return CURRENT_SWISS_TVA_RATES;
}

// Helper function to get the default rate for a specific date
export function getDefaultTaxRateForDate(): number {
  const rates = getTaxRatesForDate();
  const normalRate = rates.find(rate => rate.label.includes('normal'));
  return normalRate?.value || DEFAULT_TVA_RATE;
}