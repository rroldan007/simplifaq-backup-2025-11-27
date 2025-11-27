import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { tokenManager } from '../../services/tokenManager';
import { crossTabCoordinator } from '../../services/crossTabCoordinator';
import { secureStorage } from '../../utils/security';

// Mock the buildAuthApiBase function to avoid import.meta issues
jest.mock('../AuthContext', () => {
  const originalModule = jest.requireActual('../AuthContext');
  
  // Create a mock version that doesn't use import.meta
  const mockAuthContext = {
    ...originalModule,
    // We'll manually import the actual AuthProvider and useAuth after mocking other dependencies
  };
  
  return mockAuthContext;
});

// Mock dependencies
jest.mock('../../services/tokenManager', () => ({
  tokenManager: {
    storeTokenInfo: jest.fn(),
    clearTokenInfo: jest.fn(),
    onTokenRefreshed: jest.fn(),
    onTokenExpired: jest.fn(),
    onSessionWarning: jest.fn(),
    onRefreshFailed: jest.fn(),
    removeListener: jest.fn(),
    isTokenExpiringSoon: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('../../services/crossTabCoordinator', () => ({
  crossTabCoordinator: {
    initiateLogout: jest.fn(),
  },
}));

jest.mock('../../utils/security', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  apiRateLimiter: {
    isAllowed: jest.fn(() => true),
    reset: jest.fn(),
  },
  securityLogger: {
    logSecurityEvent: jest.fn(),
  },
  sanitizeEmail: jest.fn((email) => email),
  sanitizeTextInput: jest.fn((text) => text),
  validateInput: {
    email: jest.fn(),
    minLength: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that uses AuthContext
function TestComponent() {
  const { state, login, logout, clearError } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-state">
        {JSON.stringify({
          isAuthenticated: state.isAuthenticated,
          isLoading: state.isLoading,
          user: state.user,
          error: state.error,
        })}
      </div>
      <button 
        onClick={() => login({ email: 'test@example.com', password: 'password123' })}
        data-testid="login-button"
      >
        Login
      </button>
      <button onClick={() => logout()} data-testid="logout-button">
        Logout
      </button>
      <button onClick={() => clearError()} data-testid="clear-error-button">
        Clear Error
      </button>
    </div>
  );
}

describe('AuthContext with TokenManager Integration', () => {
  let mockTokenManager: jest.Mocked<typeof tokenManager>;
  let mockCrossTabCoordinator: jest.Mocked<typeof crossTabCoordinator>;
  let mockSecureStorage: jest.Mocked<typeof secureStorage>;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
    mockCrossTabCoordinator = crossTabCoordinator as jest.Mocked<typeof crossTabCoordinator>;
    mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    // Reset mocks
    mockSecureStorage.getItem.mockReturnValue(null);
    mockTokenManager.isTokenExpiringSoon.mockReturnValue(false);
    mockTokenManager.refreshToken.mockResolvedValue('new-token');
    mockTokenManager.logout.mockResolvedValue();
    mockCrossTabCoordinator.initiateLogout.mockResolvedValue();
  });

  describe('Initialization and Token Recovery', () => {
    it('should initialize with TokenManager event listeners', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Verify TokenManager event listeners are set up
      expect(mockTokenManager.onTokenRefreshed).toHaveBeenCalled();
      expect(mockTokenManager.onTokenExpired).toHaveBeenCalled();
      expect(mockTokenManager.onSessionWarning).toHaveBeenCalled();
      expect(mockTokenManager.onRefreshFailed).toHaveBeenCalled();
    });

    it('should recover authentication state from storage', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      mockSecureStorage.getItem
        .mockReturnValueOnce('test-token') // TOKEN_KEY
        .mockReturnValueOnce(JSON.stringify(mockUser)); // USER_KEY

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.user).toEqual(mockUser);
      });

      // Verify TokenManager integration
      expect(mockTokenManager.storeTokenInfo).toHaveBeenCalledWith({
        token: 'test-token',
        expiresAt: expect.any(Number),
        refreshToken: undefined,
        issuedAt: expect.any(Number),
      });
    });
  });

  describe('Login with Refresh Token Support', () => {
    it('should login successfully and store refresh token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockResponse = {
        success: true,
        data: {
          user: mockUser,
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.user).toEqual(mockUser);
      });

      // Verify TokenManager integration with refresh token
      expect(mockTokenManager.storeTokenInfo).toHaveBeenCalledWith({
        token: 'access-token',
        expiresAt: expect.any(Number),
        refreshToken: 'refresh-token',
        issuedAt: expect.any(Number),
      });
    });

    it('should handle login without refresh token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockResponse = {
        success: true,
        data: {
          user: mockUser,
          token: 'access-token',
          // No refreshToken provided
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.click(screen.getByTestId('login-button'));

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Verify TokenManager integration without refresh token
      expect(mockTokenManager.storeTokenInfo).toHaveBeenCalledWith({
        token: 'access-token',
        expiresAt: expect.any(Number),
        refreshToken: undefined,
        issuedAt: expect.any(Number),
      });
    });
  });

  describe('Automatic Token Refresh', () => {
    it('should handle token refresh events from TokenManager', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('old-token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Simulate token refresh event
      const tokenRefreshCallback = mockTokenManager.onTokenRefreshed.mock.calls[0][0];
      
      act(() => {
        tokenRefreshCallback('new-refreshed-token');
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.user).toEqual(mockUser);
      });

      // Verify token was updated in secure storage
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'simplifaq_token',
        'new-refreshed-token'
      );
    });

    it('should handle token expiration events', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('expired-token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Simulate token expiration event
      const tokenExpiredCallback = mockTokenManager.onTokenExpired.mock.calls[0][0];
      
      act(() => {
        tokenExpiredCallback();
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBeNull();
      });

      // Verify cleanup was performed
      expect(mockTokenManager.clearTokenInfo).toHaveBeenCalled();
    });

    it('should handle session warning events', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      // Mock window.dispatchEvent
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Simulate session warning event
      const sessionWarningCallback = mockTokenManager.onSessionWarning.mock.calls[0][0];
      
      act(() => {
        sessionWarningCallback(300000); // 5 minutes remaining
      });

      // Verify session warning event was dispatched
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sessionWarning',
          detail: { timeRemaining: 300000, user: mockUser },
        })
      );

      dispatchEventSpy.mockRestore();
    });
  });

  describe('Automatic Session Extension', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should extend session on user activity', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      mockTokenManager.isTokenExpiringSoon.mockReturnValue(true);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Fast-forward time to simulate 5+ minutes passing
      act(() => {
        jest.advanceTimersByTime(6 * 60 * 1000);
      });

      // Simulate user activity
      act(() => {
        fireEvent.mouseDown(document);
      });

      // Verify token refresh was triggered
      expect(mockTokenManager.refreshToken).toHaveBeenCalled();
    });

    it('should perform periodic session checks', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      mockTokenManager.isTokenExpiringSoon.mockReturnValue(true);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Fast-forward time to trigger periodic check
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000 + 1000); // 10 minutes + 1 second
      });

      // Verify periodic token refresh was triggered
      expect(mockTokenManager.refreshToken).toHaveBeenCalled();
    });
  });

  describe('Coordinated Logout', () => {
    it('should perform coordinated logout across tabs', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Perform logout
      fireEvent.click(screen.getByTestId('logout-button'));

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
      });

      // Verify coordinated logout was performed
      expect(mockTokenManager.logout).toHaveBeenCalled();
      expect(mockCrossTabCoordinator.initiateLogout).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      // Mock logout to fail
      mockTokenManager.logout.mockRejectedValueOnce(new Error('Logout failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Perform logout
      fireEvent.click(screen.getByTestId('logout-button'));

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
      });

      // Verify logout still completed despite error
      expect(mockTokenManager.logout).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle refresh token failures', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up initial authenticated state
      mockSecureStorage.getItem
        .mockReturnValueOnce('token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
      });

      // Simulate refresh failure event
      const refreshFailedCallback = mockTokenManager.onRefreshFailed.mock.calls[0][0];
      
      act(() => {
        refreshFailedCallback(new Error('Refresh failed'));
      });

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(false);
      });

      // Verify cleanup was performed
      expect(mockTokenManager.clearTokenInfo).toHaveBeenCalled();
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      unmount();

      // Verify cleanup was called
      expect(mockTokenManager.removeListener).toHaveBeenCalledTimes(4);
      expect(mockTokenManager.removeListener).toHaveBeenCalledWith('token_refreshed', expect.any(Function));
      expect(mockTokenManager.removeListener).toHaveBeenCalledWith('token_expired', expect.any(Function));
      expect(mockTokenManager.removeListener).toHaveBeenCalledWith('session_warning', expect.any(Function));
      expect(mockTokenManager.removeListener).toHaveBeenCalledWith('refresh_failed', expect.any(Function));
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing token storage', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
      };

      // Set up existing token in storage
      mockSecureStorage.getItem
        .mockReturnValueOnce('existing-token')
        .mockReturnValueOnce(JSON.stringify(mockUser));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.user).toEqual(mockUser);
      });

      // Verify both storage systems are updated
      expect(mockTokenManager.storeTokenInfo).toHaveBeenCalled();
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('simplifaq_token', 'existing-token');
    });
  });
});
