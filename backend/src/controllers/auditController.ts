/**
 * Audit Controller for Security Logging and Monitoring
 * Handles user interaction tracking and form data audit trails
 */

import { Request, Response } from 'express';
import { securityAuditService, SecurityEventType, SecuritySeverity } from '../services/securityAuditService';
import { ApiResponse } from '../types';

/**
 * Log user interaction event
 */
export const logUserInteraction = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      userId,
      sessionId,
      action,
      component,
      timestamp,
      metadata
    } = req.body;

    // Validate required fields
    if (!action || !component) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Action and component are required',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Log the user interaction
    securityAuditService.logUserInteraction({
      userId: userId || (req as any).user?.id,
      sessionId: sessionId || (req as any).sessionID || (req as any).session?.id || undefined,
      action,
      component,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: {
        ...metadata,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      data: { message: 'User interaction logged successfully' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Error logging user interaction:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to log user interaction',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Log form data preservation/restoration event
 */
export const logFormDataEvent = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      userId,
      sessionId,
      formId,
      action,
      dataSize,
      timestamp,
      metadata
    } = req.body;

    // Validate required fields
    if (!formId || !action || dataSize === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'FormId, action, and dataSize are required',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Validate action type
    const validActions = ['preserve', 'restore', 'expire', 'cleanup'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: `Action must be one of: ${validActions.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Log the form data event
    securityAuditService.logFormDataAudit({
      userId: userId || (req as any).user?.id,
      sessionId: sessionId || (req as any).sessionID || (req as any).session?.id || undefined,
      formId,
      action,
      dataSize: Number(dataSize),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: {
        ...metadata,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      success: true,
      data: { message: 'Form data event logged successfully' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Error logging form data event:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to log form data event',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Get security metrics for monitoring dashboard
 */
export const getSecurityMetrics = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 24 hours if no date range provided
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Invalid date format. Use ISO 8601 format.',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Start date must be before end date',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Get security metrics
    const metrics = await securityAuditService.getSecurityMetrics({
      start,
      end
    });

    res.json({
      success: true,
      data: {
        ...metrics,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Error getting security metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get security metrics',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};

/**
 * Log performance metric
 */
export const logPerformanceMetric = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      operation,
      duration,
      metadata
    } = req.body;

    // Validate required fields
    if (!operation || duration === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Operation and duration are required',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    // Log performance metric as a security event
    securityAuditService.logSecurityEvent({
      eventType: SecurityEventType.PERFORMANCE_SLOW_REFRESH,
      severity: duration > 5000 ? SecuritySeverity.HIGH : duration > 2000 ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      metadata: {
        operation,
        ...metadata
      },
      performanceMetrics: {
        duration: Number(duration)
      }
    });

    res.json({
      success: true,
      data: { message: 'Performance metric logged successfully' },
      timestamp: new Date().toISOString(),
    } as ApiResponse);

  } catch (error) {
    console.error('Error logging performance metric:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to log performance metric',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
};
