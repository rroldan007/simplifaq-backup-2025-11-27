import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { useAuth } from './useAuth';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  issueDate: string;
  dueDate: string;
  currency: string;
  qrBillGenerated?: boolean;
  sentAt?: string;
  paidAt?: string;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  language: 'fr' | 'de' | 'it' | 'en';
  createdAt: string;
  updatedAt: string;
  isQuote?: boolean;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total: number;
  order: number;
  productId?: string;
}

interface CreateInvoiceRequest {
  invoiceNumber?: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  items: Omit<InvoiceItem, 'id'>[];
  notes?: string;
  terms?: string;
  language: 'fr' | 'de' | 'it' | 'en';
  currency: 'CHF' | 'EUR';
  // Recurring billing (optional)
  estRecurrente?: boolean;
  frequence?: 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL';
  prochaineDateRecurrence?: string;
  dateFinRecurrence?: string;
  // Quote flag
  isQuote?: boolean;
}

interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

interface UseInvoicesParams {
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoRefresh?: boolean;
  refreshInterval?: number;
  isQuote?: boolean;
}

interface UseInvoicesState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  lastUpdated: Date | null;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: string;
}

export function useInvoices(params: UseInvoicesParams = {}) {
  const { updateUser, user } = useAuth();
  
  const [state, setState] = useState<UseInvoicesState>({
    invoices: [],
    loading: true,
    error: null,
    total: 0,
    hasMore: false,
    lastUpdated: null,
  });

  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [operationLoading, setOperationLoading] = useState<Record<string, boolean>>({});

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `notification-${Date.now()}`;
    const notification: NotificationState = { message, type, id };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
    
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchInvoices = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const response = await api.getInvoices({
        status: params.status,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        isQuote: params.isQuote,
        limit: 50, // Load more invoices for better UX
      });
      // Support both wrapped and plain array responses with safe narrowing
      let invoices: Invoice[] = [];
      let total: number | undefined;
      let hasMore = false;

      if (Array.isArray(response)) {
        invoices = response as unknown as Invoice[];
        total = invoices.length;
        hasMore = false;
      } else if (response && typeof response === 'object') {
        const obj = response as Record<string, unknown>;
        const maybeInvoices = obj.invoices;
        if (Array.isArray(maybeInvoices)) {
          invoices = maybeInvoices as unknown as Invoice[];
        }
        if (typeof obj.total === 'number') {
          total = obj.total as number;
        }
        hasMore = Boolean(obj.hasMore);
      }

      setState(prev => ({
        ...prev,
        invoices: invoices || [],
        total: total ?? (invoices ? invoices.length : 0),
        hasMore,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors du chargement des factures';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [params.status, params.search, params.sortBy, params.sortOrder, params.isQuote]);

  // Memoize params to prevent unnecessary re-fetches
  const paramsRef = useRef(params);
  useEffect(() => {
    const changed = 
      paramsRef.current.status !== params.status ||
      paramsRef.current.search !== params.search ||
      paramsRef.current.sortBy !== params.sortBy ||
      paramsRef.current.sortOrder !== params.sortOrder ||
      paramsRef.current.isQuote !== params.isQuote;
    
    if (changed) {
      paramsRef.current = params;
    }
  }, [params]);

  const createInvoice = useCallback(async (data: CreateInvoiceRequest): Promise<Invoice | null> => {
    const operationId = 'create';
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));
    const docName = data.isQuote ? 'devis' : 'facture';
    const docNameCapitalized = data.isQuote ? 'Devis' : 'Facture';

    try {
      const newInvoice = await api.createInvoice(data);
      if (!newInvoice) {
        // Safety: if API returns null/undefined, do not mutate state
        showNotification(`La création du ${docName} a échoué`, 'error');
        return null;
      }
      
      // Refresh user data to get updated nextInvoiceNumber
      try {
        const updatedUser = await api.getMyProfile();
        if (updatedUser) {
          updateUser(updatedUser);
        }
      } catch (e) {
        console.error('Failed to refresh user after creating invoice:', e);
      }
      
      // Avoid optimistic update due to potential shape mismatch; refetch instead
      await fetchInvoices(false);

      showNotification(`${docNameCapitalized} créé avec succès`, 'success');
      return newInvoice;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : `Erreur lors de la création du ${docName}`;
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification, fetchInvoices, updateUser]);

  const updateInvoice = useCallback(async (id: string, data: UpdateInvoiceRequest): Promise<Invoice | null> => {
    const operationId = `update-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    // Store original invoice for rollback
    const originalInvoice = state.invoices.find(inv => inv.id === id);
    
    try {
      // Optimistic update (do not override items to avoid type mismatch)
      const safeData: Omit<UpdateInvoiceRequest, 'items'> = { ...(data as Omit<UpdateInvoiceRequest, 'items'>) };
      // Ensure 'items' is not present
      if ((safeData as unknown as Record<string, unknown>).items !== undefined) {
        delete (safeData as unknown as Record<string, unknown>).items;
      }
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.map(invoice => 
          invoice.id === id 
            ? { ...invoice, ...safeData, updatedAt: new Date().toISOString() }
            : invoice
        ),
      }));

      const updatedInvoice = await api.updateInvoice(id, data);
      
      // Update with server response
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.map(invoice => 
          invoice.id === id ? updatedInvoice : invoice
        ),
      }));

      showNotification('Facture mise à jour avec succès', 'success');
      return updatedInvoice;
    } catch (error) {
      // Rollback optimistic update
      if (originalInvoice) {
        setState(prev => ({
          ...prev,
          invoices: prev.invoices.map(invoice => 
            invoice.id === id ? originalInvoice : invoice
          ),
        }));
      }

      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la mise à jour de la facture';
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.invoices, showNotification]);

  const deleteInvoice = useCallback(async (id: string): Promise<boolean> => {
    const operationId = `delete-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    // Store original invoice for rollback
    const originalInvoice = state.invoices.find(inv => inv.id === id);
    
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.filter(invoice => invoice.id !== id),
        total: prev.total - 1,
      }));

      await api.deleteInvoice(id);
      showNotification('Facture supprimée avec succès', 'success');
      return true;
    } catch (error) {
      // Rollback optimistic update
      if (originalInvoice) {
        setState(prev => ({
          ...prev,
          invoices: [...prev.invoices, originalInvoice].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          total: prev.total + 1,
        }));
      }

      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la suppression de la facture';
      
      showNotification(errorMessage, 'error');
      return false;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.invoices, showNotification]);

  const sendInvoice = useCallback(async (id: string, options?: { email?: string; message?: string }): Promise<boolean> => {
    const operationId = `send-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      await api.sendInvoice(id, options);
      
      // Refresh invoices from server to get updated status
      await fetchInvoices(false);

      showNotification('Facture envoyée avec succès', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de l\'envoi de la facture';
      
      showNotification(errorMessage, 'error');
      return false;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification, fetchInvoices]);

  const duplicateInvoice = useCallback(async (id: string): Promise<Invoice | null> => {
    const operationId = `duplicate-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      const duplicatedInvoice = await api.duplicateInvoice(id);
      
      // Add to list
      setState(prev => ({
        ...prev,
        invoices: [duplicatedInvoice, ...prev.invoices],
        total: prev.total + 1,
      }));

      showNotification('Facture dupliquée avec succès', 'success');
      return duplicatedInvoice;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la duplication de la facture';
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification]);

  const downloadPdf = useCallback(async (id: string): Promise<boolean> => {
    const operationId = `download-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      const invoice = state.invoices.find(inv => inv.id === id);
      // Pass user's template and color preferences to PDF generator
      type UserPdfSettings = { pdfTemplate?: string; pdfPrimaryColor?: string };
      const userPdf = user as UserPdfSettings | null;
      const opts: { language?: string; template?: string; accentColor?: string } = {};
      if (invoice?.language) opts.language = invoice.language;
      if (userPdf?.pdfTemplate) opts.template = userPdf.pdfTemplate;
      if (userPdf?.pdfPrimaryColor) opts.accentColor = userPdf.pdfPrimaryColor;
      const pdfBlob = await api.downloadInvoicePdf(id, opts);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      link.download = `${invoice?.invoiceNumber || 'facture'}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showNotification('PDF téléchargé avec succès', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors du téléchargement du PDF';
      
      showNotification(errorMessage, 'error');
      return false;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.invoices, showNotification, user]);

  const refreshInvoices = useCallback(() => {
    fetchInvoices(false); // Don't show loading spinner for refresh
  }, [fetchInvoices]);

  // Initial fetch
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Auto-refresh
  useEffect(() => {
    if (!params.autoRefresh) return;

    const interval = setInterval(() => {
      refreshInvoices();
    }, params.refreshInterval || 30000);

    return () => clearInterval(interval);
  }, [params.autoRefresh, params.refreshInterval, refreshInvoices]);

  return {
    ...state,
    notifications,
    operationLoading,
    // Actions
    createInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    duplicateInvoice,
    downloadPdf,
    refreshInvoices,
    removeNotification,
  };
}