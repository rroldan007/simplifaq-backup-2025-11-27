import { useState, useEffect, useCallback } from 'react';
import {
  getFeatureFlags,
  saveFeatureFlags,
  isFeatureEnabled,
  toggleFeature,
  resetFeatureFlags,
  type FeatureFlags,
} from '../config/featureFlags';

/**
 * Hook to access and manage feature flags
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags);
  
  // Listen to storage events (for sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feature_flags' && e.newValue) {
        try {
          setFlags(JSON.parse(e.newValue));
        } catch (error) {
          console.error('[useFeatureFlags] Failed to parse storage event:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const updateFlag = useCallback((feature: keyof FeatureFlags, value: boolean) => {
    saveFeatureFlags({ [feature]: value });
    setFlags(getFeatureFlags());
  }, []);
  
  const toggle = useCallback((feature: keyof FeatureFlags) => {
    const newValue = toggleFeature(feature);
    setFlags(getFeatureFlags());
    return newValue;
  }, []);
  
  const reset = useCallback(() => {
    resetFeatureFlags();
    setFlags(getFeatureFlags());
  }, []);
  
  const isEnabled = useCallback((feature: keyof FeatureFlags) => {
    return flags[feature] ?? false;
  }, [flags]);
  
  return {
    flags,
    isEnabled,
    updateFlag,
    toggle,
    reset,
  };
}

/**
 * Simple hook to check if a specific feature is enabled
 */
export function useFeature(feature: keyof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(feature));
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'feature_flags') {
        setEnabled(isFeatureEnabled(feature));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [feature]);
  
  return enabled;
}
