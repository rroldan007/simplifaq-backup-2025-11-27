import { renderHook, act } from '@testing-library/react';
import { useReports } from '../useReports';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// Mock the API
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock useAuth
jest.mock('../../contexts/AuthContext');
const mockedUseAuth = useAuth as jest.Mock;

describe('useReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to a default non-admin user before each test
    mockedUseAuth.mockReturnValue({
      state: { user: { id: 'user-123', role: 'user' } }
    });
  });

  describe('generateTVAReport', () => {
    it('should generate TVA report successfully', async () => {
      const mockTVAData = {
        period: { from: '2024-01-01', to: '2024-03-31', label: 'Q1 2024' },
        company: { companyName: 'Test Company' },
        tvaRates: [],
        summary: { totalNet: 1000, totalTva: 81, totalGross: 1081 },
        generatedAt: '2024-01-01T00:00:00Z',
        currency: 'CHF'
      };

      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockTVAData }
      });

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateTVAReport('2024-01-01', '2024-03-31');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/reports/tva-report', {
        params: { from: '2024-01-01', to: '2024-03-31' }
      });
      expect(reportData).toEqual(mockTVAData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle TVA report error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateTVAReport('2024-01-01', '2024-03-31');
      });

      expect(reportData).toBe(null);
      expect(result.current.error).toBe('API Error');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('generateIncomeReport', () => {
    it('should generate income report successfully', async () => {
      const mockIncomeData = {
        period: { type: 'month', from: '2024-01-01', to: '2024-01-31', label: 'January 2024' },
        summary: { totalInvoices: 10, totalRevenue: 5000, averageInvoiceValue: 500 },
        invoicesByStatus: { paid: { count: 8, revenue: 4000 } },
        topClients: [],
        generatedAt: '2024-01-01T00:00:00Z',
        currency: 'CHF'
      };

      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockIncomeData }
      });

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateIncomeReport('month', 2024, 1);
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/reports/income-report', {
        params: { period: 'month', year: 2024, month: 1 }
      });
      expect(reportData).toEqual(mockIncomeData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle income report error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateIncomeReport('month', 2024, 1);
      });

      expect(reportData).toBe(null);
      expect(result.current.error).toBe('API Error');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('generateClientReport', () => {
    it('should generate client report successfully', async () => {
      const mockClientData = {
        period: { startDate: '2024-01-01', endDate: '2024-12-31', label: '2024' },
        selectedClient: { id: '1', name: 'Test Client', email: 'test@example.com', address: 'Test Address' },
        summary: { totalRevenue: 10000, totalInvoices: 20, averageInvoiceAmount: 500 },
        invoiceHistory: [],
        paymentBehavior: { onTimePayments: 18, latePayments: 2 },
        monthlyActivity: [],
        generatedAt: '2024-01-01T00:00:00Z',
        currency: 'CHF'
      };

      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockClientData }
      });

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateClientReport('2024-01-01', '2024-12-31', 'client-1');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/reports/client-report', {
        params: { from: '2024-01-01', to: '2024-12-31', clientId: 'client-1' }
      });
      expect(reportData).toEqual(mockClientData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should generate client report without clientId', async () => {
      const mockClientData = {
        period: { startDate: '2024-01-01', endDate: '2024-12-31', label: '2024' },
        summary: { totalRevenue: 10000, totalInvoices: 20, averageInvoiceAmount: 500 },
        invoiceHistory: [],
        paymentBehavior: { onTimePayments: 18, latePayments: 2 },
        monthlyActivity: [],
        generatedAt: '2024-01-01T00:00:00Z',
        currency: 'CHF'
      };

      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockClientData }
      });

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateClientReport('2024-01-01', '2024-12-31');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/reports/client-report', {
        params: { from: '2024-01-01', to: '2024-12-31' }
      });
      expect(reportData).toEqual(mockClientData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle client report error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateClientReport('2024-01-01', '2024-12-31');
      });

      expect(reportData).toBe(null);
      expect(result.current.error).toBe('API Error');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('getFinancialSummary', () => {
    const mockSummaryData = {
      period: { from: '2024-01-01', to: '2024-01-31' },
      invoices: { total: 10, paid: 8, sent: 2 },
      revenue: { total: 5000, pending: 1000 },
      tva: { totalTva: 405, totalNet: 4595 }
    };

    it('should call the standard endpoint for a regular user', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockSummaryData }
      });

      const { result } = renderHook(() => useReports());

      let summaryData;
      await act(async () => {
        summaryData = await result.current.getFinancialSummary('2024-01-01', '2024-01-31');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/reports/financial-summary', {
        params: { from: '2024-01-01', to: '2024-01-31' }
      });
      expect(summaryData).toEqual(mockSummaryData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should call the admin endpoint for an admin user', async () => {
      mockedUseAuth.mockReturnValue({
        state: { user: { id: 'admin-123', role: 'admin' } }
      });

      const mockAdminSummaryData = { ...mockSummaryData, source: 'admin' };

      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockAdminSummaryData }
      });

      const { result } = renderHook(() => useReports());

      let summaryData;
      await act(async () => {
        summaryData = await result.current.getFinancialSummary('2024-01-01', '2024-01-31');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/admin/reports/financial-summary', {
        params: { from: '2024-01-01', to: '2024-01-31' }
      });
      expect(summaryData).toEqual(mockAdminSummaryData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle financial summary error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useReports());

      let summaryData;
      await act(async () => {
        summaryData = await result.current.getFinancialSummary('2024-01-01', '2024-01-31');
      });

      expect(summaryData).toBe(null);
      expect(result.current.error).toBe('API Error');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('export functions', () => {
    it('should handle PDF export (not implemented)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() => useReports());

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportReportPDF('tva', { test: 'data' });
      });

      expect(consoleSpy).toHaveBeenCalledWith('PDF export not yet implemented', {
        reportType: 'tva',
        params: { test: 'data' }
      });
      expect(exportResult).toBe(null);

      consoleSpy.mockRestore();
    });

    it('should handle Excel export (not implemented)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() => useReports());

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportReportExcel('income', { test: 'data' });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Excel export not yet implemented', {
        reportType: 'income',
        params: { test: 'data' }
      });
      expect(exportResult).toBe(null);

      consoleSpy.mockRestore();
    });
  });

  describe('loading states', () => {
    it('should set loading to true during API calls', async () => {
      mockedApi.get.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { success: true, data: {} } }), 100))
      );

      const { result } = renderHook(() => useReports());

      act(() => {
        result.current.generateTVAReport('2024-01-01', '2024-03-31');
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle API response errors', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { success: false, error: { message: 'Custom API Error', code: 'CUSTOM_ERROR' } }
      });

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateTVAReport('2024-01-01', '2024-03-31');
      });

      expect(reportData).toBe(null);
      expect(result.current.error).toBe('Custom API Error');
    });

    it('should handle network errors', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: { data: { error: { message: 'Network Error', code: 'NETWORK_ERROR' } } }
      });

      const { result } = renderHook(() => useReports());

      let reportData;
      await act(async () => {
        reportData = await result.current.generateTVAReport('2024-01-01', '2024-03-31');
      });

      expect(reportData).toBe(null);
      expect(result.current.error).toBe('Network Error');
    });
  });
});