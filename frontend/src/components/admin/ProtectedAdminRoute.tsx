import { useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedAdminRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string }>;
  fallbackPath?: string;
}

export function ProtectedAdminRoute({
  children,
  roles,
  permissions,
  fallbackPath = '/admin/login',
}: ProtectedAdminRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, admin, hasRole, hasPermission } = useAdminAuth();

  console.log('--- [ProtectedAdminRoute] Rendering ---');
  console.log(`[ProtectedAdminRoute] State: isLoading=${isLoading}, isAuthenticated=${isAuthenticated}, admin=${!!admin}`);
  console.log(`[ProtectedAdminRoute] Location: ${location.pathname}`);

  useEffect(() => {
    console.log('--- [ProtectedAdminRoute] useEffect triggered ---');
    console.log(`[ProtectedAdminRoute] useEffect State: isLoading=${isLoading}, isAuthenticated=${isAuthenticated}`);

    if (isLoading) {
      console.log('[ProtectedAdminRoute] useEffect: Still loading, doing nothing.');
      return;
    }

    if (!isAuthenticated) {
      console.log('[ProtectedAdminRoute] useEffect: Not authenticated, redirecting to login.');
      navigate(fallbackPath, { state: { from: location }, replace: true });
    } else {
      console.log('[ProtectedAdminRoute] useEffect: Authenticated, no redirect needed.');
    }
  }, [isLoading, isAuthenticated, admin, navigate, fallbackPath, location]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('[ProtectedAdminRoute] Rendering: LoadingSpinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // If authenticated, proceed with role/permission checks
  if (!isAuthenticated || !admin) {
    console.log('[ProtectedAdminRoute] Rendering: null (waiting for useEffect redirect)');
    return null;
  }

  // Check role requirements
  if (roles && !hasRole(roles)) {
    console.log(`[ProtectedAdminRoute] Rendering: Access Denied (Role). Required: ${roles}`);
    return <Navigate to="/admin/unauthorized" state={{ from: location }} replace />;
  }

  // Check permission requirements
  if (permissions && !permissions.every(p => hasPermission(p.resource, p.action))) {
    console.log(`[ProtectedAdminRoute] Rendering: Access Denied (Permission). Required: ${JSON.stringify(permissions)}`);
    return <Navigate to="/admin/unauthorized" state={{ from: location }} replace />;
  }

  console.log('[ProtectedAdminRoute] Rendering: Access GRANTED, rendering children.');
  console.log('[ProtectedAdminRoute] Children type:', typeof children, children);
  return children as ReactElement;
}