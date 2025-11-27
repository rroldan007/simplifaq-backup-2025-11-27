import IBAN from 'iban';

// Types
interface WrappedValue<T = unknown> {
  value: T;
  timestamp: number;
}

interface SecurityLogEntry {
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
  userAgent: string;
  url: string;
}

function isWrappedValue(obj: unknown): obj is WrappedValue {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'value' in obj &&
    'timestamp' in obj &&
    typeof (obj as { timestamp: unknown }).timestamp === 'number'
  );
}

/**
 * Security utilities for financial data protection
 */

// XSS Protection - Sanitize HTML content
export const sanitizeHtml = (input: string): string => {
  if (!input) return '';
  
  // Remove potentially dangerous HTML tags and attributes
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/vbscript:/gi, '');

  // Remove javascript: protocols more thoroughly
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove event handlers more thoroughly
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^>\s"']+/gi, '');
  
  return sanitized;
};

// Sanitize financial input (amounts, numbers)
export const sanitizeFinancialInput = (input: string): string => {
  if (!input) return '';
  
  // Only allow numbers, decimal points, commas, and basic formatting
  return input
    .replace(/[^\d.,\-\s]/g, '')
    .trim();
};

// Sanitize text input for names, addresses, etc.
export const sanitizeTextInput = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags completely and dangerous characters
  return input
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/[<>"']/g, '')
    .trim();
};

// Validate and sanitize email addresses
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  // Basic email sanitization - remove dangerous characters but keep valid email chars
  return email
    .toLowerCase()
    .replace(/[<>]/g, '') // Remove angle brackets specifically
    .replace(/[^\w@.\-+]/g, '') // Allow word chars, @, ., -, +
    .trim();
};

// Validate Swiss VAT number format
export const validateSwissVAT = (vat: string): boolean => {
  if (!vat) return false;
  
  // Swiss VAT format: CHE-123.456.789 TVA or CHE-123456789 TVA
  const vatRegex = /^CHE-\d{3}\.?\d{3}\.?\d{3}\s?(TVA|MWST|IVA)?$/i;
  return vatRegex.test(vat.trim());
};

// Validate Swiss IBAN format
export const validateSwissIBAN = (iban: string): boolean => {
  if (!iban) return false;
  return IBAN.isValid(iban) && iban.startsWith('CH');
};

// Rate limiting for API calls
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

// Global rate limiter instance
export const apiRateLimiter = new RateLimiter(50, 60000); // 50 requests per minute

// Secure token storage utilities
export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      // Ensure we're not double-wrapping the value
      let valueToStore = value;
      try {
        const parsed = JSON.parse(value);
        // If it's already in our expected format, use it as is
        if (isWrappedValue(parsed)) {
          valueToStore = String(parsed.value);
        }
      } catch {
        // Not JSON, use as is
      }
      
      const item = {
        value: valueToStore,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Error setting secure item:', error);
    }
  },

  getItem: (key: string, maxAge: number = 24 * 60 * 60 * 1000): string | null => {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      // Special handling for user data which is a JSON object
      if (key === 'simplifaq_user') {
        try {
          const parsed = JSON.parse(itemStr) as unknown;
          if (parsed && typeof parsed === 'object') {
            // New wrapped format { value, timestamp }
            if (isWrappedValue(parsed)) {
              const now = Date.now();
              if (now - parsed.timestamp > maxAge) {
                localStorage.removeItem(key);
                return null;
              }
              const value = parsed.value;
              // If value is already a JSON string of the user object, return it directly.
              // If value is an object, stringify once.
              return typeof value === 'string' ? value : JSON.stringify(value);
            }
            // Legacy direct object stored: return original string
            return itemStr;
          }
        } catch {
          console.warn('Error parsing user data, returning as is');
          return itemStr;
        }
      }

      // Handle other keys (like tokens)
      try {
        const item = JSON.parse(itemStr) as unknown;
        // If it has a timestamp and value, it's the new format
        if (isWrappedValue(item)) {
          const now = Date.now();
          // Check if item has expired
          if (now - (item.timestamp) > maxAge) {
            localStorage.removeItem(key);
            return null;
          }
          return String(item.value);
        }
      } catch {
        // If parsing fails, it might be a direct token string (old format)
        console.warn(`Found legacy format for key ${key}, migrating to new format`);
        // Save in new format for next time
        secureStorage.setItem(key, itemStr);
        return itemStr;
      }

      // If we get here, the format is unexpected
      console.warn('Unexpected item format in localStorage for key:', key, 'Value:', itemStr);
      return itemStr; // Return the original string as a fallback
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      localStorage.removeItem(key);
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  }
};

// Input validation for forms
export const validateInput = {
  required: (value: string, fieldName: string): string | null => {
    if (!value || value.trim().length === 0) {
      return `${fieldName} est requis`;
    }
    return null;
  },

  email: (email: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide';
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName: string): string | null => {
    if (value.length < min) {
      return `${fieldName} doit contenir au moins ${min} caractères`;
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName: string): string | null => {
    if (value.length > max) {
      return `${fieldName} ne peut pas dépasser ${max} caractères`;
    }
    return null;
  },

  amount: (value: string): string | null => {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) {
      return 'Montant invalide';
    }
    return null;
  },

  swissVAT: (vat: string): string | null => {
    if (!validateSwissVAT(vat)) {
      return 'Numéro TVA suisse invalide (format: CHE-123.456.789 TVA)';
    }
    return null;
  },

  swissIBAN: (iban: string): string | null => {
    if (!validateSwissIBAN(iban)) {
      return 'IBAN suisse invalide';
    }
    return null;
  }
};

// Security audit logging
export const securityLogger = {
  logSecurityEvent: (event: string, details: Record<string, unknown> = {}): void => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, this should be sent to a secure logging service
    if (process.env.NODE_ENV === 'development') {
      console.warn('Security Event:', logEntry);
    }

    // Store critical security events locally for audit
    try {
      const existingLogs = JSON.parse(localStorage.getItem('security_logs') || '[]') as unknown;
      const logsArray: SecurityLogEntry[] = Array.isArray(existingLogs) ? existingLogs as SecurityLogEntry[] : [];
      logsArray.push(logEntry);
      
      // Keep only last 100 entries
      if (logsArray.length > 100) {
        logsArray.splice(0, logsArray.length - 100);
      }
      
      localStorage.setItem('security_logs', JSON.stringify(logsArray));
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  },

  getSecurityLogs: (): SecurityLogEntry[] => {
    try {
      const parsed = JSON.parse(localStorage.getItem('security_logs') || '[]') as unknown;
      return Array.isArray(parsed) ? (parsed as SecurityLogEntry[]) : [];
    } catch (error) {
      console.error('Error retrieving security logs:', error);
      return [];
    }
  },

  clearSecurityLogs: (): void => {
    localStorage.removeItem('security_logs');
  }
};
