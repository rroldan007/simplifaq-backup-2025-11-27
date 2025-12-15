/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormDataPreservation } from '../formDataPreservation';
import { secureStorage, securityLogger } from '../../utils/security';

// Mock dependencies
jest.mock('../../utils/security', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
}));

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock Blob
global.Blob = class Blob {
  size: number;
  constructor(parts: unknown[]) {
    this.size = JSON.stringify(parts).length;
  }
} as unknown as typeof Blob;

const mockSecureStorage = jest.mocked(secureStorage);
const mockSecurityLogger = jest.mocked(securityLogger);

describe('FormDataPreservation', () => {
  let service: FormDataPreservation;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = new Map();
    
    // Setup storage mocks
    mockSecureStorage.getItem.mockImplementation((key: string) => mockStorage.get(key) || null);
    mockSecureStorage.setItem.mockImplementation((key: string, value: string) => {
      mockStorage.set(key, value);
    });
    mockSecureStorage.removeItem.mockImplementation((key: string) => {
      mockStorage.delete(key);
    });

    // Setup crypto mocks
    mockCrypto.subtle.generateKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
    mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(16));
    mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));

    // Mock TextEncoder/TextDecoder
    global.TextEncoder = class {
      // match TextEncoder interface minimally
      encode(input: string): Uint8Array {
        return new Uint8Array(Buffer.from(input, 'utf8'));
      }
    } as unknown as typeof TextEncoder;

    global.TextDecoder = class {
      // match TextDecoder interface minimally
      decode(input: ArrayBuffer | ArrayBufferView): string {
        const buf = input instanceof ArrayBuffer ? Buffer.from(input) : Buffer.from(input.buffer);
        return buf.toString('utf8');
      }
    } as unknown as typeof TextDecoder;

    service = new FormDataPreservation();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Data Preservation', () => {
    it('should preserve form data without encryption', async () => {
      const testData = { name: 'John', email: 'john@example.com' };
      
      const id = await service.preserveFormData(testData, { encrypt: false });
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(mockSecureStorage.setItem).toHaveBeenCalled();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_DATA_PRESERVED',
        expect.objectContaining({
          id,
          encrypted: false,
        })
      );
    });

    it('should preserve form data with encryption by default', async () => {
      const testData = { name: 'John', password: 'secret123' };
      
      const id = await service.preserveFormData(testData);
      
      expect(id).toBeDefined();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_DATA_PRESERVED',
        expect.objectContaining({
          id,
          encrypted: true,
        })
      );
    });

    it('should auto-encrypt when sensitive fields are detected', async () => {
      const testData = { username: 'john', token: 'abc123' };
      
      const id = await service.preserveFormData(testData, { encrypt: false });
      
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_DATA_PRESERVED',
        expect.objectContaining({
          id,
          encrypted: true,
        })
      );
    });

    it('should use custom expiry hours', async () => {
      const testData = { name: 'John' };
      const customExpiry = 48;
      
      await service.preserveFormData(testData, { 
        encrypt: false,
        expiryHours: customExpiry 
      });
      
      const setItemCall = mockSecureStorage.setItem.mock.calls.find(
        (call: [string, string]) => call[0].startsWith('form_data_')
      );
      
      expect(setItemCall).toBeDefined();
      const storedEntry = JSON.parse(setItemCall![1]);
      const expectedExpiry = storedEntry.createdAt + (customExpiry * 60 * 60 * 1000);
      expect(storedEntry.expiresAt).toBe(expectedExpiry);
    });

    it('should use custom form ID', async () => {
      const testData = { name: 'John' };
      const formId = 'invoice-form';
      
      await service.preserveFormData(testData, { 
        encrypt: false,
        formId 
      });
      
      const setItemCall = mockSecureStorage.setItem.mock.calls.find(
        call => call[0].startsWith('form_data_')
      );
      
      expect(setItemCall).toBeDefined();
      const storedEntry = JSON.parse(setItemCall![1]);
      expect(storedEntry.formId).toBe(formId);
    });
  });

  describe('Data Retrieval', () => {
    it('should retrieve preserved data', async () => {
      const testData = { name: 'John', email: 'john@example.com' };
      
      // Mock stored data
      const mockEntry = {
        id: 'test-id',
        formId: 'default',
        data: JSON.stringify(testData),
        encrypted: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastAccessed: Date.now(),
        size: 100
      };
      
      mockStorage.set('form_data_test-id', JSON.stringify(mockEntry));
      
      const retrieved = await service.retrieveFormData('test-id');
      
      expect(retrieved).toEqual(testData);
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_DATA_RETRIEVED',
        expect.objectContaining({
          id: 'test-id',
          encrypted: false,
        })
      );
    });

    it('should return null for non-existent data', async () => {
      const retrieved = await service.retrieveFormData('non-existent');
      
      expect(retrieved).toBeNull();
    });

    it('should return null for expired data', async () => {
      const testData = { name: 'John' };
      
      // Mock expired entry
      const mockEntry = {
        id: 'expired-id',
        formId: 'default',
        data: JSON.stringify(testData),
        encrypted: false,
        createdAt: Date.now() - 48 * 60 * 60 * 1000,
        expiresAt: Date.now() - 24 * 60 * 60 * 1000, // Expired
        lastAccessed: Date.now() - 24 * 60 * 60 * 1000,
        size: 100
      };
      
      mockStorage.set('form_data_expired-id', JSON.stringify(mockEntry));
      
      const retrieved = await service.retrieveFormData('expired-id');
      
      expect(retrieved).toBeNull();
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_data_expired-id');
    });

    it('should handle decryption for encrypted data', async () => {
      const testData = { name: 'John', password: 'secret' };
      
      // Mock encrypted entry
      const mockEntry = {
        id: 'encrypted-id',
        formId: 'default',
        data: { encrypted: 'encrypted-data-hex' },
        encrypted: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastAccessed: Date.now(),
        size: 100
      };
      
      mockStorage.set('form_data_encrypted-id', JSON.stringify(mockEntry));
      mockStorage.set('form_key_encrypted-id', 'mock-encryption-key');
      
      // Mock decryption to return original data
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(testData))
      );
      
      const retrieved = await service.retrieveFormData('encrypted-id');
      
      expect(retrieved).toEqual(testData);
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should update last accessed time on retrieval', async () => {
      const testData = { name: 'John' };
      const originalTime = Date.now() - 1000;
      
      const mockEntry = {
        id: 'test-id',
        formId: 'default',
        data: JSON.stringify(testData),
        encrypted: false,
        createdAt: originalTime,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastAccessed: originalTime,
        size: 100
      };
      
      mockStorage.set('form_data_test-id', JSON.stringify(mockEntry));
      
      await service.retrieveFormData('test-id');
      
      const updateCall = mockSecureStorage.setItem.mock.calls.find(
        (call: [string, string]) => call[0] === 'form_data_test-id'
      );
      
      expect(updateCall).toBeDefined();
      const updatedEntry = JSON.parse(updateCall![1]);
      expect(updatedEntry.lastAccessed).toBeGreaterThan(originalTime);
    });
  });

  describe('Data Removal', () => {
    it('should remove preserved data', async () => {
      const mockEntry = {
        id: 'test-id',
        formId: 'default',
        data: '{"name":"John"}',
        encrypted: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastAccessed: Date.now(),
        size: 100
      };
      
      mockStorage.set('form_data_test-id', JSON.stringify(mockEntry));
      
      const result = await service.removeFormData('test-id');
      
      expect(result).toBe(true);
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_data_test-id');
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_DATA_REMOVED',
        expect.objectContaining({
          id: 'test-id',
        })
      );
    });

    it('should remove encryption key for encrypted data', async () => {
      const mockEntry = {
        id: 'encrypted-id',
        formId: 'default',
        data: '{"encrypted":"data"}',
        encrypted: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastAccessed: Date.now(),
        size: 100
      };
      
      mockStorage.set('form_data_encrypted-id', JSON.stringify(mockEntry));
      
      const result = await service.removeFormData('encrypted-id');
      
      expect(result).toBe(true);
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_data_encrypted-id');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_key_encrypted-id');
    });

    it('should return false for non-existent data', async () => {
      const result = await service.removeFormData('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('Data Listing', () => {
    beforeEach(() => {
      // Mock metadata
      const metadata = {
        entries: {
          'id1': {
            id: 'id1',
            formId: 'form1',
            encrypted: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            lastAccessed: Date.now(),
            size: 100
          },
          'id2': {
            id: 'id2',
            formId: 'form2',
            encrypted: true,
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            lastAccessed: Date.now(),
            size: 150
          },
          'id3': {
            id: 'id3',
            formId: 'form1',
            encrypted: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            lastAccessed: Date.now(),
            size: 200
          }
        },
        totalSize: 450,
        lastCleanup: Date.now()
      };
      
      mockStorage.set('form_preservation_metadata', JSON.stringify(metadata));
    });

    it('should list all preserved data', async () => {
      const list = await service.listFormData();
      
      expect(list).toHaveLength(3);
      expect(list.map(item => item.id)).toEqual(['id1', 'id2', 'id3']);
    });

    it('should filter by form ID', async () => {
      const list = await service.listFormData('form1');
      
      expect(list).toHaveLength(2);
      expect(list.every(item => item.formId === 'form1')).toBe(true);
    });

    it('should return empty array when no data exists', async () => {
      mockStorage.clear();
      
      const list = await service.listFormData();
      
      expect(list).toEqual([]);
    });
  });

  describe('Storage Quota Management', () => {
    it('should return correct storage quota information', () => {
      const metadata = {
        entries: {
          'id1': { id: 'id1', formId: 'form1', size: 1024 * 1024 }, // 1MB
          'id2': { id: 'id2', formId: 'form2', size: 2 * 1024 * 1024 }, // 2MB
        },
        totalSize: 3 * 1024 * 1024, // 3MB
        lastCleanup: Date.now()
      };
      
      mockStorage.set('form_preservation_metadata', JSON.stringify(metadata));
      
      const quota = service.getStorageQuota();
      
      expect(quota.used).toBe(2);
      expect(quota.available).toBe(48); // 50 - 2
      expect(quota.maxItems).toBe(50);
      expect(quota.maxSizeMB).toBe(10);
    });

    it('should enforce LRU eviction when quota is exceeded', async () => {
      // Create metadata with entries near the limit
      const entries: Record<string, {
        id: string;
        formId: string;
        encrypted: boolean;
        createdAt: number;
        expiresAt: number;
        lastAccessed: number;
        size: number;
      }> = {};
      for (let i = 0; i < 49; i++) {
        entries[`id${i}`] = {
          id: `id${i}`,
          formId: 'form1',
          encrypted: false,
          createdAt: Date.now() - (50 - i) * 1000, // Older entries have earlier timestamps
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          lastAccessed: Date.now() - (50 - i) * 1000,
          size: 100
        };
        mockStorage.set(`form_data_id${i}`, JSON.stringify(entries[`id${i}`]));
      }
      
      const metadata = {
        entries,
        totalSize: 49 * 100,
        lastCleanup: Date.now()
      };
      
      mockStorage.set('form_preservation_metadata', JSON.stringify(metadata));
      
      // Try to add one more entry (should trigger eviction)
      await service.preserveFormData({ name: 'New Entry' }, { encrypt: false });
      
      // Should have removed the oldest entry (id0)
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_data_id0');
    });
  });

  describe('Cleanup Operations', () => {
    it('should remove expired entries during cleanup', async () => {
      const now = Date.now();
      const metadata = {
        entries: {
          'valid': {
            id: 'valid',
            formId: 'form1',
            encrypted: false,
            createdAt: now,
            expiresAt: now + 24 * 60 * 60 * 1000, // Valid
            lastAccessed: now,
            size: 100
          },
          'expired': {
            id: 'expired',
            formId: 'form2',
            encrypted: false,
            createdAt: now - 48 * 60 * 60 * 1000,
            expiresAt: now - 24 * 60 * 60 * 1000, // Expired
            lastAccessed: now - 24 * 60 * 60 * 1000,
            size: 100
          }
        },
        totalSize: 200,
        lastCleanup: now - 2 * 60 * 60 * 1000
      };
      
      mockStorage.set('form_preservation_metadata', JSON.stringify(metadata));
      mockStorage.set('form_data_valid', JSON.stringify(metadata.entries.valid));
      mockStorage.set('form_data_expired', JSON.stringify(metadata.entries.expired));
      
      await service.cleanup();
      
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_data_expired');
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_CLEANUP_COMPLETED',
        expect.objectContaining({
          removedCount: 1,
        })
      );
    });

    it('should clear all preserved data', async () => {
      const metadata = {
        entries: {
          'id1': { id: 'id1', formId: 'form1', encrypted: false, size: 100 },
          'id2': { id: 'id2', formId: 'form2', encrypted: true, size: 150 },
        },
        totalSize: 250,
        lastCleanup: Date.now()
      };
      
      mockStorage.set('form_preservation_metadata', JSON.stringify(metadata));
      mockStorage.set('form_data_id1', JSON.stringify(metadata.entries.id1));
      mockStorage.set('form_data_id2', JSON.stringify(metadata.entries.id2));
      
      await service.clearAll();
      
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_data_id1');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('form_data_id2');
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_DATA_CLEARED_ALL',
        expect.objectContaining({
          count: 2,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockSecureStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      await expect(service.preserveFormData({ name: 'John' }))
        .rejects.toThrow('Failed to preserve form data');
      
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_PRESERVATION_ERROR',
        expect.objectContaining({
          error: 'Storage full',
        })
      );
    });

    it('should handle encryption errors gracefully', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Crypto not available'));
      
      await expect(service.preserveFormData({ password: 'secret' }))
        .rejects.toThrow('Failed to preserve form data');
    });

    it('should handle retrieval errors gracefully', async () => {
      mockSecureStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = await service.retrieveFormData('test-id');
      
      expect(result).toBeNull();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_RETRIEVAL_ERROR',
        expect.objectContaining({
          error: 'Storage error',
        })
      );
    });

    it('should handle missing encryption key gracefully', async () => {
      const mockEntry = {
        id: 'encrypted-id',
        formId: 'default',
        data: { encrypted: 'encrypted-data' },
        encrypted: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastAccessed: Date.now(),
        size: 100
      };
      
      mockStorage.set('form_data_encrypted-id', JSON.stringify(mockEntry));
      // Don't set encryption key
      
      const result = await service.retrieveFormData('encrypted-id');
      
      expect(result).toBeNull();
    });
  });

  describe('Service Lifecycle', () => {
    it('should initialize properly', () => {
      expect(service).toBeDefined();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'FORM_PRESERVATION_INITIALIZED',
        expect.any(Object)
      );
    });

    it('should dispose properly', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval' as any);
      
      service.dispose();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
