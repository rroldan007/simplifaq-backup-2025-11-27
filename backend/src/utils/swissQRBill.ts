import * as IBAN from 'iban';
import { z } from 'zod';

// Swiss QR Bill reference types
export enum QRReferenceType {
  QRR = 'QRR', // QR Reference
  SCOR = 'SCOR', // Creditor Reference (ISO 11649)
  NON = 'NON', // No reference
}

/**
 * Returns true if the IBAN is a Swiss QR-IBAN (IID in range 30000–31999).
 * This is required when using a QRR (QR reference). For non-QR-IBANs, use SCOR or NON.
 */
export function isQRIBAN(iban: string | undefined | null): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^CH\d{19}$/.test(cleaned)) return false; // Swiss IBAN basic shape
  // Positions 5-9 (1-indexed) represent the IID (5 digits). In 0-indexed JS slice, that's [4,9)
  const iidStr = cleaned.slice(4, 9);
  const iid = Number(iidStr);
  return Number.isInteger(iid) && iid >= 30000 && iid <= 31999;
}

// Swiss address validation schema
export const swissAddressSchema = z.object({
  name: z.string().min(1).max(70, 'Le nom ne peut pas dépasser 70 caractères'),
  addressLine1: z.string().min(1).max(70, 'L\'adresse ligne 1 ne peut pas dépasser 70 caractères'),
  addressLine2: z.string().max(70, 'L\'adresse ligne 2 ne peut pas dépasser 70 caractères').optional(),
  postalCode: z.string().min(1).max(16, 'Le code postal ne peut pas dépasser 16 caractères'),
  city: z.string().min(1).max(35, 'La ville ne peut pas dépasser 35 caractères'),
  country: z.string().length(2, 'Le code pays doit faire exactement 2 caractères'),
});

// Swiss QR Bill data validation schema
export const swissQRBillSchema = z.object({
  // Creditor information (required)
  creditor: swissAddressSchema,
  creditorAccount: z.string().refine(
    (iban) => isValidSwissIBAN(iban),
    'IBAN suisse invalide'
  ),
  
  // Payment amount
  amount: z.number()
    .min(0.01, 'Le montant doit être au moins 0.01')
    .max(999999999.99, 'Le montant ne peut pas dépasser 999\'999\'999.99')
    .refine(
      (amount) => Number((amount * 100).toFixed(0)) / 100 === amount,
      'Le montant ne peut avoir que 2 décimales maximum'
    ),
  currency: z.enum(['CHF', 'EUR']).refine(
    (val) => ['CHF', 'EUR'].includes(val),
    'La devise doit être CHF ou EUR'
  ),
  
  // Debtor information (optional)
  debtor: swissAddressSchema.optional(),
  
  // Reference information
  referenceType: z.nativeEnum(QRReferenceType),
  reference: z.string().max(27, 'La référence ne peut pas dépasser 27 caractères').optional(),
  
  // Additional information
  unstructuredMessage: z.string().max(140, 'Le message non structuré ne peut pas dépasser 140 caractères').optional(),
  billInformation: z.string().max(140, 'Les informations de facture ne peuvent pas dépasser 140 caractères').optional(),
  
  // Alternative procedures (optional)
  alternativeProcedure1: z.string().max(100, 'La procédure alternative 1 ne peut pas dépasser 100 caractères').optional(),
  alternativeProcedure2: z.string().max(100, 'La procédure alternative 2 ne peut pas dépasser 100 caractères').optional(),
});

export type SwissQRBillData = z.infer<typeof swissQRBillSchema>;
export type SwissAddress = z.infer<typeof swissAddressSchema>;

/**
 * Validates if an IBAN is a valid Swiss IBAN (both standard and QR-IBAN)
 * Standard Swiss IBAN format: CHXX XXXX XXXX XXXX XXXX X (21 chars)
 * QR-IBAN format: CHXX 3XXX XXXX XXXX XXXX X (IID 30000-31999)
 */
export function isValidSwissIBAN(iban: string): boolean {
  if (!iban) return false;
  
  try {
    // Remove all whitespace and convert to uppercase
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    
    // Basic format check: CH followed by 19 digits/letters
    if (!/^CH[0-9A-Z]{19}$/.test(cleanIban)) {
      console.log('IBAN failed basic format check:', { original: iban, cleanIban });
      return false;
    }
    
    // Check length (CH + 19 chars = 21)
    if (cleanIban.length !== 21) {
      console.log('IBAN failed length check (expected 21 chars):', { cleanIban, length: cleanIban.length });
      return false;
    }
    
    // Validate using the IBAN library (checks checksum and basic structure)
    if (!IBAN.isValid(cleanIban)) {
      console.log('IBAN failed checksum validation:', { cleanIban });
      return false;
    }
    
    // If we got here, it's a valid Swiss IBAN
    console.log('Valid Swiss IBAN:', { cleanIban });
    return true;
  } catch (error) {
    console.error('Error validating IBAN:', { iban, error });
    return false;
  }
}

/**
 * Generates a QR reference number using the modulo 10 recursive algorithm
 */
export function generateQRReference(customerReference: string): string {
  if (!customerReference || customerReference.length === 0) {
    throw new Error('La référence client est requise');
  }
  
  // Ensure the reference is numeric and pad to 26 digits (27th will be check digit)
  const numericRef = customerReference.replace(/\D/g, '');
  if (numericRef.length === 0) {
    throw new Error('La référence client doit contenir au moins un chiffre');
  }
  
  // Pad with zeros to make it 26 digits
  const paddedRef = numericRef.padStart(26, '0');
  
  // Calculate check digit using modulo 10 recursive
  const checkDigit = calculateMod10Recursive(paddedRef);
  
  return paddedRef + checkDigit;
}

/**
 * Validates a QR reference number
 */
export function isValidQRReference(reference: string): boolean {
  if (!reference || reference.length !== 27) {
    return false;
  }
  
  // Must be all digits
  if (!/^\d{27}$/.test(reference)) {
    return false;
  }
  
  // Check the check digit
  const referenceWithoutCheckDigit = reference.slice(0, 26);
  const providedCheckDigit = parseInt(reference.slice(26), 10);
  const calculatedCheckDigit = calculateMod10Recursive(referenceWithoutCheckDigit);
  
  return providedCheckDigit === calculatedCheckDigit;
}

/**
 * Calculates modulo 10 recursive check digit
 */
function calculateMod10Recursive(digits: string): number {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  
  for (let i = 0; i < digits.length; i++) {
    carry = table[(carry + parseInt(digits[i], 10)) % 10];
  }
  
  return (10 - carry) % 10;
}

/**
 * Validates a Swiss postal code
 */
export function isValidSwissPostalCode(postalCode: string): boolean {
  if (!postalCode) return false;
  
  // Swiss postal codes are 4 digits
  return /^\d{4}$/.test(postalCode);
}

/**
 * Validates Swiss canton code
 */
export function isValidSwissCanton(canton: string): boolean {
  const validCantons = [
    'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
    'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
    'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
  ];
  
  return validCantons.includes(canton.toUpperCase());
}

/**
 * Formats an IBAN for display (adds spaces every 4 characters)
 */
export function formatIBAN(iban: string): string {
  if (!iban) return '';
  
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return cleanIban.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Formats a QR reference for display (adds spaces for readability)
 */
export function formatQRReference(reference: string): string {
  if (!reference || reference.length !== 27) return reference;
  
  // Format as: XX XXXXX XXXXX XXXXX XXXXX XXXX X (2+5+5+5+5+4+1 = 27)
  return reference.replace(/(\d{2})(\d{5})(\d{5})(\d{5})(\d{5})(\d{4})(\d{1})/, '$1 $2 $3 $4 $5 $6 $7');
}

/**
 * Validates the complete QR Bill data structure
 */
export function validateQRBillData(data: unknown): { isValid: boolean; errors: string[] } {
  try {
    swissQRBillSchema.parse(data);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      );
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Erreur de validation inconnue'] };
  }
}

/**
 * Creates a QR Bill data structure from invoice data
 */
export function createQRBillFromInvoice(invoiceData: {
  creditorName: string;
  creditorAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  creditorIBAN: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  debtorName?: string;
  debtorAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  reference?: string;
  message?: string;
}): SwissQRBillData {
  const qrBillData: SwissQRBillData = {
    creditor: {
      name: invoiceData.creditorName,
      addressLine1: invoiceData.creditorAddress.street,
      postalCode: invoiceData.creditorAddress.postalCode,
      city: invoiceData.creditorAddress.city,
      country: invoiceData.creditorAddress.country,
    },
    creditorAccount: invoiceData.creditorIBAN,
    amount: invoiceData.amount,
    currency: invoiceData.currency,
    referenceType: invoiceData.reference ? QRReferenceType.QRR : QRReferenceType.NON,
    reference: invoiceData.reference,
    unstructuredMessage: invoiceData.message,
  };

  // Add debtor information if provided
  if (invoiceData.debtorName && invoiceData.debtorAddress) {
    qrBillData.debtor = {
      name: invoiceData.debtorName,
      addressLine1: invoiceData.debtorAddress.street,
      postalCode: invoiceData.debtorAddress.postalCode,
      city: invoiceData.debtorAddress.city,
      country: invoiceData.debtorAddress.country,
    };
  }

  return qrBillData;
}