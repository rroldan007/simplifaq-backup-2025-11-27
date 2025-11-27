/**
 * 🇨🇭 Swiss Tax Configuration - Centralized TVA Management
 * 
 * This file centralizes all Swiss TVA rates by canton and handles
 * automatic exemptions based on annual revenue thresholds.
 * 
 * Last updated: January 2025
 */

export interface SwissTVARate {
  rate: number;
  label: string;
  description: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface CantonTVAConfig {
  canton: string;
  cantonCode: string;
  name: string;
  rates: {
    standard: SwissTVARate;
    reduced: SwissTVARate;
    special: SwissTVARate;
    exempt: SwissTVARate;
    notSubject: SwissTVARate;
  };
  exemptionThreshold: number; // CHF annual revenue threshold
  lastUpdated: string;
}

// Swiss TVA Categories
export enum SwissTVACategory {
  EXEMPT = 'EXEMPT',           // 0% - Services exonérés par la loi
  REDUCED = 'REDUCED',         // 2.6% - Taux réduit
  SPECIAL = 'SPECIAL',         // 3.8% - Taux spécial hébergement
  STANDARD = 'STANDARD',       // 8.1% - Taux normal
  NOT_SUBJECT = 'NOT_SUBJECT'  // 0% - Prestations non assujetties (ex: export)
}

// Current Swiss TVA Configuration by Canton
export const SWISS_CANTON_TVA_CONFIG: Record<string, CantonTVAConfig> = {
  // Geneva (Genève)
  GE: {
    canton: 'Geneva',
    cantonCode: 'GE',
    name: 'Genève',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Taux normal)',
        description: 'Taux standard pour la plupart des biens et services',
        effectiveFrom: '2025-01-01'
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Taux réduit)',
        description: 'Biens de première nécessité, médicaments, livres, journaux',
        effectiveFrom: '2025-01-01'
      },
      special: {
        rate: 3.8,
        label: '3.8% (Taux réduit spécial)',
        description: 'Prestations d\'hébergement (hôtels, restaurants)',
        effectiveFrom: '2025-01-01'
      },
      exempt: {
        rate: 0,
        label: '0% (Exonéré)',
        description: 'Services exonérés par la loi (santé, éducation, assurances)',
        effectiveFrom: '2025-01-01'
      },
      notSubject: {
        rate: 0,
        label: '0% (Non assujetti)',
        description: 'Prestations non assujetties (export, services internationaux)',
        effectiveFrom: '2025-01-01'
      }
    },
    exemptionThreshold: 100000, // CHF per year
    lastUpdated: '2025-01-01'
  },

  // Zurich
  ZH: {
    canton: 'Zurich',
    cantonCode: 'ZH',
    name: 'Zürich',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Normalsatz)',
        description: 'Standardsatz für die meisten Waren und Dienstleistungen',
        effectiveFrom: '2025-01-01'
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Reduzierter Satz)',
        description: 'Grundnahrungsmittel, Medikamente, Bücher, Zeitungen',
        effectiveFrom: '2025-01-01'
      },
      special: {
        rate: 3.8,
        label: '3.8% (Sondersatz)',
        description: 'Beherbergungsleistungen (Hotels, Restaurants)',
        effectiveFrom: '2025-01-01'
      },
      exempt: {
        rate: 0,
        label: '0% (Befreit)',
        description: 'Befreite Dienstleistungen (Gesundheit, Bildung, Versicherungen)',
        effectiveFrom: '2025-01-01'
      },
      notSubject: {
        rate: 0,
        label: '0% (Nicht steuerbar)',
        description: 'Nicht steuerbare Leistungen (Export, internationale Dienstleistungen)',
        effectiveFrom: '2025-01-01'
      }
    },
    exemptionThreshold: 100000,
    lastUpdated: '2025-01-01'
  },

  // Vaud
  VD: {
    canton: 'Vaud',
    cantonCode: 'VD',
    name: 'Vaud',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Taux normal)',
        description: 'Taux standard pour la plupart des biens et services',
        effectiveFrom: '2025-01-01'
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Taux réduit)',
        description: 'Biens de première nécessité, médicaments, livres, journaux',
        effectiveFrom: '2025-01-01'
      },
      special: {
        rate: 3.8,
        label: '3.8% (Taux réduit spécial)',
        description: 'Prestations d\'hébergement (hôtels, restaurants)',
        effectiveFrom: '2025-01-01'
      },
      exempt: {
        rate: 0,
        label: '0% (Exonéré)',
        description: 'Services exonérés par la loi (santé, éducation, assurances)',
        effectiveFrom: '2025-01-01'
      },
      notSubject: {
        rate: 0,
        label: '0% (Non assujetti)',
        description: 'Prestations non assujetties (export, services internationaux)',
        effectiveFrom: '2025-01-01'
      }
    },
    exemptionThreshold: 100000,
    lastUpdated: '2025-01-01'
  },

  // Bern
  BE: {
    canton: 'Bern',
    cantonCode: 'BE',
    name: 'Bern',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Normalsatz)',
        description: 'Standardsatz für die meisten Waren und Dienstleistungen',
        effectiveFrom: '2025-01-01'
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Reduzierter Satz)',
        description: 'Grundnahrungsmittel, Medikamente, Bücher, Zeitungen',
        effectiveFrom: '2025-01-01'
      },
      special: {
        rate: 3.8,
        label: '3.8% (Sondersatz)',
        description: 'Beherbergungsleistungen (Hotels, Restaurants)',
        effectiveFrom: '2025-01-01'
      },
      exempt: {
        rate: 0,
        label: '0% (Befreit)',
        description: 'Befreite Dienstleistungen (Gesundheit, Bildung, Versicherungen)',
        effectiveFrom: '2025-01-01'
      },
      notSubject: {
        rate: 0,
        label: '0% (Nicht steuerbar)',
        description: 'Nicht steuerbare Leistungen (Export, internationale Dienstleistungen)',
        effectiveFrom: '2025-01-01'
      }
    },
    exemptionThreshold: 100000,
    lastUpdated: '2025-01-01'
  }
};

// Default canton (Geneva)
export const DEFAULT_CANTON = 'GE';

/**
 * Get TVA rates for a specific canton
 */
export function getCantonTVAConfig(cantonCode: string = DEFAULT_CANTON): CantonTVAConfig {
  return SWISS_CANTON_TVA_CONFIG[cantonCode] || SWISS_CANTON_TVA_CONFIG[DEFAULT_CANTON];
}

/**
 * Get specific TVA rate for a canton and category
 */
export function getTVARate(
  category: SwissTVACategory, 
  cantonCode: string = DEFAULT_CANTON
): number {
  const config = getCantonTVAConfig(cantonCode);
  
  switch (category) {
    case SwissTVACategory.STANDARD:
      return config.rates.standard.rate;
    case SwissTVACategory.REDUCED:
      return config.rates.reduced.rate;
    case SwissTVACategory.SPECIAL:
      return config.rates.special.rate;
    case SwissTVACategory.EXEMPT:
      return config.rates.exempt.rate;
    case SwissTVACategory.NOT_SUBJECT:
      return config.rates.notSubject.rate;
    default:
      return config.rates.exempt.rate;
  }
}

/**
 * Check if a company should be exempt from TVA based on annual revenue
 */
export function isExemptFromTVA(
  annualRevenue: number, 
  cantonCode: string = DEFAULT_CANTON
): boolean {
  const config = getCantonTVAConfig(cantonCode);
  return annualRevenue < config.exemptionThreshold;
}

/**
 * Calculate TVA amount with automatic exemption check
 */
export interface TVACalculation {
  netAmount: number;
  tvaRate: number;
  tvaAmount: number;
  grossAmount: number;
  isExempt: boolean;
  exemptionReason?: string;
}

export function calculateTVA(
  netAmount: number,
  category: SwissTVACategory,
  cantonCode: string = DEFAULT_CANTON,
  annualRevenue?: number
): TVACalculation {
  const config = getCantonTVAConfig(cantonCode);
  
  // Check for automatic exemption
  if (annualRevenue !== undefined && isExemptFromTVA(annualRevenue, cantonCode)) {
    return {
      netAmount,
      tvaRate: 0,
      tvaAmount: 0,
      grossAmount: netAmount,
      isExempt: true,
      exemptionReason: `Chiffre d'affaires annuel (${annualRevenue.toLocaleString('fr-CH')} CHF) inférieur au seuil d'exonération (${config.exemptionThreshold.toLocaleString('fr-CH')} CHF)`
    };
  }

  const tvaRate = getTVARate(category, cantonCode) / 100;
  const tvaAmount = Math.round(netAmount * tvaRate * 100) / 100;
  const grossAmount = netAmount + tvaAmount;

  return {
    netAmount,
    tvaRate,
    tvaAmount,
    grossAmount,
    isExempt: category === SwissTVACategory.EXEMPT,
    exemptionReason: category === SwissTVACategory.EXEMPT ? 'Service exonéré de TVA' : undefined
  };
}

/**
 * Get all available TVA rates for a canton (for UI dropdowns)
 */
export function getAvailableTVARates(cantonCode: string = DEFAULT_CANTON): SwissTVARate[] {
  const config = getCantonTVAConfig(cantonCode);
  return [
    config.rates.exempt,
    config.rates.notSubject,
    config.rates.reduced,
    config.rates.special,
    config.rates.standard
  ];
}

/**
 * Get all supported cantons
 */
export function getSupportedCantons(): Array<{code: string, name: string}> {
  return Object.entries(SWISS_CANTON_TVA_CONFIG).map(([code, config]) => ({
    code,
    name: config.name
  }));
}

/**
 * Update TVA rates for a canton (for admin use)
 */
export function updateCantonTVARates(
  cantonCode: string,
  newRates: Partial<CantonTVAConfig['rates']>
): void {
  if (SWISS_CANTON_TVA_CONFIG[cantonCode]) {
    SWISS_CANTON_TVA_CONFIG[cantonCode].rates = {
      ...SWISS_CANTON_TVA_CONFIG[cantonCode].rates,
      ...newRates
    };
    SWISS_CANTON_TVA_CONFIG[cantonCode].lastUpdated = new Date().toISOString().split('T')[0];
  }
}