// Non-React auth configuration and helpers (separate from React components/hooks)

// Build API base URL for auth calls
export function buildAuthApiBase(): string {
  // In Jest test environment, prefer a relative API base so tests don't depend on host
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return '/api/auth';
  }

  // In development, always use the backend URL directly since the browser
  // might be accessed through different ports (Vite dev server, preview proxies, etc.)
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3001/api/auth';
  }

  // Use import.meta.env in browser context (Vite injects this)
  const raw = typeof import.meta !== 'undefined' && import.meta.env 
    ? import.meta.env.VITE_API_URL 
    : undefined;

  if (raw && typeof raw === 'string' && raw.length > 0) {
    const trimmed = raw.replace(/\/$/, '');
    return trimmed.endsWith('/api/auth') ? trimmed : `${trimmed}/api/auth`;
  }
  
  // Fallback: Use relative URL
  return '/api/auth';
}

export const AUTH_API_BASE = buildAuthApiBase();

// Debug flag is intentionally kept minimal here to avoid noisy logs in production
export function debugAuthBase(): void {
  console.debug('[AuthContext] AUTH_API_BASE =', AUTH_API_BASE);
}
