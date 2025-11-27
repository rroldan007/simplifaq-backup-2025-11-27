import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EnhancedInvoiceDetailsView } from '../components/invoices/EnhancedInvoiceDetailsView';
import { PaymentModal } from '../components/invoices/PaymentModal';
import { SendInvoiceEmailModal } from '../components/invoices/SendInvoiceEmailModal';
import type { InvoiceStatus } from '../components/invoices/InvoiceStatusBadge';
import { useCurrentUser } from '../hooks/useAuth';

// Minimal invoice shape needed by this page/component
type InvoiceItemLite = {
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  tvaRate?: number | string;
};

type InvoiceForDetail = {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  total: number;
  issueDate?: string;
  dueDate?: string;
  items?: InvoiceItemLite[];
  currency?: string;
  language?: 'fr' | 'de' | 'it' | 'en';
  user?: { quantityDecimals?: 2 | 3 } | null;
};

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [invoice, setInvoice] = useState<InvoiceForDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);

  // Loading states for different actions
  const [actionLoading, setActionLoading] = useState({
    status: false,
    send: false,
    duplicate: false,
    delete: false,
    cancelRecurrence: false,
  });

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await api.getInvoice(id);
      setInvoice(inv as unknown as InvoiceForDetail);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
        ? (e as { message: string }).message
        : 'Erreur de chargement';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePaymentAdded = async () => {
    console.log('[Payment] Payment added, refreshing invoice...');
    // Small delay to ensure backend transaction is committed
    await new Promise(resolve => setTimeout(resolve, 300));
    await fetchInvoice();
    console.log('[Payment] Invoice refreshed');
  };

  const handleCancelRecurrence = async () => {
    if (!id || !invoice || actionLoading.cancelRecurrence) return;
    const confirm = window.confirm(
      "Voulez-vous annuler la récurrence pour cette facture ? Les prochaines générations seront stoppées."
    );
    if (!confirm) return;
    setActionLoading(prev => ({ ...prev, cancelRecurrence: true }));
    try {
      const updated = await api.cancelInvoiceRecurrence(id);
      setInvoice(updated as unknown as InvoiceForDetail);
    } catch (e) {
      console.error('Error cancelling recurrence:', e);
      const status = (e && typeof e === 'object' && 'status' in (e as Record<string, unknown>))
        ? Number((e as { status?: unknown }).status)
        : 0;
      if (status === 404) {
        try {
          const updated = await api.updateInvoice(id, {
            estRecurrente: false,
            frequence: undefined,
            prochaineDateRecurrence: undefined,
            dateFinRecurrence: undefined,
          } as any);
          setInvoice(updated as unknown as InvoiceForDetail);
        } catch (e2) {
          const msg2 = e2 && typeof e2 === 'object' && 'message' in e2 && typeof (e2 as { message?: unknown }).message === 'string'
            ? (e2 as { message: string }).message
            : 'Erreur lors de la désactivation de la récurrence';
          setError(msg2);
        }
      } else {
        const msg = e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
          ? (e as { message: string }).message
          : "Erreur lors de l'annulation de la récurrence";
        setError(msg);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, cancelRecurrence: false }));
    }
  };

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice || actionLoading.status) return;
    
    setActionLoading(prev => ({ ...prev, status: true }));
    try {
      const updatedInvoice = await api.updateInvoice(invoice.id, { status: newStatus });
      setInvoice(updatedInvoice as unknown as InvoiceForDetail);
    } catch (error: unknown) {
      console.error('Error updating invoice status:', error);
      const msg = error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Erreur lors de la mise à jour du statut';
      setError(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, status: false }));
    }
  };

  const handleEdit = () => {
    navigate(`/invoices/${id}/edit`);
  };

  const handleSend = () => {
    // Open email modal instead of just changing status
    setIsSendEmailModalOpen(true);
  };

  const handleEmailSent = async () => {
    // Refresh invoice to get updated status
    if (id) {
      await fetchInvoice();
    }
  };

  const handleDownloadPdf = async () => {
    if (!id || !invoice) return;
    
    try {
      const template = (currentUser as any)?.pdfTemplate;
      const accentColor = (currentUser as any)?.pdfPrimaryColor;

      console.log('Downloading PDF for invoice:', invoice.invoiceNumber);
      console.log('Current user pdfTemplate:', template);
      console.log('Current user pdfPrimaryColor:', accentColor);
      // Include all PDFKit templates (european_minimal, swiss_classic, etc.)
      type TemplateKey = 'elegant_classic' | 'minimal_modern' | 'formal_pro' | 'creative_premium' | 'clean_creative' | 'bold_statement' | 'european_minimal' | 'swiss_classic' | 'swiss_blue';
      const allowedTemplates: readonly TemplateKey[] = ['elegant_classic','minimal_modern','formal_pro','creative_premium','clean_creative','bold_statement','european_minimal','swiss_classic','swiss_blue'] as const;
      const opts: {
        language?: 'fr' | 'de' | 'it' | 'en';
        template?: TemplateKey;
        accentColor?: string;
      } = {};
      if (invoice.language && ['fr','de','it','en'].includes(invoice.language)) {
        opts.language = invoice.language;
      } else {
        opts.language = 'fr';
      }
      let tpl = typeof template === 'string' ? template.trim() : '';
      // Normalize alias
      if (tpl === 'minimal_moderm') tpl = 'minimal_modern';
      if (tpl && (allowedTemplates as readonly string[]).includes(tpl)) {
        opts.template = tpl as TemplateKey;
      }
      // Include accentColor if provided (all templates support custom colors)
      if (typeof accentColor === 'string' && accentColor.trim().length > 0) {
        opts.accentColor = accentColor;
      }
      console.log('PDF download opts:', opts);
      const pdfBlob = await api.downloadInvoicePdf(id, opts);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${invoice.invoiceNumber || invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the blob URL
      URL.revokeObjectURL(url);
      
      console.log('PDF downloaded successfully');
    } catch (error: unknown) {
      console.error('Error downloading PDF:', error);
      const msg = error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Erreur lors du téléchargement du PDF';
      setError(msg);
    }
  };

  const handleDuplicate = async () => {
    if (actionLoading.duplicate || !id) return;
    
    setActionLoading(prev => ({ ...prev, duplicate: true }));
    try {
      const duplicated = await api.duplicateInvoice(id);
      navigate(`/invoices/${(duplicated as unknown as { id: string }).id}/edit`);
    } catch (error: unknown) {
      console.error('Error duplicating invoice:', error);
      const msg = error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Erreur lors de la duplication';
      setError(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, duplicate: false }));
    }
  };

  const handleDelete = async () => {
    if (actionLoading.delete || !id) return;
    
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.');
    if (!confirmed) return;
    
    setActionLoading(prev => ({ ...prev, delete: true }));
    try {
      await api.deleteInvoice(id);
      navigate('/invoices');
    } catch (error: unknown) {
      console.error('Error deleting invoice:', error);
      const msg = error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Erreur lors de la suppression';
      setError(msg);
    } finally {
      setActionLoading(prev => ({ ...prev, delete: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          type="button"
          onClick={() => navigate('/invoices')} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600 mb-4">Facture non trouvée</p>
        <button 
          type="button"
          onClick={() => navigate('/invoices')} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <>
      <EnhancedInvoiceDetailsView
        invoice={{ ...invoice, user: (invoice.user || undefined) as any }}
        onStatusChange={handleStatusChange}
        onEdit={handleEdit}
        onSend={handleSend}
        onDownloadPdf={handleDownloadPdf}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onCancelRecurrence={(((invoice as unknown as Record<string, unknown>)?.estRecurrente as boolean) || ((invoice as unknown as Record<string, unknown>)?.statutRecurrence === 'actif')) ? handleCancelRecurrence : undefined}
        onBack={() => navigate('/invoices')}
        onAddPayment={() => setIsPaymentModalOpen(true)}
        loading={{
          status: actionLoading.status,
          send: actionLoading.send,
          duplicate: actionLoading.duplicate,
          delete: actionLoading.delete,
          cancelRecurrence: actionLoading.cancelRecurrence,
        }}
      />
      {invoice && (
        <>
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            totalAmount={invoice.total}
            onPaymentAdded={handlePaymentAdded}
          />
          <SendInvoiceEmailModal
            isOpen={isSendEmailModalOpen}
            onClose={() => setIsSendEmailModalOpen(false)}
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            clientEmail={(invoice as any).client?.email}
            clientName={(invoice as any).client?.companyName || `${(invoice as any).client?.firstName || ''} ${(invoice as any).client?.lastName || ''}`.trim()}
            onSuccess={handleEmailSent}
          />
        </>
      )}
    </>
  );
};

export default InvoiceDetailPage;

