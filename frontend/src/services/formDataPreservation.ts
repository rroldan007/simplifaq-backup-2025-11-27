/**
 * FormDataPreservation Service
 * 
 * Provides secure preservation of form data with encryption, automatic cleanup,
 * and LRU-based storage quota management.
 */

import { secureStorage, securityLogger } from '../utils/security';

// Configuration constants
const STORAGE_PREFIX = 'form_data_';
const ENCRYPTION_KEY_PREFIX = 'form_key_';
const METADATA_KEY = 'form_preservation_metadata';
const DEFAULT_EXPIRY_HOURS = 24;
const MAX_STORAGE_ITEMS = 50;
const MAX_STORAGE_SIZE_MB = 10;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Types
export interface FormDataEntry {
  id: string;
  formId: string;
  // Stored representation may be either a raw JSON string or an object with an "encrypted" string
  data: unknown;
  encrypted: boolean;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  size: number;
}

export interface PreservationMetadata {
  entries: Record<string, Omit<FormDataEntry, 'data'>>;
  totalSize: number;
  lastCleanup: number;
}

export interface PreservationOptions {
  /** Expiry time in hours (default: 24) */
  expiryHours?: number;
  /** Whether to encrypt sensitive data (default: true) */
  encrypt?: boolean;
  /** Fields to consider sensitive and always encrypt */
  sensitiveFields?: string[];
  /** Custom form identifier */
  formId?: string;
}

export interface StorageQuota {
  used: number;
  available: number;
  maxItems: number;
  maxSizeMB: number;
}

/**
 * Simple encryption/decryption utilities using Web Crypto API
 */
class CryptoUtils {
  private static encoder = new TextEncoder();
  private static decoder = new TextDecoder();

  /**
   * Generate a random encryption key
   */
  static async generateKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const exported = await crypto.subtle.exportKey('raw', key);
    return Array.from(new Uint8Array(exported))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Import key from hex string
   */
  static async importKey(keyHex: string): Promise<CryptoKey> {
    const keyBytes = new Uint8Array(
      keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    return crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-GCM
   */
  static async encrypt(data: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = this.encoder.encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return Array.from(combined)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Decrypt data using AES-GCM
   */
  static async decrypt(encryptedHex: string, key: CryptoKey): Promise<string> {
    const encryptedBytes = new Uint8Array(
      encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const iv = encryptedBytes.slice(0, 12);
    const encrypted = encryptedBytes.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return this.decoder.decode(decrypted);
  }
}

/**
 * FormDataPreservation service class
 */
export class FormDataPreservation {
  private cleanupInterval: number | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start cleanup interval
      this.startCleanupInterval();
      
      // Perform initial cleanup
      await this.cleanup();
      
      this.isInitialized = true;
      
      securityLogger.logSecurityEvent('FORM_PRESERVATION_INITIALIZED', {
        timestamp: Date.now()
      });
    } catch (error) {
      securityLogger.logSecurityEvent('FORM_PRESERVATION_INIT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Preserve form data
   */
  async preserveFormData(
    data: Record<string, unknown>,
    options: PreservationOptions = {}
  ): Promise<string | null> {
    const {
      expiryHours = DEFAULT_EXPIRY_HOURS,
      encrypt = true,
      sensitiveFields = ['password', 'token', 'secret', 'key'],
      formId = 'default'
    } = options;

    try {
      const id = this.generateId();
      const now = Date.now();
      const expiresAt = now + (expiryHours * 60 * 60 * 1000);

      // Determine if encryption is needed
      const needsEncryption = encrypt || this.hasSensitiveFields(data, sensitiveFields);
      
      let processedData: string;
      let encryptionKey: string | null = null;

      if (needsEncryption) {
        // Generate encryption key and encrypt data
        encryptionKey = await CryptoUtils.generateKey();
        const key = await CryptoUtils.importKey(encryptionKey);
        processedData = await CryptoUtils.encrypt(JSON.stringify(data), key);
        
        // Store encryption key separately
        secureStorage.setItem(`${ENCRYPTION_KEY_PREFIX}${id}`, encryptionKey);
      } else {
        processedData = JSON.stringify(data);
      }

      const dataSize = new Blob([processedData]).size;

      // Check storage quota before saving
      await this.enforceStorageQuota(dataSize);

      const entry: FormDataEntry = {
        id,
        formId,
        data: { encrypted: processedData },
        encrypted: needsEncryption,
        createdAt: now,
        expiresAt,
        lastAccessed: now,
        size: dataSize
      };

      // Store the data
      secureStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify({
        ...entry,
        data: processedData
      }));

      // Update metadata
      await this.updateMetadata(entry);

      securityLogger.logSecurityEvent('FORM_DATA_PRESERVED', {
        id,
        formId,
        encrypted: needsEncryption,
        size: dataSize,
        expiresAt
      });

      return id;
    } catch (error) {
      securityLogger.logSecurityEvent('FORM_PRESERVATION_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Return null instead of throwing to prevent crashes
      return null;
    }
  }

  /**
   * Retrieve preserved form data
   */
  async retrieveFormData(id: string): Promise<Record<string, unknown> | null> {
    try {
      const storedData = secureStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (!storedData) {
        return null;
      }

      const entry: FormDataEntry = JSON.parse(storedData);

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        await this.removeFormData(id);
        return null;
      }

      let data: Record<string, unknown>;

      if (entry.encrypted) {
        // Decrypt data from either entry.data.encrypted or entry.data if it's a string
        const encryptionKey = secureStorage.getItem(`${ENCRYPTION_KEY_PREFIX}${id}`);
        if (!encryptionKey) {
          throw new Error('Encryption key not found');
        }

        const key = await CryptoUtils.importKey(encryptionKey);
        let encryptedPayload: string | null = null;
        if (entry && typeof entry.data === 'object' && entry.data !== null && 'encrypted' in (entry.data as Record<string, unknown>)) {
          const maybeEnc = (entry.data as { encrypted?: unknown }).encrypted;
          if (typeof maybeEnc === 'string') {
            encryptedPayload = maybeEnc;
          }
        } else if (typeof entry.data === 'string') {
          encryptedPayload = entry.data;
        }

        if (typeof encryptedPayload !== 'string') {
          throw new Error('Encrypted payload not found');
        }

        const decryptedData = await CryptoUtils.decrypt(encryptedPayload, key);
        const parsed: unknown = JSON.parse(decryptedData);
        data = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {};
      } else {
        // Non-encrypted path: data could be stored as string or under .encrypted
        let raw: string | null = null;
        if (typeof entry.data === 'string') {
          raw = entry.data;
        } else if (entry && typeof entry.data === 'object' && entry.data !== null && 'encrypted' in (entry.data as Record<string, unknown>)) {
          const maybeEnc = (entry.data as { encrypted?: unknown }).encrypted;
          if (typeof maybeEnc === 'string') raw = maybeEnc;
        }

        if (typeof raw === 'string') {
          const parsed: unknown = JSON.parse(raw);
          data = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {};
        } else {
          data = {};
        }
      }

      // Update last accessed time
      entry.lastAccessed = Date.now();
      secureStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(entry));
      await this.updateMetadata(entry);

      securityLogger.logSecurityEvent('FORM_DATA_RETRIEVED', {
        id,
        formId: entry.formId,
        encrypted: entry.encrypted
      });

      return data;
    } catch (error) {
      securityLogger.logSecurityEvent('FORM_RETRIEVAL_ERROR', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Remove preserved form data
   */
  async removeFormData(id: string): Promise<boolean> {
    try {
      const storedData = secureStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (!storedData) {
        return false;
      }

      const entry: FormDataEntry = JSON.parse(storedData);

      // Remove data and encryption key
      secureStorage.removeItem(`${STORAGE_PREFIX}${id}`);
      if (entry.encrypted) {
        secureStorage.removeItem(`${ENCRYPTION_KEY_PREFIX}${id}`);
      }

      // Update metadata
      await this.removeFromMetadata(id);

      securityLogger.logSecurityEvent('FORM_DATA_REMOVED', {
        id,
        formId: entry.formId
      });

      return true;
    } catch (error) {
      securityLogger.logSecurityEvent('FORM_REMOVAL_ERROR', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * List preserved form data by form ID
   */
  async listFormData(formId?: string): Promise<Array<Omit<FormDataEntry, 'data'>>> {
    try {
      const metadata = this.getMetadata();
      const entries = Object.values(metadata.entries);

      if (formId) {
        return entries.filter(entry => entry.formId === formId);
      }

      return entries;
    } catch (error) {
      securityLogger.logSecurityEvent('FORM_LIST_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get storage quota information
   */
  getStorageQuota(): StorageQuota {
    const metadata = this.getMetadata();

    return {
      used: Object.keys(metadata.entries).length,
      available: MAX_STORAGE_ITEMS - Object.keys(metadata.entries).length,
      maxItems: MAX_STORAGE_ITEMS,
      maxSizeMB: MAX_STORAGE_SIZE_MB
    };
  }

  /**
   * Manually trigger cleanup
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const metadata = this.getMetadata();
      let removedCount = 0;

      // Remove expired entries
      for (const [id, entry] of Object.entries(metadata.entries)) {
        if (now > entry.expiresAt) {
          await this.removeFormData(id);
          removedCount++;
        }
      }

      // Update last cleanup time
      metadata.lastCleanup = now;
      this.saveMetadata(metadata);

      securityLogger.logSecurityEvent('FORM_CLEANUP_COMPLETED', {
        removedCount,
        timestamp: now
      });
    } catch (error) {
      securityLogger.logSecurityEvent('FORM_CLEANUP_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear all preserved data
   */
  async clearAll(): Promise<void> {
    try {
      const metadata = this.getMetadata();
      const ids = Object.keys(metadata.entries);

      for (const id of ids) {
        await this.removeFormData(id);
      }

      securityLogger.logSecurityEvent('FORM_DATA_CLEARED_ALL', {
        count: ids.length
      });
    } catch (error) {
      securityLogger.logSecurityEvent('FORM_CLEAR_ALL_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isInitialized = false;
  }

  // Private helper methods

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hasSensitiveFields(data: Record<string, unknown>, sensitiveFields: string[]): boolean {
    const checkObject = (obj: unknown, fields: string[]): boolean => {
      if (typeof obj !== 'object' || obj === null) return false;

      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (fields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          return true;
        }
        if (typeof value === 'object' && value !== null && checkObject(value, fields)) {
          return true;
        }
      }
      return false;
    };

    return checkObject(data, sensitiveFields);
  }

  private getMetadata(): PreservationMetadata {
    try {
      const stored = secureStorage.getItem(METADATA_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      securityLogger.logSecurityEvent('METADATA_PARSE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return {
      entries: {},
      totalSize: 0,
      lastCleanup: Date.now()
    };
  }

  private saveMetadata(metadata: PreservationMetadata): void {
    try {
      secureStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      securityLogger.logSecurityEvent('METADATA_SAVE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async updateMetadata(entry: FormDataEntry): Promise<void> {
    const metadata = this.getMetadata();
    const entryWithoutData: Omit<FormDataEntry, 'data'> = {
      id: entry.id,
      formId: entry.formId,
      encrypted: entry.encrypted,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      lastAccessed: entry.lastAccessed,
      size: entry.size
    };
    
    metadata.entries[entry.id] = entryWithoutData;
    metadata.totalSize = Object.values(metadata.entries).reduce((sum, e) => sum + e.size, 0);
    
    this.saveMetadata(metadata);
  }

  private async removeFromMetadata(id: string): Promise<void> {
    const metadata = this.getMetadata();
    delete metadata.entries[id];
    metadata.totalSize = Object.values(metadata.entries).reduce((sum, e) => sum + e.size, 0);
    
    this.saveMetadata(metadata);
  }

  private async enforceStorageQuota(newEntrySize: number): Promise<void> {
    const metadata = this.getMetadata();
    const entries = Object.values(metadata.entries);
    
    // Check if we need to evict entries
    const wouldExceedItems = entries.length >= MAX_STORAGE_ITEMS;
    const wouldExceedSize = (metadata.totalSize + newEntrySize) > (MAX_STORAGE_SIZE_MB * 1024 * 1024);

    if (wouldExceedItems || wouldExceedSize) {
      // Sort by last accessed time (LRU)
      const sortedEntries = entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      let removedCount = 0;
      let removedSize = 0;

      for (const entry of sortedEntries) {
        if (entries.length - removedCount <= MAX_STORAGE_ITEMS - 1 && 
            metadata.totalSize - removedSize + newEntrySize <= MAX_STORAGE_SIZE_MB * 1024 * 1024) {
          break;
        }

        await this.removeFormData(entry.id);
        removedCount++;
        removedSize += entry.size;
      }

      securityLogger.logSecurityEvent('FORM_LRU_EVICTION', {
        removedCount,
        removedSize
      });
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);
  }
}

// Export singleton instance
export const formDataPreservation = new FormDataPreservation();

// Export types and constants
export { DEFAULT_EXPIRY_HOURS, MAX_STORAGE_ITEMS, MAX_STORAGE_SIZE_MB };
