import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useUserDisplay } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { Bell, ChevronDown, User, Building2, CreditCard, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { user, logout } = useAuth();
  const { getDisplayName, getInitials } = useUserDisplay();
  const location = useLocation();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu utilisateur quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer le menu quand on change de page
  useEffect(() => {
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/welcome');
  };

  const getPageTitle = (): string => {
    const path = location.pathname;

    if (path === '/dashboard') return 'Tableau de bord';
    if (path.startsWith('/invoices')) return 'Factures';
    if (path.startsWith('/clients')) return 'Clients';
    if (path.startsWith('/products')) return 'Produits';
    if (path.startsWith('/reports')) return 'Rapports';
    if (path.startsWith('/expenses')) return 'Charges';
    if (path.startsWith('/settings')) return 'Paramètres';

    return 'SimpliFaq';
  };

  return (
    <header className={cn('header-theme px-6 py-4', className)}>
      <div className="flex items-center justify-between">
        {/* Titre de la page */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{getPageTitle()}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {getBreadcrumbText()}
          </p>
        </div>

        {/* Right side: show only greeting on Dashboard; keep full menu elsewhere */}
        {location.pathname === '/dashboard' ? (
          <div className="ml-auto text-right">
            <span className="text-sm md:text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Bonjour, {getDisplayName()}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            {/* Theme toggle using ThemeContext */}
            <HeaderThemeToggle />

            {/* Notifications */}
            <button
              className="p-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* Menu utilisateur */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg focus:outline-none focus:ring-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ backgroundColor: 'var(--color-primary-600)', color: 'var(--color-text-inverse)' }}>
                  {getInitials()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{getDisplayName()}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
                </div>
                <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isUserMenuOpen && 'rotate-180')} style={{ color: 'var(--color-text-tertiary)' }} />
              </button>

              {/* Menu déroulant */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg py-1 z-50"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
                    border: '1px solid var(--color-border-primary)'
                  }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{getDisplayName()}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
                    {user?.companyName && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{user.companyName}</p>
                    )}
                  </div>

                  <div className="py-1">
                    <Link to="/settings/profile" className="flex items-center px-4 py-2 text-sm rounded-md" style={{ color: 'var(--color-text-primary)' }}>
                      <User className="w-4 h-4 mr-3" />
                      Mon profil
                    </Link>
                    <Link to="/settings/company" className="flex items-center px-4 py-2 text-sm rounded-md" style={{ color: 'var(--color-text-primary)' }}>
                      <Building2 className="w-4 h-4 mr-3" />
                      Mon entreprise
                    </Link>
                    <Link to="/settings/billing" className="flex items-center px-4 py-2 text-sm rounded-md" style={{ color: 'var(--color-text-primary)' }}>
                      <CreditCard className="w-4 h-4 mr-3" />
                      Facturation
                    </Link>
                    <Link to="/settings/subscription" className="flex items-center px-4 py-2 text-sm rounded-md" style={{ color: 'var(--color-text-primary)' }}>
                      <CreditCard className="w-4 h-4 mr-3" />
                      Mon abonnement
                    </Link>
                    <Link to="/settings/features" className="flex items-center px-4 py-2 text-sm rounded-md" style={{ color: 'var(--color-text-primary)' }}>
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Feature Flags
                    </Link>
                  </div>

                  <div className="py-1" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm rounded-md"
                      style={{ color: 'var(--color-error-600)' }}
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );

  function getBreadcrumbText(): string {
    const path = location.pathname;

    if (path === '/dashboard') return 'Vue d\'ensemble de votre activité';
    if (path === '/invoices') return 'Gérez vos factures et suivez vos paiements';
    if (path === '/invoices/new') return 'Créer une nouvelle facture';
    if (path.match(/\/invoices\/[^/]+$/)) return 'Détails de la facture';
    if (path.match(/\/invoices\/[^/]+\/edit$/)) return 'Modifier la facture';
    if (path === '/clients') return 'Gérez vos clients et leurs informations';
    if (path === '/clients/new') return 'Ajouter un nouveau client';
    if (path.match(/\/clients\/[^/]+$/)) return 'Détails du client';
    if (path.match(/\/clients\/[^/]+\/edit$/)) return 'Modifier le client';
    if (path === '/products') return 'Gérez votre catalogue de produits et services';
    if (path === '/products/new') return 'Ajouter un nouveau produit';
    if (path.match(/\/products\/[^/]+\/edit$/)) return 'Modifier le produit';
    if (path === '/reports') return 'Analysez vos performances et générez vos rapports';
    if (path === '/expenses') return 'Gérez vos dépenses et visualisez l\'utilité';
    if (path === '/reports/financial') return 'Rapport financier détaillé';
    if (path === '/reports/tva') return 'Rapport TVA pour déclarations';
    if (path === '/reports/income') return 'Rapport de revenus';
    if (path === '/settings') return 'Configurez votre compte et vos préférences';
    if (path === '/settings/profile') return 'Informations personnelles';
    if (path === '/settings/company') return 'Informations de l\'entreprise';
    if (path === '/settings/billing') return 'Paramètres de facturation';

    return '';
  }
}

// Header theme toggle using ThemeContext and lucide icons
function HeaderThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg text-sm font-medium
        transition-all duration-300 ease-out transform hover:scale-105 active:scale-95
        ${isDark
          ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30'
          : 'bg-amber-400/20 text-amber-700 hover:bg-amber-400/30 border border-amber-500/30'
        }
        backdrop-blur-sm shadow-sm hover:shadow-md
      `}
      aria-label={`Basculer vers le thème ${isDark ? 'clair' : 'sombre'}`}
      title={`Mode ${isDark ? 'clair' : 'sombre'}`}
    >
      <span className="transition-transform duration-300 block hover:rotate-180">
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </span>
    </button>
  );
}