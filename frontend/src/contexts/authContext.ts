import { createContext } from 'react';
import type { AuthContextType } from './authTypes';

// Separate file for the context object to satisfy react-refresh rules
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
