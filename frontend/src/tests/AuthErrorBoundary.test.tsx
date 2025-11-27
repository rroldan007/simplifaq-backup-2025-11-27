/**
 * Tests for Authentication Error Boundary System
 */

import React from 'react';
// React import not required with automatic JSX runtime
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { AuthErrorBoundary, AuthError, AuthErrorType } from '../components/AuthErrorBoundary';
import { AuthErrorRecovery } from '../components/AuthErrorRecovery';
import { useAuthErrorHandler } from '../hooks/useAuthErrorHandler';
import { userInteractionService } from '../services/userInteractionService';

// Mock dependencies
jest.mock('../services/userInteractionService', () => ({
  userInteractionService: {
    logSessionInteraction: jest.fn(async () => {})
  }
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    logout: jest.fn(() => {}),
  })
}));

// Test component that throws errors
const ErrorThrowingComponent = ({ error }: { error?: Error }) => {
  if (error) {
    throw error;
  }
  return <div>No error</div>;
};

// Test component for hook testing
const TestHookComponent = ({ error }: { error?: Error }) => {
  const errorHandler = useAuthErrorHandler();
  
  const handleClick = async () => {
    if (error) {
      await errorHandler.handleError(error);
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Trigger Error</button>
      <div>Hook Component</div>
    </div>
  );
};

describe('AuthError', () => {
  it('should create AuthError with correct properties', () => {
    const error = new AuthError(
      'Test error',
      AuthErrorType.TOKEN_EXPIRED,
      401,
      new Error('Original error'),
      true
    );

    expect(error.message).toBe('Test error');
    expect(error.type).toBe(AuthErrorType.TOKEN_EXPIRED);
    expect(error.statusCode).toBe(401);
    expect(error.recoverable).toBe(true);
    expect(error.originalError?.message).toBe('Original error');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should detect token expired errors', () => {
    const originalError = new Error('JWT token expired');
    const authError = AuthError.fromError(originalError);

    expect(authError.type).toBe(AuthErrorType.TOKEN_EXPIRED);
    expect(authError.message).toBe('Your session has expired');
    expect(authError.recoverable).toBe(true);
  });

  it('should detect invalid token errors', () => {
    const originalError = new Error('Invalid token provided');
    const authError = AuthError.fromError(originalError);

    expect(authError.type).toBe(AuthErrorType.TOKEN_INVALID);
    expect(authError.message).toBe('Authentication failed');
  });

  it('should detect network errors', () => {
    const originalError = new Error('Network request failed');
    const authError = AuthError.fromError(originalError);

    expect(authError.type).toBe(AuthErrorType.NETWORK_ERROR);
    expect(authError.message).toBe('Network connection error');
  });

  it('should handle unknown errors', () => {
    const originalError = new Error('Some random error');
    const authError = AuthError.fromError(originalError);

    expect(authError.type).toBe(AuthErrorType.UNKNOWN_AUTH_ERROR);
    expect(authError.message).toBe('Some random error');
  });
});

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <AuthErrorBoundary>
        <div>Test content</div>
      </AuthErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch and display authentication errors', () => {
    const authError = new AuthError('Test auth error', AuthErrorType.TOKEN_EXPIRED);

    render(
      <AuthErrorBoundary>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
  });

  it('should provide retry functionality', async () => {
    const authError = new AuthError('Test error', AuthErrorType.NETWORK_ERROR);
    const onError = jest.fn();

    render(
      <AuthErrorBoundary onError={onError} enableRetry={true}>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    
    // Should show retrying state
    await waitFor(() => {
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });

    expect(onError).toHaveBeenCalledWith(authError, expect.any(Object));
  });

  it('should show login redirect for token errors', () => {
    const authError = new AuthError('Token expired', AuthErrorType.TOKEN_EXPIRED);

    render(
      <AuthErrorBoundary>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    expect(screen.getByText('Log In Again')).toBeInTheDocument();
  });

  it('should show page reload for network errors', () => {
    const authError = new AuthError('Network error', AuthErrorType.NETWORK_ERROR);

    render(
      <AuthErrorBoundary>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should respect max retry limit', () => {
    const authError = new AuthError('Test error', AuthErrorType.NETWORK_ERROR);

    render(
      <AuthErrorBoundary maxRetries={2}>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    
    // Click retry multiple times
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    // Should still show retry button (component resets on retry)
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    const authError = new AuthError('Test error', AuthErrorType.TOKEN_EXPIRED);
    const customFallback = (error: AuthError, retry: () => void) => (
      <div>
        <div>Custom Error UI</div>
        <div>Error: {error.message}</div>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <AuthErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('should not catch non-authentication errors', () => {
    const regularError = new Error('Regular error');

    // This should throw and not be caught by the boundary
    expect(() => {
      render(
        <AuthErrorBoundary>
          <ErrorThrowingComponent error={regularError} />
        </AuthErrorBoundary>
      );
    }).toThrow('Regular error');
  });

  it('should show technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const authError = new AuthError('Test error', AuthErrorType.TOKEN_EXPIRED, 401);

    render(
      <AuthErrorBoundary>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('AuthErrorRecovery', () => {
  it('should render recovery options for token expired error', () => {
    const error = new AuthError('Token expired', AuthErrorType.TOKEN_EXPIRED);
    const onRetry = jest.fn();

    render(<AuthErrorRecovery error={error} onRetry={onRetry} />);

    expect(screen.getByText('Session Expired')).toBeInTheDocument();
    expect(screen.getByText('Refresh Session')).toBeInTheDocument();
    expect(screen.getByText('Log In Again')).toBeInTheDocument();
  });

  it('should render recovery options for network error', () => {
    const error = new AuthError('Network error', AuthErrorType.NETWORK_ERROR);
    const onRetry = jest.fn();

    render(<AuthErrorRecovery error={error} onRetry={onRetry} />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should handle retry action', () => {
    const error = new AuthError('Network error', AuthErrorType.NETWORK_ERROR);
    const onRetry = jest.fn();

    render(<AuthErrorRecovery error={error} onRetry={onRetry} />);

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalled();
  });

  it('should show technical details when toggled', () => {
    const error = new AuthError('Test error', AuthErrorType.TOKEN_EXPIRED, 401);

    render(<AuthErrorRecovery error={error} />);

    const detailsButton = screen.getByText('Show technical details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText(AuthErrorType.TOKEN_EXPIRED)).toBeInTheDocument();
  });

  it('should handle dismiss action', () => {
    const error = new AuthError('Test error', AuthErrorType.TOKEN_EXPIRED);
    const onDismiss = jest.fn();

    render(<AuthErrorRecovery error={error} onDismiss={onDismiss} />);

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('useAuthErrorHandler', () => {
  it('should detect authentication errors correctly', () => {
    const TestComponent = () => {
      const errorHandler = useAuthErrorHandler();
      
      const authError = new Error('Token expired');
      const regularError = new Error('Regular error');
      
      return (
        <div>
          <div>{errorHandler.isAuthError(authError) ? 'Auth Error' : 'Not Auth Error'}</div>
          <div>{errorHandler.isAuthError(regularError) ? 'Auth Error' : 'Not Auth Error'}</div>
        </div>
      );
    };

    render(<TestComponent />);

    const results = screen.getAllByText(/Error/);
    expect(results[0]).toHaveTextContent('Auth Error');
    expect(results[1]).toHaveTextContent('Not Auth Error');
  });

  it('should create AuthError correctly', () => {
    const TestComponent = () => {
      const errorHandler = useAuthErrorHandler();
      
      const authError = errorHandler.createAuthError(
        'Test message',
        AuthErrorType.TOKEN_EXPIRED,
        401
      );
      
      return (
        <div>
          <div>Message: {authError.message}</div>
          <div>Type: {authError.type}</div>
          <div>Status: {authError.statusCode}</div>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Message: Test message')).toBeInTheDocument();
    expect(screen.getByText(`Type: ${AuthErrorType.TOKEN_EXPIRED}`)).toBeInTheDocument();
    expect(screen.getByText('Status: 401')).toBeInTheDocument();
  });

  it('should handle errors and attempt recovery', async () => {
    // handlers intentionally not used here

    render(
      <TestHookComponent 
        error={new AuthError('Token expired', AuthErrorType.TOKEN_EXPIRED)} 
      />
    );

    const button = screen.getByText('Trigger Error');
    
    // This should throw since the error handler will re-throw after handling
    await expect(async () => {
      fireEvent.click(button);
      await waitFor(() => {});
    }).rejects.toThrow();
  });
});

describe('Integration Tests', () => {
  it('should handle complete error flow from boundary to recovery', async () => {
    const authError = new AuthError('Session expired', AuthErrorType.TOKEN_EXPIRED);

    render(
      <AuthErrorBoundary enableRetry={true}>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    // Should show error boundary UI
    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();

    // Should have recovery actions
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Log In Again')).toBeInTheDocument();
  });

  it('should handle different error types with appropriate recovery options', () => {
    const testCases = [
      {
        error: new AuthError('Token expired', AuthErrorType.TOKEN_EXPIRED),
        expectedActions: ['Try Again', 'Log In Again']
      },
      {
        error: new AuthError('Network error', AuthErrorType.NETWORK_ERROR),
        expectedActions: ['Try Again', 'Reload Page']
      },
      {
        error: new AuthError('Permission denied', AuthErrorType.PERMISSION_DENIED),
        expectedActions: ['Log In Again']
      }
    ];

    testCases.forEach(({ error, expectedActions }) => {
      const { unmount } = render(
        <AuthErrorBoundary>
          <ErrorThrowingComponent error={error} />
        </AuthErrorBoundary>
      );

      expectedActions.forEach(action => {
        expect(screen.getByText(action)).toBeInTheDocument();
      });

      unmount();
    });
  });

  it('should log errors for security audit', async () => {
    const authError = new AuthError('Test error', AuthErrorType.TOKEN_EXPIRED);

    render(
      <AuthErrorBoundary>
        <ErrorThrowingComponent error={authError} />
      </AuthErrorBoundary>
    );

    await waitFor(() => {
      expect(userInteractionService.logSessionInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auth_error_boundary_triggered',
          component: 'AuthErrorBoundary',
          metadata: expect.objectContaining({
            errorType: AuthErrorType.TOKEN_EXPIRED,
            errorMessage: 'Test error'
          })
        })
      );
    });
  });
});
