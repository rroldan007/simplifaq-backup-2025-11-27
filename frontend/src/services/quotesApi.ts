import { api, ApiError } from './api';
import { secureStorage } from '../utils/security';

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  client?: {
    id: string;
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  issueDate: string;
  validUntil?: string;
  language: 'fr' | 'de' | 'it' | 'en';
  currency: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
  notes?: string;
  terms?: string;
  convertedInvoiceId?: string;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total: number;
  order: number;
  productId?: string;
  unit?: string;
}

export interface CreateQuoteRequest {
  clientId: string;
  validUntil?: string;
  items: Array<Omit<QuoteItem, 'id' | 'unit'> & { unit?: string }>;
  notes?: string;
  terms?: string;
  language?: 'fr' | 'de' | 'it' | 'en';
  currency?: 'CHF' | 'EUR';
}

export interface UpdateQuoteRequest extends Partial<CreateQuoteRequest> {
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  quoteNumber?: string;
}

export const quotesApi = {
  // Get all quotes
  async getQuotes(params?: {
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  }): Promise<Quote[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/quotes${query ? `?${query}` : ''}`;
    
    const response = await api.get<any>(endpoint);
    // API returns { success, data: { quotes, total, hasMore } }
    return response.data.data?.quotes || [];
  },

  // Get single quote
  async getQuote(id: string): Promise<Quote> {
    const response = await api.get<Quote>(`/quotes/${id}`);
    if (!response.data.data) throw new ApiError('Devis non trouvé', 404);
    return response.data.data;
  },

  // Create new quote
  async createQuote(data: CreateQuoteRequest): Promise<Quote> {
    const response = await api.post<Quote>('/quotes', data);
    if (!response.data.data) throw new ApiError('Erreur lors de la création du devis', 500);
    return response.data.data;
  },

  // Update quote
  async updateQuote(id: string, data: UpdateQuoteRequest): Promise<Quote> {
    const response = await api.put<Quote>(`/quotes/${id}`, data);
    if (!response.data.data) throw new ApiError('Erreur lors de la mise à jour du devis', 500);
    return response.data.data;
  },

  // Delete quote
  async deleteQuote(id: string): Promise<void> {
    await api.delete(`/quotes/${id}`);
  },

  // Send quote via email
  async sendQuote(id: string, options?: { email?: string; message?: string }): Promise<void> {
    await api.post(`/quotes/${id}/send-via-smtp`, options || {});
  },

  // Download quote PDF
  async downloadQuotePdf(id: string, options?: {
    template?: string;
    accentColor?: string;
  }): Promise<Blob> {
    const API_BASE_URL = '/api';
    
    const queryParams = new URLSearchParams();
    if (options?.template) queryParams.append('template', options.template);
    if (options?.accentColor) queryParams.append('accentColor', options.accentColor);
    queryParams.append('_ts', String(Date.now())); // Cache-busting
    
    const query = queryParams.toString();
    const url = `${API_BASE_URL}/quotes/${id}/pdf${query ? `?${query}` : ''}`;
    
    // Get token from secure storage (same way api.ts does it)
    const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    
    if (!response.ok) {
      throw new ApiError('Erreur lors du téléchargement du PDF', response.status);
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf')) {
      const text = await response.text().catch(() => '');
      throw new ApiError(text || 'Réponse inattendue (pas un PDF)', response.status || 500);
    }
    
    return await response.blob();
  },

  // Convert quote to invoice
  async convertToInvoice(id: string): Promise<{ id: string; invoiceNumber: string }> {
    const response = await api.post<any>(`/quotes/${id}/convert`, {});
    if (!response.data.data) throw new ApiError('Erreur lors de la conversion', 500);
    // Backend returns full invoice object, extract what we need
    const invoice = response.data.data;
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber
    };
  },

  // Get next quote number
  async getNextNumber(): Promise<string> {
    const response = await api.get<{ nextNumber: string }>('/quotes/next-number');
    if (!response.data.data) throw new ApiError('Erreur lors de la récupération du numéro', 500);
    return response.data.data.nextNumber;
  },
};
