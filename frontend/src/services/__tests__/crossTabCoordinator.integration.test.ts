import { CrossTabCoordinator } from '../crossTabCoordinator';
import { tokenManager } from '../tokenManager';
import { securityLogger } from '../securityLogger';

// Mock dependencies
jest.mock('../tokenManager', () => ({
  tokenManager: {
    onTokenRefreshed: jest.fn(),
    onTokenExpired: jest.fn(),
    onSessionWarning: jest.fn(),
    updateTokenFromCrossTab: jest.fn(),
    handleTokenExpiredFromCrossTab: jest.fn(),
    handleSessionWarningFromCrossTab: jest.fn(),
    logout: jest.fn(),
    getTokenInfo: jest.fn(),
  },
}));

jest.mock('../securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      // Simulate storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: value,
        oldValue: store[key] || null,
        storageArea: localStorage,
      }));
    }),
    removeItem: jest.fn((key: string) => {
      const oldValue = store[key];
      delete store[key];
      // Simulate storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: null,
        oldValue: oldValue || null,
        storageArea: localStorage,
      }));
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.crypto for tab ID generation
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-tab-id-12345'),
  },
});

describe('CrossTabCoordinator Integration Tests', () => {
  let coordinator: CrossTabCoordinator;
  let mockTokenManager: jest.Mocked<typeof tokenManager>;
  let mockSecurityLogger: jest.Mocked<typeof securityLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    
    mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
    mockSecurityLogger = securityLogger as jest.Mocked<typeof securityLogger>;
    
    // Reset token manager mocks
    mockTokenManager.getTokenInfo.mockReturnValue({
      token: 'test-token',
      expiresAt: Date.now() + 3600000,
      refreshToken: 'test-refresh-token',
      issuedAt: Date.now(),
    });

    coordinator = new CrossTabCoordinator();
  });

  afterEach(() => {
    coordinator.destroy();
  });

  describe('Multi-Tab Token Coordination', () => {
    it('should broadcast token updates to other tabs', async () => {
      const testToken = 'new-test-token';
      const expiresAt = Date.now() + 7200000;

      // Simulate token refresh in current tab
      coordinator.broadcastTokenUpdate(testToken, expiresAt);

      // Verify localStorage event was triggered
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"TOKEN_UPDATE"')
      );

      // Verify security logging
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'CROSS_TAB_TOKEN_UPDATE_BROADCAST',
        expect.objectContaining({
          token: testToken,
          expiresAt,
        })
      );
    });

    it('should handle token updates from other tabs', () => {
      const testToken = 'updated-token';
      const expiresAt = Date.now() + 7200000;

      // Simulate storage event from another tab
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'TOKEN_UPDATE',
          data: { token: testToken, expiresAt },
          tabId: 'other-tab-id',
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      // Verify token manager was called to update token
      expect(mockTokenManager.updateTokenFromCrossTab).toHaveBeenCalledWith(
        testToken,
        expiresAt
      );
    });

    it('should not handle events from the same tab', () => {
      const testToken = 'self-token';
      const expiresAt = Date.now() + 7200000;

      // Simulate storage event from same tab (using the mocked tab ID)
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'TOKEN_UPDATE',
          data: { token: testToken, expiresAt },
          tabId: 'mock-tab-id-12345', // Same as mocked crypto.randomUUID
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      // Verify token manager was NOT called (same tab)
      expect(mockTokenManager.updateTokenFromCrossTab).not.toHaveBeenCalled();
    });
  });

  describe('Multi-Tab Session Expiration', () => {
    it('should broadcast session expiration to other tabs', () => {
      coordinator.broadcastTokenExpired();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"TOKEN_EXPIRED"')
      );

      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'CROSS_TAB_TOKEN_EXPIRED_BROADCAST',
        expect.any(Object)
      );
    });

    it('should handle session expiration from other tabs', () => {
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'TOKEN_EXPIRED',
          data: {},
          tabId: 'other-tab-id',
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(mockTokenManager.handleTokenExpiredFromCrossTab).toHaveBeenCalled();
    });
  });

  describe('Multi-Tab Session Warning', () => {
    it('should broadcast session warnings to other tabs', () => {
      const timeRemaining = 300000; // 5 minutes

      coordinator.broadcastSessionWarning(timeRemaining);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"SESSION_WARNING"')
      );

      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'CROSS_TAB_SESSION_WARNING_BROADCAST',
        expect.objectContaining({ timeRemaining })
      );
    });

    it('should handle session warnings from other tabs', () => {
      const timeRemaining = 180000; // 3 minutes

      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'SESSION_WARNING',
          data: { timeRemaining },
          tabId: 'other-tab-id',
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(mockTokenManager.handleSessionWarningFromCrossTab).toHaveBeenCalledWith(
        timeRemaining
      );
    });
  });

  describe('Multi-Tab Logout Coordination', () => {
    it('should initiate coordinated logout across tabs', async () => {
      await coordinator.initiateLogout();

      // Should broadcast logout initiation
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"LOGOUT_INITIATED"')
      );

      // Should call token manager logout
      expect(mockTokenManager.logout).toHaveBeenCalled();

      // Should broadcast logout completion
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"LOGOUT_COMPLETED"')
      );
    });

    it('should handle logout initiation from other tabs', () => {
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'LOGOUT_INITIATED',
          data: {},
          tabId: 'other-tab-id',
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(mockTokenManager.logout).toHaveBeenCalled();
    });

    it('should handle logout completion from other tabs', () => {
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'LOGOUT_COMPLETED',
          data: {},
          tabId: 'other-tab-id',
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(mockTokenManager.logout).toHaveBeenCalled();
    });
  });

  describe('Tab Heartbeat and Cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send heartbeat signals periodically', () => {
      // Fast-forward time to trigger heartbeat
      jest.advanceTimersByTime(35000); // 35 seconds (heartbeat interval is 30s)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"HEARTBEAT"')
      );
    });

    it('should track active tabs via heartbeat', () => {
      const otherTabId = 'other-tab-12345';

      // Simulate heartbeat from another tab
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'HEARTBEAT',
          data: {},
          tabId: otherTabId,
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      // Tab should be tracked as active
      expect(coordinator.getActiveTabIds()).toContain(otherTabId);
    });

    it('should clean up dead tabs', () => {
      const deadTabId = 'dead-tab-12345';
      const oldTimestamp = Date.now() - 120000; // 2 minutes ago

      // Simulate old heartbeat from a dead tab
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'HEARTBEAT',
          data: {},
          tabId: deadTabId,
          timestamp: oldTimestamp,
        }),
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      // Fast-forward time to trigger cleanup
      jest.advanceTimersByTime(65000); // 65 seconds (cleanup interval is 60s)

      // Dead tab should be removed from active tabs
      expect(coordinator.getActiveTabIds()).not.toContain(deadTabId);
    });

    it('should clean up old events from localStorage', () => {
      // Add some old events to localStorage
      const oldEvent = JSON.stringify({
        type: 'TOKEN_UPDATE',
        data: { token: 'old-token', expiresAt: Date.now() },
        tabId: 'old-tab',
        timestamp: Date.now() - 3700000, // Over 1 hour old
      });

      mockLocalStorage.setItem('cross_tab_events', oldEvent);

      // Fast-forward time to trigger cleanup
      jest.advanceTimersByTime(65000);

      // Old events should be cleaned up
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'CROSS_TAB_EVENTS_CLEANUP',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed localStorage events gracefully', () => {
      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: 'invalid-json',
        storageArea: localStorage,
      });

      // Should not throw error
      expect(() => window.dispatchEvent(event)).not.toThrow();

      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'CROSS_TAB_EVENT_PARSE_ERROR',
        expect.any(Object)
      );
    });

    it('should handle localStorage quota exceeded', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      // Should handle error gracefully
      expect(() => coordinator.broadcastTokenUpdate('test', Date.now())).not.toThrow();

      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'CROSS_TAB_BROADCAST_ERROR',
        expect.objectContaining({
          error: 'QuotaExceededError',
        })
      );
    });

    it('should handle tokenManager method failures', () => {
      // Mock tokenManager.logout to throw error
      mockTokenManager.logout.mockRejectedValueOnce(new Error('Logout failed'));

      const event = new StorageEvent('storage', {
        key: 'cross_tab_events',
        newValue: JSON.stringify({
          type: 'LOGOUT_INITIATED',
          data: {},
          tabId: 'other-tab-id',
          timestamp: Date.now(),
        }),
        storageArea: localStorage,
      });

      // Should handle error gracefully
      expect(() => window.dispatchEvent(event)).not.toThrow();
    });

    it('should handle network connectivity issues', () => {
      // Simulate network offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Should still attempt to broadcast (localStorage is local)
      coordinator.broadcastTokenUpdate('test-token', Date.now());

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Integration with TokenManager Events', () => {
    it('should set up token manager listeners on initialization', () => {
      expect(mockTokenManager.onTokenRefreshed).toHaveBeenCalled();
      expect(mockTokenManager.onTokenExpired).toHaveBeenCalled();
      expect(mockTokenManager.onSessionWarning).toHaveBeenCalled();
    });

    it('should broadcast when token manager emits token refresh', () => {
      const refreshCallback = mockTokenManager.onTokenRefreshed.mock.calls[0][0];
      const newToken = 'refreshed-token';

      // Simulate token refresh event
      refreshCallback(newToken);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"TOKEN_UPDATE"')
      );
    });

    it('should broadcast when token manager emits token expiration', () => {
      const expiredCallback = mockTokenManager.onTokenExpired.mock.calls[0][0];

      // Simulate token expiration event
      expiredCallback();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"TOKEN_EXPIRED"')
      );
    });

    it('should broadcast when token manager emits session warning', () => {
      const warningCallback = mockTokenManager.onSessionWarning.mock.calls[0][0];
      const timeRemaining = 300000;

      // Simulate session warning event
      warningCallback(timeRemaining);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cross_tab_events',
        expect.stringContaining('"type":"SESSION_WARNING"')
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('should limit the number of stored events', () => {
      // Generate many events
      for (let i = 0; i < 150; i++) {
        coordinator.broadcastTokenUpdate(`token-${i}`, Date.now());
      }

      // Should trigger cleanup due to event limit
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'CROSS_TAB_EVENTS_CLEANUP',
        expect.any(Object)
      );
    });

    it('should properly clean up resources on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      coordinator.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );
    });
  });
});
