import { useState, useEffect, useCallback, useRef } from 'react';
import { quotesApi, type Quote, type CreateQuoteRequest, type UpdateQuoteRequest } from '../services/quotesApi';
import { ApiError, api } from '../services/api';
import { useAuth } from './useAuth';

interface UseQuotesParams {
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseQuotesState {
  quotes: Quote[];
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

export function useQuotes(params: UseQuotesParams = {}) {
  const { updateUser, user } = useAuth();
  
  const [state, setState] = useState<UseQuotesState>({
    quotes: [],
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

  const fetchQuotes = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const quotes = await quotesApi.getQuotes({
        status: params.status,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        limit: 50,
      });

      // Ensure quotes is an array
      const quotesArray = Array.isArray(quotes) ? quotes : [];

      setState(prev => ({
        ...prev,
        quotes: quotesArray,
        total: quotesArray.length,
        hasMore: false,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors du chargement des devis';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [params.status, params.search, params.sortBy, params.sortOrder]);

  // Memoize params to prevent unnecessary re-fetches
  const paramsRef = useRef(params);
  useEffect(() => {
    const changed = 
      paramsRef.current.status !== params.status ||
      paramsRef.current.search !== params.search ||
      paramsRef.current.sortBy !== params.sortBy ||
      paramsRef.current.sortOrder !== params.sortOrder;
    
    if (changed) {
      paramsRef.current = params;
    }
  }, [params]);

  const createQuote = useCallback(async (data: CreateQuoteRequest): Promise<Quote | null> => {
    const operationId = 'create';
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      const newQuote = await quotesApi.createQuote(data);
      if (!newQuote) {
        showNotification('La création du devis a échoué', 'error');
        return null;
      }

      // Refresh user data to get updated nextQuoteNumber
      try {
        const updatedUser = await api.getMyProfile();
        if (updatedUser) {
          updateUser(updatedUser as any);
        }
      } catch (e) {
        console.error('Failed to refresh user after creating quote:', e);
      }

      await fetchQuotes(false);
      showNotification('Devis créé avec succès', 'success');
      return newQuote;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la création du devis';
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification, fetchQuotes, updateUser]);

  const updateQuote = useCallback(async (id: string, data: UpdateQuoteRequest): Promise<Quote | null> => {
    const operationId = `update-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    const originalQuote = state.quotes.find(q => q.id === id);
    
    try {
      // Optimistic update - only update safe fields (not items)
      const safeData: Partial<Quote> = {};
      if (data.status) safeData.status = data.status;
      if (data.notes !== undefined) safeData.notes = data.notes;
      if (data.terms !== undefined) safeData.terms = data.terms;
      if (data.validUntil !== undefined) safeData.validUntil = data.validUntil;
      
      setState(prev => ({
        ...prev,
        quotes: prev.quotes.map(quote => 
          quote.id === id 
            ? { ...quote, ...safeData, updatedAt: new Date().toISOString() }
            : quote
        ),
      }));

      const updatedQuote = await quotesApi.updateQuote(id, data);
      
      // Update with server response
      setState(prev => ({
        ...prev,
        quotes: prev.quotes.map(quote => 
          quote.id === id ? updatedQuote : quote
        ),
      }));

      showNotification('Devis mis à jour avec succès', 'success');
      return updatedQuote;
    } catch (error) {
      // Rollback
      if (originalQuote) {
        setState(prev => ({
          ...prev,
          quotes: prev.quotes.map(quote => 
            quote.id === id ? originalQuote : quote
          ),
        }));
      }

      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la mise à jour du devis';
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.quotes, showNotification]);

  const deleteQuote = useCallback(async (id: string): Promise<boolean> => {
    const operationId = `delete-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    const originalQuote = state.quotes.find(q => q.id === id);
    
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        quotes: prev.quotes.filter(quote => quote.id !== id),
        total: prev.total - 1,
      }));

      await quotesApi.deleteQuote(id);
      showNotification('Devis supprimé avec succès', 'success');
      return true;
    } catch (error) {
      // Rollback
      if (originalQuote) {
        setState(prev => ({
          ...prev,
          quotes: [...prev.quotes, originalQuote].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          total: prev.total + 1,
        }));
      }

      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la suppression du devis';
      
      showNotification(errorMessage, 'error');
      return false;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.quotes, showNotification]);

  const downloadPdf = useCallback(async (id: string, options?: {
    template?: string;
    accentColor?: string;
  }): Promise<boolean> => {
    const operationId = `download-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      const quote = state.quotes.find(q => q.id === id);
      // Merge user preferences with provided options
      const pdfOptions = {
        template: options?.template || (user as any)?.pdfTemplate,
        accentColor: options?.accentColor || (user as any)?.pdfPrimaryColor,
      };
      const pdfBlob = await quotesApi.downloadQuotePdf(id, pdfOptions);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `devis-${quote?.quoteNumber || id}.pdf`;
      
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
  }, [state.quotes, showNotification, user]);

  const sendQuote = useCallback(async (id: string, options?: { email?: string; message?: string }): Promise<boolean> => {
    const operationId = `send-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      await quotesApi.sendQuote(id, options);
      
      // Wait a bit for backend to update, then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh quotes from server to get updated status
      await fetchQuotes(false);

      showNotification('Devis envoyé avec succès', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de l\'envoi du devis';
      
      showNotification(errorMessage, 'error');
      return false;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification, fetchQuotes]);

  const convertToInvoice = useCallback(async (id: string): Promise<{ id: string; invoiceNumber: string } | null> => {
    const operationId = `convert-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      const result = await quotesApi.convertToInvoice(id);
      
      // Update quote status to accepted and mark as converted
      setState(prev => ({
        ...prev,
        quotes: prev.quotes.map(quote => 
          quote.id === id 
            ? { ...quote, status: 'accepted' as const, convertedInvoiceId: result.id }
            : quote
        ),
      }));

      showNotification(`Devis converti en facture ${result.invoiceNumber}`, 'success');
      return result;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la conversion du devis';
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification]);

  const refreshQuotes = useCallback(() => {
    fetchQuotes(false);
  }, [fetchQuotes]);

  // Initial fetch
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Auto-refresh
  useEffect(() => {
    if (!params.autoRefresh) return;

    const interval = setInterval(() => {
      refreshQuotes();
    }, params.refreshInterval || 30000);

    return () => clearInterval(interval);
  }, [params.autoRefresh, params.refreshInterval, refreshQuotes]);

  return {
    ...state,
    notifications,
    operationLoading,
    // Actions
    createQuote,
    updateQuote,
    deleteQuote,
    sendQuote,
    downloadPdf,
    convertToInvoice,
    refreshQuotes,
    removeNotification,
  };
}
