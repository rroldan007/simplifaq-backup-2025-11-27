import { useContext } from 'react';
import AdminAuthContext from '../contexts/adminAuthContextInstance';

// This file re-exports the hook to access AdminAuthContext to comply with React Fast Refresh rules.
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
  return context;
}
