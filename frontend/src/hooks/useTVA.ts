/**
 * 🇨🇭 Swiss TVA Hook - Centralized TVA Management for Frontend
 * 
 * This hook provides a clean interface for managing Swiss TVA
 * calculations and rates in React components.
 */

import { useState, useMemo } from 'react';

export interface SwissTVARate {
  rate: number;
  label: string;
  description: string;
  category: SwissTVACategory;
}

export enum SwissTVACategory {
  EXEMPT = 'EXEMPT',           // 0% - Services exonérés par la loi
  REDUCED = 'REDUCED',         // 2.6% - Taux réduit
  SPECIAL = 'SPECIAL',         // 3.8% - Taux spécial hébergement
  STANDARD = 'STANDARD',       // 8.1% - Taux normal
  NOT_SUBJECT = 'NOT_SUBJECT'  // 0% - Prestations non assujetties (ex: export)
}

export interface TVACalculation {
  netAmount: number;
  tvaRate: number;
  tvaAmount: number;
  grossAmount: number;
  isExempt: boolean;
  exemptionReason?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tvaCategory: SwissTVACategory;
}

export interface InvoiceTVASummary {
  netTotal: number;
  tvaBreakdown: Array<{
    category: SwissTVACategory;
    rate: number;
    netAmount: number;
    tvaAmount: number;
  }>;
  totalTVA: number;
  grossTotal: number;
  isExempt: boolean;
  exemptionReason?: string;
}

// Canton configuration (matches backend)
const CANTON_TVA_CONFIG: Record<string, {
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
  exemptionThreshold: number;
}> = {
  GE: {
    canton: 'Geneva',
    cantonCode: 'GE',
    name: 'Genève',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Taux normal)',
        description: 'Taux standard pour la plupart des biens et services',
        category: SwissTVACategory.STANDARD
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Taux réduit)',
        description: 'Biens de première nécessité, médicaments, livres, journaux',
        category: SwissTVACategory.REDUCED
      },
      special: {
        rate: 3.8,
        label: '3.8% (Taux réduit spécial)',
        description: 'Prestations d\'hébergement (hôtels, restaurants)',
        category: SwissTVACategory.SPECIAL
      },
      exempt: {
        rate: 0,
        label: '0% (Non applicable)',
        description: 'Services exonérés par la loi (santé, éducation, assurances)',
        category: SwissTVACategory.EXEMPT
      },
      notSubject: {
        rate: 0,
        label: '0% (Non assujetti)',
        description: 'Prestations non assujetties (export, services internationaux)',
        category: SwissTVACategory.NOT_SUBJECT
      }
    },
    exemptionThreshold: 100000
  },
  ZH: {
    canton: 'Zurich',
    cantonCode: 'ZH',
    name: 'Zürich',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Normalsatz)',
        description: 'Standardsatz für die meisten Waren und Dienstleistungen',
        category: SwissTVACategory.STANDARD
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Reduzierter Satz)',
        description: 'Grundnahrungsmittel, Medikamente, Bücher, Zeitungen',
        category: SwissTVACategory.REDUCED
      },
      special: {
        rate: 3.8,
        label: '3.8% (Sondersatz)',
        description: 'Beherbergungsleistungen (Hotels, Restaurants)',
        category: SwissTVACategory.SPECIAL
      },
      exempt: {
        rate: 0,
        label: '0% (Befreit)',
        description: 'Befreite Dienstleistungen (Gesundheit, Bildung, Versicherungen)',
        category: SwissTVACategory.EXEMPT
      },
      notSubject: {
        rate: 0,
        label: '0% (Nicht steuerbar)',
        description: 'Nicht steuerbare Leistungen (Export, internationale Dienstleistungen)',
        category: SwissTVACategory.NOT_SUBJECT
      }
    },
    exemptionThreshold: 100000
  },
  VD: {
    canton: 'Vaud',
    cantonCode: 'VD',
    name: 'Vaud',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Taux normal)',
        description: 'Taux standard pour la plupart des biens et services',
        category: SwissTVACategory.STANDARD
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Taux réduit)',
        description: 'Biens de première nécessité, médicaments, livres, journaux',
        category: SwissTVACategory.REDUCED
      },
      special: {
        rate: 3.8,
        label: '3.8% (Taux réduit spécial)',
        description: 'Prestations d\'hébergement (hôtels, restaurants)',
        category: SwissTVACategory.SPECIAL
      },
      exempt: {
        rate: 0,
        label: '0% (Non applicable)',
        description: 'Services exonérés par la loi (santé, éducation, assurances)',
        category: SwissTVACategory.EXEMPT
      },
      notSubject: {
        rate: 0,
        label: '0% (Non assujetti)',
        description: 'Prestations non assujetties (export, services internationaux)',
        category: SwissTVACategory.NOT_SUBJECT
      }
    },
    exemptionThreshold: 100000
  },
  BE: {
    canton: 'Bern',
    cantonCode: 'BE',
    name: 'Bern',
    rates: {
      standard: {
        rate: 8.1,
        label: '8.1% (Normalsatz)',
        description: 'Standardsatz für die meisten Waren und Dienstleistungen',
        category: SwissTVACategory.STANDARD
      },
      reduced: {
        rate: 2.6,
        label: '2.6% (Reduzierter Satz)',
        description: 'Grundnahrungsmittel, Medikamente, Bücher, Zeitungen',
        category: SwissTVACategory.REDUCED
      },
      special: {
        rate: 3.8,
        label: '3.8% (Sondersatz)',
        description: 'Beherbergungsleistungen (Hotels, Restaurants)',
        category: SwissTVACategory.SPECIAL
      },
      exempt: {
        rate: 0,
        label: '0% (Befreit)',
        description: 'Befreite Dienstleistungen (Gesundheit, Bildung, Versicherungen)',
        category: SwissTVACategory.EXEMPT
      },
      notSubject: {
        rate: 0,
        label: '0% (Nicht steuerbar)',
        description: 'Nicht steuerbare Leistungen (Export, internationale Dienstleistungen)',
        category: SwissTVACategory.NOT_SUBJECT
      }
    },
    exemptionThreshold: 100000
  }
};

export function useTVA(cantonCode: string = 'GE') {
  const [annualRevenue, setAnnualRevenue] = useState<number | undefined>(undefined);

  // Get canton configuration
  const cantonConfig = useMemo(() => {
    return CANTON_TVA_CONFIG[cantonCode] || CANTON_TVA_CONFIG['GE'];
  }, [cantonCode]);

  // Check if company is exempt from TVA
  const isExemptFromTVA = useMemo(() => {
    return annualRevenue !== undefined && 
           annualRevenue < cantonConfig.exemptionThreshold;
  }, [annualRevenue, cantonConfig.exemptionThreshold]);

  // Get available TVA rates for dropdowns
  const availableRates = useMemo(() => {
    return [
      cantonConfig.rates.exempt,
      cantonConfig.rates.notSubject,
      cantonConfig.rates.reduced,
      cantonConfig.rates.special,
      cantonConfig.rates.standard
    ];
  }, [cantonConfig]);

  // Get TVA rate for a specific category
  const getTVARate = (category: SwissTVACategory): number => {
    switch (category) {
      case SwissTVACategory.STANDARD:
        return cantonConfig.rates.standard.rate;
      case SwissTVACategory.REDUCED:
        return cantonConfig.rates.reduced.rate;
      case SwissTVACategory.SPECIAL:
        return cantonConfig.rates.special.rate;
      case SwissTVACategory.EXEMPT:
        return cantonConfig.rates.exempt.rate;
      case SwissTVACategory.NOT_SUBJECT:
        return cantonConfig.rates.notSubject.rate;
      default:
        return cantonConfig.rates.exempt.rate;
    }
  };

  // Calculate TVA for a single amount
  const calculateTVA = (
    netAmount: number,
    category: SwissTVACategory
  ): TVACalculation => {
    // Check for automatic exemption
    if (isExemptFromTVA) {
      return {
        netAmount,
        tvaRate: 0,
        tvaAmount: 0,
        grossAmount: netAmount,
        isExempt: true,
        exemptionReason: `Chiffre d'affaires annuel (${annualRevenue?.toLocaleString('fr-CH')} CHF) inférieur au seuil d'exonération (${cantonConfig.exemptionThreshold.toLocaleString('fr-CH')} CHF)`
      };
    }

    const tvaRate = getTVARate(category) / 100;
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
  };

  // Calculate TVA for an entire invoice
  const calculateInvoiceTVA = (items: InvoiceItem[]): InvoiceTVASummary => {
    const tvaBreakdown = new Map<SwissTVACategory, {
      rate: number;
      netAmount: number;
      tvaAmount: number;
    }>();

    let netTotal = 0;
    let totalTVA = 0;
    let isExempt = false;
    let exemptionReason: string | undefined;

    // Group items by TVA category
    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice;
      netTotal += itemTotal;

      const calculation = calculateTVA(itemTotal, item.tvaCategory);
      
      if (calculation.isExempt && calculation.exemptionReason) {
        isExempt = true;
        exemptionReason = calculation.exemptionReason;
      }

      if (tvaBreakdown.has(item.tvaCategory)) {
        const existing = tvaBreakdown.get(item.tvaCategory)!;
        existing.netAmount += itemTotal;
        existing.tvaAmount += calculation.tvaAmount;
      } else {
        tvaBreakdown.set(item.tvaCategory, {
          rate: calculation.tvaRate,
          netAmount: itemTotal,
          tvaAmount: calculation.tvaAmount
        });
      }

      totalTVA += calculation.tvaAmount;
    }

    return {
      netTotal,
      tvaBreakdown: Array.from(tvaBreakdown.entries()).map(([category, data]) => ({
        category,
        ...data
      })),
      totalTVA,
      grossTotal: netTotal + totalTVA,
      isExempt,
      exemptionReason
    };
  };

  // Get formatted rate label
  const getRateLabel = (category: SwissTVACategory): string => {
    switch (category) {
      case SwissTVACategory.STANDARD:
        return cantonConfig.rates.standard.label;
      case SwissTVACategory.REDUCED:
        return cantonConfig.rates.reduced.label;
      case SwissTVACategory.SPECIAL:
        return cantonConfig.rates.special.label;
      case SwissTVACategory.EXEMPT:
        return cantonConfig.rates.exempt.label;
      case SwissTVACategory.NOT_SUBJECT:
        return cantonConfig.rates.notSubject.label;
      default:
        return cantonConfig.rates.exempt.label;
    }
  };

  // Get all supported cantons
  const getSupportedCantons = () => {
    return Object.entries(CANTON_TVA_CONFIG).map(([code, config]) => ({
      code,
      name: config.name
    }));
  };

  // Update annual revenue (affects exemption status)
  const updateAnnualRevenue = (revenue: number) => {
    setAnnualRevenue(revenue);
  };

  return {
    // Configuration
    cantonConfig,
    availableRates,
    isExemptFromTVA,
    exemptionThreshold: cantonConfig.exemptionThreshold,
    
    // Calculation functions
    getTVARate,
    calculateTVA,
    calculateInvoiceTVA,
    getRateLabel,
    
    // Utility functions
    getSupportedCantons,
    updateAnnualRevenue,
    
    // State
    annualRevenue,
    cantonCode
  };
}