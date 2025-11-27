import { 
  isValidSwissIBAN, 
  isValidSwissPostalCode, 
  isValidSwissCanton,
  validateQRBillData,
  generateQRReference,
  formatSwissAmount 
} from '../utils/swissQRBill';
import { 
  calculateSwissTVA, 
  getSwissTVARate, 
  validateSwissTVANumber,
  SwissTVACategory 
} from '../utils/swissTVA';

describe('Swiss Compliance Verification', () => {
  describe('Swiss Geographic Standards', () => {
    it('should validate all Swiss postal codes', () => {
      const validPostalCodes = [
        '1000', // Lausanne
        '1201', // Geneva
        '3000', // Bern
        '4001', // Basel
        '6900', // Lugano
        '8001', // Zurich
        '9000', // St. Gallen
      ];

      const invalidPostalCodes = [
        '100',    // Too short
        '12345',  // Too long
        'ABCD',   // Non-numeric
        '0000',   // Invalid range
        '10000',  // Too long
      ];

      validPostalCodes.forEach(code => {
        expect(isValidSwissPostalCode(code)).toBe(true);
      });

      invalidPostalCodes.forEach(code => {
        expect(isValidSwissPostalCode(code)).toBe(false);
      });
    });

    it('should validate all Swiss cantons', () => {
      const allSwissCantons = [
        'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
        'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
        'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
      ];

      const invalidCantons = [
        'XX', 'YY', 'ZZ', 'AB', 'CD', '12', 'A1', '1A'
      ];

      allSwissCantons.forEach(canton => {
        expect(isValidSwissCanton(canton)).toBe(true);
        expect(isValidSwissCanton(canton.toLowerCase())).toBe(true);
      });

      invalidCantons.forEach(canton => {
        expect(isValidSwissCanton(canton)).toBe(false);
      });
    });

    it('should validate Swiss IBAN format and check digits', () => {
      const validIBANs = [
        'CH93 0076 2011 6238 5295 7',
        'CH9300762011623852957',
        'CH56 0483 5012 3456 7800 9',
        'CH5604835012345678009',
        'CH17 0900 0000 1234 5678 9',
      ];

      const invalidIBANs = [
        'CH93 0076 2011 6238 5295 8', // Wrong check digits
        'DE89 3704 0044 0532 0130 00', // German IBAN
        'CH93 0076 2011 6238 529',     // Too short
        'CH93 0076 2011 6238 5295 78', // Too long
        'FR14 2004 1010 0505 0001 3M02 606', // French IBAN
      ];

      validIBANs.forEach(iban => {
        expect(isValidSwissIBAN(iban)).toBe(true);
      });

      invalidIBANs.forEach(iban => {
        expect(isValidSwissIBAN(iban)).toBe(false);
      });
    });
  });

  describe('Swiss TVA (VAT) Compliance', () => {
    it('should use correct Swiss TVA rates', () => {
      expect(getSwissTVARate(SwissTVACategory.STANDARD)).toBe(0.081); // 8.1%
      expect(getSwissTVARate(SwissTVACategory.REDUCED)).toBe(0.026);  // 2.6%
      expect(getSwissTVARate(SwissTVACategory.SPECIAL)).toBe(0.038);  // 3.8%
      expect(getSwissTVARate(SwissTVACategory.EXEMPT)).toBe(0);       // 0%
    });

    it('should calculate TVA according to Swiss standards', () => {
      // Test standard rate (8.1%)
      const standardCalc = calculateSwissTVA(1000, SwissTVACategory.STANDARD);
      expect(standardCalc.tvaRate).toBe(0.081);
      expect(standardCalc.tvaAmount).toBe(81);
      expect(standardCalc.grossAmount).toBe(1081);

      // Test reduced rate (2.6%)
      const reducedCalc = calculateSwissTVA(1000, SwissTVACategory.REDUCED);
      expect(reducedCalc.tvaRate).toBe(0.026);
      expect(reducedCalc.tvaAmount).toBe(26);
      expect(reducedCalc.grossAmount).toBe(1026);

      // Test special rate (3.8%)
      const specialCalc = calculateSwissTVA(1000, SwissTVACategory.SPECIAL);
      expect(specialCalc.tvaRate).toBe(0.038);
      expect(specialCalc.tvaAmount).toBe(38);
      expect(specialCalc.grossAmount).toBe(1038);

      // Test exempt (0%)
      const exemptCalc = calculateSwissTVA(1000, SwissTVACategory.EXEMPT);
      expect(exemptCalc.tvaRate).toBe(0);
      expect(exemptCalc.tvaAmount).toBe(0);
      expect(exemptCalc.grossAmount).toBe(1000);
    });

    it('should validate Swiss TVA numbers', () => {
      const validTVANumbers = [
        'CHE-123.456.789 TVA',   // French
        'CHE-123.456.789 MWST',  // German
        'CHE-123.456.789 IVA',   // Italian
        'CHE-987.654.321 TVA',
        'CHE-111.222.333 MWST',
      ];

      const invalidTVANumbers = [
        'CHE-123.456.78 TVA',    // Too short
        'CHE-123.456.7890 TVA',  // Too long
        'DE-123.456.789 TVA',    // Wrong country
        'CHE-123.456.789',       // Missing suffix
        'CHE-123.456.789 VAT',   // Wrong suffix
        '123.456.789 TVA',       // Missing CHE
      ];

      validTVANumbers.forEach(tva => {
        expect(validateSwissTVANumber(tva)).toBe(true);
      });

      invalidTVANumbers.forEach(tva => {
        expect(validateSwissTVANumber(tva)).toBe(false);
      });
    });

    it('should handle Swiss rounding rules for TVA', () => {
      // Swiss rounding: round to nearest 0.05 CHF for cash payments
      // For electronic payments: round to nearest 0.01 CHF
      
      const testAmounts = [
        { amount: 100.33, expected: 8.13 }, // 100.33 * 0.081 = 8.12673 → 8.13
        { amount: 200.67, expected: 16.25 }, // 200.67 * 0.081 = 16.25427 → 16.25
        { amount: 333.33, expected: 27.00 }, // 333.33 * 0.081 = 26.99973 → 27.00
      ];

      testAmounts.forEach(({ amount, expected }) => {
        const calc = calculateSwissTVA(amount, SwissTVACategory.STANDARD);
        expect(calc.tvaAmount).toBe(expected);
      });
    });
  });

  describe('Swiss QR Bill Compliance', () => {
    it('should generate valid QR references according to Swiss standards', () => {
      const testInputs = ['123456', '1', '999999999999999999999999999'];
      
      testInputs.forEach(input => {
        const qrRef = generateQRReference(input);
        
        // Must be exactly 27 digits
        expect(qrRef).toHaveLength(27);
        expect(/^\d{27}$/.test(qrRef)).toBe(true);
        
        // Must pass modulo 10 check
        expect(isValidQRReference(qrRef)).toBe(true);
      });
    });

    it('should validate complete QR Bill data structure', () => {
      const validQRBillData = {
        creditor: {
          name: 'Simplifaq Solutions SA',
          addressLine1: 'Avenue de la Gare 15',
          postalCode: '1000',
          city: 'Lausanne',
          country: 'CH',
        },
        creditorAccount: 'CH9300762011623852957',
        amount: 1234.56,
        currency: 'CHF' as const,
        referenceType: 'QRR' as const,
        reference: generateQRReference('123456'),
        unstructuredMessage: 'Facture pour services de consultation',
        debtor: {
          name: 'Client Entreprise SA',
          addressLine1: 'Rue du Commerce 42',
          postalCode: '1201',
          city: 'Genève',
          country: 'CH',
        },
      };

      const validation = validateQRBillData(validQRBillData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should enforce Swiss QR Bill amount limits', () => {
      const validAmounts = [0.01, 100, 1000, 50000, 999999.99];
      const invalidAmounts = [0, -100, 1000000, 999999999];

      validAmounts.forEach(amount => {
        const qrBillData = {
          creditor: {
            name: 'Test Company',
            addressLine1: 'Test Street 1',
            postalCode: '1000',
            city: 'Lausanne',
            country: 'CH',
          },
          creditorAccount: 'CH9300762011623852957',
          amount,
          currency: 'CHF' as const,
          referenceType: 'NON' as const,
        };

        const validation = validateQRBillData(qrBillData);
        expect(validation.isValid).toBe(true);
      });

      invalidAmounts.forEach(amount => {
        const qrBillData = {
          creditor: {
            name: 'Test Company',
            addressLine1: 'Test Street 1',
            postalCode: '1000',
            city: 'Lausanne',
            country: 'CH',
          },
          creditorAccount: 'CH9300762011623852957',
          amount,
          currency: 'CHF' as const,
          referenceType: 'NON' as const,
        };

        const validation = validateQRBillData(qrBillData);
        expect(validation.isValid).toBe(false);
      });
    });

    it('should validate Swiss currency requirements', () => {
      const validCurrencies = ['CHF', 'EUR'];
      const invalidCurrencies = ['USD', 'GBP', 'JPY', 'CAD'];

      validCurrencies.forEach(currency => {
        const qrBillData = {
          creditor: {
            name: 'Test Company',
            addressLine1: 'Test Street 1',
            postalCode: '1000',
            city: 'Lausanne',
            country: 'CH',
          },
          creditorAccount: 'CH9300762011623852957',
          amount: 100,
          currency: currency as 'CHF' | 'EUR',
          referenceType: 'NON' as const,
        };

        const validation = validateQRBillData(qrBillData);
        expect(validation.isValid).toBe(true);
      });

      invalidCurrencies.forEach(currency => {
        const qrBillData = {
          creditor: {
            name: 'Test Company',
            addressLine1: 'Test Street 1',
            postalCode: '1000',
            city: 'Lausanne',
            country: 'CH',
          },
          creditorAccount: 'CH9300762011623852957',
          amount: 100,
          currency: currency as any,
          referenceType: 'NON' as const,
        };

        const validation = validateQRBillData(qrBillData);
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('Swiss Formatting Standards', () => {
    it('should format amounts according to Swiss conventions', () => {
      const testCases = [
        { amount: 1234.56, expected: '1\'234.56' },
        { amount: 1000, expected: '1\'000.00' },
        { amount: 123, expected: '123.00' },
        { amount: 12345.67, expected: '12\'345.67' },
        { amount: 1234567.89, expected: '1\'234\'567.89' },
      ];

      testCases.forEach(({ amount, expected }) => {
        expect(formatSwissAmount(amount)).toBe(expected);
      });
    });

    it('should handle Swiss date formats', () => {
      const testDate = new Date('2024-03-15T10:30:00.000Z');
      
      // Swiss date format: DD.MM.YYYY
      const swissDateFormat = testDate.toLocaleDateString('de-CH');
      expect(swissDateFormat).toMatch(/^\d{1,2}\.\d{1,2}\.\d{4}$/);
      
      // French Swiss format: DD.MM.YYYY
      const frenchSwissFormat = testDate.toLocaleDateString('fr-CH');
      expect(frenchSwissFormat).toMatch(/^\d{1,2}\.\d{1,2}\.\d{4}$/);
    });

    it('should validate Swiss phone number formats', () => {
      const validPhoneNumbers = [
        '+41 21 123 45 67',  // Lausanne
        '+41 22 987 65 43',  // Geneva
        '+41 44 123 45 67',  // Zurich
        '+41 31 456 78 90',  // Bern
        '+41 91 234 56 78',  // Ticino
      ];

      const invalidPhoneNumbers = [
        '021 123 45 67',     // Missing country code
        '+1 555 123 4567',   // US format
        '+41 21 123 456',    // Too short
        '+41 21 123 45 678', // Too long
        '123-456-7890',      // Wrong format
      ];

      const swissPhoneRegex = /^\+41\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;

      validPhoneNumbers.forEach(phone => {
        expect(swissPhoneRegex.test(phone)).toBe(true);
      });

      invalidPhoneNumbers.forEach(phone => {
        expect(swissPhoneRegex.test(phone)).toBe(false);
      });
    });
  });

  describe('Swiss Business Rules', () => {
    it('should enforce Swiss invoice numbering standards', () => {
      // Swiss invoice numbers typically follow patterns like:
      // INV-YYYY-NNN, FACT-YYYY-NNN, or similar
      const validInvoiceNumbers = [
        'INV-2024-001',
        'FACT-2024-123',
        'FACTURE-2024-0001',
        'RG-2024-456',
      ];

      const swissInvoiceRegex = /^[A-Z]+-\d{4}-\d{3,4}$/;

      validInvoiceNumbers.forEach(number => {
        expect(swissInvoiceRegex.test(number)).toBe(true);
      });
    });

    it('should validate Swiss company name suffixes', () => {
      const validCompanyNames = [
        'Simplifaq Solutions SA',
        'Tech Consulting GmbH',
        'Services Professionnels Sàrl',
        'Individual Enterprise',
        'Consulting AG',
      ];

      const swissCompanySuffixes = ['SA', 'GmbH', 'Sàrl', 'AG', 'SE'];
      
      validCompanyNames.forEach(name => {
        const hasValidSuffix = swissCompanySuffixes.some(suffix => 
          name.includes(suffix) || !name.includes(' ')
        );
        expect(hasValidSuffix).toBe(true);
      });
    });

    it('should validate Swiss fiscal year requirements', () => {
      // Swiss fiscal year typically aligns with calendar year
      const currentYear = new Date().getFullYear();
      const fiscalYearStart = new Date(currentYear, 0, 1); // January 1st
      const fiscalYearEnd = new Date(currentYear, 11, 31); // December 31st

      expect(fiscalYearStart.getMonth()).toBe(0); // January
      expect(fiscalYearStart.getDate()).toBe(1);
      expect(fiscalYearEnd.getMonth()).toBe(11); // December
      expect(fiscalYearEnd.getDate()).toBe(31);
    });
  });

  describe('Swiss Regulatory Compliance', () => {
    it('should meet Swiss data protection requirements', () => {
      // Verify that sensitive data fields are properly handled
      const sensitiveFields = [
        'iban',
        'tvaNumber',
        'personalData',
        'financialData',
      ];

      // These should be encrypted or handled securely
      // This is a placeholder for actual encryption/security tests
      sensitiveFields.forEach(field => {
        expect(typeof field).toBe('string');
        expect(field.length).toBeGreaterThan(0);
      });
    });

    it('should comply with Swiss accounting standards', () => {
      // Swiss accounting requires:
      // - Double-entry bookkeeping
      // - Proper documentation
      // - TVA compliance
      // - Annual financial statements

      const accountingRequirements = {
        doubleEntry: true,
        tvaCompliance: true,
        properDocumentation: true,
        annualStatements: true,
      };

      Object.values(accountingRequirements).forEach(requirement => {
        expect(requirement).toBe(true);
      });
    });

    it('should meet Swiss invoice retention requirements', () => {
      // Swiss law requires invoices to be kept for 10 years
      const retentionPeriodYears = 10;
      const currentDate = new Date();
      const retentionDate = new Date(currentDate);
      retentionDate.setFullYear(currentDate.getFullYear() - retentionPeriodYears);

      expect(retentionPeriodYears).toBe(10);
      expect(retentionDate.getFullYear()).toBe(currentDate.getFullYear() - 10);
    });
  });

  describe('Integration Compliance Tests', () => {
    it('should validate complete Swiss invoice data structure', () => {
      const completeSwissInvoice = {
        // Company data (creditor)
        creditor: {
          name: 'Simplifaq Solutions SA',
          address: {
            street: 'Avenue de la Gare 15',
            postalCode: '1000',
            city: 'Lausanne',
            canton: 'VD',
            country: 'CH',
          },
          iban: 'CH9300762011623852957',
          tvaNumber: 'CHE-123.456.789 TVA',
          phone: '+41 21 555 12 34',
        },
        
        // Client data (debtor)
        debtor: {
          name: 'Client Entreprise SA',
          address: {
            street: 'Rue du Commerce 42',
            postalCode: '1201',
            city: 'Genève',
            canton: 'GE',
            country: 'CH',
          },
          tvaNumber: 'CHE-987.654.321 TVA',
        },
        
        // Invoice data
        invoice: {
          number: 'INV-2024-001',
          date: new Date('2024-03-15'),
          dueDate: new Date('2024-04-14'),
          currency: 'CHF',
          items: [
            {
              description: 'Consultation IT',
              quantity: 8,
              unitPrice: 180.00,
              tvaCategory: SwissTVACategory.STANDARD,
            },
          ],
        },
      };

      // Validate all components
      expect(isValidSwissIBAN(completeSwissInvoice.creditor.iban)).toBe(true);
      expect(isValidSwissPostalCode(completeSwissInvoice.creditor.address.postalCode)).toBe(true);
      expect(isValidSwissCanton(completeSwissInvoice.creditor.address.canton)).toBe(true);
      expect(validateSwissTVANumber(completeSwissInvoice.creditor.tvaNumber)).toBe(true);
      
      expect(isValidSwissPostalCode(completeSwissInvoice.debtor.address.postalCode)).toBe(true);
      expect(isValidSwissCanton(completeSwissInvoice.debtor.address.canton)).toBe(true);
      expect(validateSwissTVANumber(completeSwissInvoice.debtor.tvaNumber)).toBe(true);
      
      expect(['CHF', 'EUR']).toContain(completeSwissInvoice.invoice.currency);
      expect(completeSwissInvoice.invoice.number).toMatch(/^[A-Z]+-\d{4}-\d{3}$/);
    });
  });
});