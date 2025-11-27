import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SessionWarning } from '../SessionWarning';
import { tokenManager } from '../../services/tokenManager';
import { useAuth } from '../../hooks/useAuth';

// Mock the dependencies
jest.mock('../../services/tokenManager', () => ({
  tokenManager: {
    getTokenInfo: jest.fn(),
    refreshToken: jest.fn(),
    onTokenRefreshed: jest.fn(),
    onTokenExpired: jest.fn(),
    onRefreshFailed: jest.fn(),
    removeListener: jest.fn(),
  },
  TOKEN_EXPIRATION_THRESHOLD: 5 * 60 * 1000, // 5 minutes
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../utils/cn', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;

describe('SessionWarning', () => {
  const mockLogout = jest.fn();
  const mockOnSessionExtended = jest.fn();
  const mockOnSaveAndLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mocks
    mockUseAuth.mockReturnValue({
      logout: mockLogout,
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      clearError: jest.fn(),
      updateLogo: jest.fn(),
      updateUser: jest.fn(),
      hasRole: jest.fn(),
      isEmailVerified: jest.fn(),
      getDisplayName: jest.fn(),
      getInitials: jest.fn(),
    });

    // Mock token manager methods
    mockTokenManager.onTokenRefreshed.mockImplementation(() => {});
    mockTokenManager.onTokenExpired.mockImplementation(() => {});
    mockTokenManager.onRefreshFailed.mockImplementation(() => {});
    mockTokenManager.removeListener.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility Logic', () => {
    it('should not render when token is not expiring soon', () => {
      // Token expires in 10 minutes (not soon)
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 10 * 60 * 1000,
        issuedAt: Date.now() - 50 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      expect(screen.queryByText('Session expiring soon')).not.toBeInTheDocument();
    });

    it('should render when token is expiring within threshold', () => {
      // Token expires in 3 minutes (within 5-minute threshold)
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      expect(screen.getByText('Session expiring soon')).toBeInTheDocument();
      expect(screen.getByText('Your session will expire in:')).toBeInTheDocument();
    });

    it('should not render when no token info is available', () => {
      mockTokenManager.getTokenInfo.mockReturnValue(null);

      render(<SessionWarning />);
      
      expect(screen.queryByText('Session expiring soon')).not.toBeInTheDocument();
    });

    it('should use custom threshold when provided', () => {
      const customThreshold = 2 * 60 * 1000; // 2 minutes
      
      // Token expires in 3 minutes (beyond 2-minute threshold)
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      render(<SessionWarning threshold={customThreshold} />);
      
      expect(screen.queryByText('Session expiring soon')).not.toBeInTheDocument();
    });
  });

  describe('Countdown Timer', () => {
    it('should display correct countdown format', () => {
      // Token expires in 3 minutes and 30 seconds
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000 + 30 * 1000,
        issuedAt: Date.now() - 56.5 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      expect(screen.getByText('03:30')).toBeInTheDocument();
    });

    it('should update countdown every second', async () => {
      const initialExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
      
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: initialExpiry,
        issuedAt: Date.now() - 58 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      expect(screen.getByText('02:00')).toBeInTheDocument();
      
      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText('01:59')).toBeInTheDocument();
      });
    });

    it('should handle countdown reaching zero', async () => {
      // Token expires in 1 second
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 1000,
        issuedAt: Date.now() - 59 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      expect(screen.getByText('00:01')).toBeInTheDocument();
      
      // Advance time to expiry
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      // Setup token expiring in 3 minutes
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });
    });

    it('should handle extend session button click', async () => {
      mockTokenManager.refreshToken.mockResolvedValue('new-token');

      render(<SessionWarning onSessionExtended={mockOnSessionExtended} />);
      
      const extendButton = screen.getByText('Extend Session');
      fireEvent.click(extendButton);
      
      expect(screen.getByText('Extending...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockTokenManager.refreshToken).toHaveBeenCalled();
        expect(mockOnSessionExtended).toHaveBeenCalled();
      });
    });

    it('should handle extend session failure', async () => {
      mockTokenManager.refreshToken.mockResolvedValue(null);

      render(<SessionWarning onSaveAndLogout={mockOnSaveAndLogout} />);
      
      const extendButton = screen.getByText('Extend Session');
      fireEvent.click(extendButton);
      
      await waitFor(() => {
        expect(mockTokenManager.refreshToken).toHaveBeenCalled();
        expect(mockOnSaveAndLogout).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should handle save and logout button click', async () => {
      render(<SessionWarning onSaveAndLogout={mockOnSaveAndLogout} />);
      
      const logoutButton = screen.getByText('Save & Logout');
      fireEvent.click(logoutButton);
      
      expect(screen.getByText('Logging out...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockOnSaveAndLogout).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should disable buttons during extend session operation', async () => {
      mockTokenManager.refreshToken.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SessionWarning />);
      
      const extendButton = screen.getByText('Extend Session');
      const logoutButton = screen.getByText('Save & Logout');
      
      fireEvent.click(extendButton);
      
      await waitFor(() => {
        expect(extendButton).toBeDisabled();
        expect(logoutButton).toBeDisabled();
      });
    });

    it('should disable buttons during logout operation', async () => {
      mockLogout.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SessionWarning />);
      
      const extendButton = screen.getByText('Extend Session');
      const logoutButton = screen.getByText('Save & Logout');
      
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(extendButton).toBeDisabled();
        expect(logoutButton).toBeDisabled();
      });
    });
  });

  describe('Token Event Handling', () => {
    it('should hide warning when token is refreshed', () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      expect(screen.getByText('Session expiring soon')).toBeInTheDocument();
      
      // Simulate token refresh event
      const refreshCallback = mockTokenManager.onTokenRefreshed.mock.calls[0][0];
      act(() => {
        refreshCallback('new-token');
      });
      
      expect(screen.queryByText('Session expiring soon')).not.toBeInTheDocument();
    });

    it('should handle token expired event', () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      // Simulate token expired event
      const expiredCallback = mockTokenManager.onTokenExpired.mock.calls[0][0];
      act(() => {
        expiredCallback();
      });
      
      expect(mockLogout).toHaveBeenCalled();
    });

    it('should handle refresh failed event', () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      render(<SessionWarning />);
      
      // Simulate refresh failed event
      const failedCallback = mockTokenManager.onRefreshFailed.mock.calls[0][0];
      act(() => {
        failedCallback(new Error('Refresh failed'));
      });
      
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      const { unmount } = render(<SessionWarning />);
      
      unmount();
      
      expect(mockTokenManager.removeListener).toHaveBeenCalledWith('token_refreshed', expect.any(Function));
      expect(mockTokenManager.removeListener).toHaveBeenCalledWith('token_expired', expect.any(Function));
      expect(mockTokenManager.removeListener).toHaveBeenCalledWith('refresh_failed', expect.any(Function));
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      render(<SessionWarning className="custom-warning" />);
      
      const warningElement = screen.getByText('Session expiring soon').closest('div');
      expect(warningElement).toHaveClass('custom-warning');
    });

    it('should call custom callbacks', async () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      mockTokenManager.refreshToken.mockResolvedValue('new-token');

      render(
        <SessionWarning 
          onSessionExtended={mockOnSessionExtended}
          onSaveAndLogout={mockOnSaveAndLogout}
        />
      );
      
      const extendButton = screen.getByText('Extend Session');
      fireEvent.click(extendButton);
      
      await waitFor(() => {
        expect(mockOnSessionExtended).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle refresh token error gracefully', async () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      mockTokenManager.refreshToken.mockRejectedValue(new Error('Network error'));

      render(<SessionWarning onSaveAndLogout={mockOnSaveAndLogout} />);
      
      const extendButton = screen.getByText('Extend Session');
      fireEvent.click(extendButton);
      
      await waitFor(() => {
        expect(mockOnSaveAndLogout).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('should handle logout error gracefully', async () => {
      mockTokenManager.getTokenInfo.mockReturnValue({
        token: 'valid-token',
        expiresAt: Date.now() + 3 * 60 * 1000,
        issuedAt: Date.now() - 57 * 60 * 1000,
      });

      mockLogout.mockRejectedValue(new Error('Logout error'));

      render(<SessionWarning />);
      
      const logoutButton = screen.getByText('Save & Logout');
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
      
      // Should not throw error
    });
  });
});
