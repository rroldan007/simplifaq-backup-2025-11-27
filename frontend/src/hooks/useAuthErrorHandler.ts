/**
 * Custom hook for handling authentication errors
 * Provides utilities for error detection, recovery, and user feedback
 */

import React, { useCallback } from 'react';
import { AuthError, AuthErrorType } from '../components/AuthErrorBoundary';
import { userInteractionService } from '../services/userInteractionService';
import { useAuth } from './useAuth';

interface AuthErrorHandlerOptions {
  enableAutoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: AuthError) => void;
  onRecovery?: () => void;
}

interface AuthErrorHandler {
  handleError: (error: Error | AuthError) => Promise<boolean>;
  isAuthError: (error: Error) => boolean;
  createAuthError: (message: string, type?: AuthErrorType, statusCode?: number) => AuthError;
  recoverFromError: (error: AuthError) => Promise<boolean>;
  logAuthError: (error: AuthError, context?: string) => Promise<void>;
}

export function useAuthErrorHandler(options: AuthErrorHandlerOptions = {}): AuthErrorHandler {
  const { logout } = useAuth();
  const {
    enableAutoRetry = true,
    onError
  } = options;

  /**
   * Check if an error is authentication-related
   */
  const isAuthError = useCallback((error: Error): boolean => {
    if (error instanceof AuthError) {
      return true;
    }

    const message = error.message.toLowerCase();
    const authKeywords = [
      'token', 'auth', 'unauthorized', 'forbidden', 'session', 'login', 'jwt',
      '401', '403', 'expired', 'invalid'
    ];

    return authKeywords.some(keyword => message.includes(keyword));
  }, []);

  /**
   * Create a standardized AuthError
   */
  const createAuthError = useCallback((
    message: string,
    type: AuthErrorType = AuthErrorType.UNKNOWN_AUTH_ERROR,
    statusCode?: number
  ): AuthError => {
    return new AuthError(message, type, statusCode);
  }, []);

  /**
   * Log authentication error for audit purposes
   */
  const logAuthError = useCallback(async (error: AuthError, context?: string): Promise<void> => {
    try {
      await userInteractionService.logSessionInteraction({
        action: 'auth_error_handled',
        component: context || 'useAuthErrorHandler',
        metadata: {
          errorType: error.type,
          errorMessage: error.message,
          statusCode: error.statusCode,
          recoverable: error.recoverable,
          timestamp: error.timestamp.toISOString(),
          context
        }
      });
    } catch (logError) {
      console.error('Failed to log auth error:', logError);
    }
  }, []);

  /**
   * Attempt to recover from authentication error
   */
  const recoverFromError = useCallback(async (error: AuthError): Promise<boolean> => {
    try {
      switch (error.type) {
        case AuthErrorType.TOKEN_EXPIRED:
        case AuthErrorType.REFRESH_FAILED:
          // No refresh API available; force logout to reset session
          await logout();
          return false;

        case AuthErrorType.TOKEN_INVALID:
        case AuthErrorType.SESSION_TIMEOUT:
          // Force logout for invalid tokens or session timeout
          await logout();
          return false;

        case AuthErrorType.NETWORK_ERROR:
          // Network errors might be temporary, allow retry
          return true;

        case AuthErrorType.PERMISSION_DENIED:
          // Permission errors are not recoverable
          return false;

        default:
          // Unknown errors - attempt logout as safe fallback
          await logout();
          return false;
      }
    } catch (recoveryError) {
      console.error('Error during auth error recovery:', recoveryError);
      return false;
    }
  }, [logout]);

  /**
   * Main error handling function
   */
  const handleError = useCallback(async (error: Error | AuthError): Promise<boolean> => {
    // Convert to AuthError if needed
    const authError = error instanceof AuthError ? error : AuthError.fromError(error);
    
    // Only handle if it's actually an auth error
    if (!isAuthError(authError)) {
      return false; // Not handled, let it bubble up
    }

    // Log the error
    await logAuthError(authError, 'handleError');

    // Call custom error handler if provided
    onError?.(authError);

    // Attempt recovery if the error is recoverable
    if (authError.recoverable && enableAutoRetry) {
      const recovered = await recoverFromError(authError);
      
      if (recovered) {
        console.log('Successfully recovered from auth error:', authError.type);
        return true; // Error handled and recovered
      }
    }

    // If we can't recover, the error should be thrown to trigger error boundary
    throw authError;
  }, [isAuthError, logAuthError, onError, enableAutoRetry, recoverFromError]);

  return {
    handleError,
    isAuthError,
    createAuthError,
    recoverFromError,
    logAuthError
  };
}

/**
 * Higher-order component for wrapping components with auth error handling
 */
export function withAuthErrorHandler<P extends object>(
  Component: React.ComponentType<P>,
  options?: AuthErrorHandlerOptions
) {
  return function AuthErrorHandlerWrapper(props: P) {
    const errorHandler = useAuthErrorHandler(options);

    // Add error handler to props
    const enhancedProps = {
      ...props,
      authErrorHandler: errorHandler
    } as P & { authErrorHandler: AuthErrorHandler };

    return React.createElement(Component, enhancedProps as unknown as P);
  };
}

/**
 * Utility function to wrap async operations with auth error handling
 */
export function withAuthErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler: AuthErrorHandler
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const handled = await errorHandler.handleError(error as Error);
      if (!handled) {
        throw error; // Re-throw if not handled
      }
      throw error; // Always re-throw to trigger error boundary
    }
  };
}

/**
 * React error boundary hook for functional components
 */
export function useErrorBoundary() {
  const errorHandler = useAuthErrorHandler();

  return useCallback((error: Error) => {
    if (errorHandler.isAuthError(error)) {
      errorHandler.handleError(error);
    } else {
      // For non-auth errors, just throw to trigger nearest error boundary
      throw error;
    }
  }, [errorHandler]);
}
