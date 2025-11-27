/* eslint-disable react-refresh/only-export-components */
import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

// Helper to pick ESM default or return module itself (for CJS-like modules)
const pickDefault = <T,>(mod: unknown): { default: T } => {
  if (typeof mod === 'object' && mod !== null && 'default' in (mod as object)) {
    return { default: (mod as { default: T }).default };
  }
  return { default: mod as T };
};

// Loading component for lazy-loaded components
const LazyLoadingSpinner: React.FC<{ message?: string }> = ({ 
  message = 'Chargement...' 
}) => (
  <div className="flex flex-col items-center justify-center py-12">
    <motion.div
      className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mb-4"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <p className="text-sm text-gray-600">{message}</p>
  </div>
);

// Error boundary for lazy components
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-gray-600 mb-4">
            Une erreur s'est produite lors du chargement de ce composant.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading with suspense
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string,
  errorFallback?: React.ReactNode
) => {
  const LazyComponent: React.FC<P> = (props) => (
    <LazyErrorBoundary fallback={errorFallback}>
      <Suspense fallback={<LazyLoadingSpinner message={loadingMessage} />}>
        <Component {...props} />
      </Suspense>
    </LazyErrorBoundary>
  );

  LazyComponent.displayName = `LazyLoaded(${Component.displayName || Component.name})`;
  return LazyComponent;
};

// Lazy-loaded page components
export const LazyDashboardPage = lazy(() => 
  import('../pages/DashboardPage').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazyInvoicesPage = lazy(() => 
  import('../pages/InvoicesPage').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazyClientsPage = lazy(() => 
  import('../pages/ClientsPage').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazyProductsPage = lazy(() => 
  import('../pages/ProductsPage').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazyReportsPage = lazy(() => 
  import('../pages/ReportsPage').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazySettingsPage = lazy(() => 
  import('../pages/SettingsPage').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

// Lazy-loaded modal components
export const LazyInvoiceForm = lazy(() => 
  import('../components/invoices/InvoiceForm').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazyClientForm = lazy(() => 
  import('../components/clients/ClientForm').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazyProductForm = lazy(() => 
  import('../components/products/ProductForm').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazySendEmailModal = lazy(() => 
  import('../components/invoices/SendEmailModal').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

export const LazyEmailHistoryModal = lazy(() => 
  import('../components/invoices/EmailHistoryModal').then((mod) => pickDefault<React.ComponentType<unknown>>(mod))
);

// Preload functions for better UX
export const preloadComponent = (importFn: () => Promise<unknown>) => {
  const componentImport = importFn();
  return componentImport;
};

export const preloadDashboard = () => preloadComponent(() => import('../pages/DashboardPage'));
export const preloadInvoices = () => preloadComponent(() => import('../pages/InvoicesPage'));
export const preloadClients = () => preloadComponent(() => import('../pages/ClientsPage'));
export const preloadProducts = () => preloadComponent(() => import('../pages/ProductsPage'));
export const preloadReports = () => preloadComponent(() => import('../pages/ReportsPage'));
export const preloadSettings = () => preloadComponent(() => import('../pages/SettingsPage'));

// Hook for preloading components on hover
export const usePreloadOnHover = () => {
  const preloadOnHover = (preloadFn: () => Promise<unknown>) => ({
    onMouseEnter: () => {
      preloadFn().catch(console.error);
    },
  });

  return { preloadOnHover };
};

// Component for progressive enhancement
export const ProgressiveEnhancement: React.FC<{
  children: React.ReactNode;
  fallback: React.ReactNode;
  condition?: boolean;
}> = ({ children, fallback, condition = true }) => {
  const [isEnhanced, setIsEnhanced] = React.useState(false);

  React.useEffect(() => {
    if (condition) {
      // Delay enhancement to avoid blocking initial render
      const timer = setTimeout(() => setIsEnhanced(true), 100);
      return () => clearTimeout(timer);
    }
  }, [condition]);

  return isEnhanced ? <>{children}</> : <>{fallback}</>;
};

// Intersection observer hook for triggering lazy loads
export const useIntersectionObserver = (
  callback: () => void,
  options: IntersectionObserverInit = {}
) => {
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
        observer.disconnect();
      }
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [callback, options]);

  return elementRef;
};

export default withLazyLoading;