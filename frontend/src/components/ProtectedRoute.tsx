/* eslint-disable react-refresh/only-export-components */
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

/**
 * Composant pour protéger les routes qui nécessitent une authentification
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/login',
  fallback,
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Debug logging to understand auth state transitions
  console.debug('[ProtectedRoute]', {
    path: location.pathname,
    requireAuth,
    isLoading,
    isAuthenticated,
    redirectTo
  });

  // Si l'authentification est en cours de chargement, afficher le fallback
  if (isLoading) {
    console.debug('[ProtectedRoute] Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        {fallback || <LoadingSpinner />}
      </div>
    );
  }

  // Si l'authentification est requise mais l'utilisateur n'est pas connecté
  if (requireAuth && !isAuthenticated) {
    console.debug('[ProtectedRoute] Redirecting to login - auth required but not authenticated');
    // Sauvegarder la route actuelle pour rediriger après la connexion
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // Si l'utilisateur est connecté mais ne devrait pas accéder à cette route
  // (par exemple, page de connexion quand déjà connecté)
  if (!requireAuth && isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    console.debug('[ProtectedRoute] Redirecting authenticated user away from public route to:', from);
    return <Navigate to={from} replace />;
  }

  console.debug('[ProtectedRoute] Rendering children');
  return <>{children}</>;
}

/**
 * Composant pour les routes qui ne nécessitent pas d'authentification
 * mais redirigent si l'utilisateur est déjà connecté
 */
export function PublicRoute({
  children,
  redirectTo = '/dashboard',
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  return (
    <ProtectedRoute requireAuth={false} redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Hook pour vérifier les permissions d'accès
 */
export function useRouteGuard() {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  const canAccess = (requireAuth: boolean = true): boolean => {
    if (isLoading) return false;
    return requireAuth ? isAuthenticated : true;
  };

  const shouldRedirect = (requireAuth: boolean = true): boolean => {
    if (isLoading) return false;
    return requireAuth ? !isAuthenticated : isAuthenticated;
  };

  const getRedirectPath = (requireAuth: boolean = true): string => {
    if (requireAuth) {
      return '/login';
    }
    return location.state?.from?.pathname || '/dashboard';
  };

  return {
    canAccess,
    shouldRedirect,
    getRedirectPath,
    isLoading,
    isAuthenticated,
  };
}

/**
 * Composant de chargement par défaut
 */
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600 text-sm">Chargement...</p>
    </div>
  );
}

/**
 * HOC pour protéger les composants
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean;
    redirectTo?: string;
    fallback?: React.ReactNode;
  } = {}
) {
  const WrappedComponent = (props: P) => {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Composant pour gérer les redirections après connexion
 */
export function AuthRedirect() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      window.history.replaceState(null, '', from);
    }
  }, [isAuthenticated, location.state]);

  return null;
}

/**
 * Types pour les routes
 */
export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  title?: string;
  description?: string;
}

/**
 * Utilitaire pour créer des routes protégées
 */
export function createProtectedRoute(config: RouteConfig): RouteConfig {
  return {
    ...config,
    element: (
      <ProtectedRoute
        requireAuth={config.requireAuth}
        redirectTo={config.redirectTo}
      >
        {config.element}
      </ProtectedRoute>
    ),
  };
}

/**
 * Utilitaire pour créer des routes publiques
 */
export function createPublicRoute(config: RouteConfig): RouteConfig {
  return {
    ...config,
    element: (
      <PublicRoute redirectTo={config.redirectTo}>
        {config.element}
      </PublicRoute>
    ),
  };
}