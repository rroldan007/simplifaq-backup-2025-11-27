import {
  isValidSwissIBAN,
  generateQRReference,
  isValidQRReference,
  isValidSwissPostalCode,
  isValidSwissCanton,
  formatIBAN,
  formatQRReference,
  validateQRBillData,
  createQRBillFromInvoice,
  QRReferenceType,
  swissQRBillSchema,
} from '../utils/swissQRBill';

describe('Swiss QR Bill Utilities', () => {
  describe('isValidSwissIBAN', () => {
    it('should validate correct Swiss IBANs', () => {
      const validIBANs = [
        'CH93 0076 2011 6238 5295 7',
        'CH9300762011623852957',
        'CH56 0483 5012 3456 7800 9',
        'CH5604835012345678009',
      ];

      validIBANs.forEach(iban => {
        expect(isValidSwissIBAN(iban)).toBe(true);
      });
    });

    it('should reject invalid Swiss IBANs', () => {
      const invalidIBANs = [
        'CH93 0076 2011 6238 5295 8', // Wrong check digits
        'DE89 3704 0044 0532 0130 00', // German IBAN
        'CH93 0076 2011 6238 529', // Too short
        'CH93 0076 2011 6238 5295 78', // Too long
        'CH93 0076 2011 6238 5295 X', // Invalid character
        '',
        null,
        undefined,
      ];

      invalidIBANs.forEach(iban => {
        expect(isValidSwissIBAN(iban as any)).toBe(false);
      });
    });

    it('should handle IBANs with and without spaces', () => {
      const ibanWithSpaces = 'CH93 0076 2011 6238 5295 7';
      const ibanWithoutSpaces = 'CH9300762011623852957';

      expect(isValidSwissIBAN(ibanWithSpaces)).toBe(true);
      expect(isValidSwissIBAN(ibanWithoutSpaces)).toBe(true);
    });
  });

  describe('generateQRReference', () => {
    it('should generate valid QR references', () => {
      const testCases = [
        { input: '123456', expected: 27 }, // Should be 27 characters total
        { input: '1', expected: 27 },
        { input: '999999999999999999999999999', expected: 27 }, // Long input
      ];

      testCases.forEach(({ input, expected }) => {
        const result = generateQRReference(input);
        expect(result).toHaveLength(expected);
        expect(/^\d{27}$/.test(result)).toBe(true);
        expect(isValidQRReference(result)).toBe(true);
      });
    });

    it('should handle non-numeric characters by filtering them out', () => {
      const result = generateQRReference('ABC123DEF456');
      expect(result).toHaveLength(27);
      expect(isValidQRReference(result)).toBe(true);
    });

    it('should throw error for empty or invalid input', () => {
      expect(() => generateQRReference('')).toThrow('La référence client est requise');
      expect(() => generateQRReference('ABC')).toThrow('La référence client doit contenir au moins un chiffre');
    });

    it('should generate consistent results for same input', () => {
      const input = '123456';
      const result1 = generateQRReference(input);
      const result2 = generateQRReference(input);
      expect(result1).toBe(result2);
    });
  });

  describe('isValidQRReference', () => {
    it('should validate correct QR references', () => {
      const validReferences = [
        generateQRReference('123456'),
        generateQRReference('1'),
        generateQRReference('999999'),
      ];

      validReferences.forEach(ref => {
        expect(isValidQRReference(ref)).toBe(true);
      });
    });

    it('should reject invalid QR references', () => {
      const invalidReferences = [
        '12345678901234567890123456', // Too short
        '123456789012345678901234567', // Correct length but wrong check digit
        '1234567890123456789012345678', // Too long
        '12345678901234567890123456A', // Contains letter
        '',
        null,
        undefined,
      ];

      invalidReferences.forEach(ref => {
        expect(isValidQRReference(ref as any)).toBe(false);
      });
    });
  });

  describe('isValidSwissPostalCode', () => {
    it('should validate correct Swiss postal codes', () => {
      const validCodes = ['1000', '8001', '3000', '1234'];
      validCodes.forEach(code => {
        expect(isValidSwissPostalCode(code)).toBe(true);
      });
    });

    it('should reject invalid postal codes', () => {
      const invalidCodes = ['100', '12345', 'ABCD', '12A4', '', null, undefined];
      invalidCodes.forEach(code => {
        expect(isValidSwissPostalCode(code as any)).toBe(false);
      });
    });
  });

  describe('isValidSwissCanton', () => {
    it('should validate correct Swiss cantons', () => {
      const validCantons = ['VD', 'GE', 'ZH', 'BE', 'TI', 'vd', 'ge']; // Including lowercase
      validCantons.forEach(canton => {
        expect(isValidSwissCanton(canton)).toBe(true);
      });
    });

    it('should reject invalid cantons', () => {
      const invalidCantons = ['XX', 'ABC', '12', '', null, undefined];
      invalidCantons.forEach(canton => {
        expect(isValidSwissCanton(canton as any)).toBe(false);
      });
    });
  });

  describe('formatIBAN', () => {
    it('should format IBAN with spaces', () => {
      expect(formatIBAN('CH9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7');
      expect(formatIBAN('CH56 0483 5012 3456 7800 9')).toBe('CH56 0483 5012 3456 7800 9');
    });

    it('should handle empty or invalid input', () => {
      expect(formatIBAN('')).toBe('');
      expect(formatIBAN(null as any)).toBe('');
      expect(formatIBAN(undefined as any)).toBe('');
    });
  });

  describe('formatQRReference', () => {
    it('should format QR reference with spaces', () => {
      const reference = '123456789012345678901234567';
      const formatted = formatQRReference(reference);
      expect(formatted).toBe('12 34567 89012 34567 89012 34567 7');
    });

    it('should return original string for invalid length', () => {
      expect(formatQRReference('12345')).toBe('12345');
      expect(formatQRReference('')).toBe('');
    });
  });

  describe('validateQRBillData', () => {
    const validQRBillData = {
      creditor: {
        name: 'Test Company SA',
        addressLine1: '123 Test Street',
        postalCode: '1000',
        city: 'Lausanne',
        country: 'CH',
      },
      creditorAccount: 'CH9300762011623852957',
      amount: 100.50,
      currency: 'CHF' as const,
      referenceType: QRReferenceType.NON,
    };

    it('should validate correct QR Bill data', () => {
      const result = validateQRBillData(validQRBillData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid QR Bill data', () => {
      const invalidData = {
        ...validQRBillData,
        amount: -10, // Invalid negative amount
        creditorAccount: 'INVALID_IBAN',
      };

      const result = validateQRBillData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate with optional debtor information', () => {
      const dataWithDebtor = {
        ...validQRBillData,
        debtor: {
          name: 'Client Name',
          addressLine1: '456 Client Street',
          postalCode: '1001',
          city: 'Lausanne',
          country: 'CH',
        },
      };

      const result = validateQRBillData(dataWithDebtor);
      expect(result.isValid).toBe(true);
    });

    it('should validate with QR reference', () => {
      const dataWithReference = {
        ...validQRBillData,
        referenceType: QRReferenceType.QRR,
        reference: generateQRReference('123456'),
      };

      const result = validateQRBillData(dataWithReference);
      expect(result.isValid).toBe(true);
    });

    it('should reject data with amount exceeding maximum', () => {
      const dataWithLargeAmount = {
        ...validQRBillData,
        amount: 1000000000, // Exceeds maximum
      };

      const result = validateQRBillData(dataWithLargeAmount);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('999\'999\'999.99'))).toBe(true);
    });

    it('should reject data with invalid currency', () => {
      const dataWithInvalidCurrency = {
        ...validQRBillData,
        currency: 'USD', // Not allowed
      };

      const result = validateQRBillData(dataWithInvalidCurrency);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('CHF ou EUR'))).toBe(true);
    });
  });

  describe('createQRBillFromInvoice', () => {
    const invoiceData = {
      creditorName: 'Test Company SA',
      creditorAddress: {
        street: '123 Test Street',
        city: 'Lausanne',
        postalCode: '1000',
        country: 'CH',
      },
      creditorIBAN: 'CH9300762011623852957',
      amount: 100.50,
      currency: 'CHF' as const,
      message: 'Invoice payment',
    };

    it('should create QR Bill data from invoice data', () => {
      const result = createQRBillFromInvoice(invoiceData);

      expect(result.creditor.name).toBe(invoiceData.creditorName);
      expect(result.creditor.addressLine1).toBe(invoiceData.creditorAddress.street);
      expect(result.creditorAccount).toBe(invoiceData.creditorIBAN);
      expect(result.amount).toBe(invoiceData.amount);
      expect(result.currency).toBe(invoiceData.currency);
      expect(result.unstructuredMessage).toBe(invoiceData.message);
      expect(result.referenceType).toBe(QRReferenceType.NON);
    });

    it('should include debtor information when provided', () => {
      const invoiceWithDebtor = {
        ...invoiceData,
        debtorName: 'Client Name',
        debtorAddress: {
          street: '456 Client Street',
          city: 'Geneva',
          postalCode: '1201',
          country: 'CH',
        },
      };

      const result = createQRBillFromInvoice(invoiceWithDebtor);

      expect(result.debtor).toBeDefined();
      expect(result.debtor!.name).toBe(invoiceWithDebtor.debtorName);
      expect(result.debtor!.addressLine1).toBe(invoiceWithDebtor.debtorAddress.street);
    });

    it('should set QRR reference type when reference is provided', () => {
      const invoiceWithReference = {
        ...invoiceData,
        reference: generateQRReference('123456'),
      };

      const result = createQRBillFromInvoice(invoiceWithReference);

      expect(result.referenceType).toBe(QRReferenceType.QRR);
      expect(result.reference).toBe(invoiceWithReference.reference);
    });

    it('should create valid QR Bill data that passes validation', () => {
      const result = createQRBillFromInvoice(invoiceData);
      const validation = validateQRBillData(result);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Swiss QR Bill Schema', () => {
    it('should validate maximum field lengths', () => {
      const dataWithLongFields = {
        creditor: {
          name: 'A'.repeat(71), // Exceeds 70 character limit
          addressLine1: '123 Test Street',
          postalCode: '1000',
          city: 'Lausanne',
          country: 'CH',
        },
        creditorAccount: 'CH9300762011623852957',
        amount: 100.50,
        currency: 'CHF' as const,
        referenceType: QRReferenceType.NON,
        unstructuredMessage: 'A'.repeat(141), // Exceeds 140 character limit
      };

      expect(() => swissQRBillSchema.parse(dataWithLongFields)).toThrow();
    });

    it('should validate required fields', () => {
      const incompleteData = {
        creditor: {
          name: 'Test Company',
          // Missing required fields
        },
        amount: 100.50,
      };

      expect(() => swissQRBillSchema.parse(incompleteData)).toThrow();
    });

    it('should validate amount precision', () => {
      const dataWithTooManyDecimals = {
        creditor: {
          name: 'Test Company SA',
          addressLine1: '123 Test Street',
          postalCode: '1000',
          city: 'Lausanne',
          country: 'CH',
        },
        creditorAccount: 'CH9300762011623852957',
        amount: 100.123, // Too many decimal places
        currency: 'CHF' as const,
        referenceType: QRReferenceType.NON,
      };

      expect(() => swissQRBillSchema.parse(dataWithTooManyDecimals)).toThrow();
    });
  });
});