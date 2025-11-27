/**
 * CrossTabCoordinator Service
 * 
 * Manages authentication and session state coordination across multiple browser tabs
 * using localStorage events for inter-tab communication.
 */

import { securityLogger } from './securityLogger';
import { tokenManager } from './tokenManager';

// Event types for cross-tab communication
export enum CrossTabEventType {
  TOKEN_UPDATED = 'token_updated',
  TOKEN_EXPIRED = 'token_expired',
  SESSION_WARNING = 'session_warning',
  LOGOUT_INITIATED = 'logout_initiated',
  LOGOUT_COMPLETED = 'logout_completed',
  HEARTBEAT = 'heartbeat',
  TAB_REGISTERED = 'tab_registered',
  TAB_UNREGISTERED = 'tab_unregistered',
}

// Cross-tab event structure
export interface CrossTabEvent {
  type: CrossTabEventType;
  tabId: string;
  timestamp: number;
  data?: unknown;
}

// Tab information for tracking active tabs
export interface TabInfo {
  id: string;
  lastHeartbeat: number;
  userAgent: string;
  url: string;
}

// Configuration constants
const STORAGE_KEY = 'cross_tab_events';
const TABS_KEY = 'active_tabs';
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const TAB_TIMEOUT = 15000; // 15 seconds
const EVENT_CLEANUP_INTERVAL = 30000; // 30 seconds
const MAX_EVENTS_STORED = 100;

/**
 * CrossTabCoordinator class for managing multi-tab session coordination
 */
export class CrossTabCoordinator {
  private tabId: string;
  private isInitialized = false;
  private heartbeatInterval: number | null = null;
  private cleanupInterval: number | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private beforeUnloadListener: (() => void) | null = null;
  private eventHandlers: Map<CrossTabEventType, Set<(data: unknown) => void>> = new Map();

  constructor() {
    this.tabId = this.generateTabId();
    this.initialize();
  }

  /**
   * Initialize the cross-tab coordinator
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register this tab
      await this.registerTab();

      // Set up storage event listener for cross-tab communication
      this.storageListener = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY && event.newValue) {
          this.handleStorageEvent(event.newValue);
        }
      };
      window.addEventListener('storage', this.storageListener);

      // Set up beforeunload listener for cleanup
      this.beforeUnloadListener = () => {
        this.unregisterTab();
      };
      window.addEventListener('beforeunload', this.beforeUnloadListener);

      // Start heartbeat to indicate this tab is alive
      this.startHeartbeat();

      // Start cleanup interval for old events and dead tabs
      this.startCleanup();

      // Listen to token manager events
      this.setupTokenManagerListeners();

      this.isInitialized = true;

      securityLogger.logSecurityEvent('CROSS_TAB_COORDINATOR_INITIALIZED', {
        tabId: this.tabId,
        url: window.location.href,
      });

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_COORDINATOR_INIT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tabId: this.tabId,
      });
    }
  }

  /**
   * Register event handler for specific cross-tab events
   */
  on(eventType: CrossTabEventType, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: CrossTabEventType, handler: (data: unknown) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  /**
   * Broadcast event to all other tabs
   */
  broadcast(eventType: CrossTabEventType, data?: unknown): void {
    try {
      const event: CrossTabEvent = {
        type: eventType,
        tabId: this.tabId,
        timestamp: Date.now(),
        data,
      };

      this.addEventToStorage(event);

      // Reduce console noise in development: don't log frequent heartbeats
      const isDev = process.env.NODE_ENV === 'development';
      if (!(isDev && eventType === CrossTabEventType.HEARTBEAT)) {
        securityLogger.logSecurityEvent('CROSS_TAB_EVENT_BROADCASTED', {
          eventType,
          tabId: this.tabId,
          hasData: !!data,
        });
      }

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_BROADCAST_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType,
        tabId: this.tabId,
      });
    }
  }

  /**
   * Get list of active tabs
   */
  getActiveTabs(): TabInfo[] {
    try {
      const stored = localStorage.getItem(TABS_KEY);
      if (!stored) return [];

      const tabs: Record<string, TabInfo> = JSON.parse(stored);
      const now = Date.now();

      // Filter out expired tabs
      return Object.values(tabs).filter(tab => 
        now - tab.lastHeartbeat < TAB_TIMEOUT
      );
    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_GET_TABS_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Check if this is the primary tab (oldest active tab)
   */
  isPrimaryTab(): boolean {
    const activeTabs = this.getActiveTabs();
    if (activeTabs.length === 0) return true;

    // Primary tab is the one with the earliest heartbeat
    const primaryTab = activeTabs.reduce((earliest, current) => 
      current.lastHeartbeat < earliest.lastHeartbeat ? current : earliest
    );

    return primaryTab.id === this.tabId;
  }

  /**
   * Initiate coordinated logout across all tabs
   */
  async initiateLogout(reason: string = 'user_initiated'): Promise<void> {
    try {
      // Broadcast logout initiation
      this.broadcast(CrossTabEventType.LOGOUT_INITIATED, { reason });

      // Perform logout in this tab
      await this.performLogout();

      // Broadcast logout completion
      this.broadcast(CrossTabEventType.LOGOUT_COMPLETED, { reason });

      securityLogger.logSecurityEvent('CROSS_TAB_LOGOUT_INITIATED', {
        reason,
        tabId: this.tabId,
      });

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_LOGOUT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reason,
        tabId: this.tabId,
      });
    }
  }

  /**
   * Handle token update across tabs
   */
  handleTokenUpdate(token: string, expiresAt: number): void {
    this.broadcast(CrossTabEventType.TOKEN_UPDATED, {
      token,
      expiresAt,
    });
  }

  /**
   * Handle session warning across tabs
   */
  handleSessionWarning(timeRemaining: number): void {
    this.broadcast(CrossTabEventType.SESSION_WARNING, {
      timeRemaining,
    });
  }

  /**
   * Dispose of the coordinator and clean up resources
   */
  dispose(): void {
    try {
      // Stop intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Remove event listeners
      if (this.storageListener) {
        window.removeEventListener('storage', this.storageListener);
        this.storageListener = null;
      }

      if (this.beforeUnloadListener) {
        window.removeEventListener('beforeunload', this.beforeUnloadListener);
        this.beforeUnloadListener = null;
      }

      // Unregister tab
      this.unregisterTab();

      // Clear event handlers
      this.eventHandlers.clear();

      this.isInitialized = false;

      securityLogger.logSecurityEvent('CROSS_TAB_COORDINATOR_DISPOSED', {
        tabId: this.tabId,
      });

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_COORDINATOR_DISPOSE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tabId: this.tabId,
      });
    }
  }

  // Private methods

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async registerTab(): Promise<void> {
    try {
      const tabs = this.getStoredTabs();
      const tabInfo: TabInfo = {
        id: this.tabId,
        lastHeartbeat: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      tabs[this.tabId] = tabInfo;
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));

      this.broadcast(CrossTabEventType.TAB_REGISTERED, tabInfo);

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_REGISTER_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tabId: this.tabId,
      });
    }
  }

  private unregisterTab(): void {
    try {
      const tabs = this.getStoredTabs();
      delete tabs[this.tabId];
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));

      this.broadcast(CrossTabEventType.TAB_UNREGISTERED, { tabId: this.tabId });

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_UNREGISTER_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tabId: this.tabId,
      });
    }
  }

  private getStoredTabs(): Record<string, TabInfo> {
    try {
      const stored = localStorage.getItem(TABS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      try {
        const tabs = this.getStoredTabs();
        if (tabs[this.tabId]) {
          tabs[this.tabId].lastHeartbeat = Date.now();
          localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
        }

        this.broadcast(CrossTabEventType.HEARTBEAT, {
          timestamp: Date.now(),
        });

      } catch (error) {
        securityLogger.logSecurityEvent('CROSS_TAB_HEARTBEAT_ERROR', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tabId: this.tabId,
        });
      }
    }, HEARTBEAT_INTERVAL);
  }

  private startCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupDeadTabs();
      this.cleanupOldEvents();
    }, EVENT_CLEANUP_INTERVAL);
  }

  private cleanupDeadTabs(): void {
    try {
      const tabs = this.getStoredTabs();
      const now = Date.now();
      let removedCount = 0;

      Object.keys(tabs).forEach(tabId => {
        if (now - tabs[tabId].lastHeartbeat > TAB_TIMEOUT) {
          delete tabs[tabId];
          removedCount++;
        }
      });

      if (removedCount > 0) {
        localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
        securityLogger.logSecurityEvent('CROSS_TAB_DEAD_TABS_CLEANED', {
          removedCount,
          remainingTabs: Object.keys(tabs).length,
        });
      }

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_CLEANUP_TABS_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private cleanupOldEvents(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const events: CrossTabEvent[] = JSON.parse(stored);
      const now = Date.now();
      const maxAge = 60000; // 1 minute

      // Remove events older than maxAge and limit total events
      const cleanEvents = events
        .filter(event => now - event.timestamp < maxAge)
        .slice(-MAX_EVENTS_STORED);

      if (cleanEvents.length !== events.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanEvents));
        securityLogger.logSecurityEvent('CROSS_TAB_EVENTS_CLEANED', {
          originalCount: events.length,
          cleanedCount: cleanEvents.length,
        });
      }

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_CLEANUP_EVENTS_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private addEventToStorage(event: CrossTabEvent): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const events: CrossTabEvent[] = stored ? JSON.parse(stored) : [];
      
      events.push(event);
      
      // Keep only recent events to prevent storage bloat
      const recentEvents = events.slice(-MAX_EVENTS_STORED);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentEvents));

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_ADD_EVENT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type,
      });
    }
  }

  private handleStorageEvent(newValue: string): void {
    try {
      const events: CrossTabEvent[] = JSON.parse(newValue);
      const latestEvent = events[events.length - 1];

      // Ignore events from this tab
      if (latestEvent.tabId === this.tabId) return;

      // Process the event
      this.processEvent(latestEvent);

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_HANDLE_STORAGE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private processEvent(event: CrossTabEvent): void {
    try {
      // Emit to registered handlers
      const handlers = this.eventHandlers.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event.data);
          } catch (error) {
            securityLogger.logSecurityEvent('CROSS_TAB_HANDLER_ERROR', {
              error: error instanceof Error ? error.message : 'Unknown error',
              eventType: event.type,
            });
          }
        });
      }

      // Handle built-in events
      switch (event.type) {
        case CrossTabEventType.TOKEN_UPDATED:
          this.handleTokenUpdatedEvent(event.data);
          break;

        case CrossTabEventType.TOKEN_EXPIRED:
          this.handleTokenExpiredEvent();
          break;

        case CrossTabEventType.LOGOUT_INITIATED:
          this.handleLogoutInitiatedEvent();
          break;

        case CrossTabEventType.LOGOUT_COMPLETED:
          this.handleLogoutCompletedEvent();
          break;

        case CrossTabEventType.SESSION_WARNING:
          this.handleSessionWarningEvent(event.data);
          break;
      }

      securityLogger.logSecurityEvent('CROSS_TAB_EVENT_PROCESSED', {
        eventType: event.type,
        fromTab: event.tabId,
        toTab: this.tabId,
      });

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_PROCESS_EVENT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.type,
      });
    }
  }

  private handleTokenUpdatedEvent(data: { token?: string; expiresAt?: number } | unknown): void {
    if (
      typeof data === 'object' && data !== null &&
      'token' in data && 'expiresAt' in data &&
      typeof (data as { token?: unknown }).token === 'string' &&
      typeof (data as { expiresAt?: unknown }).expiresAt === 'number'
    ) {
      const { token, expiresAt } = data as { token: string; expiresAt: number };
      // Update token in this tab without triggering another broadcast
      tokenManager.updateTokenFromCrossTab(token, expiresAt);
    }
  }

  private handleTokenExpiredEvent(): void {
    // Handle token expiration in this tab
    tokenManager.handleTokenExpiredFromCrossTab();
  }

  private handleLogoutInitiatedEvent(): void {
    // Perform logout in this tab without broadcasting again
    this.performLogout();
  }

  private handleLogoutCompletedEvent(): void {
    // Ensure this tab is also logged out
    this.performLogout();
  }

  private handleSessionWarningEvent(data: { timeRemaining?: number } | unknown): void {
    // Show session warning in this tab if not already shown
    if (
      typeof data === 'object' && data !== null &&
      'timeRemaining' in data && typeof (data as { timeRemaining?: unknown }).timeRemaining === 'number'
    ) {
      tokenManager.handleSessionWarningFromCrossTab((data as { timeRemaining: number }).timeRemaining);
    }
  }

  private async performLogout(): Promise<void> {
    try {
      // Clear tokens and authentication state
      await tokenManager.logout();
      
      // Clear any preserved form data
      localStorage.removeItem('form_preservation_metadata');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_PERFORM_LOGOUT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tabId: this.tabId,
      });
    }
  }

  private setupTokenManagerListeners(): void {
    // Listen for token updates from token manager
    tokenManager.onTokenRefreshed((token) => {
      const tokenInfo = tokenManager.getTokenInfo();
      if (tokenInfo) {
        this.handleTokenUpdate(token, tokenInfo.expiresAt);
      }
    });

    // Listen for token expiration
    tokenManager.onTokenExpired(() => {
      this.broadcast(CrossTabEventType.TOKEN_EXPIRED, {
        timestamp: Date.now(),
      });
    });

    // Listen for session warnings
    tokenManager.onSessionWarning((timeRemaining) => {
      this.handleSessionWarning(timeRemaining);
    });
  }

  /**
   * Public API methods for external use
   */

  /**
   * Broadcast token update to other tabs
   */
  broadcastTokenUpdate(token: string, expiresAt: number): void {
    this.handleTokenUpdate(token, expiresAt);
  }

  /**
   * Broadcast token expiration to other tabs
   */
  broadcastTokenExpired(): void {
    this.broadcast(CrossTabEventType.TOKEN_EXPIRED, {});
  }

  /**
   * Broadcast session warning to other tabs
   */
  broadcastSessionWarning(timeRemaining: number): void {
    this.broadcast(CrossTabEventType.SESSION_WARNING, { timeRemaining });
  }

  /**
   * Get list of active tab IDs
   */
  getActiveTabIds(): string[] {
    const activeTabs = this.getActiveTabs();
    return activeTabs.map(tab => tab.id);
  }

  /**
   * Destroy the coordinator and clean up resources
   */
  destroy(): void {
    try {
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      // Remove event listeners
      if (this.storageListener) {
        window.removeEventListener('storage', this.storageListener);
        this.storageListener = null;
      }

      if (this.beforeUnloadListener) {
        window.removeEventListener('beforeunload', this.beforeUnloadListener);
        this.beforeUnloadListener = null;
      }

      // Unregister tab
      this.unregisterTab();

      // Clear event handlers
      this.eventHandlers.clear();

      this.isInitialized = false;

      securityLogger.logSecurityEvent('CROSS_TAB_COORDINATOR_DESTROYED', {
        tabId: this.tabId,
      });

    } catch (error) {
      securityLogger.logSecurityEvent('CROSS_TAB_COORDINATOR_DESTROY_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tabId: this.tabId,
      });
    }
  }
}

// Export singleton instance
export const crossTabCoordinator = new CrossTabCoordinator();

// Export types and constants
export { HEARTBEAT_INTERVAL, TAB_TIMEOUT, MAX_EVENTS_STORED };
