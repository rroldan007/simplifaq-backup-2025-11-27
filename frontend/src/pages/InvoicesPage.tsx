import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceList } from '../components/invoices/InvoiceList';
import { ModernInvoiceList } from '../components/invoices/ModernInvoiceList';
import { SendEmailModal } from '../components/invoices/SendEmailModal';
import { EmailHistoryModal } from '../components/invoices/EmailHistoryModal';
import { NotificationContainer } from '../components/ui/Notification';
import { useInvoices, type Invoice } from '../hooks/useInvoices';
import { useFeature } from '../hooks/useFeatureFlags';

export function InvoicesPage() {
  const navigate = useNavigate();
  const modernUIEnabled = useFeature('modernInvoiceUI');
  
  // Reactive filters for ModernInvoiceList
  const [filters, setFilters] = useState({
    status: undefined as 'draft' | 'sent' | 'paid' | 'overdue' | undefined,
    search: '',
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const
  });
  
  // Update filters when ModernInvoiceList changes them (memoized to prevent re-renders)
  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => {
      // Only update if values actually changed
      const hasChanges = Object.keys(newFilters).some(
        key => prev[key as keyof typeof prev] !== newFilters[key as keyof typeof newFilters]
      );
      return hasChanges ? { ...prev, ...newFilters } : prev;
    });
  }, []);

  // Memoize invoice params to prevent unnecessary re-fetches
  const invoiceParams = useMemo(() => ({
    status: filters.status as 'draft' | 'sent' | 'paid' | 'overdue' | undefined,
    search: filters.search || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    isQuote: false, // Only show invoices, not quotes
    autoRefresh: true,
    refreshInterval: 30000
  }), [filters.status, filters.search, filters.sortBy, filters.sortOrder]);

  // Email modal states
  const [sendEmailModal, setSendEmailModal] = useState<{
    isOpen: boolean;
    invoiceId: string;
    invoiceNumber: string;
    clientEmail: string;
  }>({
    isOpen: false,
    invoiceId: '',
    invoiceNumber: '',
    clientEmail: '',
  });

  const [emailHistoryModal, setEmailHistoryModal] = useState<{
    isOpen: boolean;
    invoiceId: string;
    invoiceNumber: string;
  }>({
    isOpen: false,
    invoiceId: '',
    invoiceNumber: '',
  });

  const {
    invoices,
    loading,
    error,
    notifications,
    operationLoading,
    deleteInvoice,
    sendInvoice,
    duplicateInvoice,
    downloadPdf,
    refreshInvoices,
    removeNotification
  } = useInvoices(invoiceParams);

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const handleEditInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}/edit`);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      await deleteInvoice(invoiceId);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    await sendInvoice(invoiceId);
  };

  const handleDuplicateInvoice = async (invoiceId: string) => {
    const duplicated = await duplicateInvoice(invoiceId);
    if (duplicated) {
      navigate(`/invoices/${duplicated.id}/edit`);
    }
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    await downloadPdf(invoiceId);
  };

  const handleCreateNew = () => {
    navigate('/invoices/new');
  };

  const handleSendEmail = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSendEmailModal({
        isOpen: true,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        clientEmail: invoice.clientEmail || '',
      });
    }
  };

  const handleViewEmailHistory = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setEmailHistoryModal({
        isOpen: true,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
      });
    }
  };

  const handleEmailSent = () => {
    // Wait for backend to update, then refresh invoices list
    setTimeout(() => {
      refreshInvoices();
    }, 800);
  };

  // Check if specific operations are loading
  const isOperationLoading = (invoiceId: string, operation: string) => {
    return operationLoading[`${operation}-${invoiceId}`] || false;
  };

  // Normalize invoice status to lowercase for consistent UI handling
  const normalizedInvoices = invoices.map(invoice => ({
    ...invoice,
    status: invoice.status.toLowerCase() as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
  }));

  // Choose component based on feature flag
  const InvoiceListComponent = modernUIEnabled ? ModernInvoiceList : InvoiceList;

  return (
    <>
      <InvoiceListComponent
        invoices={normalizedInvoices}
        loading={loading}
        error={error}
        onView={handleViewInvoice}
        onEdit={handleEditInvoice}
        onDelete={handleDeleteInvoice}
        onSend={handleSendInvoice}
        onDuplicate={handleDuplicateInvoice}
        onDownloadPdf={handleDownloadPdf}
        onSendEmail={handleSendEmail}
        onViewEmailHistory={handleViewEmailHistory}
        onCreateNew={handleCreateNew}
        onRefresh={refreshInvoices}
        // Pass filter handler for ModernInvoiceList
        {...(modernUIEnabled && {
          onFilterChange: handleFilterChange,
          currentFilters: filters
        })}
        // Pass loading states for individual operations
        {...(!modernUIEnabled && {
          operationLoading: {
            delete: (id: string) => isOperationLoading(id, 'delete'),
            send: (id: string) => isOperationLoading(id, 'send'),
            duplicate: (id: string) => isOperationLoading(id, 'duplicate'),
            download: (id: string) => isOperationLoading(id, 'download'),
          }
        })}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={sendEmailModal.isOpen}
        onClose={() => setSendEmailModal(prev => ({ ...prev, isOpen: false }))}
        invoiceId={sendEmailModal.invoiceId}
        invoiceNumber={sendEmailModal.invoiceNumber}
        clientEmail={sendEmailModal.clientEmail}
        onEmailSent={handleEmailSent}
      />

      {/* Email History Modal */}
      <EmailHistoryModal
        isOpen={emailHistoryModal.isOpen}
        onClose={() => setEmailHistoryModal(prev => ({ ...prev, isOpen: false }))}
        invoiceId={emailHistoryModal.invoiceId}
        invoiceNumber={emailHistoryModal.invoiceNumber}
      />
      
      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />
    </>
  );
}