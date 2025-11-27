/**
 * 🇨🇭 SimpliFaq - Admin Layout with Sidebar
 * 
 * Layout wrapper for admin pages with persistent sidebar navigation
 */

import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    console.log('[AdminLayout] Component mounted, isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Show loading while checking auth
  if (isLoading) {
    console.log('[AdminLayout] Showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('[AdminLayout] Not authenticated, redirecting to login');
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  console.log('[AdminLayout] Authenticated, rendering layout');

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      {/* Sidebar */}
      <div className={`${isMobile && !isSidebarCollapsed ? 'fixed inset-0 z-50' : ''}`}>
        {/* Mobile overlay */}
        {isMobile && !isSidebarCollapsed && (
          <div 
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={toggleSidebar}
          />
        )}
        
        {/* Sidebar */}
        <div className={`${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative'} ${
          isMobile && isSidebarCollapsed ? 'hidden' : ''
        }`}>
          <AdminSidebar 
            isCollapsed={!isMobile && isSidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar (Mobile) */}
        {isMobile && (
          <div className="surface border-b border-primary px-4 py-3 flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-secondary"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">SF</span>
              </div>
              <span className="text-sm font-semibold text-primary">SimpliFaq Admin</span>
            </div>
            
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
