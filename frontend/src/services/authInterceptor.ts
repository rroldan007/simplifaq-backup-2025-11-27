/**
 * AuthInterceptor Service
 * 
 * HTTP request/response interceptor that automatically handles token refresh
 * on 401 responses, implements request queuing during token refresh,
 * and handles concurrent request scenarios with single refresh.
 */

import { tokenManager, TokenManager } from './tokenManager';
import { securityLogger } from '../utils/security';

// Request configuration interface
export interface RequestConfig extends RequestInit {
  url?: string;
  skipAuthRetry?: boolean; // Flag to prevent infinite retry loops
}

// Enhanced response interface
export interface InterceptedResponse extends Response {
  config?: RequestConfig;
}

// Request queue item interface
interface QueuedRequest {
  config: RequestConfig;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

// Auth error interface
export interface AuthError extends Error {
  status: number;
  code?: string;
  response?: Response;
}

/**
 * AuthInterceptor class for automatic token refresh and request retry
 */
export class AuthInterceptor {
  private tokenManager: TokenManager;
  private isRefreshing = false;
  private requestQueue: QueuedRequest[] = [];
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second base delay for exponential backoff

  constructor(tokenManagerInstance?: TokenManager) {
    this.tokenManager = tokenManagerInstance || tokenManager;
    this.setupTokenEventListeners();
  }

  /**
   * Setup event listeners for token events
   */
  private setupTokenEventListeners(): void {
    this.tokenManager.onTokenRefreshed(() => {
      this.processRequestQueue();
    });

    this.tokenManager.onRefreshFailed((error: Error) => {
      this.rejectRequestQueue(error);
    });
  }

  /**
   * Intercept outgoing requests to add authentication headers
   */
  async interceptRequest(config: RequestConfig): Promise<RequestConfig> {
    try {
      // Skip auth for certain endpoints (like refresh endpoint itself)
      if (this.shouldSkipAuth(config)) {
        return config;
      }

      // Wait for token manager to initialize if it's the first run
      if (this.tokenManager.isCurrentlyInitializing()) {
        await this.tokenManager.awaitInitialization();
      }

      // Get current token
      const token = this.tokenManager.getCurrentToken();
      
      if (token) {
        // Add authorization header
        const headers = new Headers(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        
        return {
          ...config,
          headers
        };
      }

      // If no token and not skipping auth, this might be an issue
      securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_NO_TOKEN', {
        url: config.url,
        method: config.method || 'GET'
      });

      return config;

    } catch (error) {
      securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_REQUEST_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: config.url
      });
      
      // Return original config if interception fails
      return config;
    }
  }

  /**
   * Intercept responses to handle authentication errors
   */
  async interceptResponse(response: Response, config: RequestConfig): Promise<Response> {
    // If response is ok or not an auth error, return as-is
    if (response.ok || response.status !== 401) {
      return response;
    }

    // Skip retry if explicitly disabled or already retried
    if (config.skipAuthRetry) {
      return response;
    }

    // Handle authentication error
    return this.handleAuthError(response, config);
  }

  /**
   * Handle authentication errors with automatic token refresh and retry
   */
  async handleAuthError(response: Response, config: RequestConfig): Promise<Response> {
    try {
      securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_401_DETECTED', {
        url: config.url,
        method: config.method || 'GET'
      });

      // If we're already refreshing, queue this request
      if (this.isRefreshing) {
        return this.queueRequest(config);
      }

      // Start refresh process
      this.isRefreshing = true;
      
      try {
        const newToken = await this.tokenManager.refreshToken();
        
        if (newToken) {
          // Refresh successful, retry the original request
          const retryConfig = {
            ...config,
            skipAuthRetry: true // Prevent infinite retry loops
          };
          
          // Update authorization header with new token
          const headers = new Headers(retryConfig.headers);
          headers.set('Authorization', `Bearer ${newToken}`);
          retryConfig.headers = headers;

          securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_RETRY_REQUEST', {
            url: config.url,
            method: config.method || 'GET'
          });

          // Make the retry request
          const retryResponse = await this.makeRequest(retryConfig);
          
          // Process queued requests on successful retry
          this.processRequestQueue();
          
          return retryResponse;
        } else {
          // Refresh failed, reject queued requests
          const error = new Error('Token refresh failed') as AuthError;
          error.status = 401;
          error.code = 'TOKEN_REFRESH_FAILED';
          
          this.rejectRequestQueue(error);
          throw error;
        }
      } finally {
        this.isRefreshing = false;
      }

    } catch (error) {
      securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: config.url
      });

      // If it's already an AuthError, re-throw it
      if (this.isAuthError(error)) {
        throw error;
      }

      // Create new AuthError
      const authError = new Error(
        error instanceof Error ? error.message : 'Authentication failed'
      ) as AuthError;
      authError.status = 401;
      authError.code = 'AUTH_INTERCEPTOR_ERROR';
      authError.response = response;
      
      throw authError;
    }
  }

  /**
   * Queue a request during token refresh
   */
  private queueRequest(config: RequestConfig): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        config: {
          ...config,
          skipAuthRetry: true // Prevent infinite retry loops
        },
        resolve,
        reject
      });

      securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_REQUEST_QUEUED', {
        queueLength: this.requestQueue.length,
        url: config.url
      });
    });
  }

  /**
   * Process queued requests after successful token refresh
   */
  private async processRequestQueue(): Promise<void> {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_PROCESSING_QUEUE', {
      queueLength: queue.length
    });

    // Process requests concurrently
    const promises = queue.map(async (queuedRequest) => {
      try {
        // Update authorization header with new token
        const token = this.tokenManager.getCurrentToken();
        if (token) {
          const headers = new Headers(queuedRequest.config.headers);
          headers.set('Authorization', `Bearer ${token}`);
          queuedRequest.config.headers = headers;
        }

        const response = await this.makeRequest(queuedRequest.config);
        queuedRequest.resolve(response);
      } catch (error) {
        queuedRequest.reject(error instanceof Error ? error : new Error('Request failed'));
      }
    });

    // Wait for all queued requests to complete
    await Promise.allSettled(promises);
  }

  /**
   * Reject all queued requests
   */
  private rejectRequestQueue(error: Error): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    try {
      securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_REJECTING_QUEUE', {
        queueLength: queue.length,
        error: error.message
      });
    } catch {
      // Ignore logging errors
    }

    queue.forEach(queuedRequest => {
      queuedRequest.reject(error);
    });
  }

  /**
   * Make HTTP request with retry logic for network errors
   */
  private async makeRequest(config: RequestConfig, retryCount = 0): Promise<Response> {
    try {
      const url = config.url;
      if (!url) {
        throw new Error('Request URL is required');
      }

      // Remove url from config as fetch expects it as first parameter
      const { url: _url, ...fetchConfig } = config;
      // Explicitly mark as used to satisfy no-unused-vars
      void _url;
      
      const response = await fetch(url, fetchConfig);
      return response;

    } catch (error) {
      // Retry on network errors with exponential backoff
      if (this.shouldRetryNetworkError(error, retryCount)) {
        const delay = this.calculateBackoffDelay(retryCount);
        
        securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_NETWORK_RETRY', {
          url: config.url,
          retryCount: retryCount + 1,
          delay,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await this.delay(delay);
        return this.makeRequest(config, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if we should retry on network error
   */
  private shouldRetryNetworkError(error: unknown, retryCount: number): boolean {
    // Don't retry if we've exceeded max retries
    if (retryCount >= this.maxRetries) {
      return false;
    }

    // Retry on network errors (TypeError for fetch network errors)
    if (error instanceof TypeError && typeof error.message === 'string' && error.message.includes('fetch')) {
      return true;
    }

    // Retry on specific network error messages
    const networkErrorMessages = [
      'network error',
      'connection refused',
      'timeout',
      'failed to fetch'
    ];

    const errorMessage = (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string')
      ? ((error as { message: string }).message.toLowerCase())
      : '';
    return networkErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    return this.baseDelay * Math.pow(2, retryCount);
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if request should skip authentication
   */
  private shouldSkipAuth(config: RequestConfig): boolean {
    const url = config.url || '';
    
    // Skip auth for refresh endpoint
    if (url.includes('/auth/refresh')) {
      return true;
    }

    // Skip auth for login/register endpoints
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return true;
    }

    // Skip auth for public endpoints
    if (url.includes('/public/')) {
      return true;
    }

    return false;
  }

  /**
   * Type guard for AuthError
   */
  private isAuthError(error: unknown): error is AuthError {
    return typeof error === 'object' && error !== null && 'status' in error && (error as { status?: unknown }).status === 401;
  }

  /**
   * Get current queue length (for testing/debugging)
   */
  getQueueLength(): number {
    return this.requestQueue.length;
  }

  /**
   * Check if currently refreshing (for testing/debugging)
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * Clear request queue (for cleanup)
   */
  clearQueue(): void {
    this.requestQueue = [];
  }

  /**
   * Dispose of the interceptor
   */
  dispose(): void {
    // Clear state first
    this.isRefreshing = false;
    
    // Reject any pending requests
    if (this.requestQueue.length > 0) {
      const queue = [...this.requestQueue];
      this.requestQueue = [];
      
      // Use setTimeout to avoid unhandled promise rejections in tests
      setTimeout(() => {
        queue.forEach(queuedRequest => {
          try {
            const error = new Error('AuthInterceptor disposed') as AuthError;
            error.status = 500;
            error.code = 'INTERCEPTOR_DISPOSED';
            queuedRequest.reject(error);
          } catch {
            // Ignore rejection errors during disposal
          }
        });
      }, 0);
    }

    // Clear queue again to be sure
    this.requestQueue = [];

    // Log disposal event (only in non-test environments)
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
      try {
        securityLogger.logSecurityEvent('AUTH_INTERCEPTOR_DISPOSED', {});
      } catch {
        // Ignore logging errors during disposal
      }
    }
  }
}

// Export singleton instance
export const authInterceptor = new AuthInterceptor();

// Types are already exported above via 'export interface'. Removing duplicate re-exports.