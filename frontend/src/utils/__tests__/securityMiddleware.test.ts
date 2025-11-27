/**
 * Tests for security middleware
 */

import {
  validateSecureInput,
  secureFormSubmit
} from '../securityMiddleware';

// Mock fetch
global.fetch = jest.fn();

// Mock document
const mockDocument = {
  querySelector: jest.fn(),
  createElement: jest.fn(),
  head: {
    appendChild: jest.fn()
  }
};

Object.defineProperty(document, 'querySelector', {
  value: mockDocument.querySelector,
  writable: true
});

Object.defineProperty(document, 'createElement', {
  value: mockDocument.createElement,
  writable: true
});

Object.defineProperty(document, 'head', {
  value: mockDocument.head,
  writable: true
});

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset document mocks
    mockDocument.querySelector.mockReturnValue(null);
    mockDocument.createElement.mockReturnValue({
      setAttribute: jest.fn(),
    });
  });

  describe('validateSecureInput', () => {
    it('should reject input with script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const result = validateSecureInput(maliciousInput, 'text');
      
      expect(result).toBe(false);
    });

    it('should reject input with javascript protocol', () => {
      const maliciousInput = 'javascript:alert(1)';
      
      const result = validateSecureInput(maliciousInput, 'text');
      
      expect(result).toBe(false);
    });

    it('should reject input with event handlers', () => {
      const maliciousInput = 'onclick=alert(1)';
      
      const result = validateSecureInput(maliciousInput, 'text');
      
      expect(result).toBe(false);
    });

    it('should accept safe input', () => {
      const safeInput = 'This is safe text';
      
      const result = validateSecureInput(safeInput, 'text');
      
      expect(result).toBe(true);
    });
  });

  describe('secureFormSubmit', () => {
    it('should add CSRF token if available', async () => {
      const mockCSRFMeta = {
        getAttribute: jest.fn().mockReturnValue('csrf-token-123')
      };
      mockDocument.querySelector.mockReturnValue(mockCSRFMeta);
      
      const formData = new FormData();
      formData.append('field1', 'value1');
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      await secureFormSubmit(formData, '/api/test');
      
      expect(formData.get('_token')).toBe('csrf-token-123');
      expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'POST',
        body: formData,
        headers: expect.objectContaining({
          'X-CSRF-TOKEN': 'csrf-token-123'
        })
      }));
    });

    it('should submit without CSRF token if not available', async () => {
      mockDocument.querySelector.mockReturnValue(null);
      
      const formData = new FormData();
      formData.append('field1', 'value1');
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      
      await secureFormSubmit(formData, '/api/test');
      
      expect(formData.get('_token')).toBe(null);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'POST',
        body: formData,
        headers: expect.objectContaining({
          'X-CSRF-TOKEN': ''
        })
      }));
    });
  });
});