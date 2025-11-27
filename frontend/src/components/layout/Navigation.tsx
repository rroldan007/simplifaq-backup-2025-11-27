import React from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: NavigationItem[];
}

interface NavigationProps {
  items: NavigationItem[];
  collapsed?: boolean;
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  items,
  collapsed = false,
  className,
}) => {
  const location = useLocation();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <nav className={cn('py-4', className)}>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <NavigationItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={isActive(item.href)}
            index={index}
          />
        ))}
      </ul>
    </nav>
  );
};

const NavigationItem: React.FC<{
  item: NavigationItem;
  collapsed: boolean;
  isActive: boolean;
  index: number;
}> = ({ item, collapsed, isActive, index }) => {
  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <NavLink
        to={item.href}
        className={({ isActive: linkActive }) =>
          cn(
            'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            (linkActive || isActive)
              ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
            collapsed && 'justify-center px-2'
          )
        }
      >
        {({ isActive: linkActive }) => (
          <>
            {item.icon && (
              <motion.span
                className={cn(
                  'flex-shrink-0 transition-colors duration-200',
                  (linkActive || isActive) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600',
                  collapsed ? 'w-6 h-6' : 'w-5 h-5 mr-3'
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.icon}
              </motion.span>
            )}
            
            {!collapsed && (
              <motion.span
                className="flex-1 truncate"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                {item.name}
              </motion.span>
            )}
            
            {!collapsed && item.badge && (
              <motion.span
                className={cn(
                  'ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium',
                  (linkActive || isActive)
                    ? 'bg-primary-200 text-primary-800'
                    : 'bg-gray-200 text-gray-800 group-hover:bg-gray-300'
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                {item.badge}
              </motion.span>
            )}
          </>
        )}
      </NavLink>
    </motion.li>
  );
};

// Breadcrumb component
export const Breadcrumb: React.FC<{
  items: { name: string; href?: string }[];
  className?: string;
}> = ({ items, className }) => {
  return (
    <nav className={cn('flex', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <motion.li
            key={index}
            className="flex items-center"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {index > 0 && (
              <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            
            {item.href ? (
              <NavLink
                to={item.href}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200"
              >
                {item.name}
              </NavLink>
            ) : (
              <span className="text-sm font-medium text-gray-500">{item.name}</span>
            )}
          </motion.li>
        ))}
      </ol>
    </nav>
  );
};

export default Navigation;