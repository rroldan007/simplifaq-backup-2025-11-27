import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceList } from '../components/invoices/InvoiceList';
import { ModernDevisList } from '../components/devis/ModernDevisList';
import { NotificationContainer } from '../components/ui/Notification';
import { useInvoices } from '../hooks/useInvoices';
import { useFeature } from '../hooks/useFeatureFlags';

export const DevisPage: React.FC = () => {
  const navigate = useNavigate();
  const modernUIEnabled = useFeature('modernInvoiceUI');
  const {
    invoices,
    loading,
    error,
    notifications,
    operationLoading,
    deleteInvoice,
    duplicateInvoice,
    downloadPdf,
    removeNotification,
  } = useInvoices({ autoRefresh: true, refreshInterval: 30000, sortBy: 'createdAt', sortOrder: 'desc', isQuote: true });

  // Filter only quotes
  const devis = invoices.filter((inv) => (inv as unknown as { isQuote?: boolean })?.isQuote === true);
  
  // Choose component based on feature flag
  const DevisListComponent = modernUIEnabled ? ModernDevisList : InvoiceList;

  return (
    <>
      {!modernUIEnabled && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Devis</h1>
          </div>
        </div>
      )}

      <DevisListComponent
        invoices={devis}
        loading={loading}
        error={error}
        onView={(id) => navigate(`/invoices/${id}`)}
        onEdit={(id) => navigate(`/invoices/${id}/edit`)}
        onDelete={(id) => deleteInvoice(id)}
        onDuplicate={(id) => duplicateInvoice(id)}
        onDownloadPdf={(id) => downloadPdf(id)}
        onCreateNew={() => navigate('/devis/new')}
        labels={{
          searchPlaceholder: 'Rechercher des devis...',
          noneFoundTitle: 'Aucun devis trouvé',
          noneFoundSubtitle: "Aucun devis ne correspond à vos critères de recherche.",
          emptyTitle: 'Aucun devis',
          emptySubtitle: "Vous n'avez pas encore créé de devis.",
          emptyCtaLabel: 'Créer mon premier devis',
          newAriaLabel: 'Nouveau devis',
          newTitle: 'Nouveau devis',
        }}
        operationLoading={{
          delete: (id: string) => operationLoading[`delete-${id}`] || false,
          send: (id: string) => operationLoading[`send-${id}`] || false,
          duplicate: (id: string) => operationLoading[`duplicate-${id}`] || false,
          download: (id: string) => operationLoading[`download-${id}`] || false,
        }}
      />

      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
        position="top-right"
      />
    </>
  );
};
