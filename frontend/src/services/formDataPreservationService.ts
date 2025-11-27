/**
 * Form Data Preservation Service
 * Handles secure storage and restoration of form data during session expiry
 */

import { userInteractionService } from './userInteractionService';

interface PreservedFormData {
  formId: string;
  data: string | Record<string, unknown>;
  timestamp: number;
  expiresAt: number;
  formType?: string;
  encrypted: boolean;
}

interface FormDataOptions {
  formType?: string;
  expirationMinutes?: number;
  encrypt?: boolean;
}

class FormDataPreservationService {
  private readonly STORAGE_KEY = 'preserved_form_data';
  private readonly DEFAULT_EXPIRATION_MINUTES = 60; // 1 hour
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ENCRYPTION_KEY = 'form_data_encryption_key_v1';

  constructor() {
    // Clean up expired data on initialization
    this.cleanupExpiredData();
    
    // Set up periodic cleanup every 10 minutes
    setInterval(() => {
      this.cleanupExpiredData();
    }, 10 * 60 * 1000);
  }

  /**
   * Preserve form data with optional encryption
   */
  async preserveFormData(
    formId: string,
    formData: Record<string, unknown>,
    options: FormDataOptions = {}
  ): Promise<boolean> {
    try {
      const {
        formType,
        expirationMinutes = this.DEFAULT_EXPIRATION_MINUTES,
        encrypt = true
      } = options;

      const now = Date.now();
      const expiresAt = now + (expirationMinutes * 60 * 1000);

      // Serialize and optionally encrypt the data
      const serializedData = JSON.stringify(formData);
      const dataToStore = encrypt ? this.encryptData(serializedData) : serializedData;

      const preservedData: PreservedFormData = {
        formId,
        data: dataToStore,
        timestamp: now,
        expiresAt,
        formType,
        encrypted: encrypt
      };

      // Check storage quota before saving
      if (!this.checkStorageQuota(preservedData)) {
        console.warn('Storage quota exceeded, cleaning up old data');
        this.cleanupOldestData();
      }

      // Get existing preserved data
      const existingData = this.getStoredData();
      existingData[formId] = preservedData;

      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));

      // Log the preservation event
      await userInteractionService.trackFormDataPreserved(
        formId,
        serializedData.length,
        formType
      );

      console.log(`Form data preserved for ${formId}`, {
        size: serializedData.length,
        expiresAt: new Date(expiresAt).toISOString(),
        encrypted: encrypt
      });

      return true;
    } catch (error) {
      console.error('Failed to preserve form data:', error);
      return false;
    }
  }

  /**
   * Restore preserved form data
   */
  async restoreFormData(formId: string): Promise<Record<string, unknown> | null> {
    // Return type tightened by using Record<string, unknown>
    // and adding runtime checks before returning
    try {
      const storedData = this.getStoredData();
      const preservedData = storedData[formId];

      if (!preservedData) {
        return null;
      }

      // Check if data has expired
      if (Date.now() > preservedData.expiresAt) {
        await this.expireFormData(formId, 'expired');
        return null;
      }

      // Decrypt if necessary
      let formData: Record<string, unknown>;
      if (preservedData.encrypted) {
        const decryptedData = this.decryptData(preservedData.data as string);
        const parsed: unknown = JSON.parse(decryptedData);
        formData = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {};
      } else {
        const parsed = preservedData.data;
        formData = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {};
      }

      // Log the restoration event
      const dataSize = JSON.stringify(formData).length;
      await userInteractionService.trackFormDataRestored(
        formId,
        dataSize,
        preservedData.formType
      );

      console.log(`Form data restored for ${formId}`, {
        size: dataSize,
        preservedAt: new Date(preservedData.timestamp).toISOString()
      });

      return formData;
    } catch (error) {
      console.error('Failed to restore form data:', error);
      return null;
    }
  }

  /**
   * Remove preserved form data
   */
  async removeFormData(formId: string): Promise<boolean> {
    try {
      const storedData = this.getStoredData();
      const preservedData = storedData[formId];

      if (preservedData) {
        delete storedData[formId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedData));

        // Log cleanup event
        const dataSize = typeof preservedData.data === 'string' 
          ? preservedData.data.length 
          : JSON.stringify(preservedData.data).length;

        await userInteractionService.trackFormDataExpired(
          formId,
          dataSize,
          'manual_removal'
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to remove form data:', error);
      return false;
    }
  }

  /**
   * Get list of preserved form IDs
   */
  getPreservedFormIds(): string[] {
    try {
      const storedData = this.getStoredData();
      return Object.keys(storedData).filter(formId => {
        const data = storedData[formId];
        return Date.now() <= data.expiresAt;
      });
    } catch (error) {
      console.error('Failed to get preserved form IDs:', error);
      return [];
    }
  }

  /**
   * Check if form data exists for a given form ID
   */
  hasPreservedData(formId: string): boolean {
    try {
      const storedData = this.getStoredData();
      const preservedData = storedData[formId];
      return preservedData && Date.now() <= preservedData.expiresAt;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    totalSize: number;
    itemCount: number;
    oldestItem?: { formId: string; timestamp: number };
    largestItem?: { formId: string; size: number };
  } {
    try {
      const storedData = this.getStoredData();
      const serializedData = JSON.stringify(storedData);
      const totalSize = new Blob([serializedData]).size;

      let oldestItem: { formId: string; timestamp: number } | undefined;
      let largestItem: { formId: string; size: number } | undefined;

      Object.entries(storedData).forEach(([formId, data]) => {
        // Track oldest item
        if (!oldestItem || data.timestamp < oldestItem.timestamp) {
          oldestItem = { formId, timestamp: data.timestamp };
        }

        // Track largest item
        const itemSize = typeof data.data === 'string' 
          ? data.data.length 
          : JSON.stringify(data.data).length;
        
        if (!largestItem || itemSize > largestItem.size) {
          largestItem = { formId, size: itemSize };
        }
      });

      return {
        totalSize,
        itemCount: Object.keys(storedData).length,
        oldestItem,
        largestItem
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { totalSize: 0, itemCount: 0 };
    }
  }

  /**
   * Clean up expired form data
   */
  private async cleanupExpiredData(): Promise<void> {
    try {
      const storedData = this.getStoredData();
      const now = Date.now();
      let cleanedCount = 0;

      for (const [formId, data] of Object.entries(storedData)) {
        if (now > data.expiresAt) {
          await this.expireFormData(formId, 'expired');
          delete storedData[formId];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedData));
        console.log(`Cleaned up ${cleanedCount} expired form data entries`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  /**
   * Clean up oldest data when storage quota is exceeded
   */
  private async cleanupOldestData(): Promise<void> {
    try {
      const storedData = this.getStoredData();
      const entries = Object.entries(storedData);

      if (entries.length === 0) return;

      // Sort by timestamp (oldest first)
      entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

      // Remove oldest 25% of entries
      const toRemove = Math.max(1, Math.floor(entries.length * 0.25));

      for (let i = 0; i < toRemove; i++) {
        const [formId] = entries[i];
        await this.expireFormData(formId, 'storage_quota_exceeded');
        delete storedData[formId];
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storedData));
      console.log(`Cleaned up ${toRemove} oldest form data entries due to storage quota`);
    } catch (error) {
      console.error('Failed to cleanup oldest data:', error);
    }
  }

  /**
   * Check if adding new data would exceed storage quota
   */
  private checkStorageQuota(newData: PreservedFormData): boolean {
    try {
      const currentData = this.getStoredData();
      const currentSize = new Blob([JSON.stringify(currentData)]).size;
      const newDataSize = new Blob([JSON.stringify(newData)]).size;

      return (currentSize + newDataSize) <= this.MAX_STORAGE_SIZE;
    } catch {
      return false;
    }
  }

  /**
   * Get stored data from localStorage
   */
  private getStoredData(): Record<string, PreservedFormData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse stored form data:', error);
      return {};
    }
  }

  /**
   * Log form data expiration
   */
  private async expireFormData(formId: string, reason: string): Promise<void> {
    try {
      const storedData = this.getStoredData();
      const preservedData = storedData[formId];

      if (preservedData) {
        const dataSize = typeof preservedData.data === 'string' 
          ? preservedData.data.length 
          : JSON.stringify(preservedData.data).length;

        await userInteractionService.trackFormDataExpired(formId, dataSize, reason);
      }
    } catch (error) {
      console.error('Failed to log form data expiration:', error);
    }
  }

  /**
   * Simple encryption for form data (not cryptographically secure, just obfuscation)
   */
  private encryptData(data: string): string {
    try {
      // Simple XOR encryption with key
      const key = this.ENCRYPTION_KEY;
      let encrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const dataChar = data.charCodeAt(i);
        encrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.error('Encryption failed:', error);
      return data; // Return original data if encryption fails
    }
  }

  /**
   * Simple decryption for form data
   */
  private decryptData(encryptedData: string): string {
    try {
      const encrypted = atob(encryptedData); // Base64 decode
      const key = this.ENCRYPTION_KEY;
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const formDataPreservationService = new FormDataPreservationService();
