import { api } from './api';

// API Key del Asistente ADM
const ASISTENTE_API_KEY = import.meta.env.VITE_ASISTENTE_API_KEY || '';

// Headers comunes para todas las llamadas al asistente
const getAsistenteHeaders = () => ({
  'x-api-key': ASISTENTE_API_KEY,
});

export interface AsistenteChatRequest {
  message: string;
  sessionId?: string;
  channel?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}

export interface AsistenteChatResponse {
  reply: string;
  actions?: AssistantActionPlan[];
  sessionId?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AssistantActionPlan {
  id: string;
  description: string;
  endpointMethod: string;
  endpointUrl: string;
  payload?: Record<string, unknown> | null;
  requiresConfirmation: boolean;
  status?: 'pending' | 'confirmed' | 'executed' | 'cancelled' | 'failed';
  lastError?: unknown;
  createdAt?: string;
  confirmedAt?: string | null;
  executedAt?: string | null;
  cancelledAt?: string | null;
}

export interface ConfirmActionRequest {
  actionId: string;
  confirmation: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConfirmActionResponse {
  action: AssistantActionPlan;
  result?: unknown;
  [key: string]: unknown;
}

export interface AnalyzeExpenseResponse {
  summary: string;
  proposal?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AssistantActionListQuery {
  status?: 'pending' | 'confirmed' | 'executed' | 'cancelled' | 'failed';
}

export interface AssistantActionListItem extends AssistantActionPlan {}

export const asistenteApi = {
  async chat(payload: AsistenteChatRequest): Promise<AsistenteChatResponse> {
    const response = await api.post<AsistenteChatResponse>('/asistente/chat', payload, {
      headers: getAsistenteHeaders(),
    });
    return response.data.data as AsistenteChatResponse;
  },

  async confirmAction(payload: ConfirmActionRequest): Promise<ConfirmActionResponse> {
    const response = await api.post<ConfirmActionResponse>('/asistente/actions/confirm', payload, {
      headers: getAsistenteHeaders(),
    });
    return response.data.data as ConfirmActionResponse;
  },

  async cancelAction(actionId: string): Promise<{ actionId: string; status: 'cancelled' }> {
    const response = await api.post<{ actionId: string; status: 'cancelled' }>(`/asistente/actions/${actionId}/cancel`, undefined, {
      headers: getAsistenteHeaders(),
    });
    return response.data.data as { actionId: string; status: 'cancelled' };
  },

  async listActions(params?: AssistantActionListQuery): Promise<AssistantActionListItem[]> {
    const response = await api.get<AssistantActionListItem[]>(`/asistente/actions`, { 
      params: params as Record<string, unknown> | undefined,
      headers: getAsistenteHeaders(),
    });
    const raw = response.data.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && 'actions' in raw) {
      return Array.isArray((raw as { actions?: unknown[] }).actions) ? (raw as { actions: AssistantActionListItem[] }).actions : [];
    }
    return [];
  },

  async getAction(actionId: string): Promise<AssistantActionPlan | null> {
    const response = await api.get<AssistantActionPlan>(`/asistente/actions/${actionId}`, {
      headers: getAsistenteHeaders(),
    });
    return response.data.data ?? null;
  },

  async analyzeExpense(file: File, metadata?: Record<string, unknown>): Promise<AnalyzeExpenseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await api.upload('/asistente/expenses/analyze', formData);
    return (response.data as any).data as AnalyzeExpenseResponse;
  },
};
