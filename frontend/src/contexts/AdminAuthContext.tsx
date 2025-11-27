import React, { useReducer, useEffect } from 'react';
import { adminApi } from '../services/adminApi';
import AdminAuthContext from './adminAuthContextInstance';
import type { AdminUser, AdminAuthState, AdminAuthAction, AdminAuthContextType } from './adminAuthTypes';

// Types now imported from adminAuthTypes

// Initial state
const initialState: AdminAuthState = {
  admin: null,
  token: localStorage.getItem('adminToken'),
  isLoading: true,
  isAuthenticated: false,
  requiresTwoFactor: false,
  error: null,
};

// Reducer
function adminAuthReducer(state: AdminAuthState, action: AdminAuthAction): AdminAuthState {
  console.log('[AdminAuth] Reducer action:', action.type, action);
  console.log('[AdminAuth] Current state:', { isAuthenticated: state.isAuthenticated, admin: !!state.admin, token: !!state.token });
  
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        requiresTwoFactor: false,
      };

    case 'LOGIN_SUCCESS':
      {
        console.log('[AdminAuth] LOGIN_SUCCESS payload:', action.payload);
        const newState = {
          ...state,
          admin: action.payload.admin,
          token: action.payload.token,
          isLoading: false,
          isAuthenticated: true,
          requiresTwoFactor: false,
          error: null,
        };
        console.log('[AdminAuth] New state after LOGIN_SUCCESS:', { isAuthenticated: newState.isAuthenticated, admin: !!newState.admin, token: !!newState.token });
        return newState;
      }

    case 'LOGIN_REQUIRES_2FA':
      return {
        ...state,
        isLoading: false,
        requiresTwoFactor: true,
        error: null,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        requiresTwoFactor: false,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        token: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'UPDATE_ADMIN':
      return {
        ...state,
        admin: state.admin ? { ...state.admin, ...action.payload } : null,
      };

    default:
      return state;
  }
}

// Singleton pattern to prevent multiple instances
let isProviderMounted = false;

// Provider component
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(adminAuthReducer, initialState);
  
  // Prevent multiple instances
  useEffect(() => {
    if (isProviderMounted) {
      console.warn('[AdminAuth] Multiple AdminAuthProvider instances detected!');
      return;
    }
    isProviderMounted = true;
    console.log('[AdminAuth] Provider mounted');
    
    return () => {
      isProviderMounted = false;
      console.log('[AdminAuth] Provider unmounted');
    };
  }, []);

  // Initialize authentication on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      if (!isMounted) {
        console.log('[AdminAuth] Component unmounted, skipping initialization');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      console.log('[AdminAuth] Initializing auth, token found:', !!token);
      
      if (token) {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          adminApi.setAuthToken(token);
          
          console.log('[AdminAuth] Attempting to get profile with token');
          const response = await adminApi.getProfile();
          console.log('[AdminAuth] Profile response:', response);
          
          if (response.success && response.data) {
            console.log('[AdminAuth] Profile loaded successfully, dispatching LOGIN_SUCCESS');
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                admin: response.data,
                token,
              },
            });
          } else {
            console.log('[AdminAuth] Profile failed, removing token');
            // Invalid token, remove it
            localStorage.removeItem('adminToken');
            adminApi.setAuthToken(null);
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('[AdminAuth] Auth initialization error:', error);
          localStorage.removeItem('adminToken');
          adminApi.setAuthToken(null);
          dispatch({ type: 'LOGOUT' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('[AdminAuth] No token found, staying logged out');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Login function
  const login = async (email: string, password: string, twoFactorCode?: string) => {
    try {
      dispatch({ type: 'LOGIN_START' });

      const response = await adminApi.login({
        email,
        password,
        twoFactorCode,
      });

      if (response.success) {
        if (response.requiresTwoFactor) {
          dispatch({ type: 'LOGIN_REQUIRES_2FA' });
        } else {
          const payload = response.data as unknown;
          const hasValidShape =
            typeof payload === 'object' && payload !== null &&
            'admin' in payload && ('accessToken' in payload || 'token' in payload);
          const admin = (hasValidShape ? (payload as { admin: AdminUser; accessToken?: string; token?: string }).admin : undefined);
          const token = (hasValidShape ? ((payload as { admin: AdminUser; accessToken?: string; token?: string }).accessToken || (payload as { admin: AdminUser; accessToken?: string; token?: string }).token) : undefined);
          if (!admin || !token) {
            console.error('[AdminLogin] Invalid response:', response);
            dispatch({ type: 'LOGIN_FAILURE', payload: 'Réponse invalide du serveur' });
            throw new Error('Réponse invalide du serveur');
          }
          
          // Store token
          localStorage.setItem('adminToken', token);
          adminApi.setAuthToken(token);

          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { admin, token },
          });
        }
      } else {
        const errorMessage = response.error?.message || 'Une erreur inattendue est survenue';
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: errorMessage,
        });
        throw new Error(errorMessage);
      }
    } catch (error: unknown) {
      const errorMessage =
        (typeof error === 'object' && error !== null && 'response' in error &&
          typeof (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message === 'string'
          ? (error as { response?: { data?: { error?: { message?: string } } } }).response!.data!.error!.message
          : undefined) ||
        (error instanceof Error ? error.message : undefined) ||
        'Erreur de connexion';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (state.token) {
        await adminApi.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      localStorage.removeItem('adminToken');
      adminApi.setAuthToken(null);
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Check if admin has specific permission
  const hasPermission = (resource: string, action: string): boolean => {
    if (!state.admin) return false;
    
    // Super admin has all permissions
    if (state.admin.role === 'super_admin') return true;
    
    const resourcePermissions = state.admin.permissions[resource];
    return resourcePermissions?.includes(action) || false;
  };

  // Check if admin has specific role
  const hasRole = (roles: string[]): boolean => {
    if (!state.admin) return false;
    return roles.includes(state.admin.role);
  };

  // Refresh admin profile
  const refreshProfile = async () => {
    try {
      if (!state.token) return;

      const response = await adminApi.getProfile();
      if (response.success && response.data) {
        dispatch({
          type: 'UPDATE_ADMIN',
          payload: response.data,
        });
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  };

  const contextValue: AdminAuthContextType = {
    ...state,
    login,
    logout,
    clearError,
    hasPermission,
    hasRole,
    refreshProfile,
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// Hook to use admin auth context
export function useAdminAuth() {
  const context = React.useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}