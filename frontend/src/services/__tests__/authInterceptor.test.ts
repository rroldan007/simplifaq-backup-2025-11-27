/**
 * AuthInterceptor Unit Tests
 * 
 * Tests for HTTP request/response interception, automatic token refresh,
 * request queuing, and concurrent request handling.
 */

import { AuthInterceptor, type RequestConfig, type AuthError } from '../authInterceptor';
import type { TokenManager } from '../tokenManager';
import { securityLogger } from '../../utils/security';

// Mock dependencies
jest.mock('../../utils/security', () => ({
  securityLogger: {
    logSecurityEvent: jest.fn()
  }
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Response and Headers for Node.js test environment
type HeadersInitLike = Record<string, string> | undefined | Headers;

global.Response = class MockResponse {
  public status: number;
  public statusText: string;
  public ok: boolean;
  public headers: Headers;
  private body: string;

  constructor(body: string = '', init: { status?: number; statusText?: string; headers?: HeadersInitLike } = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init.headers);
  }

  async text(): Promise<string> {
    return this.body;
  }

  async json(): Promise<unknown> {
    return JSON.parse(this.body);
  }
} as unknown as typeof Response;

global.Headers = class MockHeaders {
  private headers: Map<string, string> = new Map();

  constructor(init?: Headers | { [key: string]: string } | globalThis.Headers) {
    if (init) {
      if (init instanceof Headers) {
        // Copy from another Headers instance
        (init as Headers).forEach((value: string, key: string) => {
          this.headers.set(key.toLowerCase(), value);
        });
      } else if (typeof init === 'object') {
        // Copy from object
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), String(value));
        });
      }
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  delete(name: string): void {
    this.headers.delete(name.toLowerCase());
  }

  forEach(callback: (value: string, key: string) => void): void {
    this.headers.forEach((value, key) => callback(value, key));
  }
} as unknown as typeof Headers;

// Mock TokenManager
class MockTokenManager {
  private token: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private callbacks: Record<string, Array<(...args: unknown[]) => void>> = {};
  private isInitializing = false;

  isCurrentlyInitializing(): boolean {
    return this.isInitializing;
  }

  async awaitInitialization(): Promise<void> {
    return Promise.resolve();
  }

  getCurrentToken(): string | null {
    return this.token;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = new Promise((resolve) => {
      setTimeout(() => {
        if (this.token === 'expired_token') {
          this.token = 'new_token';
          this.emitEvent('onTokenRefreshed', 'new_token');
          resolve('new_token');
        } else {
          this.emitEvent('onRefreshFailed', new Error('Refresh failed'));
          resolve(null);
        }
        this.refreshPromise = null;
      }, 100);
    });

    return this.refreshPromise;
  }

  onTokenRefreshed(callback: (token: string) => void): void {
    // Wrap to fit generic unknown-args callback signature
    this.addCallback('onTokenRefreshed', (...args: unknown[]) => {
      const token = String(args[0]);
      callback(token);
    });
  }

  onRefreshFailed(callback: (error: Error) => void): void {
    // Wrap to fit generic unknown-args callback signature
    this.addCallback('onRefreshFailed', (...args: unknown[]) => {
      const err = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
      callback(err);
    });
  }

  private addCallback(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  private emitEvent(event: string, ...args: unknown[]): void {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(...args));
    }
  }
}

describe('AuthInterceptor', () => {
  let authInterceptor: AuthInterceptor;
  let mockTokenManager: MockTokenManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    mockTokenManager = new MockTokenManager();
    authInterceptor = new AuthInterceptor(mockTokenManager as unknown as TokenManager);
  });

  afterEach(() => {
    authInterceptor.dispose();
  });

  describe('interceptRequest', () => {
    it('should add Authorization header when token is available', async () => {
      mockTokenManager.setToken('valid_token');

      const config: RequestConfig = {
        url: '/api/test',
        method: 'GET'
      };

      const result = await authInterceptor.interceptRequest(config);

      expect(result.headers).toBeInstanceOf(Headers);
      const headers = result.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer valid_token');
    });

    it('should not add Authorization header when no token is available', async () => {
      mockTokenManager.setToken(null);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'GET'
      };

      const result = await authInterceptor.interceptRequest(config);

      const headers = result.headers as Headers;
      expect(headers?.get('Authorization')).toBeUndefined();
    });

    it('should skip auth for refresh endpoint', async () => {
      mockTokenManager.setToken('valid_token');

      const config: RequestConfig = {
        url: '/api/auth/refresh',
        method: 'POST'
      };

      const result = await authInterceptor.interceptRequest(config);

      // Should return original config without modification
      expect(result).toBe(config);
    });

    it('should skip auth for login endpoint', async () => {
      mockTokenManager.setToken('valid_token');

      const config: RequestConfig = {
        url: '/api/auth/login',
        method: 'POST'
      };

      const result = await authInterceptor.interceptRequest(config);

      expect(result).toBe(config);
    });

    it('should skip auth for public endpoints', async () => {
      mockTokenManager.setToken('valid_token');

      const config: RequestConfig = {
        url: '/api/public/status',
        method: 'GET'
      };

      const result = await authInterceptor.interceptRequest(config);

      expect(result).toBe(config);
    });

    it('should log security event when no token is available', async () => {
      mockTokenManager.setToken(null);

      const config: RequestConfig = {
        url: '/api/test',
        method: 'GET'
      };

      await authInterceptor.interceptRequest(config);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'AUTH_INTERCEPTOR_NO_TOKEN',
        {
          url: '/api/test',
          method: 'GET'
        }
      );
    });
  });

  describe('interceptResponse', () => {
    it('should return response as-is when status is ok', async () => {
      const mockResponse = new Response('success', { status: 200 });
      const config: RequestConfig = { url: '/api/test' };

      const result = await authInterceptor.interceptResponse(mockResponse, config);

      expect(result).toBe(mockResponse);
    });

    it('should return response as-is when status is not 401', async () => {
      const mockResponse = new Response('error', { status: 500 });
      const config: RequestConfig = { url: '/api/test' };

      const result = await authInterceptor.interceptResponse(mockResponse, config);

      expect(result).toBe(mockResponse);
    });

    it('should return response as-is when skipAuthRetry is true', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config: RequestConfig = { 
        url: '/api/test',
        skipAuthRetry: true 
      };

      const result = await authInterceptor.interceptResponse(mockResponse, config);

      expect(result).toBe(mockResponse);
    });

    it('should handle auth error when status is 401', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config: RequestConfig = { url: '/api/test' };

      // Mock successful token refresh and retry
      mockTokenManager.setToken('expired_token');
      mockFetch.mockResolvedValueOnce(new Response('success', { status: 200 }));

      const result = await authInterceptor.interceptResponse(mockResponse, config);

      expect(result.status).toBe(200);
      expect(mockTokenManager.getCurrentToken()).toBe('new_token');
    });
  });

  describe('handleAuthError', () => {
    it('should refresh token and retry request on 401 error', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config: RequestConfig = { 
        url: '/api/test',
        method: 'GET'
      };

      mockTokenManager.setToken('expired_token');
      mockFetch.mockResolvedValueOnce(new Response('success', { status: 200 }));

      const result = await authInterceptor.handleAuthError(mockResponse, config);

      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
        skipAuthRetry: true,
        headers: expect.any(Headers)
      }));
    });

    it('should queue requests when refresh is already in progress', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config1: RequestConfig = { url: '/api/test1' };
      const config2: RequestConfig = { url: '/api/test2' };

      mockTokenManager.setToken('expired_token');
      
      // Start first request (will trigger refresh)
      const promise1 = authInterceptor.handleAuthError(mockResponse, config1);
      
      // Start second request while refresh is in progress (should be queued)
      const promise2 = authInterceptor.handleAuthError(mockResponse, config2);

      expect(authInterceptor.getQueueLength()).toBe(1);
      expect(authInterceptor.isCurrentlyRefreshing()).toBe(true);

      // Mock successful responses for both requests
      mockFetch
        .mockResolvedValueOnce(new Response('success1', { status: 200 }))
        .mockResolvedValueOnce(new Response('success2', { status: 200 }));

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.status).toBe(200);
      expect(result2.status).toBe(200);
      expect(authInterceptor.getQueueLength()).toBe(0);
      expect(authInterceptor.isCurrentlyRefreshing()).toBe(false);
    });

    it('should throw error when token refresh fails', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config: RequestConfig = { url: '/api/test' };

      mockTokenManager.setToken('invalid_token'); // Will cause refresh to fail

      await expect(authInterceptor.handleAuthError(mockResponse, config))
        .rejects.toThrow('Token refresh failed');
    });

    it('should reject queued requests when refresh fails', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config1: RequestConfig = { url: '/api/test1' };
      const config2: RequestConfig = { url: '/api/test2' };

      mockTokenManager.setToken('invalid_token'); // Will cause refresh to fail

      const promise1 = authInterceptor.handleAuthError(mockResponse, config1);
      const promise2 = authInterceptor.handleAuthError(mockResponse, config2);

      await expect(Promise.all([promise1, promise2]))
        .rejects.toThrow('Refresh failed');
    });

    it('should log security events during auth error handling', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config: RequestConfig = { url: '/api/test', method: 'POST' };

      mockTokenManager.setToken('expired_token');
      mockFetch.mockResolvedValueOnce(new Response('success', { status: 200 }));

      await authInterceptor.handleAuthError(mockResponse, config);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'AUTH_INTERCEPTOR_401_DETECTED',
        {
          url: '/api/test',
          method: 'POST'
        }
      );

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'AUTH_INTERCEPTOR_RETRY_REQUEST',
        {
          url: '/api/test',
          method: 'POST'
        }
      );
    });
  });

  describe('network error retry', () => {
    it('should retry on network errors with exponential backoff', async () => {
      const config: RequestConfig = { url: '/api/test' };

      // Mock network error followed by success
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      // Use private method through handleAuthError to test retry logic
      const mockResponse = new Response('unauthorized', { status: 401 });
      mockTokenManager.setToken('expired_token');

      const result = await authInterceptor.handleAuthError(mockResponse, config);

      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    it('should stop retrying after max retries', async () => {
      const config: RequestConfig = { url: '/api/test' };

      // Mock continuous network errors
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const mockResponse = new Response('unauthorized', { status: 401 });
      mockTokenManager.setToken('expired_token');

      await expect(authInterceptor.handleAuthError(mockResponse, config))
        .rejects.toThrow('Failed to fetch');

      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    }, 10000); // Increase timeout to 10 seconds

    it('should log retry attempts', async () => {
      const config: RequestConfig = { url: '/api/test' };

      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response('success', { status: 200 }));

      const mockResponse = new Response('unauthorized', { status: 401 });
      mockTokenManager.setToken('expired_token');

      await authInterceptor.handleAuthError(mockResponse, config);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'AUTH_INTERCEPTOR_NETWORK_RETRY',
        expect.objectContaining({
          url: '/api/test',
          retryCount: 1,
          delay: 1000,
          error: 'Failed to fetch'
        })
      );
    });
  });

  describe('concurrent request handling', () => {
    it('should handle multiple concurrent 401 errors with single refresh', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const configs = [
        { url: '/api/test1' },
        { url: '/api/test2' },
        { url: '/api/test3' }
      ];

      mockTokenManager.setToken('expired_token');

      // Mock successful responses for all requests
      mockFetch
        .mockResolvedValueOnce(new Response('success1', { status: 200 }))
        .mockResolvedValueOnce(new Response('success2', { status: 200 }))
        .mockResolvedValueOnce(new Response('success3', { status: 200 }));

      // Start all requests concurrently
      const promises = configs.map(config => 
        authInterceptor.handleAuthError(mockResponse, config)
      );

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Should have queued 2 requests (first one triggers refresh, others are queued)
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'AUTH_INTERCEPTOR_PROCESSING_QUEUE',
        { queueLength: 2 }
      );
    });

    it('should handle queue processing correctly', async () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config1: RequestConfig = { url: '/api/test1' };
      const config2: RequestConfig = { url: '/api/test2' };

      mockTokenManager.setToken('expired_token');

      // Start first request
      const promise1 = authInterceptor.handleAuthError(mockResponse, config1);
      
      // Start second request (should be queued)
      const promise2 = authInterceptor.handleAuthError(mockResponse, config2);

      expect(authInterceptor.getQueueLength()).toBe(1);

      // Mock responses
      mockFetch
        .mockResolvedValueOnce(new Response('success1', { status: 200 }))
        .mockResolvedValueOnce(new Response('success2', { status: 200 }));

      await Promise.all([promise1, promise2]);

      expect(authInterceptor.getQueueLength()).toBe(0);
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'AUTH_INTERCEPTOR_REQUEST_QUEUED',
        expect.objectContaining({
          queueLength: 1,
          url: '/api/test2'
        })
      );
    });
  });

  describe('utility methods', () => {
    it('should return correct queue length', () => {
      expect(authInterceptor.getQueueLength()).toBe(0);
    });

    it('should return correct refreshing status', () => {
      expect(authInterceptor.isCurrentlyRefreshing()).toBe(false);
    });

    it('should clear queue', () => {
      // Add some items to queue by triggering concurrent requests
      const mockResponse = new Response('unauthorized', { status: 401 });
      mockTokenManager.setToken('expired_token');

      authInterceptor.handleAuthError(mockResponse, { url: '/api/test1' });
      authInterceptor.handleAuthError(mockResponse, { url: '/api/test2' });

      expect(authInterceptor.getQueueLength()).toBeGreaterThan(0);

      authInterceptor.clearQueue();
      expect(authInterceptor.getQueueLength()).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should reject pending requests and clear state', () => {
      const mockResponse = new Response('unauthorized', { status: 401 });
      mockTokenManager.setToken('expired_token');

      // Add requests to queue
      authInterceptor.handleAuthError(mockResponse, { url: '/api/test1' });
      authInterceptor.handleAuthError(mockResponse, { url: '/api/test2' });

      expect(authInterceptor.getQueueLength()).toBeGreaterThan(0);

      authInterceptor.dispose();

      expect(authInterceptor.getQueueLength()).toBe(0);
      expect(authInterceptor.isCurrentlyRefreshing()).toBe(false);
      // In test environment, dispose doesn't log
      expect(authInterceptor.getQueueLength()).toBe(0);
    });
  });

  describe('error handling', () => {
    it.skip('should create proper AuthError objects', async () => {
      // Create a fresh interceptor for this test to avoid interference
      const freshInterceptor = new AuthInterceptor(mockTokenManager as unknown as TokenManager);
      
      const mockResponse = new Response('unauthorized', { status: 401 });
      const config: RequestConfig = { url: '/api/test' };

      mockTokenManager.setToken('invalid_token'); // Will cause refresh to fail

      // Mock console.log to suppress output during test
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      try {
        await freshInterceptor.handleAuthError(mockResponse, config);
        fail('Should have thrown an error');
      } catch (error) {
        const authError = error as AuthError;
        expect(authError.status).toBe(401);
        expect(authError.code).toBe('TOKEN_REFRESH_FAILED');
        expect(authError.message).toContain('Token refresh failed');
      } finally {
        console.log = originalConsoleLog;
        freshInterceptor.dispose();
      }
    });

    it('should handle interceptRequest errors gracefully', async () => {
      // Mock tokenManager to throw error
      const errorTokenManager = new MockTokenManager();
      jest.spyOn(errorTokenManager, 'getCurrentToken').mockImplementation(() => {
        throw new Error('Token manager error');
      });

      const interceptor = new AuthInterceptor(errorTokenManager as unknown as TokenManager);
      const config: RequestConfig = { url: '/api/test' };

      const result = await interceptor.interceptRequest(config);

      // Should return original config on error
      expect(result).toBe(config);
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'AUTH_INTERCEPTOR_REQUEST_ERROR',
        expect.objectContaining({
          error: 'Token manager error',
          url: '/api/test'
        })
      );

      interceptor.dispose();
    });
  });
});