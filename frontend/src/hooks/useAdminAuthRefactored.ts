/**
 * 🇨🇭 SimpliFaq - Admin Auth Hook (Refactored)
 * 
 * Enhanced React hook using centralized auth service
 */

import { useState, useEffect, useCallback } from 'react';
import { adminAuthService, type AdminUser } from '../services/adminAuthService';
import { adminApiService } from '../services/adminApiServiceRefactored';

interface AdminAuthState {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  error: string | null;
}

interface AdminAuthContextType extends AdminAuthState {
  login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roles: string[]) => boolean;
  refreshProfile: () => Promise<void>;
}

export function useAdminAuth(): AdminAuthContextType {
  const [state, setState] = useState<AdminAuthState>({
    admin: adminAuthService.getUser(),
    isLoading: true,
    isAuthenticated: adminAuthService.isAuthenticated(),
    requiresTwoFactor: false,
    error: null,
  });

  const updateState = useCallback((updates: Partial<AdminAuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize authentication on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      if (!isMounted) return;
      
      if (adminAuthService.isAuthenticated()) {
        try {
          updateState({ isLoading: true, error: null });
          
          const response = await adminApiService.getProfile();
          
          if (response.success && response.data) {
            updateState({
              admin: response.data,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // Invalid session, clear it
            adminAuthService.clearToken();
            updateState({
              admin: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          adminAuthService.clearToken();
          updateState({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        updateState({ isLoading: false });
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, [updateState]);

  // Login function
  const login = useCallback(async (email: string, password: string, twoFactorCode?: string) => {
    try {
      updateState({ isLoading: true, error: null, requiresTwoFactor: false });

      const response = await adminApiService.login({
        email,
        password,
        twoFactorCode,
      });

      if (response.success) {
        if (response.requiresTwoFactor) {
          updateState({ requiresTwoFactor: true, isLoading: false });
        } else {
          type LoginPayload = { admin?: unknown; accessToken?: string; token?: string };
          const payload = response.data as LoginPayload;
          const admin = payload.admin;
          const token = payload.accessToken || payload.token;
          
          if (!admin || !token) {
            throw new Error('Invalid response from server');
          }
          
          // Token is already set in adminApiService.login
          updateState({
            admin,
            isAuthenticated: true,
            isLoading: false,
            requiresTwoFactor: false,
            error: null,
          });
        }
      } else {
        const errorMessage = response.error?.message || 'Authentication failed';
        updateState({ error: errorMessage, isLoading: false });
        throw new Error(errorMessage);
      }
    } catch (error: unknown) {
      const errorMessage = 
        (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string')
          ? error.message
          : 'Login error';
      
      updateState({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  }, [updateState]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await adminApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      adminAuthService.clearToken();
      updateState({
        admin: null,
        isAuthenticated: false,
        error: null,
      });
    }
  }, [updateState]);

  // Clear error function
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Permission checks
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    return adminAuthService.hasPermission(resource, action);
  }, []);

  const hasRole = useCallback((roles: string[]): boolean => {
    return adminAuthService.hasRole(roles);
  }, []);

  // Refresh admin profile
  const refreshProfile = useCallback(async () => {
    try {
      if (!adminAuthService.isAuthenticated()) return;

      const response = await adminApiService.getProfile();
      if (response.success && response.data) {
        updateState({ admin: response.data });
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  }, [updateState]);

  return {
    ...state,
    login,
    logout,
    clearError,
    hasPermission,
    hasRole,
    refreshProfile,
  };
}

// Export types
export type { AdminAuthContextType, AdminAuthState };
