import { renderHook, waitFor, act } from '@testing-library/react';
import { useInvoices } from '../useInvoices';
import { api } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

describe('useInvoices', () => {
  const mockInvoices = [
    {
      id: '1',
      invoiceNumber: 'FAC-2024-001',
      clientId: 'client-1',
      clientName: 'Test Client SA',
      amount: 2500,
      status: 'sent' as const,
      issueDate: '2024-01-15',
      dueDate: '2024-02-14',
      currency: 'CHF',
      qrBillGenerated: true,
      items: [],
      language: 'fr' as const,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      invoiceNumber: 'FAC-2024-002',
      clientId: 'client-2',
      clientName: 'Another Client Sàrl',
      amount: 1800,
      status: 'draft' as const,
      issueDate: '2024-01-12',
      dueDate: '2024-02-11',
      currency: 'CHF',
      qrBillGenerated: false,
      items: [],
      language: 'fr' as const,
      createdAt: '2024-01-12T10:00:00Z',
      updatedAt: '2024-01-12T10:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getInvoices.mockResolvedValue({
      invoices: mockInvoices,
      total: mockInvoices.length,
      hasMore: false
    });
  });

  it('fetches invoices on mount', async () => {
    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    expect(result.current.loading).toBe(true);
    expect(result.current.invoices).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.invoices).toEqual(mockInvoices);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBe(null);
    expect(mockApi.getInvoices).toHaveBeenCalledWith({
      status: undefined,
      search: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      limit: 50
    });
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockApi.getInvoices.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Erreur lors du chargement des factures');
    expect(result.current.invoices).toEqual([]);
  });

  it('creates invoice with optimistic update', async () => {
    const newInvoice = {
      id: '3',
      invoiceNumber: 'FAC-2024-003',
      clientId: 'client-3',
      clientName: 'New Client AG',
      amount: 3000,
      status: 'draft' as const,
      issueDate: '2024-01-20',
      dueDate: '2024-02-19',
      currency: 'CHF',
      qrBillGenerated: false,
      items: [],
      language: 'fr' as const,
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2024-01-20T10:00:00Z'
    };

    mockApi.createInvoice.mockResolvedValue(newInvoice);

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const createData = {
      invoiceNumber: 'FAC-2024-003',
      clientId: 'client-3',
      issueDate: '2024-01-20',
      dueDate: '2024-02-19',
      items: [],
      language: 'fr' as const,
      currency: 'CHF' as const
    };

    let createdInvoice: Awaited<ReturnType<typeof result.current.createInvoice>> = null;
    await act(async () => {
      createdInvoice = await result.current.createInvoice(createData);
    });

    expect(createdInvoice).toEqual(newInvoice);
    expect(result.current.invoices).toHaveLength(3);
    expect(result.current.invoices[0]).toEqual(newInvoice);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Facture créée avec succès');
    expect(result.current.notifications[0].type).toBe('success');
  });

  it('updates invoice with optimistic update', async () => {
    const updatedInvoice = {
      ...mockInvoices[0],
      status: 'paid' as const,
      updatedAt: '2024-01-16T10:00:00Z'
    };

    mockApi.updateInvoice.mockResolvedValue(updatedInvoice);

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updateData = { status: 'paid' as const };

    await act(async () => {
      await result.current.updateInvoice('1', updateData);
    });

    expect(result.current.invoices[0].status).toBe('paid');
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Facture mise à jour avec succès');
  });

  it('deletes invoice with optimistic update', async () => {
    mockApi.deleteInvoice.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteInvoice('1');
    });

    expect(result.current.invoices).toHaveLength(1);
    expect(result.current.invoices[0].id).toBe('2');
    expect(result.current.total).toBe(1);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Facture supprimée avec succès');
  });

  it('sends invoice and updates status', async () => {
    mockApi.sendInvoice.mockResolvedValue({
      success: true,
      sentAt: '2024-01-16T10:00:00Z'
    });

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.sendInvoice('2');
    });

    const updatedInvoice = result.current.invoices.find(inv => inv.id === '2');
    expect(updatedInvoice?.status).toBe('sent');
    expect(updatedInvoice?.sentAt).toBe('2024-01-16T10:00:00Z');
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Facture envoyée avec succès');
  });

  it('duplicates invoice', async () => {
    const duplicatedInvoice = {
      ...mockInvoices[0],
      id: '3',
      invoiceNumber: 'FAC-2024-003',
      status: 'draft' as const,
      createdAt: '2024-01-16T10:00:00Z'
    };

    mockApi.duplicateInvoice.mockResolvedValue(duplicatedInvoice);

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let duplicated: Awaited<ReturnType<typeof result.current.duplicateInvoice>> = null;
    await act(async () => {
      duplicated = await result.current.duplicateInvoice('1');
    });

    expect(duplicated).toEqual(duplicatedInvoice);
    expect(result.current.invoices).toHaveLength(3);
    expect(result.current.invoices[0]).toEqual(duplicatedInvoice);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Facture dupliquée avec succès');
  });

  it('downloads PDF', async () => {
    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockApi.downloadInvoicePdf.mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and related DOM methods
    const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = jest.fn();
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL
      }
    });

    const mockLink = {
      href: '',
      download: '',
      click: mockClick
    };

    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLAnchorElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.downloadPdf('1');
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockLink.download).toBe('FAC-2024-001.pdf');
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('PDF téléchargé avec succès');
  });

  it('handles operation errors with rollback', async () => {
    mockApi.deleteInvoice.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const originalLength = result.current.invoices.length;

    await act(async () => {
      await result.current.deleteInvoice('1');
    });

    // Should rollback the optimistic update
    expect(result.current.invoices).toHaveLength(originalLength);
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('Erreur lors de la suppression de la facture');
  });

  it('tracks operation loading states', async () => {
    mockApi.deleteInvoice.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.deleteInvoice('1');
    });

    expect(result.current.operationLoading['delete-1']).toBe(true);

    await waitFor(() => {
      expect(result.current.operationLoading['delete-1']).toBe(false);
    });
  });

  it('removes notifications', async () => {
    const { result } = renderHook(() => useInvoices({ autoRefresh: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Create a notification
    await act(async () => {
      await result.current.createInvoice({
        invoiceNumber: 'FAC-2024-003',
        clientId: 'client-3',
        issueDate: '2024-01-20',
        dueDate: '2024-02-19',
        items: [],
        language: 'fr',
        currency: 'CHF'
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});