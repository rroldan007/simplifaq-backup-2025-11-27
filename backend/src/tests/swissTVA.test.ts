import {
  calculateSwissTVA,
  getSwissTVARate,
  formatSwissTVAAmount,
  validateSwissTVANumber,
  SwissTVACategory,
  SwissTVACalculation,
} from '../utils/swissTVA';

describe('Swiss TVA (VAT) Utilities', () => {
  describe('getSwissTVARate', () => {
    it('should return correct TVA rates for different categories', () => {
      expect(getSwissTVARate(SwissTVACategory.STANDARD)).toBe(0.081); // 8.1%
      expect(getSwissTVARate(SwissTVACategory.REDUCED)).toBe(0.026); // 2.6%
      expect(getSwissTVARate(SwissTVACategory.SPECIAL)).toBe(0.038); // 3.8%
      expect(getSwissTVARate(SwissTVACategory.EXEMPT)).toBe(0); // 0%
    });

    it('should handle invalid categories', () => {
      expect(() => getSwissTVARate('INVALID' as SwissTVACategory)).toThrow('Catégorie TVA invalide');
    });
  });

  describe('calculateSwissTVA', () => {
    it('should calculate TVA correctly for standard rate', () => {
      const result = calculateSwissTVA(1000, SwissTVACategory.STANDARD);
      
      expect(result.netAmount).toBe(1000);
      expect(result.tvaRate).toBe(0.081);
      expect(result.tvaAmount).toBe(81);
      expect(result.grossAmount).toBe(1081);
      expect(result.category).toBe(SwissTVACategory.STANDARD);
    });

    it('should calculate TVA correctly for reduced rate', () => {
      const result = calculateSwissTVA(1000, SwissTVACategory.REDUCED);
      
      expect(result.netAmount).toBe(1000);
      expect(result.tvaRate).toBe(0.026);
      expect(result.tvaAmount).toBe(26);
      expect(result.grossAmount).toBe(1026);
      expect(result.category).toBe(SwissTVACategory.REDUCED);
    });

    it('should calculate TVA correctly for special rate', () => {
      const result = calculateSwissTVA(1000, SwissTVACategory.SPECIAL);
      
      expect(result.netAmount).toBe(1000);
      expect(result.tvaRate).toBe(0.038);
      expect(result.tvaAmount).toBe(38);
      expect(result.grossAmount).toBe(1038);
      expect(result.category).toBe(SwissTVACategory.SPECIAL);
    });

    it('should handle exempt category', () => {
      const result = calculateSwissTVA(1000, SwissTVACategory.EXEMPT);
      
      expect(result.netAmount).toBe(1000);
      expect(result.tvaRate).toBe(0);
      expect(result.tvaAmount).toBe(0);
      expect(result.grossAmount).toBe(1000);
      expect(result.category).toBe(SwissTVACategory.EXEMPT);
    });

    it('should round TVA amounts correctly', () => {
      // Test with amount that results in fractional TVA
      const result = calculateSwissTVA(100.33, SwissTVACategory.STANDARD);
      
      expect(result.tvaAmount).toBe(8.13); // 100.33 * 0.081 = 8.12673, rounded to 8.13
      expect(result.grossAmount).toBe(108.06);
    });

    it('should handle zero amounts', () => {
      const result = calculateSwissTVA(0, SwissTVACategory.STANDARD);
      
      expect(result.netAmount).toBe(0);
      expect(result.tvaAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });

    it('should handle negative amounts', () => {
      const result = calculateSwissTVA(-100, SwissTVACategory.STANDARD);
      
      expect(result.netAmount).toBe(-100);
      expect(result.tvaAmount).toBe(-7.7);
      expect(result.grossAmount).toBe(-107.7);
    });

    it('should include breakdown by category', () => {
      const result = calculateSwissTVA(1000, SwissTVACategory.STANDARD);
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.standard).toBe(77);
      expect(result.breakdown.reduced).toBe(0);
      expect(result.breakdown.special).toBe(0);
      expect(result.breakdown.exempt).toBe(0);
    });
  });

  describe('formatSwissTVAAmount', () => {
    it('should format amounts in Swiss format', () => {
      expect(formatSwissTVAAmount(1234.56)).toBe('1\'234.56');
      expect(formatSwissTVAAmount(1000)).toBe('1\'000.00');
      expect(formatSwissTVAAmount(123)).toBe('123.00');
      expect(formatSwissTVAAmount(0)).toBe('0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatSwissTVAAmount(-1234.56)).toBe('-1\'234.56');
    });

    it('should round to 2 decimal places', () => {
      expect(formatSwissTVAAmount(123.456)).toBe('123.46');
      expect(formatSwissTVAAmount(123.454)).toBe('123.45');
    });
  });

  describe('validateSwissTVANumber', () => {
    it('should validate correct Swiss TVA numbers', () => {
      const validNumbers = [
        'CHE-123.456.789 TVA',
        'CHE-123.456.789 MWST',
        'CHE-123.456.789 IVA',
        'CHE-123456789 TVA',
        'CHE123456789TVA',
      ];

      validNumbers.forEach(number => {
        expect(validateSwissTVANumber(number)).toBe(true);
      });
    });

    it('should reject invalid Swiss TVA numbers', () => {
      const invalidNumbers = [
        'CHE-123.456.78 TVA', // Too short
        'CHE-123.456.7890 TVA', // Too long
        'DE-123.456.789 TVA', // Wrong country code
        'CHE-123.456.789', // Missing TVA suffix
        'CHE-123.456.789 VAT', // Wrong suffix
        '123.456.789 TVA', // Missing CHE prefix
        '',
        null,
        undefined,
      ];

      invalidNumbers.forEach(number => {
        expect(validateSwissTVANumber(number as any)).toBe(false);
      });
    });

    it('should handle different language suffixes', () => {
      const number = 'CHE-123.456.789';
      expect(validateSwissTVANumber(`${number} TVA`)).toBe(true); // French
      expect(validateSwissTVANumber(`${number} MWST`)).toBe(true); // German
      expect(validateSwissTVANumber(`${number} IVA`)).toBe(true); // Italian
    });
  });

  describe('Complex TVA calculations', () => {
    it('should calculate TVA for multiple items with different rates', () => {
      const items = [
        { amount: 1000, category: SwissTVACategory.STANDARD },
        { amount: 500, category: SwissTVACategory.REDUCED },
        { amount: 200, category: SwissTVACategory.SPECIAL },
        { amount: 100, category: SwissTVACategory.EXEMPT },
      ];

      const results = items.map(item => calculateSwissTVA(item.amount, item.category));
      
      const totalNet = results.reduce((sum, result) => sum + result.netAmount, 0);
      const totalTVA = results.reduce((sum, result) => sum + result.tvaAmount, 0);
      const totalGross = results.reduce((sum, result) => sum + result.grossAmount, 0);

      expect(totalNet).toBe(1800);
      expect(totalTVA).toBe(77 + 12.5 + 7.4 + 0); // 96.9
      expect(totalGross).toBe(1896.9);
    });

    it('should handle invoice-level TVA calculation', () => {
      const invoiceItems = [
        { description: 'Service A', amount: 1000, tvaCategory: SwissTVACategory.STANDARD },
        { description: 'Service B', amount: 500, tvaCategory: SwissTVACategory.REDUCED },
        { description: 'Service C', amount: 200, tvaCategory: SwissTVACategory.EXEMPT },
      ];

      const invoiceTVA = invoiceItems.reduce((acc, item) => {
        const tvaCalc = calculateSwissTVA(item.amount, item.tvaCategory);
        return {
          netTotal: acc.netTotal + tvaCalc.netAmount,
          tvaTotal: acc.tvaTotal + tvaCalc.tvaAmount,
          grossTotal: acc.grossTotal + tvaCalc.grossAmount,
          breakdown: {
            standard: acc.breakdown.standard + (tvaCalc.category === SwissTVACategory.STANDARD ? tvaCalc.tvaAmount : 0),
            reduced: acc.breakdown.reduced + (tvaCalc.category === SwissTVACategory.REDUCED ? tvaCalc.tvaAmount : 0),
            special: acc.breakdown.special + (tvaCalc.category === SwissTVACategory.SPECIAL ? tvaCalc.tvaAmount : 0),
            exempt: acc.breakdown.exempt + (tvaCalc.category === SwissTVACategory.EXEMPT ? tvaCalc.tvaAmount : 0),
          },
        };
      }, {
        netTotal: 0,
        tvaTotal: 0,
        grossTotal: 0,
        breakdown: { standard: 0, reduced: 0, special: 0, exempt: 0 },
      });

      expect(invoiceTVA.netTotal).toBe(1700);
      expect(invoiceTVA.tvaTotal).toBe(89.5); // 77 + 12.5 + 0
      expect(invoiceTVA.grossTotal).toBe(1789.5);
      expect(invoiceTVA.breakdown.standard).toBe(77);
      expect(invoiceTVA.breakdown.reduced).toBe(12.5);
      expect(invoiceTVA.breakdown.exempt).toBe(0);
    });
  });

  describe('TVA reporting calculations', () => {
    it('should calculate quarterly TVA report totals', () => {
      const quarterlyInvoices = [
        { netAmount: 10000, tvaCategory: SwissTVACategory.STANDARD },
        { netAmount: 5000, tvaCategory: SwissTVACategory.REDUCED },
        { netAmount: 2000, tvaCategory: SwissTVACategory.SPECIAL },
        { netAmount: 1000, tvaCategory: SwissTVACategory.EXEMPT },
      ];

      const quarterlyTotals = quarterlyInvoices.reduce((totals, invoice) => {
        const tvaCalc = calculateSwissTVA(invoice.netAmount, invoice.tvaCategory);
        
        totals.totalNet += tvaCalc.netAmount;
        totals.totalTVA += tvaCalc.tvaAmount;
        totals.totalGross += tvaCalc.grossAmount;
        
        switch (tvaCalc.category) {
          case SwissTVACategory.STANDARD:
            totals.standardNet += tvaCalc.netAmount;
            totals.standardTVA += tvaCalc.tvaAmount;
            break;
          case SwissTVACategory.REDUCED:
            totals.reducedNet += tvaCalc.netAmount;
            totals.reducedTVA += tvaCalc.tvaAmount;
            break;
          case SwissTVACategory.SPECIAL:
            totals.specialNet += tvaCalc.netAmount;
            totals.specialTVA += tvaCalc.tvaAmount;
            break;
          case SwissTVACategory.EXEMPT:
            totals.exemptNet += tvaCalc.netAmount;
            break;
        }
        
        return totals;
      }, {
        totalNet: 0,
        totalTVA: 0,
        totalGross: 0,
        standardNet: 0,
        standardTVA: 0,
        reducedNet: 0,
        reducedTVA: 0,
        specialNet: 0,
        specialTVA: 0,
        exemptNet: 0,
      });

      expect(quarterlyTotals.totalNet).toBe(18000);
      expect(quarterlyTotals.totalTVA).toBe(969); // 770 + 125 + 74
      expect(quarterlyTotals.totalGross).toBe(18969);
      
      expect(quarterlyTotals.standardNet).toBe(10000);
      expect(quarterlyTotals.standardTVA).toBe(770);
      
      expect(quarterlyTotals.reducedNet).toBe(5000);
      expect(quarterlyTotals.reducedTVA).toBe(125);
      
      expect(quarterlyTotals.specialNet).toBe(2000);
      expect(quarterlyTotals.specialTVA).toBe(74);
      
      expect(quarterlyTotals.exemptNet).toBe(1000);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very large amounts', () => {
      const largeAmount = 999999999.99;
      const result = calculateSwissTVA(largeAmount, SwissTVACategory.STANDARD);
      
      expect(result.netAmount).toBe(largeAmount);
      expect(result.tvaAmount).toBe(Math.round(largeAmount * 0.081 * 100) / 100);
      expect(result.grossAmount).toBe(largeAmount + result.tvaAmount);
    });

    it('should handle very small amounts', () => {
      const smallAmount = 0.01;
      const result = calculateSwissTVA(smallAmount, SwissTVACategory.STANDARD);
      
      expect(result.netAmount).toBe(smallAmount);
      expect(result.tvaAmount).toBe(0); // Rounds to 0
      expect(result.grossAmount).toBe(0.01);
    });

    it('should maintain precision in calculations', () => {
      const amount = 123.456789;
      const result = calculateSwissTVA(amount, SwissTVACategory.STANDARD);
      
      // Should round to 2 decimal places
      expect(Number.isInteger(result.tvaAmount * 100)).toBe(true);
      expect(Number.isInteger(result.grossAmount * 100)).toBe(true);
    });
  });
});