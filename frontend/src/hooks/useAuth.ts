import { useContext } from 'react';
import { AuthContext } from '../contexts/authContext';
import type { 
  AuthState, 
  LoginCredentials, 
  RegisterData, 
  User 
} from '../contexts/authTypes';

// Interface pour le hook useAuth
interface UseAuthReturn {
  // État d'authentification
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions d'authentification
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateLogo: (logoUrl: string) => Promise<void>;
  updateUser: (user: User) => void;
  
  // Fonctions utilitaires
  hasRole: (role: string) => boolean;
  isEmailVerified: () => boolean;
  getDisplayName: () => string;
  getInitials: () => string;
}

/**
 * Hook personnalisé pour l'authentification
 * Fournit un accès simplifié au contexte d'authentification
 */
export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }

  const { state, login, register, logout, clearError, updateUser, updateLogo } = context;

  // Fonction pour vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (role: string): boolean => {
    // Marquer "role" comme utilisé pour satisfaire ESLint, même si non utilisé actuellement
    void role;
    // Pour l'instant, tous les utilisateurs ont le même rôle
    // Cette fonction peut être étendue plus tard
    return state.isAuthenticated;
  };

  // Fonction pour vérifier si l'email est vérifié
  const isEmailVerified = (): boolean => {
    // Pour l'instant, on considère que tous les emails sont vérifiés
    // Cette fonction peut être étendue plus tard
    return state.isAuthenticated;
  };

  // Fonction pour obtenir le nom d'affichage
  const getDisplayName = (): string => {
    if (!state.user) return '';
    
    const { firstName, lastName, companyName } = state.user;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    if (companyName) {
      return companyName;
    }
    // Fallback to email if present, otherwise a generic label
    if (state.user.email) return state.user.email;
    return 'Utilisateur';
  };

  // Fonction pour obtenir les initiales
  const getInitials = (): string => {
    if (!state.user) return '';
    
    const { firstName, lastName, companyName } = state.user;
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    
    if (companyName) {
      const words = companyName.trim().split(' ').filter(Boolean);
      if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
      }
      return companyName.substring(0, 2).toUpperCase();
    }
    // Try to use email if available
    if (typeof state.user.email === 'string' && state.user.email.length > 0) {
      return state.user.email.substring(0, 2).toUpperCase();
    }
    // Final fallback
    return 'US';
  };

  return {
    // État d'authentification
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    error: state.error,
    
    // Actions d'authentification
    login,
    register,
    logout,
    clearError,
    updateLogo,
    updateUser,
    
    // Fonctions utilitaires
    hasRole,
    isEmailVerified,
    getDisplayName,
    getInitials,
  };
}

// Hook pour obtenir uniquement l'état d'authentification
export function useAuthState(): AuthState {
  const { user, token, isLoading, isAuthenticated, error } = useAuth();
  return { user, token, isLoading, isAuthenticated, error };
}

// Hook pour obtenir uniquement les actions d'authentification
export function useAuthActions() {
  const { login, register, logout, clearError, updateUser } = useAuth();
  return { login, register, logout, clearError, updateUser };
}

// Hook pour obtenir le token d'authentification
export function useAuthToken(): string | null {
  const { token } = useAuth();
  return token;
}

// Hook pour vérifier si l'utilisateur est authentifié
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

// Hook pour obtenir l'utilisateur actuel
export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}

// Hook pour obtenir les informations d'affichage de l'utilisateur
export function useUserDisplay() {
  const { getDisplayName, getInitials } = useAuth();
  return { getDisplayName, getInitials };
}

// Hook pour la gestion des erreurs d'authentification
export function useAuthError() {
  const { error, clearError } = useAuth();
  return { error, clearError };
}

// Hook pour les opérations de connexion/déconnexion
export function useAuthOperations() {
  const { login, register, logout, isLoading } = useAuth();
  return { login, register, logout, isLoading };
}