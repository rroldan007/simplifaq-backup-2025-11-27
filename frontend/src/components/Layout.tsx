import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useUserDisplay } from '../hooks/useAuth';
import { Header } from './Header';
import { SessionWarning } from './SessionWarning';
import { AIAssistant } from './ai/AIAssistant';
import { useFeature } from '../hooks/useFeatureFlags';
import { cn } from '../utils/cn';

type IconComponent = React.ComponentType<{ className?: string }>;

interface NavigationChild {
  name: string;
  href: string;
  icon?: IconComponent;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: IconComponent;
  description: string;
  children?: NavigationChild[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: DashboardIcon,
    description: 'Vue d\'ensemble de votre activité'
  },
  {
    name: 'Facturation',
    href: '/billing',
    icon: InvoiceIcon,
    description: 'Factures et devis',
    children: [
      { name: 'Factures', href: '/invoices', icon: InvoiceIcon },
      { name: 'Devis', href: '/quotes', icon: QuoteIcon },
    ],
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: ClientIcon,
    description: 'Gestion des clients'
  },
  {
    name: 'Produits',
    href: '/products',
    icon: ProductIcon,
    description: 'Catalogue de produits et services'
  },
  {
    name: 'Charges',
    href: '/expenses',
    icon: ExpenseIcon,
    description: 'Dépenses et charges'
  },
  {
    name: 'Rapports',
    href: '/reports',
    icon: ReportIcon,
    description: 'Analyses et statistiques'
  },
  {
    name: 'Paramètres',
    href: '/settings',
    icon: SettingsIcon,
    description: 'Configuration du compte'
  },
];

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { getDisplayName, getInitials } = useUserDisplay();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const aiAssistantEnabled = useFeature('aiAssistant');

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, var(--color-base-100) 0%, color-mix(in oklch, var(--color-base-100), black 8%) 100%)',
        color: 'var(--color-text-primary)'
      }}
    >
      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 shadow-lg transform transition-transform duration-300 ease-in-out',
        'lg:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)', borderRight: '1px solid var(--color-border-primary)' }}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4" style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
            <Link to="/dashboard" className="flex items-center">
              {/* Logo image - coloca tu logo en /public/brand/logo-light.png (modo claro) y logo-dark.png (modo oscuro) */}
              <img
                src="/brand/logo-light.png"
                alt="SimpliFaq"
                className="h-10 w-auto dark:hidden"
                onError={(e) => {
                  // Fallback al logo de texto si la imagen no existe
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling?.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <img
                src="/brand/logo-dark.png"
                alt="SimpliFaq"
                className="h-10 w-auto hidden dark:block"
                onError={(e) => {
                  // Fallback al logo de texto si la imagen no existe
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              {/* Fallback logo - se muestra si las imágenes no existen */}
              <div className="flex items-center" style={{ display: 'none' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-primary-600)', color: 'var(--color-text-inverse)' }}>
                  <span className="font-bold text-xl">S</span>
                </div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary-500)' }}>SimpliFaq</h1>
              </div>
            </Link>

            {/* Bouton fermer mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              const isSectionActive = location.pathname.startsWith(item.href);
              const IconComponent = item.icon;

              if (!hasChildren) {
                const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                      'hover:bg-[var(--color-bg-secondary)]',
                      isActive && 'shadow-sm'
                    )}
                    style={{
                      color: isActive ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
                      background: isActive ? 'var(--color-bg-secondary)' : 'transparent',
                    }}
                  >
                    <span 
                      className={cn(
                        'mr-3 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-all',
                        isActive 
                          ? 'bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] text-white shadow-lg shadow-[var(--color-primary-500)]/25' 
                          : 'bg-[var(--color-text-primary)]/5 dark:bg-white/10 group-hover:bg-[var(--color-text-primary)]/10 dark:group-hover:bg-white/15'
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              }

              const isOpen = openSubmenus[item.name] ?? isSectionActive;
              const isParentActive = location.pathname === item.href;
              return (
                <div key={item.name}>
                  <div className="flex items-center">
                    {/* Main link that navigates to the hub page */}
                    <Link
                      to={item.href}
                      onClick={() => {
                        setIsSidebarOpen(false);
                        setOpenSubmenus((s) => ({ ...s, [item.name]: true }));
                      }}
                      className={cn(
                        'group flex-1 flex items-center px-3 py-2.5 text-sm font-medium rounded-l-xl transition-all duration-200',
                        'hover:bg-[var(--color-bg-secondary)]',
                        (isSectionActive || isParentActive) && 'shadow-sm'
                      )}
                      style={{
                        color: (isSectionActive || isParentActive) ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
                        background: (isSectionActive || isParentActive) ? 'var(--color-bg-secondary)' : 'transparent',
                      }}
                    >
                      <span 
                        className={cn(
                          'mr-3 w-9 h-9 inline-flex items-center justify-center rounded-lg transition-all',
                          (isSectionActive || isParentActive) 
                            ? 'bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] text-white shadow-lg shadow-[var(--color-primary-500)]/25' 
                            : 'bg-[var(--color-text-primary)]/5 dark:bg-white/10 group-hover:bg-[var(--color-text-primary)]/10 dark:group-hover:bg-white/15'
                        )}
                      >
                        <IconComponent className="w-5 h-5" />
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                    {/* Toggle button for submenu */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenSubmenus((s) => ({ ...s, [item.name]: !isOpen }));
                      }}
                      className={cn(
                        'px-2 py-2.5 rounded-r-xl transition-all duration-200',
                        'hover:bg-[var(--color-bg-secondary)]',
                        (isSectionActive || isParentActive) && 'bg-[var(--color-bg-secondary)]'
                      )}
                    >
                      <svg 
                        className={cn(
                          'w-4 h-4 transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )}
                        style={{ color: 'var(--color-text-tertiary)' }}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {isOpen && item.children && (
                    <div className="mt-1 ml-12 space-y-0.5 relative">
                      {/* Vertical line connector */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-[var(--color-primary-500)]/30 to-transparent"
                        style={{ marginLeft: '-8px' }}
                      />
                      {item.children.map((child) => {
                        const ChildIcon = child.icon || IconComponent;
                        const active = location.pathname === child.href || location.pathname.startsWith(child.href + '/');
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200',
                              'hover:bg-[var(--color-bg-secondary)]',
                              active && 'font-medium'
                            )}
                            style={{
                              color: active ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
                              background: active ? 'var(--color-bg-secondary)' : 'transparent',
                            }}
                          >
                            <span 
                              className={cn(
                                'mr-2 w-6 h-6 inline-flex items-center justify-center rounded-md transition-all',
                                active 
                                  ? 'bg-[var(--color-primary-500)]/20 text-[var(--color-primary-500)]' 
                                  : 'text-[var(--color-text-tertiary)]'
                              )}
                            >
                              <ChildIcon className="w-4 h-4" />
                            </span>
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--color-border-primary)' }}>
            <div className="flex items-center p-2 rounded-xl bg-[var(--color-text-primary)]/5 dark:bg-white/5 backdrop-blur-sm">
              <div className="flex-shrink-0">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm" 
                  style={{ 
                    background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-700) 100%)', 
                    color: 'white' 
                  }}
                >
                  {getInitials()}
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {getDisplayName()}
                </p>
                {user?.companyName && (
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {user.companyName}
                  </p>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                color: 'white',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              }}
            >
              {isLoggingOut ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Déconnexion...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Se déconnecter
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header avec bouton menu mobile */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">SimpliFaq</h1>
            <div className="w-9" /> {/* Spacer pour centrer le titre */}
          </div>
        </div>

        {/* Header desktop */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Contenu principal */}
        <main className="p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Session Warning Component */}
      <SessionWarning />

      {/* AI Assistant - Only show if feature is enabled */}
      {aiAssistantEnabled && <AIAssistant />}
    </div>
  );
}

// Icônes
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function InvoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ClientIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  );
}

function ProductIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ExpenseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}