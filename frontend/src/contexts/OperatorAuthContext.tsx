/**
 * 🇨🇭 SimpliFaq - Operator Authentication Context
 * Clean authentication system for operator panel
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { adminApi } from '../services/adminApi';

interface Admin {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, string[]>;
}

interface OperatorAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  operator: Admin | null;
  token: string | null;
  error: string | null;
}

interface OperatorAuthContextType extends OperatorAuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const initialState: OperatorAuthState = {
  isAuthenticated: false,
  isLoading: true,
  operator: null,
  token: null,
  error: null,
};

type OperatorAuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { operator: Admin; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

function operatorAuthReducer(state: OperatorAuthState, action: OperatorAuthAction): OperatorAuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        operator: action.payload.operator,
        token: action.payload.token,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

const OperatorAuthContext = createContext<OperatorAuthContextType | undefined>(undefined);

export function OperatorAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(operatorAuthReducer, initialState);

  // Initialize auth on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const token = localStorage.getItem('operatorToken');
      
      if (token) {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          adminApi.setAuthToken(token);
          
          const response = await adminApi.getProfile();
          
          if (isMounted && response.success && response.data) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                operator: response.data,
                token,
              },
            });
          } else {
            localStorage.removeItem('operatorToken');
            adminApi.setAuthToken(null);
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('[OperatorAuth] Initialization error:', error);
          if (isMounted) {
            localStorage.removeItem('operatorToken');
            adminApi.setAuthToken(null);
            dispatch({ type: 'LOGOUT' });
          }
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await adminApi.login({ email, password });
      
      if (response.success && response.data) {
        const { admin, token } = response.data as { admin: Admin; token: string };
        
        localStorage.setItem('operatorToken', token);
        adminApi.setAuthToken(token);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { operator: admin, token },
        });
        
        return { success: true };
      } else {
        const errorMessage = response.error?.message || 'Login failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during login';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await adminApi.logout();
    } catch (error) {
      console.error('[OperatorAuth] Logout error:', error);
    } finally {
      localStorage.removeItem('operatorToken');
      adminApi.setAuthToken(null);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: OperatorAuthContextType = {
    ...state,
    login,
    logout,
    clearError,
  };

  return (
    <OperatorAuthContext.Provider value={value}>
      {children}
    </OperatorAuthContext.Provider>
  );
}

export function useOperatorAuth(): OperatorAuthContextType {
  const context = useContext(OperatorAuthContext);
  if (context === undefined) {
    throw new Error('useOperatorAuth must be used within OperatorAuthProvider');
  }
  return context;
}
