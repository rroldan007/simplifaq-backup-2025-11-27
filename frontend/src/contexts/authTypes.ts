import type { ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user';
  vatNumber?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  quantityDecimals?: 2 | 3;
  emailConfirmed: boolean;
  emailConfirmedAt?: string;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    canton?: string;
    country?: string;
  };
  // Address fields (also available at root level for backward compatibility)
  street?: string;
  postalCode?: string;
  city?: string;
  canton?: string;
  country?: string;
  // Invoice numbering
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  invoicePadding?: number;
  invoiceYearInPrefix?: boolean;
  invoiceYearFormat?: 'YYYY' | 'YY' | '';
  invoiceAutoReset?: boolean;
  lastInvoiceYear?: number;
  // Quote numbering
  quotePrefix?: string;
  nextQuoteNumber?: number;
  quotePadding?: number;
  quoteYearInPrefix?: boolean;
  quoteYearFormat?: 'YYYY' | 'YY' | '';
  quoteAutoReset?: boolean;
  lastQuoteYear?: number;
  // PDF Appearance Settings
  pdfShowCompanyNameWithLogo?: boolean;
  pdfPrimaryColor?: string;
  pdfTemplate?: string;
  pdfShowVAT?: boolean;
  pdfShowPhone?: boolean;
  pdfShowEmail?: boolean;
  pdfShowWebsite?: boolean;
  pdfShowIBAN?: boolean;
  pdfAdvancedConfig?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  firstName: string;
  lastName: string;
  vatNumber?: string;
  street: string;
  postalCode: string;
  city: string;
  canton: string;
  country: string;
  phone?: string;
  website?: string;
  subscribeNewsletter?: boolean;
}

export interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateLogo: (logoUrl: string) => Promise<void>;
  updateUser: (user: User) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}
