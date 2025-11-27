import type { AdminUser as ApiAdminUser } from '../services/adminApi';

export type AdminUser = ApiAdminUser;

export interface AdminAuthState {
  admin: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  error: string | null;
}

export type AdminAuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { admin: AdminUser; token: string } }
  | { type: 'LOGIN_REQUIRES_2FA' }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_ADMIN'; payload: Partial<AdminUser> };

export interface AdminAuthContextType extends AdminAuthState {
  login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roles: string[]) => boolean;
  refreshProfile: () => Promise<void>;
}
