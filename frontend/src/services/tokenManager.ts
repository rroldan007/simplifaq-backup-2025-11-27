/**
 * TokenManager Service
 * 
 * Centralized token lifecycle management with event emitter system
 * for token state changes and cross-tab coordination.
 */

import { secureStorage, securityLogger } from '../utils/security';

// Token storage keys
const TOKEN_KEY = 'simplifaq_token';
const REFRESH_TOKEN_KEY = 'simplifaq_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'simplifaq_token_expires_at';

// Token expiration threshold (5 minutes in milliseconds)
const TOKEN_EXPIRATION_THRESHOLD = 5 * 60 * 1000;

// Cross-tab coordination event types
const TOKEN_EVENTS = {
  TOKEN_REFRESHED: 'token_refreshed',
  TOKEN_EXPIRED: 'token_expired',
  REFRESH_FAILED: 'refresh_failed',
  TOKEN_UPDATED: 'token_updated',
  SESSION_WARNING: 'session_warning',
} as const;

export interface TokenInfo {
  token: string;
  expiresAt: number;
  refreshToken?: string;
  issuedAt: number;
}

export interface TokenEventCallbacks {
  onTokenRefreshed?: (token: string) => void;
  onTokenExpired?: () => void;
  onRefreshFailed?: (error: Error) => void;
}

/**
 * Event emitter for token state changes
 */
type TokenEventHandler = (...args: unknown[]) => void;

class TokenEventEmitter {
  private callbacks: Map<string, Set<TokenEventHandler>> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    // Cast to internal handler type; individual callers have stricter types
    this.callbacks.get(event)!.add(callback as unknown as TokenEventHandler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback: (...args: any[]) => void): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback as unknown as TokenEventHandler);
      if (callbacks.size === 0) {
        this.callbacks.delete(event);
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in token event callback for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.callbacks.delete(event);
    } else {
      this.callbacks.clear();
    }
  }
}

/**
 * TokenManager class for centralized token lifecycle management
 */
export class TokenManager {
  private eventEmitter = new TokenEventEmitter();
  private refreshPromise: Promise<string | null> | null = null;
  private refreshScheduleTimeout: number | null = null;
  private isInitializing = true;
  private initializationPromise: Promise<void>;
  private isListeningForUpdates = false;

  constructor() {
    this.initializationPromise = this.initialize().finally(() => {
      this.isInitializing = false;
    });
    this.setupCrossTabListener();
  }

  private async initialize(): Promise<void> {
    // This method provides a consistent entry point for any async initialization logic.
    // Currently, storage access is synchronous, but this pattern is robust for future changes.
    this.getTokenInfo();
  }

  /**
   * Get current token information
   */
  getTokenInfo(): TokenInfo | null {
    try {
      const token = secureStorage.getItem(TOKEN_KEY);
      const expiresAtStr = secureStorage.getItem(TOKEN_EXPIRES_AT_KEY);
      const refreshToken = secureStorage.getItem(REFRESH_TOKEN_KEY);

      if (!token || !expiresAtStr) {
        return null;
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt)) {
        return null;
      }

      return {
        token,
        expiresAt,
        refreshToken: refreshToken || undefined,
        issuedAt: expiresAt - (60 * 60 * 1000), // Assume 1 hour token lifetime
      };
    } catch (error) {
      securityLogger.logSecurityEvent('TOKEN_INFO_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Check if token is expiring soon
   */
  isTokenExpiringSoon(threshold: number = TOKEN_EXPIRATION_THRESHOLD): boolean {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo) {
      return true; // No token means it's "expired"
    }

    const now = Date.now();
    const timeUntilExpiry = tokenInfo.expiresAt - now;
    
    return timeUntilExpiry <= threshold;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo) {
      return true;
    }

    return Date.now() >= tokenInfo.expiresAt;
  }

  /**
   * Get current token if valid
   */
  getCurrentToken(): string | null {
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo || this.isTokenExpired()) {
      return null;
    }
    return tokenInfo.token;
  }

  /**
   * Store token information securely
   */
  storeTokenInfo(tokenInfo: Partial<TokenInfo>): void {
    try {
      if (tokenInfo.token) {
        secureStorage.setItem(TOKEN_KEY, tokenInfo.token);
      }
      
      if (tokenInfo.expiresAt) {
        secureStorage.setItem(TOKEN_EXPIRES_AT_KEY, tokenInfo.expiresAt.toString());
      }
      
      if (tokenInfo.refreshToken) {
        secureStorage.setItem(REFRESH_TOKEN_KEY, tokenInfo.refreshToken);
      }

      // Log token storage event
      securityLogger.logSecurityEvent('TOKEN_STORED', {
        hasToken: !!tokenInfo.token,
        hasRefreshToken: !!tokenInfo.refreshToken,
        expiresAt: tokenInfo.expiresAt
      });

      // Schedule automatic refresh if needed
      this.scheduleTokenRefresh();

    } catch (error) {
      securityLogger.logSecurityEvent('TOKEN_STORAGE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to store token information');
    }
  }

  /**
   * Clear all token information
   */
  clearTokenInfo(): void {
    try {
      secureStorage.removeItem(TOKEN_KEY);
      secureStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      secureStorage.removeItem(REFRESH_TOKEN_KEY);

      // Clear any scheduled refresh
      if (this.refreshScheduleTimeout) {
        clearTimeout(this.refreshScheduleTimeout);
        this.refreshScheduleTimeout = null;
      }

      // Clear any pending refresh promise
      this.refreshPromise = null;

      securityLogger.logSecurityEvent('TOKEN_CLEARED', {});

    } catch (error) {
      securityLogger.logSecurityEvent('TOKEN_CLEAR_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Refresh token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    // Return existing refresh promise if one is in progress
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<string | null> {
    try {
      const tokenInfo = this.getTokenInfo();
      if (!tokenInfo?.refreshToken) {
        const error = new Error('No refresh token available');
        this.eventEmitter.emit(TOKEN_EVENTS.REFRESH_FAILED, error);
        return null;
      }

      // Build API URL (similar to AuthContext)
      const apiBase = this.buildApiBase();
      const refreshUrl = `${apiBase}/auth/refresh`;

      securityLogger.logSecurityEvent('TOKEN_REFRESH_ATTEMPT', {
        refreshUrl
      });

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenInfo.refreshToken}`,
        },
        body: JSON.stringify({
          refreshToken: tokenInfo.refreshToken
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const error = new Error(data.error?.message || 'Token refresh failed');
        securityLogger.logSecurityEvent('TOKEN_REFRESH_FAILED', {
          status: response.status,
          error: error.message
        });
        this.eventEmitter.emit(TOKEN_EVENTS.REFRESH_FAILED, error);
        return null;
      }

      const { token, refreshToken, expiresIn } = data.data;
      const expiresAt = Date.now() + (expiresIn * 1000);

      // Store new token information
      this.storeTokenInfo({
        token,
        refreshToken,
        expiresAt,
        issuedAt: Date.now()
      });

      // Emit success event
      this.eventEmitter.emit(TOKEN_EVENTS.TOKEN_REFRESHED, token);
      
      // Broadcast to other tabs with new expiry
      this.broadcastTokenUpdate(token, expiresAt);

      securityLogger.logSecurityEvent('TOKEN_REFRESH_SUCCESS', {
        expiresAt
      });

      return token;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      securityLogger.logSecurityEvent('TOKEN_REFRESH_ERROR', {
        error: errorMessage
      });
      
      const refreshError = new Error(`Token refresh failed: ${errorMessage}`);
      this.eventEmitter.emit(TOKEN_EVENTS.REFRESH_FAILED, refreshError);
      return null;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(): void {
    // Clear existing timeout
    if (this.refreshScheduleTimeout) {
      clearTimeout(this.refreshScheduleTimeout);
    }

    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo) {
      return;
    }

    const now = Date.now();
    const timeUntilRefresh = tokenInfo.expiresAt - now - TOKEN_EXPIRATION_THRESHOLD;

    // Only schedule if we have time before expiration
    if (timeUntilRefresh > 0) {
      this.refreshScheduleTimeout = window.setTimeout(() => {
        this.refreshToken().catch(error => {
          console.error('Scheduled token refresh failed:', error);
        });
      }, timeUntilRefresh);

      securityLogger.logSecurityEvent('TOKEN_REFRESH_SCHEDULED', {
        refreshIn: timeUntilRefresh,
        expiresAt: tokenInfo.expiresAt
      });
    }
  }

  /**
   * Event listener registration
   */
  onTokenRefreshed(callback: (token: string) => void): void {
    this.eventEmitter.on(TOKEN_EVENTS.TOKEN_REFRESHED, callback);
  }

  onTokenExpired(callback: () => void): void {
    this.eventEmitter.on(TOKEN_EVENTS.TOKEN_EXPIRED, callback);
  }

  onRefreshFailed(callback: (error: Error) => void): void {
    this.eventEmitter.on(TOKEN_EVENTS.REFRESH_FAILED, callback);
  }

  onSessionWarning(callback: (timeRemaining: number) => void): void {
    this.eventEmitter.on(TOKEN_EVENTS.SESSION_WARNING, callback);
  }

  /**
   * Cross-tab coordination methods
   */
  updateTokenFromCrossTab(token: string, expiresAt: number): void {
    try {
      const currentInfo = this.getTokenInfo();
      const tokenInfo: TokenInfo = {
        token,
        expiresAt,
        refreshToken: currentInfo?.refreshToken || '',
        issuedAt: Date.now(),
      };

      // Update stored token without triggering events to avoid loops
      this.storeTokenInfo(tokenInfo);

      // Reschedule refresh for the new token
      this.scheduleTokenRefresh();

      securityLogger.logSecurityEvent('TOKEN_UPDATED_FROM_CROSS_TAB', {
        expiresAt,
        tabSource: 'cross-tab'
      });

    } catch (error) {
      securityLogger.logSecurityEvent('TOKEN_CROSS_TAB_UPDATE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  handleTokenExpiredFromCrossTab(): void {
    try {
      // Clear token info using existing method
      this.clearTokenInfo();

      // Emit token expired event for this tab
      this.eventEmitter.emit(TOKEN_EVENTS.TOKEN_EXPIRED);

      securityLogger.logSecurityEvent('TOKEN_EXPIRED_FROM_CROSS_TAB', {
        timestamp: Date.now()
      });

    } catch (error) {
      securityLogger.logSecurityEvent('TOKEN_CROSS_TAB_EXPIRED_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  handleSessionWarningFromCrossTab(timeRemaining: number): void {
    try {
      // Emit session warning event for this tab
      this.eventEmitter.emit(TOKEN_EVENTS.SESSION_WARNING, timeRemaining);

      securityLogger.logSecurityEvent('SESSION_WARNING_FROM_CROSS_TAB', {
        timeRemaining,
        timestamp: Date.now()
      });

    } catch (error) {
      securityLogger.logSecurityEvent('SESSION_WARNING_CROSS_TAB_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if the token manager is currently initializing.
   */
  isCurrentlyInitializing(): boolean {
    return this.isInitializing;
  }

  /**
   * Returns a promise that resolves when initialization is complete.
   */
  awaitInitialization(): Promise<void> {
    return this.initializationPromise;
  }

  /**
   * Add logout method for cross-tab coordination
   */
  async logout(): Promise<void> {
    try {
      // Clear all token information
      this.clearTokenInfo();

      // Emit token expired event
      this.eventEmitter.emit(TOKEN_EVENTS.TOKEN_EXPIRED);

      securityLogger.logSecurityEvent('TOKEN_MANAGER_LOGOUT', {
        timestamp: Date.now()
      });

    } catch (error) {
      securityLogger.logSecurityEvent('TOKEN_MANAGER_LOGOUT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Remove event listeners
   */
  removeListener(event: string, callback: TokenEventHandler): void {
    this.eventEmitter.off(event, callback as unknown as (...args: unknown[]) => void);
  }

  removeAllListeners(): void {
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Broadcast token update to other tabs
   */
  broadcastTokenUpdate(token: string, expiresAt?: number): void {
    try {
      const message = {
        type: TOKEN_EVENTS.TOKEN_UPDATED,
        token,
        expiresAt: typeof expiresAt === 'number' ? expiresAt : this.getTokenInfo()?.expiresAt,
        timestamp: Date.now()
      };

      // Use localStorage event for cross-tab communication
      localStorage.setItem('token_broadcast', JSON.stringify(message));
      
      // Remove the broadcast message immediately to trigger storage event
      localStorage.removeItem('token_broadcast');

      securityLogger.logSecurityEvent('TOKEN_BROADCAST_SENT', {
        timestamp: message.timestamp
      });

    } catch (error) {
      securityLogger.logSecurityEvent('TOKEN_BROADCAST_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Listen for token updates from other tabs
   */
  listenForTokenUpdates(): void {
    if (this.isListeningForUpdates) {
      return;
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'token_broadcast' && event.newValue) {
        try {
          const message = JSON.parse(event.newValue);
          
          if (message.type === TOKEN_EVENTS.TOKEN_UPDATED && message.token) {
            // Update local token storage
            const currentInfo = this.getTokenInfo();
            if (currentInfo) {
              this.storeTokenInfo({
                ...currentInfo,
                token: message.token,
                expiresAt: typeof message.expiresAt === 'number' ? message.expiresAt : currentInfo.expiresAt,
              });
            }

            // Emit token refreshed event
            this.eventEmitter.emit(TOKEN_EVENTS.TOKEN_REFRESHED, message.token);

            securityLogger.logSecurityEvent('TOKEN_BROADCAST_RECEIVED', {
              timestamp: message.timestamp
            });
          }
        } catch (error) {
          securityLogger.logSecurityEvent('TOKEN_BROADCAST_PARSE_ERROR', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    this.isListeningForUpdates = true;

    securityLogger.logSecurityEvent('TOKEN_CROSS_TAB_LISTENER_STARTED', {});
  }

  /**
   * Setup cross-tab listener (called in constructor)
   */
  private setupCrossTabListener(): void {
    this.listenForTokenUpdates();
  }

  /**
   * Build API base URL (similar to AuthContext)
   */
  private buildApiBase(): string {
    // Check if we're in a test environment
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return '/api';
    }
    
    // Try to get from global object (set by Vite) without using any
    const maybeGlobal = globalThis as unknown as { __VITE_ENV__?: Record<string, unknown> };
    const viteEnv = maybeGlobal.__VITE_ENV__;
    if (viteEnv && typeof viteEnv.VITE_API_URL === 'string') {
      const raw = viteEnv.VITE_API_URL as string;
      const trimmed = raw.replace(/\/$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    }
    
    // Fallback to default
    return `/api`;
  }

  /**
   * Cleanup method for proper disposal
   */
  dispose(): void {
    // Clear scheduled refresh
    if (this.refreshScheduleTimeout) {
      clearTimeout(this.refreshScheduleTimeout);
      this.refreshScheduleTimeout = null;
    }

    // Clear refresh promise
    this.refreshPromise = null;

    // Remove all event listeners
    this.removeAllListeners();

    // Note: We don't remove storage event listener as it's handled by the browser
    this.isListeningForUpdates = false;

    securityLogger.logSecurityEvent('TOKEN_MANAGER_DISPOSED', {});
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export types and constants
export { TOKEN_EVENTS, TOKEN_EXPIRATION_THRESHOLD };