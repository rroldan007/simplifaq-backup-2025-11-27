// Non-React auth configuration and helpers (separate from React components/hooks)

// Build API base URL for auth calls without using `import.meta` (which Jest can't parse)
export function buildAuthApiBase(): string {
  // In Jest test environment, prefer a relative API base so tests don't depend on host
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return '/api/auth';
  }

  const fromProcess = typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>)?.VITE_API_URL : undefined;
  const fromGlobal = typeof globalThis !== 'undefined' ? (globalThis as unknown as { VITE_API_URL?: string }).VITE_API_URL : undefined;
  const raw = fromProcess || fromGlobal;

  if (raw && typeof raw === 'string' && raw.length > 0) {
    const trimmed = raw.replace(/\/$/, '');
    return trimmed.endsWith('/api/auth') ? trimmed : `${trimmed}/api/auth`;
  }
  
  // Use relative path if we're on the same domain (Nginx will proxy)
  return typeof window !== 'undefined'
    ? `https://${window.location.hostname}/api/auth`
    : '/api/auth';
}

export const AUTH_API_BASE = buildAuthApiBase();

// Debug flag is intentionally kept minimal here to avoid noisy logs in production
export function debugAuthBase(): void {
  console.debug('[AuthContext] AUTH_API_BASE =', AUTH_API_BASE);
}
