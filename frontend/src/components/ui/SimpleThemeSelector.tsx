import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

const themes: Record<Theme, { name: string; description: string }> = {
  light: { name: 'Clair', description: 'Thème clair' },
  dark: { name: 'Sombre', description: 'Thème sombre' },
};

interface SimpleThemeSelectorProps {
  className?: string;
}

export const SimpleThemeSelector: React.FC<SimpleThemeSelectorProps> = ({ className }) => {
  const { theme, toggleTheme, setTheme } = useTheme();

  // Runtime safeguard: if context has an unexpected value, fallback to 'light'
  const safeTheme: Theme = (theme === 'light' || theme === 'dark') ? theme : 'light';

  const handleClick = () => {
    // Toggle between light/dark
    toggleTheme();
  };

  // Provide a long-press (right-click) to reset to light if something went wrong
  const handleContextMenu: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    setTheme('light');
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ${className || ''}`}
      aria-label={`Basculer le thème (actuel: ${safeTheme})`}
      title={`Thème: ${themes[safeTheme].name} — clic pour basculer, clic droit pour réinitialiser`}
    >
      {safeTheme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
      <span>{themes[safeTheme].name}</span>
    </button>
  );
};

export default SimpleThemeSelector;