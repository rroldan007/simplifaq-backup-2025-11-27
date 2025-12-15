import { useEffect, useState } from 'react';
import type { Theme, ThemeContextType, ThemeProviderProps } from './themeTypes';
import { themeConfig } from './themeConfig';
import { ThemeContext } from './themeContext';

// Provider du contexte
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  storageKey = 'simplifaq-theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light');

  // Détecter la préférence système
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Charger le thème depuis le localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as Theme | null;
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
    } catch (error) {
      console.warn('Erreur lors du chargement du thème:', error);
    }
  }, [storageKey]);

  // Appliquer le thème au DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Ajouter une classe temporaire pour désactiver les transitions
    root.classList.add('theme-transitioning');
    
    // Appliquer le thème
    // When logical theme is "dark", apply DaisyUI's custom dark theme name
    root.setAttribute('data-theme', theme === 'dark' ? 'synthwave' : 'light');
    
    // Agregar/quitar clase 'dark' para Tailwind CSS
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Supprimer la classe après un court délai
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 50);

    // Sauvegarder dans localStorage
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du thème:', error);
    }
  }, [theme, storageKey]);

  // Fonction pour changer de thème
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Fonction pour basculer entre clair et sombre
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Calculer si le thème actuel est sombre
  const isDark = theme === 'dark';

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    availableThemes: themeConfig,
    isDark,
    systemPreference,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
export default ThemeProvider;
// Re-exports for convenience so consumers can import from 'contexts/ThemeContext'
// eslint-disable-next-line react-refresh/only-export-components
export { useTheme } from '../hooks/useTheme';
// eslint-disable-next-line react-refresh/only-export-components
export { themeConfig } from './themeConfig';