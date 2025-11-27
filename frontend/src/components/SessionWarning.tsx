import { useState, useEffect, useCallback } from 'react';
import { tokenManager, TOKEN_EXPIRATION_THRESHOLD } from '../services/tokenManager';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { userInteractionService } from '../services/userInteractionService';

interface SessionWarningProps {
  /** Custom threshold in milliseconds for showing warning (default: 5 minutes) */
  threshold?: number;
  /** Custom className for styling */
  className?: string;
  /** Callback when session is extended */
  onSessionExtended?: () => void;
  /** Callback when user chooses to save and logout */
  onSaveAndLogout?: () => void;
}

interface TimeRemaining {
  minutes: number;
  seconds: number;
  total: number;
}

export function SessionWarning({
  threshold = TOKEN_EXPIRATION_THRESHOLD,
  className,
  onSessionExtended,
  onSaveAndLogout
}: SessionWarningProps) {
  const { logout } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({ minutes: 0, seconds: 0, total: 0 });
  const [isExtending, setIsExtending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Calculate time remaining until token expiration
   */
  const calculateTimeRemaining = useCallback((): TimeRemaining => {
    const tokenInfo = tokenManager.getTokenInfo();
    if (!tokenInfo) {
      return { minutes: 0, seconds: 0, total: 0 };
    }

    const now = Date.now();
    const total = Math.max(0, tokenInfo.expiresAt - now);
    const minutes = Math.floor(total / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);

    return { minutes, seconds, total };
  }, []);

  /**
   * Check if warning should be shown
   */
  const checkWarningVisibility = useCallback(() => {
    const tokenInfo = tokenManager.getTokenInfo();
    if (!tokenInfo) {
      setIsVisible(false);
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = tokenInfo.expiresAt - now;
    const shouldShow = timeUntilExpiry <= threshold && timeUntilExpiry > 0;
    
    // Track when session warning is first displayed
    if (shouldShow && !isVisible) {
      userInteractionService.trackSessionWarningDisplayed(timeUntilExpiry);
    }
    
    setIsVisible(shouldShow);
    
    if (shouldShow) {
      setTimeRemaining(calculateTimeRemaining());
    }
  }, [threshold, calculateTimeRemaining, isVisible]);

  /**
   * Handle session extension
   */
  const handleExtendSession = async () => {
    const currentTimeRemaining = timeRemaining.total;
    setIsExtending(true);
    
    try {
      const newToken = await tokenManager.refreshToken();
      if (newToken) {
        // Track successful session extension
        await userInteractionService.trackSessionExtended(currentTimeRemaining);
        setIsVisible(false);
        onSessionExtended?.();
      } else {
        // If refresh fails, force logout
        await handleSaveAndLogout();
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      // If refresh fails, force logout
      await handleSaveAndLogout();
    } finally {
      setIsExtending(false);
    }
  };

  /**
   * Handle save and logout
   */
  const handleSaveAndLogout = useCallback(async () => {
    const currentTimeRemaining = timeRemaining.total;
    setIsLoggingOut(true);
    
    try {
      // Track user-initiated save and logout
      await userInteractionService.trackSaveAndLogout(currentTimeRemaining);
      onSaveAndLogout?.();
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
      // Force logout even if there's an error
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }, [timeRemaining.total, onSaveAndLogout, logout]);

  /**
   * Set up periodic checks for warning visibility
   */
  useEffect(() => {
    // Initial check
    checkWarningVisibility();

    // Set up interval to check warning visibility every 30 seconds
    const visibilityInterval = setInterval(checkWarningVisibility, 30000);

    return () => {
      clearInterval(visibilityInterval);
    };
  }, [checkWarningVisibility]);

  /**
   * Set up countdown timer when visible
   */
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;
    
    if (isVisible) {
      countdownInterval = setInterval(() => {
        const remaining = calculateTimeRemaining();
        setTimeRemaining(remaining);
        
        // Auto-logout if time expires
        if (remaining.total <= 0) {
          userInteractionService.trackSessionTimeout();
          handleSaveAndLogout();
        }
      }, 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [isVisible, calculateTimeRemaining, handleSaveAndLogout]);

  /**
   * Listen for token events
   */
  useEffect(() => {
    const handleTokenRefreshed = () => {
      setIsVisible(false);
    };

    const handleTokenExpired = () => {
      setIsVisible(false);
      handleSaveAndLogout();
    };

    const handleRefreshFailed = () => {
      setIsVisible(false);
      handleSaveAndLogout();
    };

    tokenManager.onTokenRefreshed(handleTokenRefreshed);
    tokenManager.onTokenExpired(handleTokenExpired);
    tokenManager.onRefreshFailed(handleRefreshFailed);

    return () => {
      tokenManager.removeListener('token_refreshed', handleTokenRefreshed);
      tokenManager.removeListener('token_expired', handleTokenExpired);
      tokenManager.removeListener('refresh_failed', handleRefreshFailed);
    };
  }, [handleSaveAndLogout]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 max-w-md bg-white border border-yellow-200 rounded-lg shadow-lg',
      'animate-in slide-in-from-top-2 duration-300',
      className
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <WarningIcon className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">
              Session expiring soon
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Your session will expire in:
          </p>
          <div className="text-2xl font-bold text-yellow-600 text-center py-2">
            {String(timeRemaining.minutes).padStart(2, '0')}:
            {String(timeRemaining.seconds).padStart(2, '0')}
          </div>
          <p className="text-xs text-gray-500 text-center">
            Please choose an action to continue working or save your progress.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExtendSession}
            disabled={isExtending || isLoggingOut}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium rounded-md',
              'bg-blue-600 text-white hover:bg-blue-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200'
            )}
          >
            {isExtending ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Extending...
              </span>
            ) : (
              'Extend Session'
            )}
          </button>
          
          <button
            onClick={handleSaveAndLogout}
            disabled={isExtending || isLoggingOut}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium rounded-md',
              'bg-gray-600 text-white hover:bg-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200'
            )}
          >
            {isLoggingOut ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Logging out...
              </span>
            ) : (
              'Save & Logout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Warning icon component
 */
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" 
      />
    </svg>
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg 
      className={cn('animate-spin', className)} 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default SessionWarning;
