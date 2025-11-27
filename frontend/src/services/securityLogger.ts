/**
 * Enhanced Security Logger Service
 * Provides comprehensive security event logging, monitoring, and audit trails
 * for authentication, session management, and token operations
 */

export interface SecurityEvent {
  event: string;
  data?: Record<string, unknown>;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  category: 'auth' | 'token' | 'session' | 'form' | 'performance' | 'security' | 'audit';
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  duration?: number; // For performance tracking
  metadata?: {
    ip?: string;
    location?: string;
    deviceInfo?: string;
    browserInfo?: string;
  };
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  details?: Record<string, unknown>;
}

export interface AuditTrail {
  action: string;
  resource: string;
  userId?: string;
  timestamp: number;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsByLevel: Record<string, number>;
  recentErrors: SecurityEvent[];
  performanceMetrics: PerformanceMetric[];
  auditTrail: AuditTrail[];
}

class SecurityLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log a security event
   */
  logSecurityEvent(event: string, data?: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info'): void {
    const securityEvent: SecurityEvent = {
      event,
      data,
      timestamp: Date.now(),
      level,
      category: 'security',
    };

    // In development, log to console
    if (this.isDevelopment) {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
      logMethod(`[SECURITY] ${event}:`, data || {});
    }

    // In production, you might want to send to a logging service
    // For now, we'll just store in sessionStorage for debugging
    try {
      const existingLogs = sessionStorage.getItem('security_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Keep only last 100 logs to prevent storage bloat
      if (logs.length >= 100) {
        logs.shift();
      }
      
      logs.push(securityEvent);
      sessionStorage.setItem('security_logs', JSON.stringify(logs));
    } catch (error) {
      // Silently fail if storage is not available
      console.warn('Failed to store security log:', error);
    }
  }

  /**
   * Get recent security logs (for debugging)
   */
  getRecentLogs(limit: number = 50): SecurityEvent[] {
    try {
      const existingLogs = sessionStorage.getItem('security_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      return logs.slice(-limit);
    } catch (error) {
      console.warn('Failed to retrieve security logs:', error);
      return [];
    }
  }

  /**
   * Clear all security logs
   */
  clearLogs(): void {
    try {
      sessionStorage.removeItem('security_logs');
    } catch (error) {
      console.warn('Failed to clear security logs:', error);
    }
  }
}

export const securityLogger = new SecurityLogger();
