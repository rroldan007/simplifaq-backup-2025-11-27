import { FormData, fetch, Response } from 'undici';
import { AssistantActionPlan } from './asistenteActionService';
import { extractTextFromReceipt } from './ocrService';

interface AsistenteClientOptions {
  userToken: string;
}

interface AsistenteChatPayload {
  sessionId?: string;
  message: string;
  channel?: string;
  locale?: string;
  [key: string]: unknown;
}

interface AsistenteConfirmPayload {
  actionId: string;
  confirmation: boolean;
  [key: string]: unknown;
}

interface AsistenteBaseResponse<T = unknown> {
  success?: boolean;
  error?: {
    code: string;
    message: string;
    [key: string]: unknown;
  };
  data?: T;
  [key: string]: unknown;
}

interface ExpenseAnalyzeMetadata {
  [key: string]: unknown;
}

interface ExpenseAnalyzeResult {
  summary: string;
  proposal: Record<string, unknown>;
  confidence?: number;
  requiresConfirmation?: boolean;
  [key: string]: unknown;
}

class AsistenteClientError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const BASE_URL = process.env.ASISTENTE_BASE_URL || '';
const API_KEY = process.env.ASISTENTE_API_KEY || '';
const TIMEOUT_MS = Number(process.env.ASISTENTE_TIMEOUT_MS || 30000);
const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL || '';

function ensureConfiguration() {
  if (!BASE_URL) {
    throw new Error('ASISTENTE_BASE_URL is not configured');
  }
  if (!API_KEY) {
    throw new Error('ASISTENTE_API_KEY is not configured');
  }
}

async function withTimeout<T>(promiseFactory: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (!TIMEOUT_MS || TIMEOUT_MS <= 0) {
    return promiseFactory(new AbortController().signal);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const result = await promiseFactory(controller.signal);
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function buildUrl(path: string): string {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL.replace(/\/$/, '')}${sanitizedPath}`;
}

function buildHeaders(userToken: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
    ...extra,
  };

  // Use the real user token instead of creating a dummy one
  headers['Authorization'] = `Bearer ${userToken}`;

  return headers;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new AsistenteClientError('Invalid JSON response from Asistente ADM service', response.status, 'INVALID_JSON', {
      body: text,
    });
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = await parseJsonResponse<AsistenteBaseResponse<T>>(response);

  if (!response.ok) {
    const message = payload?.error?.message || response.statusText || 'Asistente ADM request failed';
    throw new AsistenteClientError(message, response.status, payload?.error?.code, payload?.error);
  }

  if (payload?.data !== undefined) {
    return payload.data;
  }

  return payload as unknown as T;
}

export class AsistenteClient {
  static async chat(payload: AsistenteChatPayload, options: AsistenteClientOptions): Promise<unknown> {
    ensureConfiguration();

    if (!payload || typeof payload.message !== 'string' || payload.message.trim() === '') {
      throw new AsistenteClientError('Message is required for chat interactions', 400, 'MISSING_MESSAGE');
    }

    const url = buildUrl('/asistente/v1/chat');
    const headers = buildHeaders(options.userToken, {
      'Content-Type': 'application/json',
    });

    console.log('🔵 [AsistenteClient] Sending request to:', url);
    console.log('🔵 [AsistenteClient] Headers:', JSON.stringify(headers, null, 2));
    console.log('🔵 [AsistenteClient] Payload:', JSON.stringify(payload, null, 2));

    const response = await withTimeout((signal) =>
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      })
    );

    console.log('🔵 [AsistenteClient] Response status:', response.status, response.statusText);
    console.log('🔵 [AsistenteClient] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    const result = await handleResponse(response);
    console.log('✅ [AsistenteClient] Response data:', JSON.stringify(result, null, 2));
    
    return result;
  }

  static async confirmAction(payload: AsistenteConfirmPayload, options: AsistenteClientOptions): Promise<unknown> {
    ensureConfiguration();

    if (!payload || !payload.actionId) {
      throw new AsistenteClientError('actionId is required for confirmation', 400, 'MISSING_ACTION_ID');
    }

    const url = buildUrl('/asistente/v1/actions/confirm');

    const response = await withTimeout((signal) =>
      fetch(url, {
        method: 'POST',
        headers: buildHeaders(options.userToken, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
        signal,
      })
    );

    return handleResponse(response);
  }

  static async analyzeExpense(
    file: Express.Multer.File,
    metadata: ExpenseAnalyzeMetadata | undefined,
    options: AsistenteClientOptions,
  ): Promise<ExpenseAnalyzeResult> {
    ensureConfiguration();

    if (!file) {
      throw new AsistenteClientError('File is required for expense analysis', 400, 'MISSING_FILE');
    }

    console.log('[AsistenteClient] Starting OCR text extraction...');
    
    // Paso 1: Extraer texto del archivo usando OCR
    const ocrResult = await extractTextFromReceipt(file.buffer, file.mimetype);
    
    console.log(`[AsistenteClient] OCR completed. Confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`);
    console.log(`[AsistenteClient] Extracted text length: ${ocrResult.text.length} characters`);

    // Paso 2: Usar el endpoint de chat para analizar el TEXTO extraído
    const url = buildUrl('/asistente/v1/chat');

    // Mensaje estructurado con el texto de la factura
    const analysisMessage = `Analiza el siguiente texto extraído de una factura y extrae la información en formato JSON.

TEXTO DE LA FACTURA:
${ocrResult.text}

Extrae la siguiente información en formato JSON válido:
- supplier: nombre del proveedor o empresa (fournisseur/proveedor)
- label: descripción del servicio o producto
- amount: monto total TTC (solo número, sin símbolos)
- tvaRate: tasa de IVA en porcentaje (ej: 8.1)
- date: fecha de la factura en formato YYYY-MM-DD

Responde SOLO con un objeto JSON válido, sin texto adicional ni markdown.`;

    const chatPayload: AsistenteChatPayload = {
      message: analysisMessage,
      locale: 'fr',
    };

    if (metadata) {
      Object.assign(chatPayload, metadata);
    }

    const response = await withTimeout((signal) =>
      fetch(url, {
        method: 'POST',
        headers: {
          ...buildHeaders(options.userToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatPayload),
        signal,
      })
    );

    const result: any = await handleResponse(response);
    
    console.log('[AsistenteClient] ADM response received');
    
    // Adaptar la respuesta del chat al formato esperado
    let proposal: Record<string, unknown> = {};
    
    try {
      // Intentar parsear la respuesta como JSON
      if (result.response) {
        const cleaned = result.response
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        proposal = JSON.parse(cleaned);
        console.log('[AsistenteClient] Successfully parsed JSON proposal');
      }
    } catch (e) {
      // Si no es JSON válido, intentar extraer información del texto
      console.warn('[AsistenteClient] Could not parse JSON response, using fallback');
      proposal = {
        label: 'Dépense',
        amount: 0,
        supplier: null,
        tvaRate: 0,
        date: new Date().toISOString()
      };
    }

    // Combinar la confianza del OCR con la del análisis
    const combinedConfidence = ocrResult.confidence * 0.9; // Penalizar ligeramente por el paso extra

    return {
      summary: result.response || 'Facture analysée',
      proposal,
      confidence: combinedConfidence,
      requiresConfirmation: true
    };
  }

  static async executeAction(
    action: AssistantActionPlan,
    options: AsistenteClientOptions,
  ): Promise<unknown> {
    ensureConfiguration();

    if (!action.endpoint?.url) {
      throw new AsistenteClientError('Action endpoint URL is required', 400, 'MISSING_ENDPOINT_URL');
    }

    // Build the internal API URL
    const internalUrl = action.endpoint.url.startsWith('/api/') 
      ? action.endpoint.url 
      : `/api${action.endpoint.url.startsWith('/') ? action.endpoint.url : `/${action.endpoint.url}`}`;

    // Use the backend's API directly instead of calling the external service
    const response = await withTimeout(async (signal) => {
      // For internal API calls, we need to make HTTP requests to the backend API
      const baseUrl =
        INTERNAL_API_BASE_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'http://test.simplifaq.ch'
          : 'http://localhost:3001');

      const fullUrl = `${baseUrl}${internalUrl}`;
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${options.userToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Simplifaq-AsistenteADM/1.0',
      };

      const fetchOptions: RequestInit = {
        method: action.endpoint?.method?.toUpperCase() || 'GET',
        headers,
        signal,
      };

      // Add body for non-GET methods
      if (action.endpoint?.body && (action.endpoint.method?.toUpperCase() !== 'GET')) {
        fetchOptions.body = JSON.stringify(action.endpoint.body);
      }

      // Add query parameters for GET requests
      if (action.endpoint?.method?.toUpperCase() === 'GET' && action.endpoint.body) {
        const url = new URL(fullUrl);
        Object.entries(action.endpoint.body as Record<string, string>).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
        return fetch(url.toString(), { ...fetchOptions, body: undefined });
      }

      return fetch(fullUrl, fetchOptions);
    });

    return handleResponse(response);
  }
}

export { AsistenteClientError, AsistenteChatPayload, AsistenteConfirmPayload, ExpenseAnalyzeResult };
