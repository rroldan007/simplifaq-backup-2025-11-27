/**
 * 🇨🇭 SimpliFaq - Operator Panel Layout
 */

import React, { useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useOperatorAuth } from '../../contexts/OperatorAuthContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  MessageSquare
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/operator/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    id: 'users',
    label: 'Users',
    path: '/operator/users',
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    path: '/operator/subscriptions',
    icon: <CreditCard className="w-5 h-5" />
  },
  {
    id: 'plans',
    label: 'Plans',
    path: '/operator/plans',
    icon: <Package className="w-5 h-5" />
  },
  {
    id: 'invoices',
    label: 'Invoices',
    path: '/operator/invoices',
    icon: <FileText className="w-5 h-5" />
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/operator/analytics',
    icon: <BarChart3 className="w-5 h-5" />
  },
  {
    id: 'support',
    label: 'Support',
    path: '/operator/support',
    icon: <MessageSquare className="w-5 h-5" />
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/operator/settings',
    icon: <Settings className="w-5 h-5" />
  }
];

export function OperatorLayout() {
  const { isAuthenticated, isLoading, operator, logout } = useOperatorAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/operator/login" state={{ from: location }} replace />;
  }

  const isActivePath = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/operator/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-white">
              🇨🇭 Operator
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Info */}
          {operator && (
            <div className="px-6 py-4 border-b border-slate-800">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {operator.email.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {operator.email}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {operator.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = isActivePath(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              SimpliFaq Operator
            </h1>
            <div className="w-6"></div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
