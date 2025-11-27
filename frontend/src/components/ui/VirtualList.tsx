import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useVirtualScroll } from '../../hooks/useLazyLoad';
import { cn } from '../../utils/cn';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  loading = false,
  loadingComponent,
  emptyComponent,
}: VirtualListProps<T>) => {
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
  } = useVirtualScroll(items, {
    itemHeight,
    containerHeight,
    overscan,
  });

  const defaultLoadingComponent = useMemo(() => (
    <div className="flex items-center justify-center py-8">
      <motion.div
        className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  ), []);

  const defaultEmptyComponent = useMemo(() => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
      </svg>
      <p className="text-lg font-medium">Aucun élément</p>
    </div>
  ), []);

  if (loading) {
    return (
      <div className={cn('relative', className)} style={{ height: containerHeight }}>
        {loadingComponent || defaultLoadingComponent}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('relative', className)} style={{ height: containerHeight }}>
        {emptyComponent || defaultEmptyComponent}
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="w-full"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Specialized virtual list for invoices
export interface InvoiceListItem {
  number: string;
  clientName: string;
  amount: number;
  dueDate: string | number | Date;
}

interface VirtualInvoiceListProps {
  invoices: InvoiceListItem[];
  onView?: (invoice: InvoiceListItem) => void;
  onEdit?: (invoice: InvoiceListItem) => void;
  onSend?: (invoice: InvoiceListItem) => void;
  onDownload?: (invoice: InvoiceListItem) => void;
  className?: string;
  loading?: boolean;
}

export const VirtualInvoiceList: React.FC<VirtualInvoiceListProps> = ({
  invoices,
  onView,
  onEdit,
  onSend,
  onDownload,
  className,
  loading = false,
}) => {
  const renderInvoiceItem = (invoice: InvoiceListItem, index: number) => (
    <motion.div
      className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {invoice.number}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {invoice.clientName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {new Intl.NumberFormat('fr-CH', {
                  style: 'currency',
                  currency: 'CHF',
                }).format(invoice.amount)}
              </p>
              <p className="text-xs text-gray-500">
                {new Intl.DateTimeFormat('fr-CH').format(new Date(invoice.dueDate))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onView?.(invoice)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onEdit?.(invoice)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {onSend && (
            <button
              onClick={() => onSend?.(invoice)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7"></path>
              </svg>
            </button>
          )}
          {onDownload && (
            <button
              onClick={() => onDownload?.(invoice)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <VirtualList
      items={invoices}
      itemHeight={80}
      containerHeight={600}
      renderItem={renderInvoiceItem}
      className={className}
      loading={loading}
    />
  );
};

export default VirtualList;