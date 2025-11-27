import { useContext, useEffect, useState } from 'react';
import { ThemeContext } from '../contexts/themeContext';
import type { ThemeContextType } from '../contexts/themeTypes';

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook to detect system theme changes
export const useSystemTheme = () => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemTheme;
};

// Hook to get CSS classes based on current theme
export const useThemeClasses = () => {
  const { theme, isDark } = useTheme();

  return {
    // Base classes
    bg: {
      primary: 'bg-white dark:bg-gray-900',
      secondary: 'bg-gray-50 dark:bg-gray-800',
      tertiary: 'bg-gray-100 dark:bg-gray-700',
    },
    text: {
      primary: 'text-gray-900 dark:text-gray-100',
      secondary: 'text-gray-600 dark:text-gray-300',
      tertiary: 'text-gray-500 dark:text-gray-400',
    },
    border: {
      primary: 'border-gray-200 dark:border-gray-700',
      secondary: 'border-gray-300 dark:border-gray-600',
    },
    // Utilities
    theme,
    isDark,
    // Custom CSS classes
    card: 'card-theme',
    button: {
      primary: 'btn-theme-primary',
      secondary: 'btn-theme-secondary',
    },
    input: 'input-theme',
    nav: 'nav-theme',
    header: 'header-theme',
  } as const;
};
