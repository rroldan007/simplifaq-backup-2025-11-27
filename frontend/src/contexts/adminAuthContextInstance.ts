import { createContext } from 'react';
import type { AdminAuthContextType } from './adminAuthTypes';

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
export default AdminAuthContext;
