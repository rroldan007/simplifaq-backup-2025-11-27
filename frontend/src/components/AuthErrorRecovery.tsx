/**
 * Authentication Error Recovery Component
 * Provides specialized recovery UI for different types of authentication errors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthError, AuthErrorType } from './AuthErrorBoundary';
import { useAuthErrorHandler } from '../hooks/useAuthErrorHandler';
import { cn } from '../utils/cn';

interface AuthErrorRecoveryProps {
  error: AuthError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AuthErrorRecovery({ error, onRetry, onDismiss, className }: AuthErrorRecoveryProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const errorHandler = useAuthErrorHandler();

  const maxRecoveryAttempts = 3;

  /**
   * Attempt automatic recovery
   */
  const handleAutoRecovery = useCallback(async () => {
    if (recoveryAttempts >= maxRecoveryAttempts) {
      return;
    }

    setIsRecovering(true);
    setRecoveryAttempts(prev => prev + 1);

    try {
      const recovered = await errorHandler.recoverFromError(error);
      
      if (recovered) {
        onDismiss?.();
      } else {
        // Recovery failed, show manual options
        console.log('Automatic recovery failed for:', error.type);
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
    } finally {
      setIsRecovering(false);
    }
  }, [recoveryAttempts, maxRecoveryAttempts, errorHandler, error, onDismiss]);

  /**
   * Handle manual retry
   */
  const handleManualRetry = () => {
    onRetry?.();
  };

  /**
   * Handle login redirect
   */
  const handleLoginRedirect = () => {
    // Clear tokens and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  /**
   * Handle page reload
   */
  const handlePageReload = () => {
    window.location.reload();
  };

  /**
   * Get error-specific recovery options
   */
  const getRecoveryOptions = () => {
    switch (error.type) {
      case AuthErrorType.TOKEN_EXPIRED:
        return {
          title: 'Session Expired',
          description: 'Your session has expired. We can try to refresh it automatically.',
          icon: '🔄',
          autoRecovery: true,
          actions: [
            { label: 'Refresh Session', onClick: handleAutoRecovery, primary: true },
            { label: 'Log In Again', onClick: handleLoginRedirect }
          ]
        };

      case AuthErrorType.TOKEN_INVALID:
        return {
          title: 'Authentication Failed',
          description: 'Your authentication token is invalid. Please log in again.',
          icon: '🔐',
          autoRecovery: false,
          actions: [
            { label: 'Log In Again', onClick: handleLoginRedirect, primary: true }
          ]
        };

      case AuthErrorType.REFRESH_FAILED:
        return {
          title: 'Session Refresh Failed',
          description: 'Unable to refresh your session. Please log in again.',
          icon: '⚠️',
          autoRecovery: false,
          actions: [
            { label: 'Log In Again', onClick: handleLoginRedirect, primary: true }
          ]
        };

      case AuthErrorType.NETWORK_ERROR:
        return {
          title: 'Connection Error',
          description: 'Unable to connect to the server. Please check your internet connection.',
          icon: '🌐',
          autoRecovery: true,
          actions: [
            { label: 'Try Again', onClick: handleManualRetry, primary: true },
            { label: 'Reload Page', onClick: handlePageReload }
          ]
        };

      case AuthErrorType.PERMISSION_DENIED:
        return {
          title: 'Access Denied',
          description: 'You do not have permission to access this resource.',
          icon: '🚫',
          autoRecovery: false,
          actions: [
            { label: 'Go to Dashboard', onClick: () => window.location.href = '/dashboard' },
            { label: 'Log In Again', onClick: handleLoginRedirect }
          ]
        };

      case AuthErrorType.SESSION_TIMEOUT:
        return {
          title: 'Session Timeout',
          description: 'Your session has timed out due to inactivity.',
          icon: '⏰',
          autoRecovery: false,
          actions: [
            { label: 'Log In Again', onClick: handleLoginRedirect, primary: true }
          ]
        };

      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected authentication error occurred.',
          icon: '❌',
          autoRecovery: true,
          actions: [
            { label: 'Try Again', onClick: handleManualRetry, primary: true },
            { label: 'Log In Again', onClick: handleLoginRedirect }
          ]
        };
    }
  };

  const recoveryOptions = getRecoveryOptions();

  // Auto-attempt recovery for recoverable errors
  useEffect(() => {
    if (recoveryOptions.autoRecovery && error.recoverable && recoveryAttempts === 0) {
      const timer = setTimeout(() => {
        handleAutoRecovery();
      }, 1000); // Wait 1 second before auto-recovery

      return () => clearTimeout(timer);
    }
  }, [error, recoveryOptions.autoRecovery, recoveryAttempts, handleAutoRecovery]);

  return (
    <div className={cn(
      'bg-white border border-red-200 rounded-lg shadow-lg p-6 max-w-md mx-auto',
      className
    )}>
      {/* Header */}
      <div className="flex items-center mb-4">
        <div className="text-2xl mr-3">{recoveryOptions.icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {recoveryOptions.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {recoveryOptions.description}
          </p>
        </div>
      </div>

      {/* Recovery Status */}
      {isRecovering && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-blue-700">
              Attempting to recover... ({recoveryAttempts}/{maxRecoveryAttempts})
            </span>
          </div>
        </div>
      )}

      {/* Recovery Actions */}
      <div className="space-y-2 mb-4">
        {recoveryOptions.actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={isRecovering}
            className={cn(
              'w-full px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              action.primary
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Error Details Toggle */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          {showDetails ? 'Hide' : 'Show'} technical details
        </button>

        {showDetails && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs font-mono text-gray-600">
            <div className="space-y-1">
              <div><strong>Type:</strong> {error.type}</div>
              <div><strong>Status:</strong> {error.statusCode || 'N/A'}</div>
              <div><strong>Recoverable:</strong> {error.recoverable ? 'Yes' : 'No'}</div>
              <div><strong>Time:</strong> {error.timestamp.toLocaleString()}</div>
              <div><strong>Attempts:</strong> {recoveryAttempts}/{maxRecoveryAttempts}</div>
              {error.originalError && (
                <div><strong>Original:</strong> {error.originalError.message}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <div className="mt-4 text-center">
          <button
            onClick={onDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default AuthErrorRecovery;
