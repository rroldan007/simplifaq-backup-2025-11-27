import { useState } from 'react';
import type { FC } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { themeConfig } from '../../contexts/themeConfig';
import type { Theme } from '../../contexts/themeTypes';
import { cn } from '../../utils/cn';
import { Sun, Moon, Check, ChevronDown } from 'lucide-react';

interface ThemeSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'grid' | 'inline';
  showLabels?: boolean;
}

export const ThemeSelector: FC<ThemeSelectorProps> = ({
  className,
  variant = 'dropdown',
  showLabels = true,
}) => {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {Object.entries(availableThemes).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleThemeChange(key as Theme)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105',
              theme === key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-primary surface hover:bg-[var(--color-bg-secondary)]'
            )}
          >
            <span className="text-2xl">
              {key === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </span>
            {showLabels && (
              <div className="text-left">
                <div className="font-medium text-primary">{config.name}</div>
                <div className="text-xs text-secondary">{config.description}</div>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {Object.entries(availableThemes).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleThemeChange(key as Theme)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105',
              theme === key
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-secondary hover:bg-[var(--color-bg-secondary)] hover:text-primary border border-transparent'
            )}
          >
            <span>
              {key === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </span>
            {showLabels && <span>{config.name}</span>}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 surface border border-primary rounded-lg text-sm font-medium text-secondary hover:bg-[var(--color-bg-secondary)] transition-all duration-200 hover:scale-105"
      >
        <span className="text-lg">
          {theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </span>
        {showLabels && <span>{availableThemes[theme].name}</span>}
        <ChevronDown
          className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 surface-elevated border border-primary rounded-lg shadow-lg z-20 animate-in fade-in duration-200">
            <div className="p-2">
              <div className="text-xs font-medium text-secondary uppercase tracking-wide px-3 py-2">
                Choisir un thème
              </div>
              {Object.entries(availableThemes).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key as Theme)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all duration-200 hover:translate-x-1',
                    theme === key
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-secondary hover:bg-[var(--color-bg-secondary)]'
                  )}
                >
                  <span className="text-lg">
                    {key === 'dark' ? (
                      <Moon className="w-4 h-4" />
                    ) : (
                      <Sun className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <div className="font-medium text-primary">{config.name}</div>
                    <div className="text-xs text-secondary">{config.description}</div>
                  </div>
                  {theme === key && (
                    <div className="ml-auto">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Componente simple para toggle rápido claro/oscuro
export const ThemeToggle: FC<{ className?: string }> = ({ className }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center w-10 h-10 rounded-lg surface-elevated hover:bg-[var(--color-bg-secondary)] transition-all duration-200 hover:scale-105',
        className
      )}
      title={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

// Preview de temas para configuración
export const ThemePreview: FC<{ 
  themeName: Theme;
  className?: string;
}> = ({ themeName, className }) => {
  const { setTheme, theme: currentTheme } = useTheme();
  const config = themeConfig[themeName];

  return (
    <div
      className={cn(
        'relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105',
        currentTheme === themeName
          ? 'border-blue-500 bg-blue-50'
          : 'border-primary hover:bg-[var(--color-bg-secondary)]',
        className
      )}
      onClick={() => setTheme(themeName)}
    >
      {/* Preview colors */}
      <div className="flex gap-2 mb-3">
        <div className="w-4 h-4 rounded-full bg-blue-500" />
        <div className="w-4 h-4 rounded-full bg-gray-300" />
        <div className="w-4 h-4 rounded-full bg-green-500" />
        <div className="w-4 h-4 rounded-full bg-red-500" />
      </div>
      
      {/* Theme info */}
      <div className="flex items-center gap-2">
        <span className="text-xl">
          {themeName === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </span>
        <div>
          <div className="font-medium text-sm text-primary">{config.name}</div>
          <div className="text-xs text-secondary">{config.description}</div>
        </div>
      </div>
      
      {/* Selected indicator */}
      {currentTheme === themeName && (
        <div className="absolute top-2 right-2">
          <Check className="w-5 h-5 text-blue-600" />
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;