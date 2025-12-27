/**
 * Pierre API Service - Frontend client for Pierre AI Assistant
 */

import { api } from './api';

export interface PierreAction {
  action: 'search_product' | 'create_product' | 'search_client' | 'create_client' | 
          'ask_confirmation' | 'ask_info' | 'respond' | 'error';
  endpoint?: string;
  method?: 'GET' | 'POST';
  payload?: Record<string, unknown>;
  query?: Record<string, string>;
  message: string;
  requiresConfirmation?: boolean;
  pendingAction?: string;
  pendingPayload?: Record<string, unknown>;
  field?: string;
  data?: unknown;
}

export interface PierreChatRequest {
  message: string;
  conversationId?: string;
}

export interface PierreChatResponse {
  message: string;
  action?: PierreAction;
  conversationId?: string;
  data?: unknown;
}

export interface PierreConfirmRequest {
  conversationId: string;
  action: PierreAction;
}

export interface PierreTestResponse {
  success: boolean;
  message: string;
  model?: string;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  data?: T;
}

export const pierreApi = {
  /**
   * Test connection to Pierre/Ollama
   */
  async testConnection(): Promise<PierreTestResponse> {
    // api.get returns { data: { success, data: T } }
    const response = await api.get<PierreTestResponse>('/pierre/test');
    return response.data.data as PierreTestResponse;
  },

  /**
   * Send a chat message to Pierre
   */
  async chat(payload: PierreChatRequest): Promise<PierreChatResponse> {
    // api.post returns { data: { success, data: T } }
    const response = await api.post<PierreChatResponse>('/pierre/chat', payload);
    console.log('[PierreAPI] Raw response:', response);
    console.log('[PierreAPI] Extracted data:', response.data.data);
    return response.data.data as PierreChatResponse;
  },

  /**
   * Confirm a pending action
   */
  async confirmAction(payload: PierreConfirmRequest): Promise<PierreChatResponse> {
    const response = await api.post<PierreChatResponse>('/pierre/confirm', payload);
    return response.data.data as PierreChatResponse;
  },

  /**
   * Clear conversation history
   */
  async clearConversation(conversationId: string): Promise<void> {
    await api.delete(`/pierre/conversation/${conversationId}`);
  },

  /**
   * Get Pierre status
   */
  async getStatus(): Promise<{ success: boolean; message: string; version: string }> {
    const response = await api.get<{ success: boolean; message: string; version: string }>('/pierre/status');
    return response.data.data as { success: boolean; message: string; version: string };
  }
};
