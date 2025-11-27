import { useState, useCallback } from 'react';
import { api } from '../services/api';

export interface EmailHistory {
  type: 'email_sent' | 'invoice_sent';
  timestamp: string;
  recipient: string;
  status: 'sent' | 'failed';
}

export interface EmailServiceStatus {
  status: 'connected' | 'disconnected';
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  lastChecked: string;
}

export interface SendEmailData {
  recipientEmail: string;
  senderEmail?: string;
  message?: string;
}

// Safely extract an error message from unknown error shapes (Axios or generic Error)
function extractApiErrorMessage(err: unknown, fallback: string): string {
  // Try axios-style error: err.response.data.error.message
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const maybeResponse = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    const maybeMsg = maybeResponse?.data?.error?.message;
    if (typeof maybeMsg === 'string') return maybeMsg;
  }
  // Generic Error
  if (err instanceof Error && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return fallback;
}

export function useEmail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvoiceEmail = useCallback(async (
    invoiceId: string, 
    emailData: SendEmailData
  ): Promise<{ success: boolean; messageId?: string; sentTo?: string; sentAt?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<{
        messageId: string;
        sentTo: string;
        sentAt: string;
      }>(`/invoices/${invoiceId}/send-email`, emailData);

      if (response.data.success && response.data.data) {
        const payload = response.data.data;
        return {
          success: true,
          messageId: payload.messageId,
          sentTo: payload.sentTo,
          sentAt: payload.sentAt,
        };
      }
      throw new Error(response.data.error?.message || 'Erreur lors de l\'envoi de l\'email');
    } catch (err: unknown) {
      const errorMessage = extractApiErrorMessage(err, 'Erreur lors de l\'envoi de l\'email');
      setError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const getEmailHistory = useCallback(async (invoiceId: string): Promise<{
    invoiceId: string;
    invoiceNumber: string;
    currentStatus: string;
    emailHistory: EmailHistory[];
  } | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{
        invoiceId: string;
        invoiceNumber: string;
        currentStatus: string;
        emailHistory: EmailHistory[];
      }>(`/invoices/${invoiceId}/email-history`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Erreur lors de la récupération de l\'historique');
    } catch (err: unknown) {
      const errorMessage = extractApiErrorMessage(err, 'Erreur lors de la récupération de l\'historique');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const testEmailConfiguration = useCallback(async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<unknown>('/email/test', { email });

      if (response.data.success) {
        return true;
      }
      throw new Error(response.data.error?.message || 'Erreur lors du test de configuration');
    } catch (err: unknown) {
      const errorMessage = extractApiErrorMessage(err, 'Erreur lors du test de configuration');
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEmailServiceStatus = useCallback(async (): Promise<EmailServiceStatus | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<EmailServiceStatus>('/email/status');

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error?.message || 'Erreur lors de la récupération du statut');
    } catch (err: unknown) {
      const errorMessage = extractApiErrorMessage(err, 'Erreur lors de la récupération du statut');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    sendInvoiceEmail,
    getEmailHistory,
    testEmailConfiguration,
    getEmailServiceStatus,
  };
}