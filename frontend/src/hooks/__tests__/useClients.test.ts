import { renderHook, waitFor, act } from '@testing-library/react';
import { useClients } from '../useClients';
import { api } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Local test type mirroring the Client shape from useClients
interface TestClient {
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

describe('useClients', () => {
  const mockClients: TestClient[] = [
    {
      id: '1',
      companyName: 'Test Company SA',
      email: 'contact@testcompany.ch',
      phone: '+41 22 123 45 67',
      address: {
        street: 'Rue de la Paix 123',
        city: 'Genève',
        postalCode: '1200',
        country: 'Suisse',
        canton: 'GE'
      },
      vatNumber: 'CHE-123.456.789',
      language: 'fr' as const,
      paymentTerms: 30,
      notes: 'Important client',
      isActive: true,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@email.ch',
      address: {
        street: 'Chemin des Fleurs 78',
        city: 'Zurich',
        postalCode: '8000',
        country: 'Suisse',
        canton: 'ZH'
      },
      language: 'de' as const,
      paymentTerms: 15,
      isActive: false,
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getClients.mockResolvedValue({
      clients: mockClients,
      total: mockClients.length,
      hasMore: false
    });
  });

  it('fetches clients on mount', async () => {
    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    expect(result.current.loading).toBe(true);
    expect(result.current.clients).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.clients).toEqual(mockClients);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBe(null);
    expect(mockApi.getClients).toHaveBeenCalledWith({
      search: undefined,
      status: undefined,
      type: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      limit: 50
    });
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockApi.getClients.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Erreur lors du chargement des clients');
    expect(result.current.clients).toEqual([]);
  });

  it('creates client with optimistic update', async () => {
    const newClient = {
      id: '3',
      companyName: 'New Company AG',
      email: 'contact@newcompany.ch',
      address: {
        street: 'Bahnhofstrasse 1',
        city: 'Zurich',
        postalCode: '8001',
        country: 'Suisse',
        canton: 'ZH'
      },
      language: 'de' as const,
      paymentTerms: 30,
      isActive: true,
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2024-01-20T10:00:00Z'
    };

    mockApi.createClient.mockResolvedValue(newClient);

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const createData = {
      companyName: 'New Company AG',
      email: 'contact@newcompany.ch',
      address: {
        street: 'Bahnhofstrasse 1',
        city: 'Zurich',
        postalCode: '8001',
        country: 'Suisse',
        canton: 'ZH'
      },
      language: 'de' as const,
      paymentTerms: 30,
      isActive: true
    };

    let createdClient: TestClient | null = null;
    await act(async () => {
      createdClient = await result.current.createClient(createData);
    });

    expect(createdClient).toEqual(newClient);
    expect(result.current.clients).toHaveLength(3);
    expect(result.current.clients[0]).toEqual(newClient);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Client créé avec succès');
    expect(result.current.notifications[0].type).toBe('success');
  });

  it('validates Swiss address during creation', async () => {
    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const invalidData = {
      companyName: 'Test Company',
      email: 'test@company.ch',
      address: {
        street: 'Test Street 1',
        city: 'Zurich',
        postalCode: '123', // Invalid Swiss postal code
        country: 'Suisse',
        canton: 'ZH'
      },
      language: 'fr' as const,
      paymentTerms: 30,
      isActive: true
    };

    let result_client: TestClient | null = null;
    await act(async () => {
      result_client = await result.current.createClient(invalidData);
    });

    expect(result_client).toBe(null);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toContain('Code postal suisse invalide');
  });

  it('validates VAT number during creation', async () => {
    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const invalidData = {
      companyName: 'Test Company',
      email: 'test@company.ch',
      address: {
        street: 'Test Street 1',
        city: 'Zurich',
        postalCode: '8001',
        country: 'Suisse',
        canton: 'ZH'
      },
      vatNumber: 'INVALID-VAT', // Invalid VAT format
      language: 'fr' as const,
      paymentTerms: 30,
      isActive: true
    };

    let result_client: TestClient | null = null;
    await act(async () => {
      result_client = await result.current.createClient(invalidData);
    });

    expect(result_client).toBe(null);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toContain('Format de numéro TVA suisse invalide');
  });

  it('updates client with optimistic update', async () => {
    const updatedClient = {
      ...mockClients[0],
      paymentTerms: 45,
      updatedAt: '2024-01-16T10:00:00Z'
    };

    mockApi.updateClient.mockResolvedValue(updatedClient);

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData = { paymentTerms: 45 };

    await act(async () => {
      await result.current.updateClient('1', updateData);
    });

    expect(result.current.clients[0].paymentTerms).toBe(45);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Client mis à jour avec succès');
  });

  it('deletes client with optimistic update', async () => {
    mockApi.deleteClient.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteClient('1');
    });

    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].id).toBe('2');
    expect(result.current.total).toBe(1);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Client supprimé avec succès');
  });

  it('toggles client status', async () => {
    const updatedClient = {
      ...mockClients[1],
      isActive: true,
      updatedAt: '2024-01-16T10:00:00Z'
    };

    mockApi.updateClient.mockResolvedValue(updatedClient);

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleClientStatus('2');
    });

    const updatedClientInState = result.current.clients.find(c => c.id === '2');
    expect(updatedClientInState?.isActive).toBe(true);
    expect(result.current.notifications).toHaveLength(2); // Update success + toggle success
    expect(result.current.notifications[1].message).toBe('Client activé avec succès');
  });

  it('searches clients', async () => {
    const searchResults = [mockClients[0]];
    mockApi.searchClients.mockResolvedValue(searchResults);

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let searchResult: TestClient[] = [];
    await act(async () => {
      searchResult = await result.current.searchClients('Test Company');
    });

    expect(searchResult).toEqual(searchResults);
    expect(mockApi.searchClients).toHaveBeenCalledWith('Test Company', 10);
  });

  it('handles operation errors with rollback', async () => {
    mockApi.deleteClient.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const originalLength = result.current.clients.length;

    await act(async () => {
      await result.current.deleteClient('1');
    });

    // Should rollback the optimistic update
    expect(result.current.clients).toHaveLength(originalLength);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('Erreur lors de la suppression du client');
  });

  it('tracks operation loading states', async () => {
    mockApi.deleteClient.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.deleteClient('1');
    });

    expect(result.current.operationLoading['delete-1']).toBe(true);

    await waitFor(() => {
      expect(result.current.operationLoading['delete-1']).toBe(false);
    });
  });

  it('removes notifications', async () => {
    const { result } = renderHook(() => useClients({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Create a notification
    await act(async () => {
      await result.current.createClient({
        companyName: 'Test Company',
        email: 'test@company.ch',
        address: {
          street: 'Test Street 1',
          city: 'Zurich',
          postalCode: '8001',
          country: 'Suisse',
          canton: 'ZH'
        },
        language: 'fr',
        paymentTerms: 30,
        isActive: true
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('filters clients by parameters', async () => {
    const { result } = renderHook(() => useClients({ 
      search: 'Test Company',
      status: 'active',
      type: 'company',
      autoRefresh: false 
    }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.getClients).toHaveBeenCalledWith({
      search: 'Test Company',
      status: 'active',
      type: 'company',
      sortBy: undefined,
      sortOrder: undefined,
      limit: 50
    });
  });
});