import React from 'react';

/**
 * Componente para rutas completamente públicas que NO deben pasar por AuthProvider
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
