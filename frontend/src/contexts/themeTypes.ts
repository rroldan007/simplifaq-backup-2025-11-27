import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  availableThemes: Readonly<Record<'light' | 'dark', { name: string; description: string; icon: string }>>;
  isDark: boolean;
  systemPreference: 'light' | 'dark';
}

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}
