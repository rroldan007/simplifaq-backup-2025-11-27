/* eslint-disable react-refresh/only-export-components */
/**
 * Authentication Error Boundary Component
 * Handles authentication-related errors with graceful fallback UI and recovery mechanisms
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { userInteractionService } from '../services/userInteractionService';

// Error types that this boundary should handle
export enum AuthErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_FAILED = 'REFRESH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  UNKNOWN_AUTH_ERROR = 'UNKNOWN_AUTH_ERROR'
}

// Props interface
interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AuthError, retry: () => void) => ReactNode;
  onError?: (error: AuthError, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  className?: string;
}

// State interface
interface AuthErrorBoundaryState {
  hasError: boolean;
  error: AuthError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  lastErrorTime: number;
}

// Custom authentication error class
export class AuthError extends Error {
  public readonly type: AuthErrorType;
  public readonly statusCode?: number;
  public readonly originalError?: Error;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    type: AuthErrorType = AuthErrorType.UNKNOWN_AUTH_ERROR,
    statusCode?: number,
    originalError?: Error,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.timestamp = new Date();
    this.recoverable = recoverable;
  }

  static fromError(error: Error): AuthError {
    // Detect authentication errors from various sources
    const message = error.message.toLowerCase();
    
    if (message.includes('token expired') || message.includes('jwt expired')) {
      return new AuthError('Your session has expired', AuthErrorType.TOKEN_EXPIRED, 401, error);
    }
    
    if (message.includes('invalid token') || message.includes('unauthorized')) {
      return new AuthError('Authentication failed', AuthErrorType.TOKEN_INVALID, 401, error);
    }
    
    if (message.includes('refresh') && message.includes('failed')) {
      return new AuthError('Unable to refresh session', AuthErrorType.REFRESH_FAILED, 401, error);
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return new AuthError('Network connection error', AuthErrorType.NETWORK_ERROR, 0, error);
    }
    
    if (message.includes('permission') || message.includes('forbidden')) {
      return new AuthError('Access denied', AuthErrorType.PERMISSION_DENIED, 403, error, false);
    }
    
    if (message.includes('session') && message.includes('timeout')) {
      return new AuthError('Session timed out', AuthErrorType.SESSION_TIMEOUT, 401, error);
    }
    
    return new AuthError(error.message, AuthErrorType.UNKNOWN_AUTH_ERROR, undefined, error);
  }
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Convert regular errors to AuthError if they seem authentication-related
    const authError = error instanceof AuthError ? error : AuthErrorBoundary.detectAuthError(error);
    
    if (authError) {
      return {
        hasError: true,
        error: authError,
        lastErrorTime: Date.now()
      };
    }
    
    // If it's not an auth error, don't catch it
    return {};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const authError = this.state.error;
    
    if (authError) {
      // Log the authentication error
      this.logAuthError(authError, errorInfo);
      
      // Call custom error handler if provided
      this.props.onError?.(authError, errorInfo);
      
      this.setState({ errorInfo });
    } else {
      // Re-throw non-auth errors
      throw error;
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Detect if an error is authentication-related
   */
  private static detectAuthError(error: Error): AuthError | null {
    const message = error.message.toLowerCase();
    const authKeywords = [
      'token', 'auth', 'unauthorized', 'forbidden', 'session', 'login', 'jwt'
    ];
    
    const isAuthError = authKeywords.some(keyword => message.includes(keyword));
    
    if (isAuthError) {
      return AuthError.fromError(error);
    }
    
    return null;
  }

  /**
   * Log authentication error for security audit
   */
  private async logAuthError(error: AuthError, errorInfo: ErrorInfo) {
    try {
      // Log to user interaction service
      await userInteractionService.logSessionInteraction({
        action: 'auth_error_boundary_triggered',
        component: 'AuthErrorBoundary',
        metadata: {
          errorType: error.type,
          errorMessage: error.message,
          statusCode: error.statusCode,
          recoverable: error.recoverable,
          retryCount: this.state.retryCount,
          componentStack: errorInfo.componentStack,
          timestamp: error.timestamp.toISOString()
        }
      });

      console.error('Authentication Error Boundary triggered:', {
        error: error.message,
        type: error.type,
        statusCode: error.statusCode,
        recoverable: error.recoverable,
        componentStack: errorInfo.componentStack
      });
    } catch (logError) {
      console.error('Failed to log auth error:', logError);
    }
  }

  /**
   * Retry the failed operation
   */
  private handleRetry = async () => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('Max retries exceeded for auth error recovery');
      return;
    }

    this.setState({ isRetrying: true });

    // Log retry attempt
    await userInteractionService.logSessionInteraction({
      action: 'auth_error_retry_attempt',
      component: 'AuthErrorBoundary',
      metadata: {
        retryCount: this.state.retryCount + 1,
        errorType: this.state.error?.type,
        maxRetries
      }
    });

    // Delay before retry
    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false
      }));
    }, retryDelay);
  };

  /**
   * Reset error boundary state
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: 0
    });
  };

  /**
   * Navigate to login page
   */
  private handleLoginRedirect = () => {
    // Clear any stored tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login
    window.location.href = '/login';
  };

  /**
   * Reload the page
   */
  private handlePageReload = () => {
    window.location.reload();
  };

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: AuthError): string {
    switch (error.type) {
      case AuthErrorType.TOKEN_EXPIRED:
        return 'Your session has expired. Please log in again to continue.';
      case AuthErrorType.TOKEN_INVALID:
        return 'Authentication failed. Please log in again.';
      case AuthErrorType.REFRESH_FAILED:
        return 'Unable to refresh your session. Please log in again.';
      case AuthErrorType.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection and try again.';
      case AuthErrorType.PERMISSION_DENIED:
        return 'You do not have permission to access this resource.';
      case AuthErrorType.SESSION_TIMEOUT:
        return 'Your session has timed out due to inactivity. Please log in again.';
      default:
        return 'An authentication error occurred. Please try again or log in.';
    }
  }

  /**
   * Get recovery actions based on error type
   */
  private getRecoveryActions(error: AuthError) {
    const { enableRetry = true, maxRetries = 3 } = this.props;
    const canRetry = enableRetry && error.recoverable && this.state.retryCount < maxRetries;

    const actions = [];

    if (canRetry) {
      actions.push({
        label: this.state.isRetrying ? 'Retrying...' : 'Try Again',
        onClick: this.handleRetry,
        disabled: this.state.isRetrying,
        primary: true
      });
    }

    if (error.type === AuthErrorType.NETWORK_ERROR) {
      actions.push({
        label: 'Reload Page',
        onClick: this.handlePageReload,
        disabled: this.state.isRetrying
      });
    }

        if ([AuthErrorType.TOKEN_EXPIRED, AuthErrorType.TOKEN_INVALID, AuthErrorType.REFRESH_FAILED, AuthErrorType.SESSION_TIMEOUT, AuthErrorType.PERMISSION_DENIED].includes(error.type)) {
      actions.push({
        label: 'Log In Again',
        onClick: this.handleLoginRedirect,
        disabled: this.state.isRetrying,
        primary: !canRetry
      });
    }

    return actions;
  }

  /**
   * Default fallback UI
   */
  private renderDefaultFallback(error: AuthError) {
    const message = this.getErrorMessage(error);
    const actions = this.getRecoveryActions(error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Error Title */}
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>

            {/* Error Message */}
            <p className="mt-2 text-sm text-gray-600">
              {message}
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700">
                  <div><strong>Type:</strong> {error.type}</div>
                  <div><strong>Status:</strong> {error.statusCode || 'N/A'}</div>
                  <div><strong>Retries:</strong> {this.state.retryCount}</div>
                  <div><strong>Time:</strong> {error.timestamp.toISOString()}</div>
                  {error.originalError && (
                    <div><strong>Original:</strong> {error.originalError.message}</div>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Recovery Actions */}
          <div className="space-y-3">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`
                  group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white
                  ${action.primary 
                    ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' 
                    : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                `}
              >
                {action.disabled && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }
      
      return this.renderDefaultFallback(this.state.error);
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;
