/**
 * User Interaction Service for Security Audit Logging
 * Tracks user interactions with session warnings and form data preservation
 */

// Note: Using a simple fetch approach since the api object doesn't have generic POST methods
// This will be enhanced when backend audit endpoints are implemented

export interface UserInteractionEvent {
  action: string;
  component: string;
  metadata?: Record<string, unknown>;
}

export interface FormDataEvent {
  formId: string;
  action: 'preserve' | 'restore' | 'expire' | 'cleanup';
  dataSize: number;
  metadata?: Record<string, unknown>;
}

class UserInteractionService {
  private sessionId: string | null = null;
  private userId: string | null = null;

  constructor() {
    // Generate a unique session ID for this browser session
    this.sessionId = this.generateSessionId();
    
    // Listen for auth state changes to update userId
    this.initializeUserTracking();
  }

  /**
   * Initialize user tracking
   */
  private initializeUserTracking(): void {
    // Try to get user info from localStorage or auth context
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userId = payload.userId;
      } catch (error) {
        console.warn('Failed to parse token for user tracking:', error);
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update user ID when user logs in
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear user ID when user logs out
   */
  clearUserId(): void {
    this.userId = null;
  }

  /**
   * Log user interaction with session warning
   */
  async logSessionInteraction(event: UserInteractionEvent): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      // If no token is present, skip logging (endpoint requires auth)
      if (!token) return;

      const response = await fetch('/api/audit/user-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          action: event.action,
          component: event.component,
          timestamp: new Date().toISOString(),
          metadata: {
            ...event.metadata,
            userAgent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      // Don't throw errors for logging failures, just log to console
      console.warn('Failed to log user interaction:', error);
    }
  }

  /**
   * Log form data preservation/restoration event
   */
  async logFormDataEvent(event: FormDataEvent): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/audit/form-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          formId: event.formId,
          action: event.action,
          dataSize: event.dataSize,
          timestamp: new Date().toISOString(),
          metadata: {
            ...event.metadata,
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to log form data event:', error);
    }
  }

  /**
   * Track session warning display
   */
  async trackSessionWarningDisplayed(timeRemaining: number): Promise<void> {
    await this.logSessionInteraction({
      action: 'session_warning_displayed',
      component: 'SessionWarning',
      metadata: {
        timeRemainingMs: timeRemaining,
        warningThreshold: 5 * 60 * 1000 // 5 minutes in ms
      }
    });
  }

  /**
   * Track session extension
   */
  async trackSessionExtended(previousTimeRemaining: number): Promise<void> {
    await this.logSessionInteraction({
      action: 'session_extended',
      component: 'SessionWarning',
      metadata: {
        previousTimeRemainingMs: previousTimeRemaining,
        extensionMethod: 'user_action'
      }
    });
  }

  /**
   * Track save and logout action
   */
  async trackSaveAndLogout(timeRemaining: number): Promise<void> {
    await this.logSessionInteraction({
      action: 'save_and_logout',
      component: 'SessionWarning',
      metadata: {
        timeRemainingMs: timeRemaining,
        logoutReason: 'user_initiated'
      }
    });
  }

  /**
   * Track session timeout
   */
  async trackSessionTimeout(): Promise<void> {
    await this.logSessionInteraction({
      action: 'session_timeout',
      component: 'SessionWarning',
      metadata: {
        timeoutReason: 'automatic_expiry'
      }
    });
  }

  /**
   * Track form data preservation
   */
  async trackFormDataPreserved(formId: string, dataSize: number, formType?: string): Promise<void> {
    await this.logFormDataEvent({
      formId,
      action: 'preserve',
      dataSize,
      metadata: {
        formType,
        preservationReason: 'session_expiry_warning'
      }
    });
  }

  /**
   * Track form data restoration
   */
  async trackFormDataRestored(formId: string, dataSize: number, formType?: string): Promise<void> {
    await this.logFormDataEvent({
      formId,
      action: 'restore',
      dataSize,
      metadata: {
        formType,
        restorationTrigger: 'user_login'
      }
    });
  }

  /**
   * Track form data expiration/cleanup
   */
  async trackFormDataExpired(formId: string, dataSize: number, reason: string): Promise<void> {
    await this.logFormDataEvent({
      formId,
      action: 'expire',
      dataSize,
      metadata: {
        expirationReason: reason
      }
    });
  }

  /**
   * Track performance metrics for client-side operations
   */
  async trackPerformanceMetric(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logSessionInteraction({
      action: 'performance_metric',
      component: operation,
      metadata: {
        duration,
        ...metadata,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Get current session info for debugging
   */
  getSessionInfo(): { sessionId: string | null; userId: string | null } {
    return {
      sessionId: this.sessionId,
      userId: this.userId
    };
  }
}

// Export singleton instance
export const userInteractionService = new UserInteractionService();
