import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useMotion } from '../../hooks/useMotion';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  className?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  sidebarCollapsed = false,
  onSidebarToggle,
  className,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { transition, variants } = useMotion();

  return (
    <div
      className={cn('min-h-screen flex flex-col', className)}
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      {/* Header */}
      {header && (
        <motion.header
          className="shadow-sm sticky top-0 z-40"
          style={{
            background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
            borderBottom: '1px solid var(--color-border-primary)',
            color: 'var(--color-text-primary)'
          }}
          initial="hidden"
          animate="visible"
          variants={variants.slideDown}
          transition={transition}
        >
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Mobile menu button */}
              {sidebar && (
                <motion.button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
                  style={{ color: 'var(--color-text-secondary)' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </motion.button>
              )}
              
              {header}
              
              {/* Desktop sidebar toggle */}
              {sidebar && onSidebarToggle && (
                <motion.button
                  onClick={onSidebarToggle}
                  className="hidden lg:block p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
                  style={{ color: 'var(--color-text-secondary)' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                  </svg>
                </motion.button>
              )}
            </div>
          </div>
        </motion.header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <>
            {/* Desktop Sidebar */}
            <motion.aside
              className={cn(
                'hidden lg:flex lg:flex-col transition-all duration-300',
                sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
                borderRight: '1px solid var(--color-border-primary)',
                color: 'var(--color-text-primary)'
              }}
              initial="hidden"
              animate="visible"
              variants={variants.slideRight}
              transition={transition}
            >
              <div className="flex-1 overflow-y-auto">
                {sidebar}
              </div>
            </motion.aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    className="fixed inset-0 z-40 lg:hidden"
                    style={{ backgroundColor: 'var(--color-surface-overlay)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  
                  {/* Mobile Sidebar */}
                  <motion.aside
                    className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
                      color: 'var(--color-text-primary)'
                    }}
                    initial={{ x: -256 }}
                    animate={{ x: 0 }}
                    exit={{ x: -256 }}
                    transition={transition}
                  >
                    <div
                      className="flex items-center justify-between h-16 px-4"
                      style={{ borderBottom: '1px solid var(--color-border-primary)' }}
                    >
                      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Menu</h2>
                      <motion.button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 rounded-md transition-colors duration-200"
                        style={{ color: 'var(--color-text-secondary)' }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </motion.button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {sidebar}
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            className="h-full"
            initial="hidden"
            animate="visible"
            variants={variants.fadeIn}
            transition={{ ...transition, delay: 0.1 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <motion.footer
          className="mt-auto"
          style={{
            background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
            borderTop: '1px solid var(--color-border-primary)',
            color: 'var(--color-text-primary)'
          }}
          initial="hidden"
          animate="visible"
          variants={variants.slideUp}
          transition={{ ...transition, delay: 0.2 }}
        >
          {footer}
        </motion.footer>
      )}
    </div>
  );
};

// Page Container for consistent spacing
export const PageContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}> = ({ children, className, maxWidth = '7xl', padding = 'lg' }) => {
  const { variants, transition } = useMotion();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 py-3',
    md: 'px-4 sm:px-6 py-4',
    lg: 'px-4 sm:px-6 lg:px-8 py-6',
    xl: 'px-4 sm:px-6 lg:px-8 py-8',
  };

  return (
    <motion.div
      className={cn(
        'mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
      initial="hidden"
      animate="visible"
      variants={variants.slideUp}
      transition={transition}
    >
      {children}
    </motion.div>
  );
};

// Grid Layout for responsive cards
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  stagger?: boolean;
}> = ({ 
  children, 
  className, 
  cols = { default: 1, md: 2, lg: 3 }, 
  gap = 'md',
  stagger = true 
}) => {
  const { variants, transition } = useMotion();

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const getGridCols = () => {
    const classes = [];
    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    return classes.join(' ');
  };

  return (
    <motion.div
      className={cn(
        'grid',
        getGridCols(),
        gapClasses[gap],
        className
      )}
      initial={stagger ? "hidden" : undefined}
      animate={stagger ? "visible" : undefined}
      variants={stagger ? variants.staggerContainer : undefined}
      transition={transition}
    >
      {children}
    </motion.div>
  );
};

// Section component for page sections
export const Section: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  background?: 'white' | 'gray' | 'transparent';
}> = ({ children, className, title, description, background = 'transparent' }) => {
  const { variants, transition } = useMotion();

  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    transparent: 'bg-transparent',
  };

  return (
    <motion.section
      className={cn(
        'py-8',
        backgroundClasses[background],
        className
      )}
      initial="hidden"
      animate="visible"
      variants={variants.slideUp}
      transition={transition}
    >
      {(title || description) && (
        <div className="mb-8">
          {title && (
            <motion.h2
              className="text-2xl font-bold text-gray-900 mb-2"
              variants={variants.slideUp}
              transition={{ ...transition, delay: 0.1 }}
            >
              {title}
            </motion.h2>
          )}
          {description && (
            <motion.p
              className="text-gray-600"
              variants={variants.slideUp}
              transition={{ ...transition, delay: 0.2 }}
            >
              {description}
            </motion.p>
          )}
        </div>
      )}
      {children}
    </motion.section>
  );
};

export default ResponsiveLayout;