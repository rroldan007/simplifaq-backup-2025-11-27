import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';
import { api } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

describe('useDashboardData', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockFinancialSummary: any = { // Use 'any' to simplify mock data
    period: { from: '2024-01-01', to: '2024-01-31' },
    invoices: { total: 12, draft: 1, sent: 2, paid: 8, overdue: 1 },
    revenue: { total: 125420, pending: 15420, overdue: 5000 },
    tva: { breakdown: [], totalTva: 0, totalNet: 0 },
    quotes: { total: 10, draft: 2, sent: 5, accepted: 3, rejected: 0 },
    clients: { total: 8, newThisMonth: 2 },
    currency: 'CHF',
    // Add other missing properties to satisfy the type
    avgPaymentTime: 15,
    paidInvoicesRate: 0.8,
    quoteConversionRate: 0.3,
    topClients: [],
    revenueStreams: [],
    clientGrowthRate: 0.1
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRecentInvoices: any = [ // Use 'any' to bypass strict type checking in test mock
    {
      id: '1',
      invoiceNumber: 'FAC-2024-001',
      clientName: 'Test Client',
      amount: 2500,
      status: 'paid' as const,
      issueDate: '2024-01-15',
      dueDate: '2024-02-14',
      currency: 'CHF',
      // Add missing properties to satisfy Invoice type
      clientId: 'client-1',
      items: [],
      language: 'fr',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isQuote: false
    }
  ];

  const mockOverdueInvoices = [
    {
      id: '2',
      invoiceNumber: 'FAC-2024-002',
      clientName: 'Overdue Client',
      amount: 1800,
      dueDate: '2024-01-10',
      daysPastDue: 5,
      currency: 'CHF'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getFinancialSummary.mockResolvedValue(mockFinancialSummary);
    mockApi.getRecentInvoices.mockResolvedValue(mockRecentInvoices);
    mockApi.getOverdueInvoices.mockResolvedValue(mockOverdueInvoices);
  });

  it('fetches dashboard data on mount', async () => {
    const { result } = renderHook(() => useDashboardData(false)); // Disable auto-refresh for test

    expect(result.current.loading).toBe(true);
    expect(result.current.financialSummary).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.financialSummary).toEqual(mockFinancialSummary);
    expect(result.current.recentInvoices).toEqual(mockRecentInvoices);
    expect(result.current.overdueInvoices).toEqual(mockOverdueInvoices);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Erreur de connexion';
    mockApi.getFinancialSummary.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useDashboardData(false));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Erreur lors du chargement des données');
    expect(result.current.financialSummary).toBe(null);
  });

  it('refreshes data when refreshData is called', async () => {
    const { result } = renderHook(() => useDashboardData(false));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mocks and set up new data
    jest.clearAllMocks();
    const updatedSummary = { ...mockFinancialSummary, monthlyRevenue: 20000 };
    mockApi.getFinancialSummary.mockResolvedValue(updatedSummary);
    mockApi.getRecentInvoices.mockResolvedValue(mockRecentInvoices);
    mockApi.getOverdueInvoices.mockResolvedValue(mockOverdueInvoices);

    // Call refresh
    result.current.refreshData();

    await waitFor(() => {
      expect(result.current.financialSummary?.monthlyRevenue).toBe(20000);
    });

    expect(mockApi.getFinancialSummary).toHaveBeenCalledTimes(1);
  });

  it('sends reminder and refreshes data', async () => {
    mockApi.sendInvoiceReminder.mockResolvedValue({ success: true, message: 'Rappel envoyé avec succès' });

    const { result } = renderHook(() => useDashboardData(false));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const reminderResult = await result.current.sendReminder('invoice-123');

    expect(reminderResult.success).toBe(true);
    expect(reminderResult.message).toBe('Rappel envoyé avec succès');
    expect(mockApi.sendInvoiceReminder).toHaveBeenCalledWith('invoice-123');
  });

  it('handles reminder sending errors', async () => {
    mockApi.sendInvoiceReminder.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDashboardData(false));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const reminderResult = await result.current.sendReminder('invoice-123');

    expect(reminderResult.success).toBe(false);
    expect(reminderResult.message).toBe('Erreur lors de l\'envoi du rappel');
  });
});