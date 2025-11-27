import { renderHook, act } from '@testing-library/react';
import { useEmail } from '../useEmail';
import { api } from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('useEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendInvoiceEmail', () => {
    it('should send invoice email successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            messageId: 'test-message-id',
            sentTo: 'client@example.com',
            sentAt: '2024-01-01T00:00:00Z',
          },
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useEmail());

      let emailResult;
      await act(async () => {
        emailResult = await result.current.sendInvoiceEmail('invoice-1', {
          recipientEmail: 'client@example.com',
        });
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/invoices/invoice-1/send-email', {
        recipientEmail: 'client@example.com',
      });
      expect(emailResult).toEqual({
        success: true,
        messageId: 'test-message-id',
        sentTo: 'client@example.com',
        sentAt: '2024-01-01T00:00:00Z',
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should send invoice email with custom sender and message', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            messageId: 'test-message-id',
            sentTo: 'client@example.com',
            sentAt: '2024-01-01T00:00:00Z',
          },
        },
      };

      mockedApi.post.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useEmail());

      let emailResult;
      await act(async () => {
        emailResult = await result.current.sendInvoiceEmail('invoice-1', {
          recipientEmail: 'client@example.com',
          senderEmail: 'custom@example.com',
          message: 'Custom message',
        });
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/invoices/invoice-1/send-email', {
        recipientEmail: 'client@example.com',
        senderEmail: 'custom@example.com',
        message: 'Custom message',
      });
      expect(emailResult).toEqual({
        success: true,
        messageId: 'test-message-id',
        sentTo: 'client@example.com',
        sentAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle email send error', async () => {
      mockedApi.post.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Email configuration error' },
          },
        },
      });

      const { result } = renderHook(() => useEmail());

      let emailResult;
      await act(async () => {
        emailResult = await result.current.sendInvoiceEmail('invoice-1', {
          recipientEmail: 'client@example.com',
        });
      });

      expect(emailResult).toEqual({ success: false });
      expect(result.current.error).toBe('Email configuration error');
      expect(result.current.loading).toBe(false);
    });

    it('should handle network error', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEmail());

      let emailResult;
      await act(async () => {
        emailResult = await result.current.sendInvoiceEmail('invoice-1', {
          recipientEmail: 'client@example.com',
        });
      });

      expect(emailResult).toEqual({ success: false });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('getEmailHistory', () => {
    it('should get email history successfully', async () => {
      const mockHistoryData = {
        invoiceId: 'invoice-1',
        invoiceNumber: 'INV-2024-001',
        currentStatus: 'sent',
        emailHistory: [
          {
            type: 'email_sent',
            timestamp: '2024-01-01T00:00:00Z',
            recipient: 'client@example.com',
            status: 'sent',
          },
        ],
      };

      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockHistoryData },
      });

      const { result } = renderHook(() => useEmail());

      let historyResult;
      await act(async () => {
        historyResult = await result.current.getEmailHistory('invoice-1');
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/invoices/invoice-1/email-history');
      expect(historyResult).toEqual(mockHistoryData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle email history error', async () => {
      mockedApi.get.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invoice not found' },
          },
        },
      });

      const { result } = renderHook(() => useEmail());

      let historyResult;
      await act(async () => {
        historyResult = await result.current.getEmailHistory('invoice-1');
      });

      expect(historyResult).toBe(null);
      expect(result.current.error).toBe('Invoice not found');
    });
  });

  describe('testEmailConfiguration', () => {
    it('should test email configuration successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { success: true },
      });

      const { result } = renderHook(() => useEmail());

      let testResult;
      await act(async () => {
        testResult = await result.current.testEmailConfiguration('test@example.com');
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/email/test', {
        email: 'test@example.com',
      });
      expect(testResult).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle test email configuration error', async () => {
      mockedApi.post.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'SMTP configuration invalid' },
          },
        },
      });

      const { result } = renderHook(() => useEmail());

      let testResult;
      await act(async () => {
        testResult = await result.current.testEmailConfiguration('test@example.com');
      });

      expect(testResult).toBe(false);
      expect(result.current.error).toBe('SMTP configuration invalid');
    });
  });

  describe('getEmailServiceStatus', () => {
    it('should get email service status successfully', async () => {
      const mockStatusData = {
        status: 'connected',
        smtpHost: 'smtp.gmail.com',
        smtpPort: '587',
        smtpUser: 'test@gmail.com',
        lastChecked: '2024-01-01T00:00:00Z',
      };

      mockedApi.get.mockResolvedValueOnce({
        data: { success: true, data: mockStatusData },
      });

      const { result } = renderHook(() => useEmail());

      let statusResult;
      await act(async () => {
        statusResult = await result.current.getEmailServiceStatus();
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/email/status');
      expect(statusResult).toEqual(mockStatusData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle email service status error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Service unavailable'));

      const { result } = renderHook(() => useEmail());

      let statusResult;
      await act(async () => {
        statusResult = await result.current.getEmailServiceStatus();
      });

      expect(statusResult).toBe(null);
      expect(result.current.error).toBe('Service unavailable');
    });
  });

  describe('loading states', () => {
    it('should set loading to true during API calls', async () => {
      mockedApi.post.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
      );

      const { result } = renderHook(() => useEmail());

      act(() => {
        result.current.sendInvoiceEmail('invoice-1', {
          recipientEmail: 'client@example.com',
        });
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
      mockedApi.post.mockResolvedValueOnce({
        data: { success: false, error: { message: 'Custom API Error' } },
      });

      const { result } = renderHook(() => useEmail());

      let emailResult;
      await act(async () => {
        emailResult = await result.current.sendInvoiceEmail('invoice-1', {
          recipientEmail: 'client@example.com',
        });
      });

      expect(emailResult).toEqual({ success: false });
      expect(result.current.error).toBe('Custom API Error');
    });

    it('should handle network errors with fallback message', async () => {
      mockedApi.post.mockRejectedValueOnce({});

      const { result } = renderHook(() => useEmail());

      let emailResult;
      await act(async () => {
        emailResult = await result.current.sendInvoiceEmail('invoice-1', {
          recipientEmail: 'client@example.com',
        });
      });

      expect(emailResult).toEqual({ success: false });
      expect(result.current.error).toBe('Erreur lors de l\'envoi de l\'email');
    });
  });
});