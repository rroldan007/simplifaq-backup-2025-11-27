/**
 * Unit tests for TokenManager service
 */

import { TokenManager, tokenManager, TOKEN_EVENTS, TOKEN_EXPIRATION_THRESHOLD } from '../tokenManager';
import { secureStorage, securityLogger } from '../../utils/security';

// Mock dependencies
jest.mock('../../utils/security', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

// Mock window.setTimeout and window.clearTimeout
const mockSetTimeout = jest.fn().mockReturnValue(123); // Return a mock timeout ID
const mockClearTimeout = jest.fn();
Object.defineProperty(window, 'setTimeout', {
  value: mockSetTimeout,
  writable: true
});
Object.defineProperty(window, 'clearTimeout', {
  value: mockClearTimeout,
  writable: true
});

// Helper to safely access private event emitter for testing without using any
type EventEmitterLike = { emit: (event: string, ...args: unknown[]) => void };
const getEmitter = (m: TokenManager): EventEmitterLike => {
  return (m as unknown as { eventEmitter: EventEmitterLike }).eventEmitter;
};

describe('TokenManager', () => {
  let manager: TokenManager;
  const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
  const mockSecurityLogger = securityLogger as jest.Mocked<typeof securityLogger>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockSetTimeout.mockClear();
    mockClearTimeout.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    
    // Dispose previous manager if it exists
    if (manager) {
      manager.dispose();
    }
    
    manager = new TokenManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('getTokenInfo', () => {
    it('should return null when no token is stored', () => {
      mockSecureStorage.getItem.mockReturnValue(null);
      
      const result = manager.getTokenInfo();
      
      expect(result).toBeNull();
    });

    it('should return null when token exists but no expiration time', () => {
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(null) // expiresAt
        .mockReturnValueOnce('refresh-token');
      
      const result = manager.getTokenInfo();
      
      expect(result).toBeNull();
    });

    it('should return token info when all data is present', () => {
      const expiresAt = Date.now() + 3600000; // 1 hour from now
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString())
        .mockReturnValueOnce('refresh-token');
      
      const result = manager.getTokenInfo();
      
      expect(result).toEqual({
        token: 'test-token',
        expiresAt,
        refreshToken: 'refresh-token',
        issuedAt: expiresAt - 3600000, // 1 hour before expiration
      });
    });

    it('should handle invalid expiration time gracefully', () => {
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce('invalid-number')
        .mockReturnValueOnce('refresh-token');
      
      const result = manager.getTokenInfo();
      
      expect(result).toBeNull();
    });

    it('should log security event on error', () => {
      mockSecureStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = manager.getTokenInfo();
      
      expect(result).toBeNull();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_INFO_ERROR', {
        error: 'Storage error'
      });
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return true when no token exists', () => {
      mockSecureStorage.getItem.mockReturnValue(null);
      
      const result = manager.isTokenExpiringSoon();
      
      expect(result).toBe(true);
    });

    it('should return true when token expires within threshold', () => {
      const expiresAt = Date.now() + 60000; // 1 minute from now
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      const result = manager.isTokenExpiringSoon();
      
      expect(result).toBe(true);
    });

    it('should return false when token expires after threshold', () => {
      const expiresAt = Date.now() + 600000; // 10 minutes from now
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      const result = manager.isTokenExpiringSoon();
      
      expect(result).toBe(false);
    });

    it('should use custom threshold', () => {
      const expiresAt = Date.now() + 120000; // 2 minutes from now
      const customThreshold = 180000; // 3 minutes
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      const result = manager.isTokenExpiringSoon(customThreshold);
      
      expect(result).toBe(true);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when no token exists', () => {
      mockSecureStorage.getItem.mockReturnValue(null);
      
      const result = manager.isTokenExpired();
      
      expect(result).toBe(true);
    });

    it('should return true when token is expired', () => {
      const expiresAt = Date.now() - 60000; // 1 minute ago
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      const result = manager.isTokenExpired();
      
      expect(result).toBe(true);
    });

    it('should return false when token is not expired', () => {
      const expiresAt = Date.now() + 60000; // 1 minute from now
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      const result = manager.isTokenExpired();
      
      expect(result).toBe(false);
    });
  });

  describe('getCurrentToken', () => {
    it('should return null when no token exists', () => {
      mockSecureStorage.getItem.mockReturnValue(null);
      
      const result = manager.getCurrentToken();
      
      expect(result).toBeNull();
    });

    it('should return null when token is expired', () => {
      const expiresAt = Date.now() - 60000; // 1 minute ago
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      const result = manager.getCurrentToken();
      
      expect(result).toBeNull();
    });

    it('should return token when valid', () => {
      const expiresAt = Date.now() + 60000; // 1 minute from now
      
      // Mock all the calls that getTokenInfo makes
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token') // TOKEN_KEY
        .mockReturnValueOnce(expiresAt.toString()) // TOKEN_EXPIRES_AT_KEY
        .mockReturnValueOnce('refresh-token') // REFRESH_TOKEN_KEY
        // Mock the second call to getTokenInfo in getCurrentToken
        .mockReturnValueOnce('test-token') // TOKEN_KEY
        .mockReturnValueOnce(expiresAt.toString()) // TOKEN_EXPIRES_AT_KEY
        .mockReturnValueOnce('refresh-token'); // REFRESH_TOKEN_KEY
      
      const result = manager.getCurrentToken();
      
      expect(result).toBe('test-token');
    });
  });

  describe('storeTokenInfo', () => {
    it('should store token information correctly', () => {
      const tokenInfo = {
        token: 'new-token',
        expiresAt: Date.now() + 3600000,
        refreshToken: 'new-refresh-token',
      };
      
      manager.storeTokenInfo(tokenInfo);
      
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('simplifaq_token', 'new-token');
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('simplifaq_token_expires_at', tokenInfo.expiresAt.toString());
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('simplifaq_refresh_token', 'new-refresh-token');
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_STORED', {
        hasToken: true,
        hasRefreshToken: true,
        expiresAt: tokenInfo.expiresAt
      });
    });

    it('should handle partial token info', () => {
      const tokenInfo = {
        token: 'new-token',
      };
      
      manager.storeTokenInfo(tokenInfo);
      
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('simplifaq_token', 'new-token');
      expect(mockSecureStorage.setItem).not.toHaveBeenCalledWith('simplifaq_token_expires_at', expect.anything());
      expect(mockSecureStorage.setItem).not.toHaveBeenCalledWith('simplifaq_refresh_token', expect.anything());
    });

    it('should handle storage errors', () => {
      mockSecureStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => {
        manager.storeTokenInfo({ token: 'test-token' });
      }).toThrow('Failed to store token information');
      
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_STORAGE_ERROR', {
        error: 'Storage error'
      });
    });
  });

  describe('clearTokenInfo', () => {
    it('should clear all token information', () => {
      manager.clearTokenInfo();
      
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('simplifaq_token');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('simplifaq_token_expires_at');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('simplifaq_refresh_token');
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_CLEARED', {});
    });

    it('should handle storage errors gracefully', () => {
      mockSecureStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => {
        manager.clearTokenInfo();
      }).not.toThrow();
      
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_CLEAR_ERROR', {
        error: 'Storage error'
      });
    });
  });

  describe('refreshToken', () => {

    it('should return null when no refresh token is available', async () => {
      mockSecureStorage.getItem.mockReturnValue(null);
      
      const result = await manager.refreshToken();
      
      expect(result).toBeNull();
    });

    it('should successfully refresh token', async () => {
      // Create a fresh manager for this test
      const testManager = new TokenManager();
      
      const expiresAt = Date.now() + 3600000;
      
      // Mock getTokenInfo call in refreshToken
      mockSecureStorage.getItem
        .mockReturnValueOnce('current-token') // TOKEN_KEY
        .mockReturnValueOnce(expiresAt.toString()) // TOKEN_EXPIRES_AT_KEY  
        .mockReturnValueOnce('refresh-token'); // REFRESH_TOKEN_KEY

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            token: 'new-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600
          }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await testManager.refreshToken();
      
      expect(result).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer refresh-token',
        },
        body: JSON.stringify({
          refreshToken: 'refresh-token'
        })
      });
      
      testManager.dispose();
    });

    it('should handle refresh failure', async () => {
      const expiresAt = Date.now() + 3600000;
      mockSecureStorage.getItem
        .mockReturnValueOnce('current-token')
        .mockReturnValueOnce(expiresAt.toString())
        .mockReturnValueOnce('refresh-token');

      const mockResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: { message: 'Invalid refresh token' }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await manager.refreshToken();
      
      expect(result).toBeNull();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_REFRESH_FAILED', {
        status: 401,
        error: 'Invalid refresh token'
      });
    });

    it('should handle network errors', async () => {
      const expiresAt = Date.now() + 3600000;
      mockSecureStorage.getItem
        .mockReturnValueOnce('current-token')
        .mockReturnValueOnce(expiresAt.toString())
        .mockReturnValueOnce('refresh-token');

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await manager.refreshToken();
      
      expect(result).toBeNull();
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_REFRESH_ERROR', {
        error: 'Network error'
      });
    });

    it('should return same promise for concurrent refresh attempts', async () => {
      // Create a fresh manager for this test
      const testManager = new TokenManager();
      
      const expiresAt = Date.now() + 3600000;
      
      // Mock getTokenInfo calls - need to return values for both calls
      mockSecureStorage.getItem
        .mockReturnValueOnce('current-token') // TOKEN_KEY - first call
        .mockReturnValueOnce(expiresAt.toString()) // TOKEN_EXPIRES_AT_KEY - first call
        .mockReturnValueOnce('refresh-token'); // REFRESH_TOKEN_KEY - first call

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            token: 'new-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600
          }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      // Start two concurrent refresh attempts
      const promise1 = testManager.refreshToken();
      const promise2 = testManager.refreshToken();
      
      // Should be the same promise
      expect(promise1).toStrictEqual(promise2);
      
      const result1 = await promise1;
      const result2 = await promise2;
      
      expect(result1).toBe('new-token');
      expect(result2).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one actual request
      
      testManager.dispose();
    });
  });

  describe('scheduleTokenRefresh', () => {
    it('should schedule refresh before token expiration', () => {
      const expiresAt = Date.now() + 600000; // 10 minutes from now
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      manager.scheduleTokenRefresh();
      
      expect(mockSetTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        600000 - TOKEN_EXPIRATION_THRESHOLD // 10 minutes - 5 minutes threshold
      );
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_REFRESH_SCHEDULED', {
        refreshIn: 600000 - TOKEN_EXPIRATION_THRESHOLD,
        expiresAt
      });
    });

    it('should not schedule refresh if token expires too soon', () => {
      const expiresAt = Date.now() + 60000; // 1 minute from now (less than threshold)
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      manager.scheduleTokenRefresh();
      
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should clear existing timeout before scheduling new one', () => {
      const expiresAt = Date.now() + 600000;
      mockSecureStorage.getItem
        .mockReturnValue('test-token')
        .mockReturnValue(expiresAt.toString());
      
      // Schedule first refresh
      manager.scheduleTokenRefresh();
      const firstTimeoutId = 123; // Mock timeout ID
      
      // Schedule second refresh
      manager.scheduleTokenRefresh();
      
      expect(mockClearTimeout).toHaveBeenCalledWith(firstTimeoutId);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event System', () => {
    it('should register and emit token refreshed events', () => {
      const callback = jest.fn();
      manager.onTokenRefreshed(callback);
      
      // Simulate token refresh event
      getEmitter(manager).emit(TOKEN_EVENTS.TOKEN_REFRESHED, 'new-token');
      
      expect(callback).toHaveBeenCalledWith('new-token');
    });

    it('should register and emit token expired events', () => {
      const callback = jest.fn();
      manager.onTokenExpired(callback);
      
      // Simulate token expired event
      getEmitter(manager).emit(TOKEN_EVENTS.TOKEN_EXPIRED);
      
      expect(callback).toHaveBeenCalled();
    });

    it('should register and emit refresh failed events', () => {
      const callback = jest.fn();
      const error = new Error('Refresh failed');
      manager.onRefreshFailed(callback);
      
      // Simulate refresh failed event
      getEmitter(manager).emit(TOKEN_EVENTS.REFRESH_FAILED, error);
      
      expect(callback).toHaveBeenCalledWith(error);
    });

    it('should remove specific event listeners', () => {
      const callback = jest.fn();
      manager.onTokenRefreshed(callback);
      
      // Remove listener
      manager.removeListener(TOKEN_EVENTS.TOKEN_REFRESHED, callback);
      
      // Emit event - callback should not be called
      getEmitter(manager).emit(TOKEN_EVENTS.TOKEN_REFRESHED, 'new-token');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should remove all event listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      manager.onTokenRefreshed(callback1);
      manager.onTokenExpired(callback2);
      
      // Remove all listeners
      manager.removeAllListeners();
      
      // Emit events - callbacks should not be called
      getEmitter(manager).emit(TOKEN_EVENTS.TOKEN_REFRESHED, 'new-token');
      getEmitter(manager).emit(TOKEN_EVENTS.TOKEN_EXPIRED);
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Cross-tab coordination', () => {
    it('should broadcast token updates', () => {
      manager.broadcastTokenUpdate('new-token');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token_broadcast', 
        expect.stringContaining('"type":"token_updated"')
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token_broadcast', 
        expect.stringContaining('"token":"new-token"')
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token_broadcast');
    });

    it('should handle broadcast errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => {
        manager.broadcastTokenUpdate('new-token');
      }).not.toThrow();
      
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_BROADCAST_ERROR', {
        error: 'Storage error'
      });
    });
  });

  describe('dispose', () => {
    it('should cleanup all resources', () => {
      // Setup some state
      const expiresAt = Date.now() + 600000;
      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token')
        .mockReturnValueOnce(expiresAt.toString());
      
      manager.scheduleTokenRefresh();
      const timeoutId = 123; // Mock timeout ID
      
      // Dispose
      manager.dispose();
      
      expect(mockClearTimeout).toHaveBeenCalledWith(timeoutId);
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith('TOKEN_MANAGER_DISPOSED', {});
    });
  });

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(tokenManager).toBeInstanceOf(TokenManager);
    });
  });
});