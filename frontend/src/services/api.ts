import { apiRateLimiter, secureStorage, securityLogger, sanitizeHtml } from '../utils/security';
import { normalizePdfTemplate } from '../constants/pdfTemplates';
import type { PdfTemplateKey } from '../constants/pdfTemplates';
import { authInterceptor, type RequestConfig } from './authInterceptor';

// Build API base URL (robust to VITE_API_URL with or without /api)
function buildApiBase(): string {
  const raw = import.meta.env?.VITE_API_URL as string | undefined;
  if (raw && typeof raw === 'string' && raw.length > 0) {
    const trimmed = raw.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return `/api`;
}

const API_BASE_URL = buildApiBase();

console.log('Using API URL:', API_BASE_URL); // Debug log

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Makes an API request with built-in retry logic and token refresh handling
 * @param endpoint API endpoint (e.g., '/invoices')
 * @param options Fetch options
 * @param retryCount Current retry attempt (internal use)
 * @returns Promise with the parsed response data
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  // Rate limiting check
  const rateLimitKey = `api_${endpoint.split('?')[0]}`;
  if (!apiRateLimiter.isAllowed(rateLimitKey)) {
    securityLogger.logSecurityEvent('API_RATE_LIMIT_EXCEEDED', {
      endpoint,
      method: options.method || 'GET'
    });
    throw new ApiError(
      'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  const method = (options.method || 'GET').toUpperCase();
  // Try to read CSRF token from meta tag if present
  const csrfToken = (typeof document !== 'undefined'
    ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    : undefined) || undefined;

  // Detectar si el body es FormData para no establecer Content-Type
  const isFormData = options.body instanceof FormData;
  
  // Prepare request configuration for interceptor
  const requestConfig: RequestConfig = {
    url: `${API_BASE_URL}${endpoint}`,
    method: options.method || 'GET',
    credentials: 'include' as RequestCredentials,
    headers: {
      // No establecer Content-Type para FormData (el navegador lo hace automáticamente)
      ...(isFormData ? {} : { 'Content-Type': 'application/json; charset=UTF-8' }),
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      // Attach CSRF header for state-changing methods if available
      ...((method !== 'GET' && method !== 'HEAD' && csrfToken)
        ? { 'X-CSRF-TOKEN': csrfToken }
        : {}),
      ...options.headers,
    },
    ...options,
  };

  // Sanitize request body if it's JSON
  if (options.body && typeof options.body === 'string') {
    try {
      const bodyData = JSON.parse(options.body);
      const sanitizedBody = sanitizeRequestBody(bodyData);
      requestConfig.body = JSON.stringify(sanitizedBody);
    } catch {
      // If it's not valid JSON, leave as is
      requestConfig.body = options.body;
    }
  }

  try {
    const startTime = Date.now();
    
    // Use AuthInterceptor for request processing
    const interceptedConfig = await authInterceptor.interceptRequest(requestConfig);
    
    // CRITICAL: Ensure Content-Type is set for JSON requests AFTER interceptor
    if (interceptedConfig.body && typeof interceptedConfig.body === 'string') {
      const headers = new Headers(interceptedConfig.headers);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=UTF-8');
      }
      interceptedConfig.headers = headers;
    }
    
    // Make the request
    const { url, ...fetchConfig} = interceptedConfig;
    let response: Response;
    
    try {
      response = await fetch(url!, fetchConfig);
      
      // Process response through auth interceptor
      const processedResponse = await authInterceptor.interceptResponse(response, interceptedConfig);
      
      // If we get here, the request was successful or the interceptor handled the error
      if (!processedResponse.ok) {
        throw new Error(`HTTP error! status: ${processedResponse.status}`);
      }
      
      // Parse and return JSON response
      const data = await processedResponse.json() as ApiResponse<T>;
      
      // Log successful request
      securityLogger.logSecurityEvent('API_REQUEST_SUCCESS', {
        endpoint,
        method: interceptedConfig.method,
        status: processedResponse.status,
        duration: Date.now() - startTime,
      });
      
      // Check for API-level errors
      if (!data.success) {
        throw new ApiError(
          data.error?.message || 'Une erreur inconnue est survenue',
          processedResponse.status,
          data.error?.code
        );
      }
      
      return data.data!;
      
    } catch (error) {
      // Handle network errors with retry logic
      if (error instanceof Error && isNetworkError(error) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        securityLogger.logSecurityEvent('API_REQUEST_RETRY', {
          endpoint,
          method: interceptedConfig.method || 'GET',
          attempt: retryCount + 1,
          maxRetries: 3,
          delay,
          error: error.message,
        });
        
        // Wait for the delay before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return apiRequest<T>(endpoint, options, retryCount + 1);
      }
      
      // If we've exhausted retries or it's not a retryable error, rethrow
      throw error;
    }
    
    // Use AuthInterceptor for response processing
    const finalResponse = await authInterceptor.interceptResponse(response, interceptedConfig);
    
    const responseTime = Date.now() - startTime;

    // Logger les requêtes lentes (plus de 5 secondes)
    if (responseTime > 5000) {
      securityLogger.logSecurityEvent('API_SLOW_RESPONSE', {
        endpoint,
        responseTime,
        method: options.method || 'GET'
      });
    }

    // Try to parse JSON safely, fallback to text
    let data: ApiResponse<T> | null = null;
    let rawText = '';
    const getErrorInfo = (d: unknown, fallbackMessage: string): { message: string; code?: string } => {
      if (d && typeof d === 'object' && 'error' in (d as Record<string, unknown>)) {
        const errVal = (d as { error?: unknown }).error;
        if (errVal && typeof errVal === 'object') {
          const ev = errVal as { code?: unknown; message?: unknown };
          const msg = typeof ev.message === 'string' ? ev.message : fallbackMessage;
          const code = typeof ev.code === 'string' ? ev.code : undefined;
          return { message: msg, code };
        }
      }
      return { message: fallbackMessage };
    };
    const ct = finalResponse.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) {
        data = await finalResponse.json();
      } else {
        const responseText = await finalResponse.text();
        rawText = responseText || '';
        if (rawText.trim().length > 0) {
          try {
            data = JSON.parse(rawText) as ApiResponse<T>;
          } catch {
            data = null;
          }
        }
      }
    } catch {
      // swallow JSON parse errors; we'll handle based on response.ok
      data = null;
    }

    if (!finalResponse.ok) {
      // Narrow possible error object from backend
      const baseMessage = rawText || finalResponse.statusText || 'Une erreur est survenue';
      const { message: backendMessage, code: backendCode } = getErrorInfo(data, baseMessage);
      
      // Logger les erreurs d'API avec le code backend
      securityLogger.logSecurityEvent('API_ERROR', {
        endpoint,
        status: finalResponse.status,
        error: backendMessage,
        code: backendCode,
        method: options.method || 'GET'
      });

      // For 401 errors, the AuthInterceptor should have already handled token refresh
      // If we still get a 401, it means refresh failed or token is invalid
      if (finalResponse.status === 401) {
        securityLogger.logSecurityEvent('AUTH_TOKEN_EXPIRED_FINAL', { endpoint });
        throw new ApiError(
          backendMessage || 'Session expirée. Veuillez vous reconnecter.',
          401,
          (backendCode as string) || 'AUTH_REQUIRED'
        );
      }

      const { message, code } = getErrorInfo(data, baseMessage);
      throw new ApiError(message, finalResponse.status, code);
    }

    if (!data || (typeof data?.success === 'boolean' && data?.success === false)) {
      securityLogger.logSecurityEvent('API_INVALID_RESPONSE', {
        endpoint,
        hasData: Boolean(data?.data)
      });
      throw new ApiError('Réponse invalide du serveur', finalResponse.status);
    }

    return (data as { data: T }).data;
  } catch (error) {
    // Handle network errors
    if (error instanceof Error && isNetworkError(error)) {
      securityLogger.logSecurityEvent('NETWORK_ERROR', {
        endpoint,
        method: requestConfig.method || 'GET',
        error: error.message,
      });
      
      throw new ApiError(
        'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.',
        0,
        'NETWORK_ERROR'
      );
    }
    
    // Re-throw ApiError as is
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle AuthError from interceptor
    if (error && typeof error === 'object' && 'status' in error) {
      const errObj = error as Record<string, unknown>;
      const status = typeof errObj.status === 'number' ? errObj.status : 0;
      const message = typeof errObj.message === 'string' ? errObj.message : 'Authentication error';
      const code = typeof errObj.code === 'string' ? errObj.code : 'AUTH_ERROR';
      
      throw new ApiError(message, status, code);
    }
    
    // Wrap other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
      0,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Check if an error is a network error
 */
function isNetworkError(error: Error): boolean {
  return (
    error instanceof TypeError && 
    (error.message === 'Failed to fetch' || 
     error.message.includes('Network request failed') ||
     error.message.includes('NetworkError') ||
     error.message.includes('Failed to execute') ||
     error.message.includes('NetworkError when attempting to fetch resource'))
  );
}

// Fonction pour sanitiser le body des requêtes
function sanitizeRequestBody(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeRequestBody(item));
  }

  const obj = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Sanitiser les chaînes de caractères
      sanitized[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      // Récursion pour les objets imbriqués
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      // Garder les autres types tels quels
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Type definitions for API responses
interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  currency: string;
  qrBillGenerated?: boolean;
  sentAt?: string;
  paidAt?: string;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  language: 'fr' | 'de' | 'it' | 'en';
  createdAt: string;
  updatedAt: string;
}

interface InvoiceItem {
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

interface CreateInvoiceRequest {
  invoiceNumber?: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  items: Omit<InvoiceItem, 'id'>[];
  notes?: string;
  terms?: string;
  language: 'fr' | 'de' | 'it' | 'en';
  currency: 'CHF' | 'EUR';
  // Recurring billing (optional)
  estRecurrente?: boolean;
  frequence?: 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL';
  prochaineDateRecurrence?: string;
  dateFinRecurrence?: string;
  // Quote flag
  isQuote?: boolean;
}

interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

interface Client {
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

interface CreateClientRequest {
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
}

type UpdateClientRequest = Partial<CreateClientRequest>;

interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateProductRequest {
  name: string;
  description?: string;
  unitPrice: number;
  tvaRate: number;
  unit: string;
  isActive: boolean;
}

type UpdateProductRequest = Partial<CreateProductRequest>;

type UserSmtpProvider = 'smtp' | 'sendgrid' | 'ses' | 'mailgun';

interface UserSmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string | null;
  provider: UserSmtpProvider;
  isActive: boolean;
  isVerified: boolean;
  lastTestedAt?: string | null;
  enableAutoSend: boolean;
  includeFooter: boolean;
  sendCopyToSender?: boolean;
  dailyLimit: number;
  emailsSentToday: number;
  lastResetAt?: string | null;
  requires2FA?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserSmtpPreset {
  host: string;
  port: number;
  secure: boolean;
  provider: UserSmtpProvider;
}

type UserSmtpPresets = Record<string, UserSmtpPreset>;

interface UserSmtpConfigResponse {
  config: UserSmtpConfig | null;
  presets?: UserSmtpPresets;
  message?: string;
  notice?: string;
}

interface UpdateUserSmtpConfigPayload {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string | null;
  provider: UserSmtpProvider;
  apiKey?: string | null;
  enableAutoSend?: boolean;
  includeFooter?: boolean;
  sendCopyToSender?: boolean;
}

interface UpdateUserSmtpConfigResponse {
  message?: string;
  config: UserSmtpConfig;
  notice?: string;
}

interface UserSmtpTestDetails {
  messageId?: string;
  jobId?: string;
  from?: string;
  provider?: UserSmtpProvider;
  verified?: boolean;
}

interface UserSmtpTestResponse {
  message: string;
  details?: UserSmtpTestDetails;
}

interface UserEmailStats {
  totalSent: number;
  totalFailed: number;
  totalQueued?: number;
  successRate: number;
  byTemplate: Record<string, number>;
  period?: string;
}

interface UserSmtpUsageSummary {
  dailyLimit?: number;
  emailsSentToday?: number;
  lastResetAt?: string | null;
  isVerified?: boolean;
}

type UserSmtpQueueStats = Record<string, unknown> | null;

interface UserSmtpStatsResponse {
  queue: UserSmtpQueueStats;
  email: UserEmailStats;
  config: UserSmtpUsageSummary | null;
  recentLogs: UserSmtpLog[];
  period: string;
}

interface UserSmtpLog {
  id: string;
  emailTo: string;
  emailFrom?: string | null;
  subject?: string | null;
  templateType?: string | null;
  documentNumber?: string | null;
  status: string;
  provider?: string | null;
  messageId?: string | null;
  errorMessage?: string | null;
  queuedAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  usedFallback?: boolean | null;
  includesQRBill?: boolean | null;
}

interface UserSmtpLogsResponse {
  logs: UserSmtpLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserSmtpPresetsResponse {
  presets: UserSmtpPresets;
}

interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  hasMore: boolean;
}

interface InvoiceCreateResponse {
  invoice?: Invoice;
  data?: { invoice?: Invoice };
}

export const api = {
  // Helper: normalize client shape (accept flat or nested address)
  _normalizeClient: (c: unknown): Client => {
    const r = (typeof c === 'object' && c !== null) ? (c as Record<string, unknown>) : {};
    const addr = (r.address && typeof r.address === 'object') ? (r.address as Record<string, unknown>) : undefined;
    return {
      id: String(r.id ?? ''),
      companyName: typeof r.companyName === 'string' ? r.companyName : undefined,
      firstName: typeof r.firstName === 'string' ? r.firstName : undefined,
      lastName: typeof r.lastName === 'string' ? r.lastName : undefined,
      email: String(r.email ?? ''),
      phone: typeof r.phone === 'string' ? r.phone : undefined,
      address: {
        street: typeof (addr?.street ?? r.street) === 'string' ? String(addr?.street ?? r.street) : '',
        city: typeof (addr?.city ?? r.city) === 'string' ? String(addr?.city ?? r.city) : '',
        postalCode: typeof (addr?.postalCode ?? r.postalCode) === 'string' ? String(addr?.postalCode ?? r.postalCode) : '',
        country: typeof (addr?.country ?? r.country) === 'string' ? String(addr?.country ?? r.country) : 'Switzerland',
        canton: typeof (addr?.canton ?? r.canton) === 'string' ? String(addr?.canton ?? r.canton) : undefined,
      },
      vatNumber: typeof r.vatNumber === 'string' ? r.vatNumber : undefined,
      language: (['de','fr','it','en'].includes(String(r.language)) ? String(r.language) : 'fr') as 'de' | 'fr' | 'it' | 'en',
      paymentTerms: Number.isFinite(Number(r.paymentTerms)) ? Number(r.paymentTerms) : 30,
      notes: typeof r.notes === 'string' ? r.notes : undefined,
      isActive: Boolean(r.isActive ?? true),
      createdAt: String(r.createdAt ?? new Date().toISOString()),
      updatedAt: String(r.updatedAt ?? new Date().toISOString()),
    } as Client;
  },
  // Helper: normalize invoice shape and numeric fields
  // Ensures amount is a finite number and currency has a default
  _normalizeInvoice: (inv: unknown): Invoice => {
    const toNumber = (v: unknown): number => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(',', '.'));
        return Number.isFinite(n) ? n : NaN;
      }
      return Number(v);
    };

    // Compute fallback amount from items if needed
    const computeFromItems = (items: unknown): number => {
      if (!Array.isArray(items) || items.length === 0) return NaN;
      const sum = items.reduce((acc, it) => {
        const item = it as Record<string, unknown>;
        const total = toNumber(item?.total);
        if (Number.isFinite(total)) return acc + total;
        const qty = toNumber(item?.quantity);
        const unit = toNumber(item?.unitPrice);
        const tva = toNumber(item?.tvaRate);
        const line = Number.isFinite(qty) && Number.isFinite(unit)
          ? qty * unit * (Number.isFinite(tva) ? 1 + tva / 100 : 1)
          : 0;
        return acc + line;
      }, 0);
      return sum;
    };

    const raw = (typeof inv === 'object' && inv !== null) ? (inv as Record<string, unknown>) : {};
    const rawAmount = raw?.amount;
    let amount = toNumber(rawAmount);
    if (!Number.isFinite(amount)) {
      amount = computeFromItems(raw?.items);
    }
    if (!Number.isFinite(amount)) amount = 0;

    const currency = (typeof raw.currency === 'string' && raw.currency.trim().length > 0) ? raw.currency : 'CHF';

    // Construct clientName from client object
    let clientName = 'N/A';
    const client = (raw.client && typeof raw.client === 'object') ? (raw.client as Record<string, unknown>) : undefined;
    if (client) {
      const companyName = typeof client.companyName === 'string' ? client.companyName : undefined;
      const firstName = typeof client.firstName === 'string' ? client.firstName : '';
      const lastName = typeof client.lastName === 'string' ? client.lastName : '';
      if (companyName) {
        clientName = companyName;
      } else if (firstName || lastName) {
        clientName = `${firstName} ${lastName}`.trim();
      }
    }

    // Normalize status to canonical values used in frontend logic
    const normalizeStatus = (val: unknown): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' => {
      const s = String(val ?? '').trim().toLowerCase();
      // Accept common localized variants and accents
      if (!s) return 'draft';
      if (s === 'draft' || s === 'brouillon' || s === 'brouillons') return 'draft';
      if (s === 'sent' || s === 'envoye' || s === 'envoyé' || s === 'envoyee' || s === 'envoyée' || s === 'envoyes' || s === 'envoyés') return 'sent';
      if (s === 'paid' || s === 'payee' || s === 'payée' || s === 'payes' || s === 'payés' || s === 'payé') return 'paid';
      if (s === 'overdue' || s === 'en retard' || s === 'retard') return 'overdue';
      if (s === 'cancelled' || s === 'annule' || s === 'annulé' || s === 'annulee' || s === 'annulée' || s === 'annulees' || s === 'annulées') return 'cancelled';
      // Fallback: if unknown, keep as draft to avoid disappearing in filters
      return 'draft';
    };

    const status = normalizeStatus((raw as Record<string, unknown>)?.status);

    return {
      ...(raw as Record<string, unknown>),
      status,
      amount,
      currency,
      clientName,
    } as Invoice;
  },
  // Helper: normalize product shape (coerce numeric strings to numbers)
  _normalizeProduct: (p: unknown): Product => {
    const toNumber = (v: unknown): number => {
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
      }
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      ...((typeof p === 'object' && p !== null ? (p as Record<string, unknown>) : {}) as Record<string, unknown>),
      unitPrice: toNumber((p as Record<string, unknown>)?.unitPrice),
      tvaRate: toNumber((p as Record<string, unknown>)?.tvaRate),
    } as Product;
  },
  // Financial summary
  getFinancialSummary: () => 
    apiRequest<{
      period: {
        from: string;
        to: string;
      };
      invoices: {
        total: number;
        draft: number;
        sent: number;
        paid: number;
        overdue: number;
      };
      revenue: {
        total: number;
        pending: number;
        overdue: number;
      };
      tva: {
        breakdown: Array<{
          rate: number;
          netAmount: number;
          tvaAmount: number;
          totalAmount: number;
          itemCount: number;
        }>;
        totalTva: number;
        totalNet: number;
      };
    }>('/reports/financial-summary').then((data) => {
      const toNumber = (v: unknown): number => {
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        if (typeof v === 'string') {
          const n = parseFloat(v.replace(',', '.'));
          return Number.isFinite(n) ? n : 0;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const currency = 'CHF';
      return {
        period: data.period,
        invoices: {
          total: toNumber((data as unknown as Record<string, unknown>)?.invoices && (data as unknown as { invoices?: Record<string, unknown> }).invoices?.total),
          draft: toNumber((data as unknown as Record<string, unknown>)?.invoices && (data as unknown as { invoices?: Record<string, unknown> }).invoices?.draft),
          sent: toNumber((data as unknown as Record<string, unknown>)?.invoices && (data as unknown as { invoices?: Record<string, unknown> }).invoices?.sent),
          paid: toNumber((data as unknown as Record<string, unknown>)?.invoices && (data as unknown as { invoices?: Record<string, unknown> }).invoices?.paid),
          overdue: toNumber((data as unknown as Record<string, unknown>)?.invoices && (data as unknown as { invoices?: Record<string, unknown> }).invoices?.overdue),
        },
        revenue: {
          total: toNumber((data as unknown as Record<string, unknown>)?.revenue && (data as unknown as { revenue?: Record<string, unknown> }).revenue?.total),
          pending: toNumber((data as unknown as Record<string, unknown>)?.revenue && (data as unknown as { revenue?: Record<string, unknown> }).revenue?.pending),
          overdue: toNumber((data as unknown as Record<string, unknown>)?.revenue && (data as unknown as { revenue?: Record<string, unknown> }).revenue?.overdue),
        },
        tva: {
          breakdown: Array.isArray((data as unknown as { tva?: { breakdown?: unknown } }).tva?.breakdown)
            ? ((data as unknown as { tva?: { breakdown?: unknown } }).tva!.breakdown as unknown[]).map((b) => {
                const br = (typeof b === 'object' && b !== null) ? (b as Record<string, unknown>) : {};
                return {
                  rate: toNumber(br.rate),
                  netAmount: toNumber(br.netAmount),
                  tvaAmount: toNumber(br.tvaAmount),
                  totalAmount: toNumber(br.totalAmount),
                  itemCount: toNumber(br.itemCount),
                };
              })
            : [],
          totalTva: toNumber((data as unknown as { tva?: Record<string, unknown> }).tva?.totalTva),
          totalNet: toNumber((data as unknown as { tva?: Record<string, unknown> }).tva?.totalNet),
        },
        // Enrich front expected shape
        totalRevenue: toNumber((data as unknown as { revenue?: Record<string, unknown> }).revenue?.total),
        monthlyRevenue: toNumber((data as unknown as { revenue?: Record<string, unknown> }).revenue?.pending),
        totalInvoices: toNumber((data as unknown as { invoices?: Record<string, unknown> }).invoices?.total),
        paidInvoices: toNumber((data as unknown as { invoices?: Record<string, unknown> }).invoices?.paid),
        pendingInvoices: toNumber((data as unknown as { invoices?: Record<string, unknown> }).invoices?.sent),
        overdueInvoices: toNumber((data as unknown as { invoices?: Record<string, unknown> }).invoices?.overdue),
        overdueAmount: toNumber((data as unknown as { revenue?: Record<string, unknown> }).revenue?.overdue),
        activeClients: toNumber((data as unknown as Record<string, unknown>).activeClients),
        currency: (data as unknown as Record<string, unknown>).currency as string || currency,
        revenueGrowthRate: toNumber((data as unknown as Record<string, unknown>).revenueGrowthRate),
        invoiceGrowthRate: toNumber((data as unknown as Record<string, unknown>).invoiceGrowthRate),
        clientGrowthRate: toNumber((data as unknown as Record<string, unknown>).clientGrowthRate),
      };
    }),

  // Convert a quote into an invoice
  convertQuoteToInvoice: (id: string) =>
    apiRequest<Invoice>(`/invoices/${id}/convert-to-invoice`, {
      method: 'POST',
    }).then((inv) => api._normalizeInvoice(inv)),

  // User profile (preferences)
  getProfile: () =>
    apiRequest<{ user: { id: string; recurrenceBasePreference?: 'issue' | 'due' } }>(`/auth/me`) as Promise<{ user: { id: string; recurrenceBasePreference?: 'issue' | 'due' } }>,

  updateProfile: (data: { recurrenceBasePreference?: 'issue' | 'due' } & Record<string, unknown>) =>
    apiRequest<{ user: { id: string; recurrenceBasePreference?: 'issue' | 'due' } }>(`/auth/me`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Invoice CRUD operations
  getInvoices: (params?: {
    status?: 'draft' | 'sent' | 'paid' | 'overdue';
    limit?: number;
    offset?: number;
    search?: string;
    clientId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isQuote?: boolean;
  }): Promise<InvoiceListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.clientId) searchParams.append('clientId', params.clientId);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    if (typeof params?.isQuote === 'boolean') searchParams.append('isQuote', String(params.isQuote));
    
    const queryString = searchParams.toString();
    return apiRequest<unknown>(`/invoices${queryString ? `?${queryString}` : ''}`)
      .then((resp) => {
        // Normalize: allow plain array or wrapped object
        if (Array.isArray(resp)) {
          const invoices = resp.map((it) => api._normalizeInvoice(it));
          return {
            invoices,
            total: invoices.length,
            hasMore: false,
          };
        }
        if (
          resp && typeof resp === 'object' && 'data' in resp &&
          resp.data && typeof (resp as { data?: unknown }).data === 'object' && (resp as { data?: { invoices?: unknown } }).data &&
          (resp as { data?: { invoices?: unknown } }).data!.invoices &&
          Array.isArray((resp as { data?: { invoices?: unknown } }).data!.invoices)
        ) {
          const dataObj = (resp as { data: { invoices: unknown[]; total?: unknown; hasMore?: unknown } }).data;
          const normalized = dataObj.invoices.map((it) => api._normalizeInvoice(it));
          return {
            invoices: normalized,
            total: Number(dataObj.total ?? normalized.length),
            hasMore: Boolean(dataObj.hasMore ?? false),
          } as InvoiceListResponse;
        }
        // Fallback if shape is already { invoices, total, hasMore }
        const fallback = resp as { invoices?: unknown; total?: unknown; hasMore?: unknown };
        const invoicesArr = Array.isArray(fallback?.invoices) ? (fallback.invoices as unknown[]) : [];
        return {
          invoices: invoicesArr.map((it) => api._normalizeInvoice(it)),
          total: Number(fallback?.total ?? invoicesArr.length),
          hasMore: Boolean(fallback?.hasMore ?? false),
        } as InvoiceListResponse;
      });
  },

  getInvoice: (id: string): Promise<Invoice> =>
    apiRequest<Invoice>(`/invoices/${id}`).then((inv) => {
      const rawItems = inv?.items?.slice(0, 2);
      console.log('[api.getInvoice] Raw response items:', JSON.stringify(rawItems, null, 2));
      const invAny = inv as unknown as Record<string, unknown>;
      console.log('[api.getInvoice] Global discount fields:', {
        globalDiscountValue: invAny?.globalDiscountValue,
        globalDiscountType: invAny?.globalDiscountType,
        globalDiscountNote: invAny?.globalDiscountNote,
      });
      const normalized = api._normalizeInvoice(inv);
      const normAny = normalized as unknown as Record<string, unknown>;
      console.log('[api.getInvoice] Normalized items:', JSON.stringify(normalized?.items?.slice(0, 2), null, 2));
      console.log('[api.getInvoice] Normalized global discount:', {
        globalDiscountValue: normAny?.globalDiscountValue,
        globalDiscountType: normAny?.globalDiscountType,
        globalDiscountNote: normAny?.globalDiscountNote,
      });
      return normalized;
    }),

  createInvoice: (data: CreateInvoiceRequest): Promise<InvoiceCreateResponse> =>
    apiRequest<InvoiceCreateResponse>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((resp) => {
      // Normalize: backend may return { invoice } or the invoice directly
      if (resp && typeof resp === 'object' && 'invoice' in resp) {
        const inv = (resp as { invoice?: Invoice }).invoice;
        return { invoice: api._normalizeInvoice(inv) } as InvoiceCreateResponse;
      }
      if (
        resp && typeof resp === 'object' && 'data' in resp &&
        (resp as { data?: unknown }).data && typeof (resp as { data?: unknown }).data === 'object' &&
        'invoice' in (resp as { data: { invoice?: Invoice } }).data
      ) {
        const inv = (resp as { data: { invoice?: Invoice } }).data.invoice;
        return { invoice: api._normalizeInvoice(inv) } as InvoiceCreateResponse;
      }
      return { invoice: api._normalizeInvoice(resp as Invoice) } as InvoiceCreateResponse;
    }),

  updateInvoice: (id: string, data: UpdateInvoiceRequest) =>
    apiRequest<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((inv) => api._normalizeInvoice(inv)),

  // Send invoice (status -> sent)
  sendInvoice: (id: string, options?: { email?: string; message?: string }): Promise<{ message: string }> =>
    apiRequest<{ message: string }>(`/invoices/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  // Duplicate an existing invoice
  duplicateInvoice: (id: string) =>
    apiRequest<Invoice>(`/invoices/${id}/duplicate`, {
      method: 'POST',
    }).then((inv) => api._normalizeInvoice(inv)),

  // Cancel recurrence on an invoice series
  cancelInvoiceRecurrence: (id: string): Promise<Invoice> =>
    apiRequest<Invoice>(`/invoices/${id}/recurrence/cancel`, {
      method: 'POST',
    }).then((resp) => {
      // Backend may return { success, message, data }
      if (resp && typeof resp === 'object' && 'data' in resp) {
        const data = (resp as { data?: Invoice }).data;
        return api._normalizeInvoice(data);
      }
      return api._normalizeInvoice(resp as Invoice);
    }),

  // Change current user's password
  changePassword: (oldPassword: string, newPassword: string): Promise<{ message: string }> =>
    apiRequest<{ message: string }>(`/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }).then((resp) => {
      // Backend returns { success, data: { message } }
      if (resp && typeof resp === 'object' && 'data' in resp) {
        return (resp as { data: { message?: string } }).data as { message: string };
      }
      return resp as { message: string };
    }),

  deleteInvoice: async (id: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/invoices/${id}`, { method: 'DELETE' });
  },

  // Add payment to invoice
  addPayment: async (
    id: string,
    payload: { amount: number; paymentDate?: string; notes?: string; method?: string; reference?: string }
  ): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInvoicePDF: async (id: string): Promise<Blob> => {
    // Retrieve theme settings from secure storage
    const template = secureStorage.getItem('invoice_template');
    const accentColorRaw = secureStorage.getItem('invoice_accent_color');

    // Normalize template with allowed set and common aliases
    const allowedTemplates = new Set([
      'elegant_classic',
      'minimal_modern',
      'formal_pro',
      'creative_premium',
      'clean_creative',
      'bold_statement',
    ] as const);
    const normalizeTemplate = (t: unknown): string | '' => {
      if (typeof t !== 'string') return '';
      const s = t.trim();
      if (!s) return '';
      const alias = s === 'minimal_moderm' ? 'minimal_modern' : s;
      return allowedTemplates.has(alias as typeof allowedTemplates extends Set<infer T> ? T : never) ? alias : '';
    };

    const normalizeHexColor = (val: unknown): string | undefined => {
      if (typeof val !== 'string') return undefined;
      let s = val.trim();
      if (!s) return undefined;
      if (!s.startsWith('#')) s = `#${s}`;
      s = `#${s.slice(1).toUpperCase()}`;
      if (/^#[0-9A-F]{8}$/.test(s)) s = `#${s.slice(1,7)}`;
      if (/^#[0-9A-F]{4}$/.test(s)) s = `#${s[1]}${s[2]}${s[3]}`;
      if (/^#[0-9A-F]{3}$/.test(s)) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
      return /^#[0-9A-F]{6}$/.test(s) ? s : undefined;
    };

    const params = new URLSearchParams();
    const normalizedTpl = normalizeTemplate(template);
    if (normalizedTpl) {
      params.append('template', normalizedTpl);
    }

    // Only send accentColor if the current template is designed to use it
    // (clean_creative or bold_statement), to avoid overriding built-in theme colors
    const accentColorNorm = normalizeHexColor(accentColorRaw);
    const templatesThatUseAccent = new Set(['clean_creative', 'bold_statement']);
    if (accentColorNorm && normalizedTpl && templatesThatUseAccent.has(normalizedTpl)) {
      params.append('accentColor', accentColorNorm);
    }

    // Show header toggle (default true)
    const showHeaderPref = secureStorage.getItem('invoice_show_header');
    const showHeader = ((): string => {
      if (typeof showHeaderPref === 'undefined' || showHeaderPref === null || showHeaderPref === '') return 'true';
      const s = String(showHeaderPref).trim().toLowerCase();
      return ['false','0','no','off'].includes(s) ? 'false' : 'true';
    })();
    params.append('showHeader', showHeader);
    // Cache-busting to avoid stale/cached HTML or previous responses
    params.append('_ts', String(Date.now()));

    const queryString = params.toString();
    const url = `${API_BASE_URL}/invoices/${id}/pdf${queryString ? `?${queryString}` : ''}`;

    const requestConfig: RequestConfig = {
      url,
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    };

    try {
      console.debug('[PDF] getInvoicePDF URL', url);
    } catch { void 0; }

    // Use the auth interceptor to handle the token
    const interceptedConfig = await authInterceptor.interceptRequest(requestConfig);
    const response = await fetch(interceptedConfig.url!, interceptedConfig);
    try {
      console.debug('[PDF] getInvoicePDF response', {
        status: response.status,
        contentType: response.headers.get('content-type') || null,
      });
    } catch { void 0; }

    if (!response.ok) {
      // Try to parse error response for a better message
      try {
        const errorData = await response.json();
        throw new ApiError(errorData?.error?.message || 'Failed to download PDF', response.status, errorData?.error?.code);
      } catch {
        throw new ApiError('Failed to download PDF', response.status);
      }
    }

    // Validate content type to avoid saving HTML as PDF (which yields tiny 0-page files)
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/pdf')) {
      const text = await response.text().catch(() => '');
      try {
        console.debug('[PDF] getInvoicePDF non-PDF payload preview', (text || '').slice(0, 200));
      } catch { void 0; }
      throw new ApiError(text || 'Unexpected response (not a PDF)', response.status || 500);
    }

    return response.blob();
  },
  downloadInvoicePdf: async (
    id: string,
    opts?: {
      language?: 'fr' | 'de' | 'it' | 'en';
      template?: PdfTemplateKey | string;
      accentColor?: string;
    }
  ): Promise<Blob> => {
    const token = secureStorage.getItem('simplifaq_token', 30 * 24 * 60 * 60 * 1000);

    // Include selected template and accent color if available
    const selectedTemplateRaw = opts?.template;
    const normalizedTemplate = normalizePdfTemplate(selectedTemplateRaw);
    const selectedTemplate: PdfTemplateKey | undefined = normalizedTemplate;

    const normalizeHexColor = (val: unknown): string | undefined => {
      if (typeof val !== 'string') return undefined;
      let s = val.trim();
      if (!s) return undefined;
      if (!s.startsWith('#')) s = `#${s}`;
      s = `#${s.slice(1).toUpperCase()}`;
      if (/^#[0-9A-F]{8}$/.test(s)) s = `#${s.slice(1,7)}`;
      if (/^#[0-9A-F]{4}$/.test(s)) s = `#${s[1]}${s[2]}${s[3]}`;
      if (/^#[0-9A-F]{3}$/.test(s)) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
      return /^#[0-9A-F]{6}$/.test(s) ? s : undefined;
    };

    const storedAccentRaw = opts?.accentColor || '';

    const storedAccent = normalizeHexColor(storedAccentRaw) || storedAccentRaw;
    // Legacy template names for backward compatibility
    const templateStr = selectedTemplate as string | undefined;
    const defaultAccent = templateStr === 'clean_creative' ? '#0B1F3A'
      : templateStr === 'bold_statement' ? '#000000'
      : templateStr === 'swiss_classic' ? '#DC143C'
      : templateStr === 'swiss_blue' ? '#0369A1'
      : '';
    const accentColor = storedAccent || defaultAccent;

    // Debug logging to track template parameter source
    console.log('[PDF_DEBUG] Template resolution:', {
      optsTemplate: opts?.template,
      finalTemplate: normalizedTemplate,
      optsAccent: opts?.accentColor,
      finalAccent: accentColor
    });

    const basePath = `${API_BASE_URL}/invoices/${encodeURIComponent(id)}/pdf`;
    const qs = new URLSearchParams();
    // Language for PDF/QR Bill labels
    const lang = opts?.language || (secureStorage.getItem('ui_language') as unknown) || '';
    if (normalizedTemplate) qs.set('template', normalizedTemplate);

    // Send accentColor if provided (all templates can use custom colors)
    const accentNorm = normalizeHexColor(accentColor);
    if (accentNorm) {
      qs.set('accentColor', accentNorm);
    }

    // Show header toggle (default true)
    const showHeaderPref = secureStorage.getItem('invoice_show_header');
    const showHeader = ((): string => {
      if (typeof showHeaderPref === 'undefined' || showHeaderPref === null || showHeaderPref === '') return 'true';
      const s = String(showHeaderPref).trim().toLowerCase();
      return ['false','0','no','off'].includes(s) ? 'false' : 'true';
    })();
    qs.set('showHeader', showHeader);
    if (lang && ['fr','de','it','en'].includes(String(lang))) qs.set('language', String(lang));
    // Cache buster to avoid stale PDF caching by browsers/proxies
    qs.set('_', String(Date.now()));
    const urlWithParams = qs.toString() ? `${basePath}?${qs.toString()}` : basePath;

    try {
      // Debug log (non-sensitive): show query we are sending
      console.debug('[PDF] Download URL', urlWithParams);
    } catch { void 0; }

    const resp = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    try {
      console.debug('[PDF] downloadInvoicePdf response', {
        status: resp.status,
        contentType: resp.headers.get('content-type') || null,
      });
    } catch { void 0; }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new ApiError(text || resp.statusText || 'Erreur PDF', resp.status);
    }
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/pdf')) {
      const text = await resp.text().catch(() => '');
      try {
        console.debug('[PDF] downloadInvoicePdf non-PDF payload preview', (text || '').slice(0, 200));
      } catch { void 0; }
      throw new ApiError(text || 'Unexpected response (not a PDF)', resp.status || 500);
    }
    const blob = await resp.blob();
    try {
      console.debug('[PDF] downloadInvoicePdf blob.size', blob.size);
    } catch { void 0; }
    return blob;
  },

  // Export invoices as a ZIP of PDFs with optional filters
  exportInvoicesZip: async (params?: { clientId?: string; from?: string; to?: string }): Promise<Blob> => {
    const searchParams = new URLSearchParams();
    if (params?.clientId) searchParams.append('clientId', params.clientId);
    if (params?.from) searchParams.append('from', params.from);
    if (params?.to) searchParams.append('to', params.to);

    const endpoint = `/invoices/export${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    // Build intercepted request similar to downloadInvoicePdf
    const intercepted = await authInterceptor.interceptRequest({
      url: `${API_BASE_URL}${endpoint}`,
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    const { url, ...fetchConfig } = intercepted;
    const resp = await fetch(url!, fetchConfig);
    const finalResp = await authInterceptor.interceptResponse(resp, intercepted);
    if (!finalResp.ok) {
      try {
        const errJson = await finalResp.json();
        throw new ApiError(errJson?.error?.message || 'Failed to export invoices', finalResp.status, errJson?.error?.code);
      } catch {
        throw new ApiError('Failed to export invoices', finalResp.status);
      }
    }
    const ct = finalResp.headers.get('content-type') || '';
    if (!ct.includes('application/zip')) {
      const txt = await finalResp.text().catch(() => '');
      throw new ApiError(txt || 'Unexpected response (not a ZIP)', finalResp.status || 500);
    }
    return await finalResp.blob();
  },

  // Recent invoices (for dashboard)
  getRecentInvoices: (limit = 10): Promise<Invoice[]> =>
    apiRequest<Invoice[]>(`/invoices?limit=${limit}&sort=createdAt:desc`)
      .then((list) => list.map(api._normalizeInvoice)),

  // Overdue invoices
  getOverdueInvoices: (): Promise<Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    dueDate: string;
    daysPastDue: number;
    currency?: string;
  }>> =>
    apiRequest<Array<{
      id: string;
      invoiceNumber: string;
      clientName: string;
      amount: number | string | null;
      dueDate: string;
      daysPastDue: number;
      currency?: string;
    }>>('/invoices?status=overdue')
      .then((list) => {
        const toNumber = (v: unknown): number => {
          if (typeof v === 'number') return v;
          if (typeof v === 'string') {
            const n = parseFloat(v.replace(',', '.'));
            return Number.isFinite(n) ? n : NaN;
          }
          return Number(v);
        };
        return list.map((it) => {
          const amt = toNumber(it.amount);
          return {
            ...it,
            amount: Number.isFinite(amt) ? amt : 0,
            currency: it.currency || 'CHF',
          };
        });
      }),

  // Send reminder
  sendInvoiceReminder: (invoiceId: string): Promise<{ success: boolean; message: string }> =>
    apiRequest<{ success: boolean; message: string }>(`/invoices/${invoiceId}/send-reminder`, {
      method: 'POST',
    }),

  // Send invoice by email with PDF attachment
  sendInvoiceEmail: (
    invoiceId: string, 
    data: { recipientEmail: string; customSubject?: string; customBody?: string }
  ): Promise<{ success: boolean; message: string; messageId?: string; logId?: string }> =>
    apiRequest<{ success: boolean; message: string; messageId?: string; logId?: string }>(`/invoices/${invoiceId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Preview invoice email content
  previewInvoiceEmail: (
    invoiceId: string
  ): Promise<{ subject: string; body: string; recipientEmail: string; attachmentName: string }> =>
    apiRequest<{ subject: string; body: string; recipientEmail: string; attachmentName: string }>(`/invoices/${invoiceId}/preview-email-content`, {
      method: 'POST',
    }),

  // Client CRUD operations
  getClients: (params?: {
    search?: string;
    status?: 'active' | 'inactive';
    type?: 'company' | 'individual';
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ clients: Client[]; total: number; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    
    const queryString = searchParams.toString();
    return apiRequest<{
      clients: Client[] | unknown[];
      total: number;
      hasMore: boolean;
    }>(`/clients${queryString ? `?${queryString}` : ''}`)
      .then((resp) => {
        const clients = Array.isArray(resp.clients) ? resp.clients.map(api._normalizeClient) : [];
        return { ...resp, clients } as { clients: Client[]; total: number; hasMore: boolean };
      });
  },

  getClient: (id: string): Promise<Client> =>
    apiRequest<Client>(`/clients/${id}`).then((c) => api._normalizeClient(c)),

  createClient: (data: CreateClientRequest): Promise<Client> =>
    apiRequest<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((c) => api._normalizeClient(c)),

  updateClient: (id: string, data: UpdateClientRequest): Promise<Client> =>
    apiRequest<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((c) => api._normalizeClient(c)),

  deleteClient: (id: string): Promise<{ success: boolean }> =>
    apiRequest<{ success: boolean }>(`/clients/${id}`, {
      method: 'DELETE',
    }),

  // Client search for invoice creation
  searchClients: (query: string, limit = 10): Promise<Client[]> =>
    apiRequest<Client[]>(`/clients/search?q=${encodeURIComponent(query)}&limit=${limit}`)
      .then((arr) => Array.isArray(arr) ? arr.map(api._normalizeClient) : []),

  // Product CRUD operations
  getProducts: (params?: {
    search?: string;
    status?: 'active' | 'inactive';
    tvaRate?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ products: Product[]; total: number; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.tvaRate !== undefined) searchParams.append('tvaRate', params.tvaRate.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    
    const queryString = searchParams.toString();
    return apiRequest<{
      products: Product[];
      total: number;
      hasMore: boolean;
    }>(`/products${queryString ? `?${queryString}` : ''}`)
      .then((resp) => ({
        ...resp,
        products: Array.isArray(resp.products)
          ? resp.products.map(api._normalizeProduct)
          : [],
      }));
  },

  getProduct: (id: string): Promise<Product> =>
    apiRequest<Product>(`/products/${id}`).then((p) => api._normalizeProduct(p)),

  createProduct: (data: CreateProductRequest): Promise<Product> =>
    apiRequest<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((p) => api._normalizeProduct(p)),

  updateProduct: (id: string, data: UpdateProductRequest): Promise<Product> =>
    apiRequest<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((p) => api._normalizeProduct(p)),

  deleteProduct: (id: string): Promise<{ success: boolean }> =>
    apiRequest<{ success: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    }),

  duplicateProduct: (id: string): Promise<Product> =>
    apiRequest<Product>(`/products/${id}/duplicate`, {
      method: 'POST',
    }).then((p) => api._normalizeProduct(p)),

  // Product search for invoice creation
  searchProducts: (query: string, limit = 10): Promise<Product[]> =>
    apiRequest<{ products: Product[] }>(`/products?search=${encodeURIComponent(query)}&limit=${limit}`)
      .then(response => response.products),

  // File upload operations
  upload: async (endpoint: string, formData: FormData, options: RequestInit = {}): Promise<{
    success: boolean;
    data: unknown;
    message: string;
  }> => {
    // Prepare request configuration for interceptor
    const requestConfig = {
      url: `${API_BASE_URL}${endpoint}`,
      method: 'POST',
      credentials: 'include' as RequestCredentials,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.headers || {}),
      },
      body: formData,
      ...options,
    };

    // Remove Content-Type header to let browser set it with boundary for multipart/form-data
    if (requestConfig.headers) {
      const h = requestConfig.headers as unknown;
      if (h instanceof Headers) {
        h.delete('Content-Type');
      } else if (typeof h === 'object') {
        delete (h as Record<string, unknown>)['Content-Type'];
      }
    }

    try {
      // Use AuthInterceptor for request processing
      const interceptedConfig = await authInterceptor.interceptRequest(requestConfig);
      
      // Make the request
      const { url, ...fetchConfig } = interceptedConfig;
      const response = await fetch(url!, fetchConfig);
      
      // Use AuthInterceptor for response processing
      const finalResponse = await authInterceptor.interceptResponse(response, interceptedConfig);
      
      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        throw new ApiError(
          errorText || finalResponse.statusText || 'Upload failed',
          finalResponse.status
        );
      }

      const raw = await finalResponse.json();
      // Normalize to { success, data, message }
      const normalized = {
        success: typeof raw?.success === 'boolean' ? raw.success : true,
        data: raw?.data ?? raw,
        message: raw?.message ?? 'Upload successful',
      } as { success: boolean; data: unknown; message: string };
      return normalized;
    } catch (error) {
      // Handle AuthError from interceptor
      if (error && typeof error === 'object' && 'status' in error) {
        const status = typeof error.status === 'number' ? error.status : 0;
        const message = typeof (error as { message?: unknown }).message === 'string' ? (error as { message?: unknown }).message as string : 'Authentication error';
        const code = typeof (error as { code?: unknown }).code === 'string' ? (error as { code?: unknown }).code as string : 'AUTH_ERROR';
        
        throw new ApiError(message, status, code);
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Upload failed',
        500
      );
    }
  },
  // Minimal axios-like helpers for existing hooks
  _buildQuery(params?: Record<string, unknown>): string {
    if (!params) return '';
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      usp.append(k, String(v));
    });
    const qs = usp.toString();
    return qs ? `?${qs}` : '';
  },
  get: async <T = unknown>(endpoint: string, config?: { params?: Record<string, unknown>; headers?: Record<string, string> }): Promise<{ data: ApiResponse<T> }> => {
    const qs = api._buildQuery(config?.params);
    const data = await apiRequest<T>(`${endpoint}${qs}`, {
      method: 'GET',
      headers: config?.headers,
    });
    return { data: { success: true, data } as ApiResponse<T> };
  },
  post: async <T = unknown>(endpoint: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<{ data: ApiResponse<T> }> => {
    // Si el body es FormData, no lo convertir a JSON y no establecer Content-Type
    const isFormData = body instanceof FormData;
    
    const data = await apiRequest<T>(endpoint, {
      method: 'POST',
      headers: isFormData ? {} : config?.headers, // No headers para FormData
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
    return { data: { success: true, data } as ApiResponse<T> };
  },
  put: async <T = unknown>(endpoint: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<{ data: ApiResponse<T> }> => {
    const data = await apiRequest<T>(endpoint, {
      method: 'PUT',
      headers: config?.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { data: { success: true, data } as ApiResponse<T> };
  },
  delete: async <T = unknown>(endpoint: string, config?: { headers?: Record<string, string> }): Promise<{ data: ApiResponse<T> }> => {
    const data = await apiRequest<T>(endpoint, {
      method: 'DELETE',
      headers: config?.headers,
    });
    return { data: { success: true, data } as ApiResponse<T> };
  },

  // Auth/profile operations
  // Update current user's profile and return the updated user from backend
  updateMyProfile: async (payload: Record<string, unknown>): Promise<unknown> => {
    const resp = await apiRequest<unknown>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    // Normalize various possible backend shapes
    let updatedUser: unknown = resp;
    if (resp && typeof resp === 'object') {
      if ('user' in resp && (resp as { user?: unknown }).user !== undefined) {
        updatedUser = (resp as { user?: unknown }).user;
      } else if ('data' in resp && typeof (resp as { data?: unknown }).data === 'object' && (resp as { data: { user?: unknown } }).data && 'user' in (resp as { data: { user?: unknown } }).data) {
        updatedUser = (resp as { data: { user?: unknown } }).data.user;
      }
    }
    return updatedUser;
  },

  getMyProfile: async (): Promise<unknown> => {
    const resp = await apiRequest<unknown>('/auth/me', { method: 'GET' });
    if (resp && typeof resp === 'object') {
      if ('user' in resp && (resp as { user?: unknown }).user !== undefined) {
        return (resp as { user?: unknown }).user;
      }
      if ('data' in resp && typeof (resp as { data?: unknown }).data === 'object') {
        const data = (resp as { data: { user?: unknown } }).data;
        if (data && 'user' in data && data.user !== undefined) {
          return data.user;
        }
      }
    }
    return resp;
  },
  
  // Settings: invoicing numbering configuration
  // Update invoice numbering settings (prefix, next number, padding)
  updateInvoicingNumbering: async (payload: { prefix?: string; nextNumber?: number; padding?: number }): Promise<{ invoicePrefix: string; nextInvoiceNumber: number; invoicePadding: number }> => {
    const data = await apiRequest<{ invoicePrefix: string; nextInvoiceNumber: number; invoicePadding: number }>(
      '/settings/invoicing-numbering',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    // Backend returns updated fields directly; ensure a consistent shape
    const d = data as unknown as {
      invoicePrefix?: unknown;
      nextInvoiceNumber?: unknown;
      invoicePadding?: unknown;
      data?: { invoicePrefix?: unknown; nextInvoiceNumber?: unknown; invoicePadding?: unknown };
    };
    return {
      invoicePrefix: (typeof d.invoicePrefix === 'string' ? d.invoicePrefix : (d.data && typeof d.data.invoicePrefix === 'string' ? d.data.invoicePrefix : 'INV')) as string,
      nextInvoiceNumber: Number(d.nextInvoiceNumber ?? d.data?.nextInvoiceNumber ?? 1),
      invoicePadding: Number(d.invoicePadding ?? d.data?.invoicePadding ?? 3),
    } as { invoicePrefix: string; nextInvoiceNumber: number; invoicePadding: number };
  },

  // Settings: quantity decimals configuration (2 or 3)
  // Update the user's preferred quantity decimals for invoice items
  updateQuantityDecimals: async (quantityDecimals: 2 | 3): Promise<2 | 3> => {
    const data = await apiRequest<{ quantityDecimals: number }>(
      '/settings/quantity-decimals',
      {
        method: 'PATCH',
        body: JSON.stringify({ quantityDecimals }),
      }
    );
    const d = data as unknown as { quantityDecimals?: unknown; data?: { quantityDecimals?: unknown } };
    const updated = Number(d?.quantityDecimals ?? d?.data?.quantityDecimals ?? 2);
    return (updated === 3 ? 3 : 2) as 2 | 3;
  },

  // User SMTP Configuration
  getUserSmtpConfig: async (): Promise<UserSmtpConfigResponse> => {
    return apiRequest<UserSmtpConfigResponse>('/user/smtp/config', { method: 'GET' });
  },

  updateUserSmtpConfig: async (config: UpdateUserSmtpConfigPayload): Promise<UpdateUserSmtpConfigResponse> => {
    return apiRequest<UpdateUserSmtpConfigResponse>('/user/smtp/config', {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
  },

  testUserSmtpConfig: async (testEmail: string): Promise<UserSmtpTestResponse> => {
    return apiRequest<UserSmtpTestResponse>('/user/smtp/test', {
      method: 'POST',
      body: JSON.stringify({ testEmail }),
    });
  },

  getUserSmtpStats: async (days: number = 30): Promise<UserSmtpStatsResponse> => {
    return apiRequest<UserSmtpStatsResponse>(`/user/smtp/stats?days=${days}`, { method: 'GET' });
  },

  getUserSmtpLogs: async (params?: { page?: number; limit?: number; status?: string; templateType?: string }): Promise<UserSmtpLogsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page !== undefined) searchParams.append('page', params.page.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.templateType) searchParams.append('templateType', params.templateType);
    const query = searchParams.toString();
    return apiRequest<UserSmtpLogsResponse>(`/user/smtp/logs${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getUserSmtpPresets: async (): Promise<UserSmtpPresetsResponse> => {
    return apiRequest<UserSmtpPresetsResponse>('/user/smtp/presets', { method: 'GET' });
  },
};

export { ApiError };
