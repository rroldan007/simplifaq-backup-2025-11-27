import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../services/api';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton?: string;
  };
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Accept both nested and flat address inputs when creating a client
type CreateClientInput =
  | CreateClientRequest
  | (Omit<CreateClientRequest, 'address'> & {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
      canton?: string;
    });

interface CreateClientRequest {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton?: string;
  };
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
}

interface UpdateClientRequest extends Partial<Omit<CreateClientRequest, 'address'>> {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  canton?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton?: string;
  };
}

interface UseClientsParams {
  search?: string;
  status?: 'active' | 'inactive';
  type?: 'company' | 'individual';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseClientsState {
  clients: Client[];
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

export function useClients(params: UseClientsParams = {}) {
  const [state, setState] = useState<UseClientsState>({
    clients: [],
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

  const fetchClients = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const response = await api.getClients({
        search: params.search,
        status: params.status,
        type: params.type,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        limit: 50, // Load more clients for better UX
      });

      setState(prev => ({
        ...prev,
        clients: response.clients,
        total: response.total,
        hasMore: response.hasMore,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors du chargement des clients';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [params.search, params.status, params.type, params.sortBy, params.sortOrder]);

  const validateSwissAddress = (address: CreateClientRequest['address']): string[] => {
    const errors: string[] = [];

    // Check for both 'Suisse' and 'Switzerland' as valid Swiss country names
    if (address.country === 'Suisse' || address.country === 'Switzerland') {
      // Swiss postal code validation (4 digits) - make it more flexible
      if (address.postalCode && !/^\d{4}$/.test(address.postalCode.trim())) {
        errors.push('Code postal suisse invalide (4 chiffres requis)');
      }

      // Swiss city validation - just basic length check
      if (address.city && address.city.trim().length < 2) {
        errors.push('Nom de ville trop court');
      }
    }

    return errors;
  };

  const validateVatNumber = (vatNumber?: string): string[] => {
    const errors: string[] = [];

    if (vatNumber && vatNumber.trim()) {
      // More flexible Swiss VAT number validation - allow various formats
      const cleanVat = vatNumber.trim().toUpperCase();
      // Accept CHE-XXX.XXX.XXX, CHE-XXXXXXXXX, or similar variations
      if (!/^CHE[-\s]?\d{3}\.?\d{3}\.?\d{3}(\s?(TVA|MWST|IVA))?$/i.test(cleanVat)) {
        // Only show error for clearly invalid formats, but be more permissive
        if (!cleanVat.startsWith('CHE')) {
          errors.push('Numéro TVA suisse doit commencer par CHE');
        }
      }
    }

    return errors;
  };

  const createClient = useCallback(async (data: CreateClientInput): Promise<Client | null> => {
    const operationId = 'create';
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    try {
      // Handle both nested and flat address structures
      const d = data as Partial<CreateClientRequest> & Partial<Record<'street'|'city'|'postalCode'|'country'|'canton', string>>;
      const addressData = (d.address as CreateClientRequest['address']) || {
        street: d.street || '',
        city: d.city || '',
        postalCode: d.postalCode || '',
        country: d.country || 'Switzerland',
        canton: d.canton || ''
      };

      // Frontend validation
      const addressErrors = validateSwissAddress(addressData);
      const vatErrors = validateVatNumber(data.vatNumber);
      const allErrors = [...addressErrors, ...vatErrors];

      if (allErrors.length > 0) {
        showNotification(allErrors[0], 'error');
        return null;
      }

      // Prepare client data with proper address structure
      const clientData: CreateClientRequest = {
        companyName: d.companyName || undefined,
        firstName: d.firstName || undefined,
        lastName: d.lastName || undefined,
        email: String(d.email || ''),
        phone: d.phone || undefined,
        address: addressData,
        vatNumber: d.vatNumber || undefined,
        language: (d.language as Client['language']) || 'fr',
        paymentTerms: typeof d.paymentTerms === 'number' ? d.paymentTerms : 30,
        notes: d.notes || undefined,
        isActive: d.isActive !== false // Default to true if not specified
      };

      const created = await api.createClient(clientData);

      // Optimistic update
      setState(prev => ({
        ...prev,
        clients: [created, ...prev.clients],
        total: prev.total + 1,
      }));

      showNotification('Client créé avec succès', 'success');
      return created;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la création du client';
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [showNotification]);

  const updateClient = useCallback(async (id: string, data: UpdateClientRequest): Promise<Client | null> => {
    const operationId = `update-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    // Store original client for rollback
    const originalClient = state.clients.find(client => client.id === id);
    
    try {
      let updateData = { ...data };
      
      // If address is being updated, flatten it
      if (data.address) {
        const addressErrors = validateSwissAddress(data.address);
        if (addressErrors.length > 0) {
          showNotification(addressErrors[0], 'error');
          return null;
        }
        
        // Flatten the address object
        const { address, ...restData } = data;
        updateData = {
          ...restData,
          street: address.street,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          canton: address.canton
        };
      }

      if (data.vatNumber !== undefined) {
        const vatErrors = validateVatNumber(data.vatNumber);
        if (vatErrors.length > 0) {
          showNotification(vatErrors[0], 'error');
          return null;
        }
      }

      // Optimistic update - use the flattened data
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(client => 
          client.id === id 
            ? { 
                ...client, 
                ...updateData, 
                updatedAt: new Date().toISOString(),
                // Ensure address is properly structured for the UI
                address: data.address || client.address
              }
            : client
        ),
      }));

      // Use the flattened updateData for the API call
      const updatedClient = await api.updateClient(id, updateData);
      
      // Update with server response (already normalized by API)
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(client => 
          client.id === id ? updatedClient : client
        ),
      }));

      showNotification('Client mis à jour avec succès', 'success');
      return updatedClient;
    } catch (error) {
      // Rollback optimistic update
      if (originalClient) {
        setState(prev => ({
          ...prev,
          clients: prev.clients.map(client => 
            client.id === id ? originalClient : client
          ),
        }));
      }

      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la mise à jour du client';
      
      showNotification(errorMessage, 'error');
      return null;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.clients, showNotification]);

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    const operationId = `delete-${id}`;
    setOperationLoading(prev => ({ ...prev, [operationId]: true }));

    // Store original client for rollback
    const originalClient = state.clients.find(client => client.id === id);
    
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        clients: prev.clients.filter(client => client.id !== id),
        total: prev.total - 1,
      }));

      await api.deleteClient(id);
      showNotification('Client supprimé avec succès', 'success');
      return true;
    } catch (error) {
      // Rollback optimistic update
      if (originalClient) {
        setState(prev => ({
          ...prev,
          clients: [...prev.clients, originalClient].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          total: prev.total + 1,
        }));
      }

      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la suppression du client';
      
      showNotification(errorMessage, 'error');
      return false;
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationId]: false }));
    }
  }, [state.clients, showNotification]);

  const toggleClientStatus = useCallback(async (id: string): Promise<boolean> => {
    const client = state.clients.find(c => c.id === id);
    if (!client) return false;

    const newStatus = !client.isActive;
    const result = await updateClient(id, { isActive: newStatus });
    
    if (result) {
      const statusText = newStatus ? 'activé' : 'désactivé';
      showNotification(`Client ${statusText} avec succès`, 'success');
      return true;
    }
    
    return false;
  }, [state.clients, updateClient, showNotification]);

  const searchClients = useCallback(async (query: string, limit = 10): Promise<Client[]> => {
    try {
      return await api.searchClients(query, limit);
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Erreur lors de la recherche de clients';
      
      showNotification(errorMessage, 'error');
      return [];
    }
  }, [showNotification]);

  const refreshClients = useCallback(() => {
    fetchClients(false); // Don't show loading spinner for refresh
  }, [fetchClients]);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Auto-refresh
  useEffect(() => {
    if (!params.autoRefresh) return;

    const interval = setInterval(() => {
      refreshClients();
    }, params.refreshInterval || 30000);

    return () => clearInterval(interval);
  }, [params.autoRefresh, params.refreshInterval, refreshClients]);

  return {
    ...state,
    notifications,
    operationLoading,
    // Actions
    createClient,
    updateClient,
    deleteClient,
    toggleClientStatus,
    searchClients,
    refreshClients,
    removeNotification,
  };
}