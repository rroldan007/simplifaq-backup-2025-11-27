/**
 * Enhanced Security Audit Service for Token Refresh System
 * Provides comprehensive logging and monitoring for all security events
 */

import winston from 'winston';
import { Request } from 'express';

// Security event types
export enum SecurityEventType {
  // Token operations
  TOKEN_REFRESH_SUCCESS = 'TOKEN_REFRESH_SUCCESS',
  TOKEN_REFRESH_FAILURE = 'TOKEN_REFRESH_FAILURE',
  TOKEN_REFRESH_EXPIRED = 'TOKEN_REFRESH_EXPIRED',
  TOKEN_VALIDATION_FAILURE = 'TOKEN_VALIDATION_FAILURE',
  TOKEN_GENERATION = 'TOKEN_GENERATION',
  
  // Session operations
  SESSION_WARNING_DISPLAYED = 'SESSION_WARNING_DISPLAYED',
  SESSION_EXTENDED = 'SESSION_EXTENDED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  SESSION_LOGOUT = 'SESSION_LOGOUT',
  
  // Form data operations
  FORM_DATA_PRESERVED = 'FORM_DATA_PRESERVED',
  FORM_DATA_RESTORED = 'FORM_DATA_RESTORED',
  FORM_DATA_EXPIRED = 'FORM_DATA_EXPIRED',
  FORM_DATA_CLEANUP = 'FORM_DATA_CLEANUP',
  
  // Security violations
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN_ATTEMPT = 'INVALID_TOKEN_ATTEMPT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Performance events
  PERFORMANCE_SLOW_REFRESH = 'PERFORMANCE_SLOW_REFRESH',
  PERFORMANCE_HIGH_LOAD = 'PERFORMANCE_HIGH_LOAD'
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Base security event interface
export interface SecurityEvent {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  performanceMetrics?: PerformanceMetrics;
}

// Performance metrics interface
export interface PerformanceMetrics {
  duration?: number; // milliseconds
  memoryUsage?: number; // bytes
  cpuUsage?: number; // percentage
  requestCount?: number;
  errorCount?: number;
}

// User interaction tracking interface
export interface UserInteraction {
  userId: string;
  sessionId: string;
  action: string;
  component: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Form data audit interface
export interface FormDataAudit {
  userId: string;
  sessionId: string;
  formId: string;
  action: 'preserve' | 'restore' | 'expire' | 'cleanup';
  dataSize: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class SecurityAuditService {
  private logger: winston.Logger;
  private performanceMetrics: Map<string, number> = new Map();

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'security-audit' },
      transports: [
        // Separate log files for different event types
        new winston.transports.File({ 
          filename: 'logs/security-audit.log',
          level: 'info'
        }),
        new winston.transports.File({ 
          filename: 'logs/security-errors.log',
          level: 'error'
        }),
        new winston.transports.File({ 
          filename: 'logs/performance-audit.log',
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(info => {
              if (info.performanceMetrics) {
                return JSON.stringify(info);
              }
              return '';
            })
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/user-interactions.log',
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf(info => {
              if (info.userInteraction) {
                return JSON.stringify(info);
              }
              return '';
            })
          )
        })
      ],
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  /**
   * Log a security event
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logLevel = this.getLogLevel(event.severity);
    
    this.logger.log(logLevel, `Security Event: ${event.eventType}`, {
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId,
      sessionId: event.sessionId,
      ip: event.ip,
      userAgent: event.userAgent,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata,
      performanceMetrics: event.performanceMetrics
    });
  }

  /**
   * Log token operation events
   */
  logTokenEvent(
    eventType: SecurityEventType,
    req: Request,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>,
    performanceMetrics?: PerformanceMetrics
  ): void {
    const severity = this.getTokenEventSeverity(eventType);
    
    this.logSecurityEvent({
      eventType,
      severity,
      userId,
      sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      metadata,
      performanceMetrics
    });
  }

  /**
   * Log user interaction for session warnings
   */
  logUserInteraction(interaction: UserInteraction): void {
    this.logger.info('User Interaction', {
      userInteraction: true,
      userId: interaction.userId,
      sessionId: interaction.sessionId,
      action: interaction.action,
      component: interaction.component,
      timestamp: interaction.timestamp.toISOString(),
      metadata: interaction.metadata
    });
  }

  /**
   * Log form data preservation/restoration audit trail
   */
  logFormDataAudit(audit: FormDataAudit): void {
    this.logger.info('Form Data Audit', {
      formDataAudit: true,
      userId: audit.userId,
      sessionId: audit.sessionId,
      formId: audit.formId,
      action: audit.action,
      dataSize: audit.dataSize,
      timestamp: audit.timestamp.toISOString(),
      metadata: audit.metadata
    });

    // Also log as security event for high-level monitoring
    this.logSecurityEvent({
      eventType: this.getFormDataEventType(audit.action),
      severity: SecuritySeverity.LOW,
      userId: audit.userId,
      sessionId: audit.sessionId,
      timestamp: audit.timestamp,
      metadata: {
        formId: audit.formId,
        dataSize: audit.dataSize,
        ...audit.metadata
      }
    });
  }

  /**
   * Start performance monitoring for an operation
   */
  startPerformanceMonitoring(operationId: string): void {
    this.performanceMetrics.set(operationId, Date.now());
  }

  /**
   * End performance monitoring and log if slow
   */
  endPerformanceMonitoring(
    operationId: string,
    req: Request,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): PerformanceMetrics | null {
    const startTime = this.performanceMetrics.get(operationId);
    if (!startTime) return null;

    const duration = Date.now() - startTime;
    this.performanceMetrics.delete(operationId);

    const performanceMetrics: PerformanceMetrics = {
      duration,
      memoryUsage: process.memoryUsage().heapUsed,
      requestCount: 1
    };

    // Log slow operations (> 2 seconds)
    if (duration > 2000) {
      this.logSecurityEvent({
        eventType: SecurityEventType.PERFORMANCE_SLOW_REFRESH,
        severity: SecuritySeverity.MEDIUM,
        userId,
        sessionId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        metadata: {
          operationId,
          ...metadata
        },
        performanceMetrics
      });
    }

    return performanceMetrics;
  }

  /**
   * Log suspicious activity patterns
   */
  logSuspiciousActivity(
    req: Request,
    reason: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.logSecurityEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.HIGH,
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      metadata: {
        reason,
        ...metadata
      }
    });
  }

  /**
   * Get appropriate log level for severity
   */
  private getLogLevel(severity: SecuritySeverity): string {
    switch (severity) {
      case SecuritySeverity.LOW:
        return 'info';
      case SecuritySeverity.MEDIUM:
        return 'warn';
      case SecuritySeverity.HIGH:
      case SecuritySeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }

  /**
   * Get severity for token events
   */
  private getTokenEventSeverity(eventType: SecurityEventType): SecuritySeverity {
    switch (eventType) {
      case SecurityEventType.TOKEN_REFRESH_SUCCESS:
      case SecurityEventType.TOKEN_GENERATION:
        return SecuritySeverity.LOW;
      case SecurityEventType.TOKEN_REFRESH_EXPIRED:
        return SecuritySeverity.MEDIUM;
      case SecurityEventType.TOKEN_REFRESH_FAILURE:
      case SecurityEventType.TOKEN_VALIDATION_FAILURE:
      case SecurityEventType.INVALID_TOKEN_ATTEMPT:
        return SecuritySeverity.HIGH;
      default:
        return SecuritySeverity.MEDIUM;
    }
  }

  /**
   * Map form data actions to event types
   */
  private getFormDataEventType(action: string): SecurityEventType {
    switch (action) {
      case 'preserve':
        return SecurityEventType.FORM_DATA_PRESERVED;
      case 'restore':
        return SecurityEventType.FORM_DATA_RESTORED;
      case 'expire':
        return SecurityEventType.FORM_DATA_EXPIRED;
      case 'cleanup':
        return SecurityEventType.FORM_DATA_CLEANUP;
      default:
        return SecurityEventType.FORM_DATA_PRESERVED;
    }
  }

  /**
   * Get aggregated security metrics for monitoring dashboard
   */
  async getSecurityMetrics(timeRange: { start: Date; end: Date }): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    averagePerformance: number;
    suspiciousActivityCount: number;
  }> {
    // This would typically query a database or log aggregation service
    // For now, return a placeholder structure
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsBySeverity: {},
      averagePerformance: 0,
      suspiciousActivityCount: 0
    };
  }
}

// Export singleton instance
export const securityAuditService = new SecurityAuditService();
