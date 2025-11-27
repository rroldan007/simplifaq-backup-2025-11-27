import * as IBAN from 'iban';

/**
 * Swiss VAT number validation
 * Format: CHE-XXX.XXX.XXX (where X is a digit)
 */
export function validateSwissVATNumber(vatNumber: string): boolean {
  if (!vatNumber) return false;
  
  // Remove spaces and convert to uppercase
  let cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  
  // Remove common suffixes like "TVA", "MWST", "IVA"
  cleanVAT = cleanVAT.replace(/(TVA|MWST|IVA)$/, '');
  
  // Swiss VAT format: CHE-XXX.XXX.XXX
  const swissVATRegex = /^CHE-\d{3}\.\d{3}\.\d{3}$/;
  
  return swissVATRegex.test(cleanVAT);
}

/**
 * Swiss postal code validation
 * Swiss postal codes are 4 digits
 */
export function validateSwissPostalCode(postalCode: string): boolean {
  if (!postalCode) return false;
  
  const cleanPostalCode = postalCode.replace(/\s/g, '');
  const swissPostalRegex = /^\d{4}$/;
  
  return swissPostalRegex.test(cleanPostalCode);
}

/**
 * Swiss IBAN validation
 * Swiss IBANs start with CH and are 21 characters long
 */
export function validateSwissIBAN(iban: string): boolean {
  if (!iban) return false;
  
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  
  // Check if it's a Swiss IBAN (starts with CH and is 21 chars)
  if (!cleanIBAN.startsWith('CH') || cleanIBAN.length !== 21) {
    return false;
  }
  
  // Use the iban library for checksum validation
  return IBAN.isValid(cleanIBAN);
}

/**
 * Format Swiss IBAN for display
 * Adds spaces every 4 characters for readability
 */
export function formatSwissIBAN(iban: string): string {
  if (!iban) return '';
  
  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
  
  // Add spaces every 4 characters
  return cleanIBAN.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Format Swiss VAT number for display
 */
export function formatSwissVATNumber(vatNumber: string): string {
  if (!vatNumber) return '';
  
  const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  
  // If it's already formatted, return as is
  if (cleanVAT.includes('-') && cleanVAT.includes('.')) {
    return cleanVAT;
  }
  
  // If it's just digits, format it
  if (/^\d{9}$/.test(cleanVAT)) {
    return `CHE-${cleanVAT.slice(0, 3)}.${cleanVAT.slice(3, 6)}.${cleanVAT.slice(6, 9)}`;
  }
  
  return cleanVAT;
}

/**
 * Validate Swiss TVA rate
 * Only allows the official Swiss TVA rates
 */
export function validateSwissTVARate(rate: number): boolean {
  const validRates = [0.00, 3.50, 8.10];
  return validRates.includes(Number(rate.toFixed(2)));
}

/**
 * Swiss canton codes validation
 */
export const SWISS_CANTONS = [
  'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR',
  'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG',
  'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
] as const;

export type SwissCanton = typeof SWISS_CANTONS[number];

export function validateSwissCanton(canton: string): boolean {
  if (!canton) return true; // Canton is optional
  
  return SWISS_CANTONS.includes(canton.toUpperCase() as SwissCanton);
}

/**
 * Generate QR reference number for Swiss QR bills
 * This is a simplified version - in production you'd want a more sophisticated algorithm
 */
export function generateQRReference(invoiceNumber: string, customerId?: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const invoice = invoiceNumber.padStart(6, '0');
  const customer = customerId ? customerId.slice(-4).padStart(4, '0') : '0000';
  
  // Combine parts
  const baseReference = `${invoice}${customer}${timestamp}`;
  
  // Calculate check digit using modulo 10 algorithm
  const checkDigit = calculateMod10CheckDigit(baseReference);
  
  return `${baseReference}${checkDigit}`;
}

/**
 * Calculate modulo 10 check digit for QR reference
 */
function calculateMod10CheckDigit(reference: string): string {
  const digits = reference.split('').map(Number);
  let sum = 0;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    
    if ((digits.length - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
    }
    
    sum += digit;
  }
  
  const remainder = sum % 10;
  return remainder === 0 ? '0' : (10 - remainder).toString();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Swiss format)
 * Accepts various Swiss phone formats
 */
export function validateSwissPhone(phone: string): boolean {
  if (!phone) return true; // Phone is optional
  
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Swiss phone patterns
  const patterns = [
    /^\+41\d{9}$/,      // +41xxxxxxxxx (international)
    /^0\d{9}$/,         // 0xxxxxxxxx (national)
    /^\d{9}$/,          // xxxxxxxxx (local)
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
}

/**
 * Format Swiss phone number for display
 */
export function formatSwissPhone(phone: string): string {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Format +41 XX XXX XX XX
  if (cleanPhone.startsWith('+41') && cleanPhone.length === 12) {
    return `+41 ${cleanPhone.slice(3, 5)} ${cleanPhone.slice(5, 8)} ${cleanPhone.slice(8, 10)} ${cleanPhone.slice(10, 12)}`;
  }
  
  // Format 0XX XXX XX XX
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return `${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6, 8)} ${cleanPhone.slice(8, 10)}`;
  }
  
  return phone;
}