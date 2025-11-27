/**
 * 🇨🇭 Swiss TVA Service - Centralized TVA Management
 * 
 * This service handles all TVA calculations and provides a clean API
 * for the rest of the application to use Swiss TVA functionality.
 */

import { 
  SwissTVACategory, 
  getTVARate, 
  calculateTVA, 
  getCantonTVAConfig,
  getAvailableTVARates,
  isExemptFromTVA,
  TVACalculation
} from '../config/swissTaxConfig';

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

export class TVAService {
  private cantonCode: string;
  private annualRevenue?: number;

  constructor(cantonCode: string = 'GE', annualRevenue?: number) {
    this.cantonCode = cantonCode;
    this.annualRevenue = annualRevenue;
  }

  /**
   * Calculate TVA for a single amount
   */
  calculateSingleTVA(
    netAmount: number, 
    category: SwissTVACategory
  ): TVACalculation {
    return calculateTVA(netAmount, category, this.cantonCode, this.annualRevenue);
  }

  /**
   * Calculate TVA for an entire invoice
   */
  calculateInvoiceTVA(items: InvoiceItem[]): InvoiceTVASummary {
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

      const calculation = this.calculateSingleTVA(itemTotal, item.tvaCategory);
      
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
  }

  /**
   * Get available TVA rates for UI
   */
  getAvailableRates() {
    return getAvailableTVARates(this.cantonCode);
  }

  /**
   * Get canton configuration
   */
  getCantonConfig() {
    return getCantonTVAConfig(this.cantonCode);
  }

  /**
   * Check if company is exempt from TVA
   */
  isCompanyExempt(): boolean {
    return this.annualRevenue !== undefined && 
           isExemptFromTVA(this.annualRevenue, this.cantonCode);
  }

  /**
   * Get TVA rate for a specific category
   */
  getRate(category: SwissTVACategory): number {
    return getTVARate(category, this.cantonCode);
  }

  /**
   * Update canton (for multi-canton companies)
   */
  setCanton(cantonCode: string) {
    this.cantonCode = cantonCode;
  }

  /**
   * Update annual revenue (affects exemption status)
   */
  setAnnualRevenue(revenue: number) {
    this.annualRevenue = revenue;
  }

  /**
   * Generate TVA report for a period
   */
  generateTVAReport(invoices: Array<{
    items: InvoiceItem[];
    date: Date;
    invoiceNumber: string;
  }>): {
    period: { from: Date; to: Date };
    totalNet: number;
    totalTVA: number;
    totalGross: number;
    tvaByCategory: Array<{
      category: SwissTVACategory;
      rate: number;
      netAmount: number;
      tvaAmount: number;
    }>;
    invoiceCount: number;
    exemptInvoices: number;
  } {
    const categoryTotals = new Map<SwissTVACategory, {
      rate: number;
      netAmount: number;
      tvaAmount: number;
    }>();

    let totalNet = 0;
    let totalTVA = 0;
    let exemptInvoices = 0;
    let minDate = new Date();
    let maxDate = new Date(0);

    for (const invoice of invoices) {
      const invoiceSummary = this.calculateInvoiceTVA(invoice.items);
      
      if (invoiceSummary.isExempt) {
        exemptInvoices++;
      }

      totalNet += invoiceSummary.netTotal;
      totalTVA += invoiceSummary.totalTVA;

      // Update date range
      if (invoice.date < minDate) minDate = invoice.date;
      if (invoice.date > maxDate) maxDate = invoice.date;

      // Aggregate by category
      for (const breakdown of invoiceSummary.tvaBreakdown) {
        if (categoryTotals.has(breakdown.category)) {
          const existing = categoryTotals.get(breakdown.category)!;
          existing.netAmount += breakdown.netAmount;
          existing.tvaAmount += breakdown.tvaAmount;
        } else {
          categoryTotals.set(breakdown.category, {
            rate: breakdown.rate,
            netAmount: breakdown.netAmount,
            tvaAmount: breakdown.tvaAmount
          });
        }
      }
    }

    return {
      period: { from: minDate, to: maxDate },
      totalNet,
      totalTVA,
      totalGross: totalNet + totalTVA,
      tvaByCategory: Array.from(categoryTotals.entries()).map(([category, data]) => ({
        category,
        ...data
      })),
      invoiceCount: invoices.length,
      exemptInvoices
    };
  }
}

// Factory function for easy instantiation
export function createTVAService(cantonCode?: string, annualRevenue?: number): TVAService {
  return new TVAService(cantonCode, annualRevenue);
}

// Singleton for default usage
export const defaultTVAService = new TVAService();