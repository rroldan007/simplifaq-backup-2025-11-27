import {
  sanitizeHtml,
  sanitizeFinancialInput,
  sanitizeTextInput,
  sanitizeEmail,
  validateSwissVAT,
  validateSwissIBAN,
  apiRateLimiter,
  secureStorage,
  validateInput,
  securityLogger
} from '../security';

describe('Security Utils', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset rate limiter
    apiRateLimiter.reset('test');
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeHtml(input);
      expect(result).toBe('Hello');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="malicious.com"></iframe>Content';
      const result = sanitizeHtml(input);
      expect(result).toBe('Content');
    });

    it('should remove javascript: protocols', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toBe('<a href="">Link</a>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Content</div>';
      const result = sanitizeHtml(input);
      expect(result).toBe('<div >Content</div>');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as unknown as string)).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    });
  });

  describe('sanitizeFinancialInput', () => {
    it('should allow valid financial characters', () => {
      const input = '1234.56';
      const result = sanitizeFinancialInput(input);
      expect(result).toBe('1234.56');
    });

    it('should allow commas and negative signs', () => {
      const input = '-1,234.56';
      const result = sanitizeFinancialInput(input);
      expect(result).toBe('-1,234.56');
    });

    it('should remove invalid characters', () => {
      const input = '123abc.56$';
      const result = sanitizeFinancialInput(input);
      expect(result).toBe('123.56');
    });

    it('should handle empty input', () => {
      expect(sanitizeFinancialInput('')).toBe('');
    });
  });

  describe('sanitizeTextInput', () => {
    it('should remove HTML tags', () => {
      const input = '<b>Bold</b> text';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Bold text');
    });

    it('should remove dangerous characters', () => {
      const input = 'Text with <script> and "quotes"';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Text with  and quotes');
    });

    it('should trim whitespace', () => {
      const input = '  Text with spaces  ';
      const result = sanitizeTextInput(input);
      expect(result).toBe('Text with spaces');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('should remove invalid characters', () => {
      const input = 'test<script>@example.com';
      const result = sanitizeEmail(input);
      expect(result).toBe('testscript@example.com');
    });

    it('should handle empty input', () => {
      expect(sanitizeEmail('')).toBe('');
    });
  });

  describe('validateSwissVAT', () => {
    it('should validate correct Swiss VAT format', () => {
      expect(validateSwissVAT('CHE-123.456.789 TVA')).toBe(true);
      expect(validateSwissVAT('CHE-123456789 TVA')).toBe(true);
      expect(validateSwissVAT('CHE-123.456.789 MWST')).toBe(true);
      expect(validateSwissVAT('CHE-123.456.789 IVA')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateSwissVAT('CHE-123.456.78 TVA')).toBe(false);
      expect(validateSwissVAT('DE-123.456.789 TVA')).toBe(false);
      expect(validateSwissVAT('CHE123456789')).toBe(false);
      expect(validateSwissVAT('')).toBe(false);
    });
  });

  describe('validateSwissIBAN', () => {
    it('should validate correct Swiss IBAN format', () => {
      expect(validateSwissIBAN('CH93 0076 2011 6238 5295 7')).toBe(true);
      expect(validateSwissIBAN('CH9300762011623852957')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateSwissIBAN('DE93 0076 2011 6238 5295 7')).toBe(false);
      expect(validateSwissIBAN('CH93 0076 2011 6238 5295')).toBe(false);
      expect(validateSwissIBAN('')).toBe(false);
    });
  });

  describe('apiRateLimiter', () => {
    it('should allow requests within limit', () => {
      expect(apiRateLimiter.isAllowed('test')).toBe(true);
      expect(apiRateLimiter.isAllowed('test')).toBe(true);
    });

    it('should reset rate limit for specific key', () => {
      // Fill up the rate limit
      for (let i = 0; i < 50; i++) {
        apiRateLimiter.isAllowed('test');
      }
      expect(apiRateLimiter.isAllowed('test')).toBe(false);
      
      // Reset and try again
      apiRateLimiter.reset('test');
      expect(apiRateLimiter.isAllowed('test')).toBe(true);
    });
  });

  describe('secureStorage', () => {
    it('should store and retrieve items', () => {
      secureStorage.setItem('test', 'value');
      expect(secureStorage.getItem('test')).toBe('value');
    });

    it('should return null for expired items', async () => {
      secureStorage.setItem('test', 'value');
      // Wait longer to ensure expiration with maxAge of 1ms
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(secureStorage.getItem('test', 1)).toBe(null);
    });

    it('should remove items', () => {
      secureStorage.setItem('test', 'value');
      secureStorage.removeItem('test');
      expect(secureStorage.getItem('test')).toBe(null);
    });

    it('should clear all items', () => {
      secureStorage.setItem('test1', 'value1');
      secureStorage.setItem('test2', 'value2');
      secureStorage.clear();
      expect(secureStorage.getItem('test1')).toBe(null);
      expect(secureStorage.getItem('test2')).toBe(null);
    });
  });

  describe('validateInput', () => {
    describe('required', () => {
      it('should validate required fields', () => {
        expect(validateInput.required('value', 'Field')).toBe(null);
        expect(validateInput.required('', 'Field')).toBe('Field est requis');
        expect(validateInput.required('   ', 'Field')).toBe('Field est requis');
      });
    });

    describe('email', () => {
      it('should validate email format', () => {
        expect(validateInput.email('test@example.com')).toBe(null);
        expect(validateInput.email('invalid-email')).toBe('Format d\'email invalide');
        expect(validateInput.email('test@')).toBe('Format d\'email invalide');
      });
    });

    describe('minLength', () => {
      it('should validate minimum length', () => {
        expect(validateInput.minLength('12345678', 8, 'Password')).toBe(null);
        expect(validateInput.minLength('123', 8, 'Password')).toBe('Password doit contenir au moins 8 caractères');
      });
    });

    describe('maxLength', () => {
      it('should validate maximum length', () => {
        expect(validateInput.maxLength('short', 10, 'Field')).toBe(null);
        expect(validateInput.maxLength('this is a very long text', 10, 'Field')).toBe('Field ne peut pas dépasser 10 caractères');
      });
    });

    describe('amount', () => {
      it('should validate amounts', () => {
        expect(validateInput.amount('123.45')).toBe(null);
        expect(validateInput.amount('0')).toBe(null);
        expect(validateInput.amount('-123')).toBe('Montant invalide');
        expect(validateInput.amount('abc')).toBe('Montant invalide');
      });
    });

    describe('swissVAT', () => {
      it('should validate Swiss VAT numbers', () => {
        expect(validateInput.swissVAT('CHE-123.456.789 TVA')).toBe(null);
        expect(validateInput.swissVAT('invalid')).toBe('Numéro TVA suisse invalide (format: CHE-123.456.789 TVA)');
      });
    });

    describe('swissIBAN', () => {
      it('should validate Swiss IBAN', () => {
        expect(validateInput.swissIBAN('CH93 0076 2011 6238 5295 7')).toBe(null);
        expect(validateInput.swissIBAN('invalid')).toBe('IBAN suisse invalide');
      });
    });
  });

  describe('securityLogger', () => {
    it('should log security events', () => {
      securityLogger.logSecurityEvent('TEST_EVENT', { test: 'data' });
      const logs = securityLogger.getSecurityLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('TEST_EVENT');
      expect(logs[0].details.test).toBe('data');
    });

    it('should limit log entries to 100', () => {
      // Clear existing logs
      securityLogger.clearSecurityLogs();
      
      // Add 150 log entries
      for (let i = 0; i < 150; i++) {
        securityLogger.logSecurityEvent('TEST_EVENT', { index: i });
      }
      
      const logs = securityLogger.getSecurityLogs();
      expect(logs).toHaveLength(100);
      // Should keep the most recent entries
      expect(logs[0].details.index).toBe(50);
      expect(logs[99].details.index).toBe(149);
    });

    it('should clear security logs', () => {
      securityLogger.logSecurityEvent('TEST_EVENT', {});
      securityLogger.clearSecurityLogs();
      expect(securityLogger.getSecurityLogs()).toHaveLength(0);
    });
  });
});