import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { formDataPreservation } from '../services/formDataPreservation';
import type { PreservationOptions } from '../services/formDataPreservation';

export interface UseFormDataPreservationOptions extends PreservationOptions {
  /** Whether to auto-preserve on form changes (default: true) */
  autoPreserve?: boolean;
  /** Debounce delay in milliseconds for auto-preservation (default: 1000) */
  debounceMs?: number;
  /** Whether to auto-restore on mount (default: true) */
  autoRestore?: boolean;
}

export interface UseFormDataPreservationReturn {
  /** Manually preserve form data */
  preserveData: (data: unknown) => Promise<string | null>;
  /** Retrieve preserved data by ID */
  retrieveData: (id: string) => Promise<Record<string, unknown> | null>;
  /** Remove preserved data by ID */
  removeData: (id: string) => Promise<boolean>;
  /** Get the current preservation ID */
  preservationId: string | null;
  /** Check if data is currently being preserved */
  isPreserving: boolean;
  /** Clear all preserved data for this form */
  clearFormData: () => Promise<void>;
}

/**
 * React hook for form data preservation
 * 
 * Provides easy-to-use methods for preserving and restoring form data
 * with automatic preservation on form changes and restoration on mount.
 * 
 * @param formId Unique identifier for the form
 * @param options Configuration options
 * @returns Object with preservation methods and state
 */
export function useFormDataPreservation(
  formId: string,
  options: UseFormDataPreservationOptions = {}
): UseFormDataPreservationReturn {
  const {
    autoPreserve = true,
    debounceMs = 1000,
    autoRestore = true,
    ...preservationOptions
  } = options;

  // Memoize preservationOptions by stringified value to prevent unnecessary re-renders
  const preservationOptionsKey = JSON.stringify(preservationOptions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedPreservationOptions = useMemo(() => preservationOptions, [preservationOptionsKey]);

  const [preservationId, setPreservationId] = useState<string | null>(null);
  const [isPreserving, setIsPreserving] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preservationIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    preservationIdRef.current = preservationId;
  }, [preservationId]);

  /**
   * Preserve form data
   */
  const preserveData = useCallback(async (data: unknown): Promise<string | null> => {
    try {
      setIsPreserving(true);
      if (data === null || typeof data !== 'object') {
        console.error('Preserve data expects an object');
        return null;
      }
      
      // Remove previous preservation if exists (use ref to avoid dependency cycle)
      if (preservationIdRef.current) {
        await formDataPreservation.removeFormData(preservationIdRef.current);
      }

      const id = await formDataPreservation.preserveFormData(data as Record<string, unknown>, {
        ...memoizedPreservationOptions,
        formId,
      });

      if (id) {
        setPreservationId(id);
        preservationIdRef.current = id;
      }
      return id;
    } catch (error) {
      console.error('Failed to preserve form data:', error);
      return null;
    } finally {
      setIsPreserving(false);
    }
  }, [formId, memoizedPreservationOptions]); // Removed preservationId to break the cycle

  /**
   * Retrieve preserved data
   */
  const retrieveData = useCallback(async (id: string): Promise<Record<string, unknown> | null> => {
    try {
      return await formDataPreservation.retrieveFormData(id);
    } catch (error) {
      console.error('Failed to retrieve form data:', error);
      return null;
    }
  }, []);

  /**
   * Remove preserved data
   */
  const removeData = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await formDataPreservation.removeFormData(id);
      if (id === preservationId) {
        setPreservationId(null);
      }
      return result;
    } catch (error) {
      console.error('Failed to remove form data:', error);
      return false;
    }
  }, [preservationId]);

  /**
   * Clear all preserved data for this form
   */
  const clearFormData = useCallback(async (): Promise<void> => {
    try {
      const entries = await formDataPreservation.listFormData(formId);
      await Promise.all(entries.map(entry => formDataPreservation.removeFormData(entry.id)));
      setPreservationId(null);
    } catch (error) {
      console.error('Failed to clear form data:', error);
    }
  }, [formId]);

  /**
   * Debounced preservation for auto-preserve
   */
  const debouncedPreserve = useCallback((data: unknown): Promise<string | null> => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    return new Promise((resolve) => {
      debounceTimeoutRef.current = setTimeout(() => {
        preserveData(data).then(resolve).catch(() => resolve(null));
      }, debounceMs);
    });
  }, [preserveData, debounceMs]);

  /**
   * Auto-restore on mount
   */
  useEffect(() => {
    if (!autoRestore) return;

    const restoreData = async () => {
      try {
        const entries = await formDataPreservation.listFormData(formId);
        if (entries.length > 0) {
          // Get the most recent entry
          const mostRecent = entries.reduce((latest, current) => 
            current.lastAccessed > latest.lastAccessed ? current : latest
          );
          
          setPreservationId(mostRecent.id);
        }
      } catch (error) {
        console.error('Failed to restore form data on mount:', error);
      }
    };

    restoreData();
  }, [formId, autoRestore]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    preserveData: autoPreserve ? debouncedPreserve : preserveData,
    retrieveData,
    removeData,
    preservationId,
    isPreserving,
    clearFormData,
  };
}

/**
 * Hook for automatic form data preservation with form state
 * 
 * This hook automatically preserves form data when it changes and
 * provides methods to restore the data.
 * 
 * @param formId Unique identifier for the form
 * @param formData Current form data
 * @param options Configuration options
 * @returns Object with preservation methods and state
 */
export function useAutoFormPreservation(
  formId: string,
  formData: Record<string, unknown>,
  options: UseFormDataPreservationOptions = {}
) {
  const optionsKey = JSON.stringify(options);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedOptions = useMemo(() => ({
    autoPreserve: true,
    ...options,
  }), [optionsKey]);

  const preservation = useFormDataPreservation(formId, memoizedOptions);

  /**
   * Auto-preserve when form data changes
   */
  const { preserveData } = preservation;
  const { retrieveData } = preservation;
  const prevFormDataRef = useRef<string | null>(null);
  const preserveDataRef = useRef(preserveData);
  
  // Keep ref updated without triggering effect
  useEffect(() => {
    preserveDataRef.current = preserveData;
  }, [preserveData]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const stringifiedFormData = formData ? JSON.stringify(formData) : null;
    const isEmptyObject = stringifiedFormData === '{}';

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (
      stringifiedFormData &&
      !isEmptyObject &&
      stringifiedFormData !== prevFormDataRef.current
    ) {
      // Debounce the preservation to avoid excessive calls
      debounceTimerRef.current = setTimeout(() => {
        preserveDataRef.current(formData);
      }, 1500);
    }

    prevFormDataRef.current = stringifiedFormData;
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData]); // Remove preserveData from dependencies to break the loop

  /**
   * Restore most recent data
   */
  const restoreMostRecent = useCallback(async (): Promise<Record<string, unknown> | null> => {
    try {
      const entries = await formDataPreservation.listFormData(formId);
      if (entries.length === 0) return null;

      // Get the most recent entry
      const mostRecent = entries.reduce((latest, current) => 
        current.lastAccessed > latest.lastAccessed ? current : latest
      );

      return await retrieveData(mostRecent.id);
    } catch (error) {
      console.error('Failed to restore most recent form data:', error);
      return null;
    }
  }, [formId, retrieveData]);

  return {
    ...preservation,
    restoreMostRecent,
  };
}

export default useFormDataPreservation;
