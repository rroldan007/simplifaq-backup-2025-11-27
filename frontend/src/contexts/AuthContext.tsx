import { useReducer, useEffect } from 'react';
import type { 
  User,
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthAction,
  AuthContextType,
  AuthProviderProps
} from './authTypes';
import { AuthContext } from './authContext';
import { secureStorage, apiRateLimiter, securityLogger, sanitizeEmail, sanitizeTextInput, validateInput } from '../utils/security';
import { tokenManager } from '../services/tokenManager';
import { crossTabCoordinator } from '../services/crossTabCoordinator';
import { AUTH_API_BASE } from './authConfig';

// AUTH_API_BASE is now provided by './authConfig' to keep this file component-only

// Actions pour le reducer d'authentification – importées depuis authTypes

// État initial
const initialState: AuthState = {
  user: null,
  token: null,
  // Important: start in loading state to avoid route guards
  // rendering before we hydrate token/user from storage.
  // This prevents flashes to public routes like /login which
  // could trigger unintended state transitions.
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// Reducer pour gérer l'état d'authentification
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

// Interfaces LoginCredentials et RegisterData importées depuis authTypes

// AuthContext importé depuis './authContext' pour respecter react-refresh

// Clés pour le stockage local
const TOKEN_KEY = 'simplifaq_token';
const USER_KEY = 'simplifaq_user';
// Durée de persistance des identifiants (30 jours)
const AUTH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Provider du contexte d'authentification – props importées depuis authTypes

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Fonctions utilitaires pour la gestion de l'authentification
  // Normalize user payload to guarantee presence of nested address
  type RawUser = Partial<User> & { street?: string; postalCode?: string; city?: string; canton?: string; country?: string };
  const normalizeUser = (u: RawUser | null): User => {
    if (!u) return u as unknown as User;
    const address = {
      street: u.address?.street ?? u.street ?? '',
      postalCode: u.address?.postalCode ?? u.postalCode ?? '',
      city: u.address?.city ?? u.city ?? '',
      canton: u.address?.canton ?? u.canton ?? '',
      country: u.address?.country ?? u.country ?? '',
    };
    return { ...u, address } as User;
  };

  const setAuthSuccess = (user: User, tok: string, refreshToken?: string) => {
    const normalizedUser = normalizeUser(user);
    // Store tokens using TokenManager for automatic refresh capabilities
    const expiresAt = Date.now() + (60 * 60 * 1000); // Default 1 hour expiration
    tokenManager.storeTokenInfo({
      token: tok,
      expiresAt,
      refreshToken,
      issuedAt: Date.now(),
    });

    // Keep backward compatibility with existing storage
    secureStorage.setItem(TOKEN_KEY, tok);
    secureStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    dispatch({ type: 'AUTH_SUCCESS', payload: { user: normalizedUser, token: tok } });

    // Log successful authentication
    securityLogger.logSecurityEvent('AUTH_SUCCESS_WITH_TOKEN_MANAGER', {
      userId: user.id,
      email: user.email,
      hasRefreshToken: !!refreshToken,
    });
  };

  // Protection contre loops infinits
  let isHandlingCorrupted = false;
  
  const handleCorrupted = (reason: string) => {
    // Prevent infinite loop
    if (isHandlingCorrupted) {
      console.warn('[AuthContext] handleCorrupted already in progress, skipping...');
      return;
    }
    
    try {
      isHandlingCorrupted = true;
      
      // Clear tokens from both systems
      tokenManager.clearTokenInfo();
      secureStorage.removeItem(TOKEN_KEY);
      secureStorage.removeItem(USER_KEY);
      dispatch({ type: 'AUTH_LOGOUT' });
      securityLogger.logSecurityEvent('AUTH_TOKEN_CORRUPTED', { error: reason });
    } finally {
      // Reset flag after a delay to allow single cleanup
      setTimeout(() => {
        isHandlingCorrupted = false;
      }, 1000);
    }
  };

  // Charger les données d'authentification depuis le stockage sécurisé au démarrage
  useEffect(() => {
    const token = secureStorage.getItem(TOKEN_KEY, AUTH_MAX_AGE_MS);
    const userStr = secureStorage.getItem(USER_KEY, AUTH_MAX_AGE_MS);

    (async () => {
      try {
        if (token && userStr) {
          // Cas normal: token + user présents
          const user = JSON.parse(userStr);
          setAuthSuccess(normalizeUser(user), token);
          return;
        }
        if (token && !userStr) {
          // Token présent mais utilisateur manquant: tenter de récupérer le profil
          try {
            const meUrl = `${AUTH_API_BASE}/me`;
            console.debug('[AuthContext] GET', meUrl);
            // Ajout d'un timeout pour éviter un blocage indéfini si la requête ne répond pas
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 10000); // 10s timeout
            let res: Response;
            try {
              res = await fetch(meUrl, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              });
            } finally {
              window.clearTimeout(timeoutId);
            }
            const data = await res.json();
            if (!res.ok || !data?.success || !data?.data) {
              throw new Error(data?.error?.message || 'Impossible de récupérer le profil');
            }
            const user: User = (data.data.user || data.data) as User; // supporter {user,token} ou user direct
            const normalized = normalizeUser(user);
            secureStorage.setItem(USER_KEY, JSON.stringify(normalized));
            setAuthSuccess(normalized, token);
            return;
          } catch (e: unknown) {
            const isAbort = typeof e === 'object' && e !== null && 'name' in e && (e as { name?: unknown }).name === 'AbortError';
            const message = typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
              ? (e as { message: string }).message
              : 'Récupération du profil échouée';
            const reason = isAbort ? 'Timeout récupération du profil' : message;
            console.error('[AuthContext] /auth/me failed:', reason);
            handleCorrupted(reason);
            return;
          }
        }
        // Pas de token: rester déconnecté
        dispatch({ type: 'AUTH_LOGOUT' });
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Erreur inconnue';
        handleCorrupted(msg);
      }
    })();

    // Synchroniser l'état entre onglets (logout/login)
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === TOKEN_KEY || ev.key === USER_KEY) {
        const newToken = secureStorage.getItem(TOKEN_KEY, AUTH_MAX_AGE_MS);
        const newUserStr = secureStorage.getItem(USER_KEY, AUTH_MAX_AGE_MS);
        if (newToken && newUserStr) {
          try {
            const usr = JSON.parse(newUserStr);
            const normalized = normalizeUser(usr);
            dispatch({ type: 'AUTH_SUCCESS', payload: { user: normalized, token: newToken } });
          } catch {
            handleCorrupted('Données utilisateur invalides (storage event)');
          }
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // TODO: REVISAR DEPENDENCIAS - Falta: handleCorrupted, setAuthSuccess
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up TokenManager event listeners for automatic token refresh and session management
  useEffect(() => {
    // Handle successful token refresh
    const handleTokenRefresh = (newToken: string) => {
      if (state.user) {
        // Update the token in AuthContext state
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: state.user, token: newToken } });
        
        // Update secure storage for backward compatibility
        secureStorage.setItem(TOKEN_KEY, newToken);
        
        securityLogger.logSecurityEvent('AUTH_TOKEN_REFRESHED', {
          userId: state.user.id,
          email: state.user.email,
        });
      }
    };

    // Set up automatic session extension for active users
    let activityTimer: number | null = null;
    let lastActivityTime = Date.now();

    const extendSessionOnActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;
      
      // Only extend session if user is authenticated and it's been more than 5 minutes since last extension
      if (state.isAuthenticated && timeSinceLastActivity > 5 * 60 * 1000) {
        lastActivityTime = now;
        
        // Check if token is expiring soon and refresh if needed
        if (tokenManager.isTokenExpiringSoon()) {
          tokenManager.refreshToken().catch(error => {
            securityLogger.logSecurityEvent('AUTH_AUTO_REFRESH_FAILED', {
              userId: state.user?.id,
              error: error.message,
            });
          });
        }
        
        securityLogger.logSecurityEvent('AUTH_SESSION_EXTENDED', {
          userId: state.user?.id,
          email: state.user?.email,
          activityType: 'user_interaction',
        });
      }
    };

    // Activity events that should extend the session
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    if (state.isAuthenticated) {
      // Set up activity listeners
      activityEvents.forEach(event => {
        document.addEventListener(event, extendSessionOnActivity, { passive: true });
      });

      // Set up periodic session extension check (every 10 minutes)
      activityTimer = window.setInterval(() => {
        if (state.isAuthenticated && tokenManager.isTokenExpiringSoon(10 * 60 * 1000)) {
          tokenManager.refreshToken().catch(error => {
            securityLogger.logSecurityEvent('AUTH_PERIODIC_REFRESH_FAILED', {
              userId: state.user?.id,
              error: error.message,
            });
          });
        }
      }, 10 * 60 * 1000); // Check every 10 minutes
    }

    // Cleanup function for activity listeners
    const cleanupActivityListeners = () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, extendSessionOnActivity);
      });
      if (activityTimer) {
        clearInterval(activityTimer);
        activityTimer = null;
      }
    };

    // Handle token expiration
    const handleTokenExpired = () => {
      if (state.isAuthenticated) {
        securityLogger.logSecurityEvent('AUTH_TOKEN_EXPIRED', {
          userId: state.user?.id,
          email: state.user?.email,
        });
        
        // Clear authentication state
        handleCorrupted('Token expired');
      }
    };

    // Handle session warning (5 minutes before expiration)
    const handleSessionWarning = (timeRemaining: number) => {
      if (state.isAuthenticated) {
        securityLogger.logSecurityEvent('AUTH_SESSION_WARNING', {
          userId: state.user?.id,
          email: state.user?.email,
          timeRemaining,
        });
        
        // You can emit a custom event here for UI components to show session warning
        window.dispatchEvent(new CustomEvent('sessionWarning', { 
          detail: { timeRemaining, user: state.user } 
        }));
      }
    };

    // Handle token refresh failures
    const handleRefreshFailed = (error: Error) => {
      if (state.isAuthenticated) {
        securityLogger.logSecurityEvent('AUTH_REFRESH_FAILED', {
          userId: state.user?.id,
          email: state.user?.email,
          error: error.message,
        });
        
        // Force logout on refresh failure
        handleCorrupted(`Token refresh failed: ${error.message}`);
      }
    };

    // Register event listeners
    tokenManager.onTokenRefreshed(handleTokenRefresh);
    tokenManager.onTokenExpired(handleTokenExpired);
    tokenManager.onSessionWarning(handleSessionWarning);
    tokenManager.onRefreshFailed(handleRefreshFailed);

    // Cleanup function to remove listeners
    return () => {
      // Clean up TokenManager listeners
      tokenManager.removeListener('token_refreshed', handleTokenRefresh as unknown as (...args: unknown[]) => void);
      tokenManager.removeListener('token_expired', handleTokenExpired as unknown as (...args: unknown[]) => void);
      tokenManager.removeListener('session_warning', handleSessionWarning as unknown as (...args: unknown[]) => void);
      tokenManager.removeListener('refresh_failed', handleRefreshFailed as unknown as (...args: unknown[]) => void);
      
      // Clean up activity listeners and timers
      cleanupActivityListeners();
    };
    // TODO: REVISAR DEPENDENCIAS - Falta: handleCorrupted (y posiblemente otras funciones)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isAuthenticated, state.user]);

  // Fonction de connexion avec sécurité renforcée
  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Validation et sanitisation des entrées
      const emailError = validateInput.email(credentials.email);
      if (emailError) {
        throw new Error(emailError);
      }

      const passwordError = validateInput.minLength(credentials.password, 8, 'Mot de passe');
      if (passwordError) {
        throw new Error(passwordError);
      }

      // Vérification du rate limiting
      const clientId = `login_${sanitizeEmail(credentials.email)}`;
      if (!apiRateLimiter.isAllowed(clientId)) {
        securityLogger.logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
          email: sanitizeEmail(credentials.email),
          action: 'login'
        });
        throw new Error('Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.');
      }

      // Sanitiser les données avant envoi
      const sanitizedCredentials = {
        email: sanitizeEmail(credentials.email),
        password: credentials.password // Ne pas sanitiser le mot de passe
      };

      const loginUrl = `${AUTH_API_BASE}/login`;
      console.debug('[AuthContext] POST', loginUrl);
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedCredentials),
      });

      const data = await response.json();

      if (!response.ok) {
        securityLogger.logSecurityEvent('AUTH_LOGIN_FAILED', {
          email: sanitizedCredentials.email,
          status: response.status,
          error: data.error?.message
        });
        throw new Error(data.error?.message || 'Erreur de connexion');
      }

      if (!data.success || !data.data) {
        securityLogger.logSecurityEvent('AUTH_INVALID_RESPONSE', {
          email: sanitizedCredentials.email
        });
        throw new Error('Réponse invalide du serveur');
      }

      const { user, token, refreshToken, expiresAt: expiresAtString } = data.data;

      // Calculate token expiration time from ISO string
      const expiresAt = expiresAtString ? new Date(expiresAtString).getTime() : Date.now() + (60 * 60 * 1000);

      // Use enhanced setAuthSuccess function that integrates with TokenManager
      setAuthSuccess(user, token, refreshToken);

      // Logger l'événement de connexion réussie
      securityLogger.logSecurityEvent('AUTH_LOGIN_SUCCESS', {
        userId: user.id,
        email: user.email,
        hasRefreshToken: !!refreshToken,
        expiresAt,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Fonction d'inscription avec sécurité renforcée
  const register = async (data: RegisterData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Validation et sanitisation des entrées
      const emailError = validateInput.email(data.email);
      if (emailError) {
        throw new Error(emailError);
      }

      const passwordError = validateInput.minLength(data.password, 8, 'Mot de passe');
      if (passwordError) {
        throw new Error(passwordError);
      }

      if (data.password !== data.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (data.vatNumber) {
        const vatError = validateInput.swissVAT(data.vatNumber);
        if (vatError) {
          throw new Error(vatError);
        }
      }

      // Vérification du rate limiting
      const clientId = `register_${sanitizeEmail(data.email)}`;
      if (!apiRateLimiter.isAllowed(clientId)) {
        securityLogger.logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
          email: sanitizeEmail(data.email),
          action: 'register'
        });
        throw new Error('Trop de tentatives d\'inscription. Veuillez réessayer dans quelques minutes.');
      }

      // Sanitiser les données avant envoi
      const sanitizedData = {
        ...data,
        email: sanitizeEmail(data.email),
        companyName: sanitizeTextInput(data.companyName),
        firstName: sanitizeTextInput(data.firstName),
        lastName: sanitizeTextInput(data.lastName),
        street: sanitizeTextInput(data.street),
        city: sanitizeTextInput(data.city),
        canton: sanitizeTextInput(data.canton),
        country: sanitizeTextInput(data.country),
        phone: data.phone ? sanitizeTextInput(data.phone) : undefined,
        website: data.website ? sanitizeTextInput(data.website) : undefined,
        vatNumber: data.vatNumber ? sanitizeTextInput(data.vatNumber) : undefined
      };

      const registerUrl = `${AUTH_API_BASE}/register`;
      console.debug('[AuthContext] POST', registerUrl);
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        securityLogger.logSecurityEvent('AUTH_REGISTER_FAILED', {
          email: sanitizedData.email,
          status: response.status,
          error: responseData.error?.message
        });
        throw new Error(responseData.error?.message || 'Erreur d\'inscription');
      }

      if (!responseData.success || !responseData.data) {
        securityLogger.logSecurityEvent('AUTH_INVALID_RESPONSE', {
          email: sanitizedData.email,
          action: 'register'
        });
        throw new Error('Réponse invalide du serveur');
      }

      const { user, requiresEmailConfirmation } = responseData.data;

      // Si la confirmation par email est requise, ne pas authentifier l'utilisateur
      if (requiresEmailConfirmation) {
        // Logger l'événement d'inscription réussie mais en attente de confirmation
        securityLogger.logSecurityEvent('AUTH_REGISTER_SUCCESS_PENDING_CONFIRMATION', {
          userId: user.id,
          email: user.email,
          companyName: user.companyName
        });

        dispatch({ type: 'AUTH_LOGOUT' }); // S'assurer que l'utilisateur n'est pas connecté
        
        // Rediriger vers la page de succès d'inscription
        window.location.href = '/auth/registration-success';
        return; // Ne pas continuer avec l'authentification
      }

      // Si pas de confirmation requise (cas par défaut), continuer avec l'authentification
      const { token } = responseData.data;

      // Stocker les données d'authentification de manière sécurisée
      secureStorage.setItem(TOKEN_KEY, token);
      secureStorage.setItem(USER_KEY, JSON.stringify(user));

      // Logger l'événement d'inscription réussie
      securityLogger.logSecurityEvent('AUTH_REGISTER_SUCCESS', {
        userId: user.id,
        email: user.email,
        companyName: user.companyName
      });

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Protection contre loops infinits dans logout
  let isLoggingOut = false;
  
  // Fonction de déconnexion avec sécurité renforcée et coordination cross-tab
  const logout = async (): Promise<void> => {
    // Prevent infinite loop
    if (isLoggingOut) {
      console.warn('[AuthContext] logout already in progress, skipping...');
      return;
    }
    
    try {
      isLoggingOut = true;
      
      // Logger l'événement de déconnexion
      if (state.user) {
        securityLogger.logSecurityEvent('AUTH_LOGOUT', {
          userId: state.user.id,
          email: state.user.email
        });
      }

      try {
        // Use TokenManager to handle logout and coordinate across tabs
        await tokenManager.logout();
        
        // Initiate coordinated logout across all tabs
        await crossTabCoordinator.initiateLogout();
        
      } catch (error: unknown) {
        securityLogger.logSecurityEvent('AUTH_LOGOUT_ERROR', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: state.user?.id,
        });
      }

      // Nettoyer le stockage sécurisé (backup cleanup)
      secureStorage.removeItem(TOKEN_KEY);
      secureStorage.removeItem(USER_KEY);
      
      // Réinitialiser le rate limiter pour cet utilisateur
      if (state.user?.email) {
        apiRateLimiter.reset(`login_${sanitizeEmail(state.user.email)}`);
        apiRateLimiter.reset(`register_${sanitizeEmail(state.user.email)}`);
      }
      
      dispatch({ type: 'AUTH_LOGOUT' });
    } finally {
      // Reset flag after delay
      setTimeout(() => {
        isLoggingOut = false;
      }, 1000);
    }
  };

  // Función para actualizar el logo de la empresa
  const updateLogo = async (logoUrl: string): Promise<void> => {
    if (!state.user) return;
    
    try {
      const updatedUser = { ...state.user, logoUrl };
      
      // Actualizar en el almacenamiento local
      secureStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      
      // Actualizar en el estado
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      
      // Aquí iría la llamada al API para guardar el logo en el backend
    } catch (error) {
      console.error('Error al actualizar el logo:', error);
      throw error;
    }
  };

  // Fonction pour effacer les erreurs
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Fonction pour mettre à jour l'utilisateur avec sécurité
  const updateUser = (user: User): void => {
    // Logger l'événement de mise à jour
    securityLogger.logSecurityEvent('AUTH_USER_UPDATED', {
      userId: user.id,
      email: user.email
    });

    // Utiliser le stockage sécurisé
    const normalized = normalizeUser(user as RawUser);
    secureStorage.setItem(USER_KEY, JSON.stringify(normalized));
    dispatch({ type: 'UPDATE_USER', payload: normalized });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    register,
    logout,
    clearError,
    updateLogo,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Note: Hooks and utility exports have been moved out of this file to satisfy react-refresh rules.