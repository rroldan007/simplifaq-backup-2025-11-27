import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuoteList } from '../components/quotes/QuoteList';
import { ModernDevisList } from '../components/devis/ModernDevisList';
import { SendEmailModal } from '../components/invoices/SendEmailModal';
import { EmailHistoryModal } from '../components/invoices/EmailHistoryModal';
import { NotificationContainer } from '../components/ui/Notification';
import { useQuotes } from '../hooks/useQuotes';
import { useFeature } from '../hooks/useFeatureFlags';

export function QuotesPage() {
  const navigate = useNavigate();
  const modernUIEnabled = useFeature('modernInvoiceUI');
  
  // Reactive filters for ModernDevisList
  const [filters, setFilters] = useState<{
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | undefined;
    search: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }>({
    status: undefined,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Update filters when ModernDevisList changes them (memoized to prevent re-renders)
  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => {
      // Only update if values actually changed
      const hasChanges = Object.keys(newFilters).some(
        key => prev[key as keyof typeof prev] !== newFilters[key as keyof typeof newFilters]
      );
      return hasChanges ? { ...prev, ...newFilters } : prev;
    });
  }, []);

  // Email modal states
  const [sendEmailModal, setSendEmailModal] = useState<{
    isOpen: boolean;
    quoteId: string;
    quoteNumber: string;
    clientEmail: string;
  }>({
    isOpen: false,
    quoteId: '',
    quoteNumber: '',
    clientEmail: '',
  });

  const [emailHistoryModal, setEmailHistoryModal] = useState<{
    isOpen: boolean;
    quoteId: string;
    quoteNumber: string;
  }>({
    isOpen: false,
    quoteId: '',
    quoteNumber: '',
  });

  // Memoize quote params to prevent unnecessary re-fetches
  const quoteParams = useMemo(() => ({
    status: filters.status,
    search: filters.search || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    autoRefresh: true,
    refreshInterval: 30000
  }), [filters.status, filters.search, filters.sortBy, filters.sortOrder]);

  const {
    quotes,
    loading,
    error,
    notifications,
    operationLoading,
    deleteQuote,
    sendQuote,
    downloadPdf,
    convertToInvoice,
    refreshQuotes,
    removeNotification
  } = useQuotes(quoteParams);

  const handleViewQuote = (quoteId: string) => {
    navigate(`/quotes/${quoteId}`);
  };

  const handleEditQuote = (quoteId: string) => {
    navigate(`/quotes/${quoteId}/edit`);
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      await deleteQuote(quoteId);
    }
  };

  const handleDownloadPdf = async (quoteId: string) => {
    await downloadPdf(quoteId);
  };

  const handleConvertToInvoice = async (quoteId: string) => {
    if (window.confirm('Voulez-vous convertir ce devis en facture ?')) {
      const result = await convertToInvoice(quoteId);
      if (result) {
        // Navigate to the new invoice
        navigate(`/invoices/${result.id}`);
      }
    }
  };

  const handleCreateNew = () => {
    navigate('/quotes/new');
  };

  const handleSendEmail = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
      setSendEmailModal({
        isOpen: true,
        quoteId,
        quoteNumber: quote.quoteNumber,
        clientEmail: quote.client?.email || '',
      });
    }
  };

  const handleViewEmailHistory = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
      setEmailHistoryModal({
        isOpen: true,
        quoteId,
        quoteNumber: quote.quoteNumber,
      });
    }
  };

  const handleEmailSent = async () => {
    // Wait for backend to update, then refresh quotes list
    setTimeout(() => {
      refreshQuotes();
    }, 800);
  };

  const handleSendQuote = async (quoteId: string) => {
    if (sendQuote) {
      await sendQuote(quoteId);
    }
  };

  // Check if specific operations are loading
  const isOperationLoading = (quoteId: string, operation: string) => {
    return operationLoading[`${operation}-${quoteId}`] || false;
  };

  // Convert Quote[] to Devis[] for ModernDevisList compatibility
  const quotesAsDevis = quotes.map(quote => {
    // Map quote status to invoice status for UI compatibility
    let mappedStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' = 'draft';
    const status = quote.status.toLowerCase();
    switch (status) {
      case 'draft':
        mappedStatus = 'draft';
        break;
      case 'sent':
        mappedStatus = 'sent';
        break;
      case 'accepted':
        mappedStatus = 'paid'; // Accepted quotes shown as "paid" in UI
        break;
      case 'rejected':
      case 'expired':
        mappedStatus = 'cancelled';
        break;
    }
    
    return {
      ...quote,
      invoiceNumber: quote.quoteNumber,
      clientName: quote.client?.companyName || `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim(),
      clientEmail: quote.client?.email,
      amount: quote.total,
      status: mappedStatus,
      dueDate: quote.validUntil || '',
      paymentStatus: 'UNPAID' as const,
      isQuote: true,
      convertedInvoiceId: quote.convertedInvoiceId, // Para mostrar indicador de convertido
    };
  });

  return (
    <>
      {modernUIEnabled ? (
        <ModernDevisList
          invoices={quotesAsDevis}
          loading={loading}
          error={error}
          onView={handleViewQuote}
          onEdit={handleEditQuote}
          onDelete={handleDeleteQuote}
          onSend={handleSendQuote}
          onDownloadPdf={handleDownloadPdf}
          onSendEmail={handleSendEmail}
          onViewEmailHistory={handleViewEmailHistory}
          onConvertToInvoice={handleConvertToInvoice}
          onCreateNew={handleCreateNew}
          onRefresh={refreshQuotes}
          onFilterChange={handleFilterChange}
          currentFilters={filters}
          operationLoading={{
            delete: (id: string) => isOperationLoading(id, 'delete'),
            send: (id: string) => isOperationLoading(id, 'send'),
            download: (id: string) => isOperationLoading(id, 'download'),
            convert: (id: string) => isOperationLoading(id, 'convert'),
          }}
        />
      ) : (
        <QuoteList
          quotes={quotes}
          loading={loading}
          error={error}
          onView={handleViewQuote}
          onEdit={handleEditQuote}
          onDelete={handleDeleteQuote}
          onDownloadPdf={handleDownloadPdf}
          onConvertToInvoice={handleConvertToInvoice}
          onCreateNew={handleCreateNew}
          operationLoading={{
            delete: (id: string) => isOperationLoading(id, 'delete'),
            download: (id: string) => isOperationLoading(id, 'download'),
            convert: (id: string) => isOperationLoading(id, 'convert'),
          }}
        />
      )}

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={sendEmailModal.isOpen}
        onClose={() => setSendEmailModal(prev => ({ ...prev, isOpen: false }))}
        invoiceId={sendEmailModal.quoteId}
        invoiceNumber={sendEmailModal.quoteNumber}
        clientEmail={sendEmailModal.clientEmail}
        onEmailSent={handleEmailSent}
        isQuote={true}
      />

      {/* Email History Modal */}
      <EmailHistoryModal
        isOpen={emailHistoryModal.isOpen}
        onClose={() => setEmailHistoryModal(prev => ({ ...prev, isOpen: false }))}
        invoiceId={emailHistoryModal.quoteId}
        invoiceNumber={emailHistoryModal.quoteNumber}
      />

      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </>
  );
}
// Force rebuild Mon Nov 17 11:02:07 UTC 2025
