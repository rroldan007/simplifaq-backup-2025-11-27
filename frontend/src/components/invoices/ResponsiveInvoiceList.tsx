import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveGrid, PageContainer, Section, Input, Button } from '../ui';
import { ResponsiveInvoiceCard } from './ResponsiveInvoiceCard';
import { useMotion } from '../../hooks/useMotion';
import { cn } from '../../utils/cn';

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
}

interface ResponsiveInvoiceListProps {
  invoices: Invoice[];
  loading?: boolean;
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onCreateNew?: () => void;
  className?: string;
}

const filterOptions = [
  { value: 'all', label: 'Toutes', count: 0 },
  { value: 'draft', label: 'Brouillons', count: 0 },
  { value: 'sent', label: 'Envoyées', count: 0 },
  { value: 'paid', label: 'Payées', count: 0 },
  { value: 'overdue', label: 'En retard', count: 0 },
];

const sortOptions = [
  { value: 'newest', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'amount-high', label: 'Montant décroissant' },
  { value: 'amount-low', label: 'Montant croissant' },
  { value: 'due-date', label: 'Date d\'échéance' },
];

export const ResponsiveInvoiceList: React.FC<ResponsiveInvoiceListProps> = ({
  invoices,
  loading = false,
  onView,
  onEdit,
  onSend,
  onDownload,
  onCreateNew,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { variants, transition } = useMotion();

  // Filter and sort invoices
  const filteredInvoices = React.useMemo(() => {
    let filtered = invoices;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((invoice) =>
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === selectedFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-high':
          return b.amount - a.amount;
        case 'amount-low':
          return a.amount - b.amount;
        case 'due-date':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [invoices, searchTerm, selectedFilter, selectedSort]);

  // Update filter counts
  const filtersWithCounts = React.useMemo(() => {
    return filterOptions.map((filter) => ({
      ...filter,
      count:
        filter.value === 'all'
          ? invoices.length
          : invoices.filter((invoice) => invoice.status === filter.value).length,
    }));
  }, [invoices]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <motion.div
            className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className={className}>
      <Section>
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          initial="hidden"
          animate="visible"
          variants={variants.slideUp}
          transition={transition}
        >
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Factures</h1>
            <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {filteredInvoices.length} facture{filteredInvoices.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Button
            onClick={onCreateNew}
            className="w-full sm:w-auto"
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            + Facture
          </Button>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          className="rounded-xl p-4 mb-6"
          style={{
            background: 'linear-gradient(135deg, var(--color-surface-primary) 0%, var(--color-surface-secondary) 100%)',
            border: '1px solid var(--color-border-primary)'
          }}
          initial="hidden"
          animate="visible"
          variants={variants.slideUp}
          transition={{ ...transition, delay: 0.1 }}
        >
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Rechercher par numéro ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              fullWidth
            />
          </div>

          {/* Filter tabs - scrollable on mobile */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {filtersWithCounts.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedFilter(filter.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap border',
                      selectedFilter === filter.value
                        ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-600)] border-[color:var(--color-primary-200)]'
                        : 'text-[var(--color-text-secondary)] border-[color:var(--color-border-primary)] hover:bg-[var(--color-bg-secondary)]'
                    )}
                  >
                    {filter.label}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs',
                        selectedFilter === filter.value
                          ? 'bg-[var(--color-primary-200)] text-[var(--color-primary-700)]'
                          : 'bg-[var(--color-border-primary)] text-[var(--color-text-secondary)]'
                      )}
                    >
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sort and View Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Trier par:</label>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--color-surface-primary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-primary)'
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View mode toggle - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-md transition-all duration-200',
                  viewMode === 'grid'
                    ? 'text-[var(--color-primary-600)] shadow-sm'
                    : 'text-[var(--color-text-secondary)]'
                )}
                style={{ background: viewMode === 'grid' ? 'var(--color-surface-primary)' : 'transparent', border: '1px solid var(--color-border-primary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-all duration-200',
                  viewMode === 'list'
                    ? 'text-[var(--color-primary-600)] shadow-sm'
                    : 'text-[var(--color-text-secondary)]'
                )}
                style={{ background: viewMode === 'list' ? 'var(--color-surface-primary)' : 'transparent', border: '1px solid var(--color-border-primary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Invoice List */}
        <AnimatePresence mode="wait">
          {filteredInvoices.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-12"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={variants.fadeIn}
              transition={transition}
            >
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedFilter !== 'all'
                  ? 'Aucune facture trouvée'
                  : 'Aucune facture'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedFilter !== 'all'
                  ? 'Essayez de modifier vos critères de recherche.'
                  : 'Commencez par créer votre première facture.'}
              </p>
              {(!searchTerm && selectedFilter === 'all') && (
                <Button onClick={onCreateNew}>
                  Créer ma première facture
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={variants.staggerContainer}
              transition={transition}
            >
              <ResponsiveGrid
                cols={{
                  default: 1,
                  md: viewMode === 'grid' ? 2 : 1,
                  lg: viewMode === 'grid' ? 3 : 1,
                  xl: viewMode === 'grid' ? 4 : 1,
                }}
                gap="md"
                stagger
              >
                {filteredInvoices.map((invoice) => (
                  <ResponsiveInvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    onView={onView}
                    onEdit={onEdit}
                    onSend={onSend}
                    onDownload={onDownload}
                  />
                ))}
              </ResponsiveGrid>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </PageContainer>
  );
};

export default ResponsiveInvoiceList;