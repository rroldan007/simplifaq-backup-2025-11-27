/**
 * Tests for Security Audit Service and Logging Functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { securityAuditService, SecurityEventType, SecuritySeverity } from '../services/securityAuditService';
import { logUserInteraction, logFormDataEvent, getSecurityMetrics, logPerformanceMetric } from '../controllers/auditController';

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    add: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

describe('Security Audit Service', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-agent';
        return undefined;
      }),
      body: {},
      sessionID: 'test-session-id'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('SecurityAuditService', () => {
    it('should log security events correctly', () => {
      const event = {
        eventType: SecurityEventType.TOKEN_REFRESH_SUCCESS,
        severity: SecuritySeverity.LOW,
        userId: 'test-user-id',
        sessionId: 'test-session-id',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: new Date(),
        metadata: { test: 'data' }
      };

      expect(() => {
        securityAuditService.logSecurityEvent(event);
      }).not.toThrow();
    });

    it('should log token events with correct severity', () => {
      const logSpy = jest.spyOn(securityAuditService, 'logSecurityEvent');

      securityAuditService.logTokenEvent(
        SecurityEventType.TOKEN_REFRESH_SUCCESS,
        mockRequest as Request,
        'user-123',
        'session-123',
        { test: 'metadata' }
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: SecurityEventType.TOKEN_REFRESH_SUCCESS,
          severity: SecuritySeverity.LOW,
          userId: 'user-123',
          sessionId: 'session-123',
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        })
      );
    });

    it('should log user interactions correctly', () => {
      const interaction = {
        userId: 'test-user',
        sessionId: 'test-session',
        action: 'session_extended',
        component: 'SessionWarning',
        timestamp: new Date(),
        metadata: { timeRemaining: 300000 }
      };

      expect(() => {
        securityAuditService.logUserInteraction(interaction);
      }).not.toThrow();
    });

    it('should log form data audit events correctly', () => {
      const audit = {
        userId: 'test-user',
        sessionId: 'test-session',
        formId: 'invoice-form-123',
        action: 'preserve' as const,
        dataSize: 1024,
        timestamp: new Date(),
        metadata: { formType: 'invoice' }
      };

      expect(() => {
        securityAuditService.logFormDataAudit(audit);
      }).not.toThrow();
    });

    it('should track performance metrics correctly', () => {
      const operationId = 'test-operation-123';
      
      // Start monitoring
      securityAuditService.startPerformanceMonitoring(operationId);
      
      // Simulate some delay
      setTimeout(() => {
        const metrics = securityAuditService.endPerformanceMonitoring(
          operationId,
          mockRequest as Request,
          'user-123',
          'session-123'
        );

        expect(metrics).toBeDefined();
        expect(metrics?.duration).toBeGreaterThan(0);
      }, 10);
    });

    it('should log suspicious activity with high severity', () => {
      const logSpy = jest.spyOn(securityAuditService, 'logSecurityEvent');

      securityAuditService.logSuspiciousActivity(
        mockRequest as Request,
        'Multiple failed login attempts',
        'user-123',
        { attemptCount: 5 }
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.HIGH,
          userId: 'user-123',
          metadata: expect.objectContaining({
            reason: 'Multiple failed login attempts',
            attemptCount: 5
          })
        })
      );
    });
  });

  describe('Audit Controller', () => {
    describe('logUserInteraction', () => {
      it('should successfully log user interaction', async () => {
        mockRequest.body = {
          action: 'session_extended',
          component: 'SessionWarning',
          userId: 'test-user',
          sessionId: 'test-session',
          metadata: { timeRemaining: 300000 }
        };

        await logUserInteraction(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              message: 'User interaction logged successfully'
            })
          })
        );
      });

      it('should return error for missing required fields', async () => {
        mockRequest.body = {
          // Missing action and component
          userId: 'test-user'
        };

        await logUserInteraction(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'MISSING_REQUIRED_FIELDS'
            })
          })
        );
      });
    });

    describe('logFormDataEvent', () => {
      it('should successfully log form data event', async () => {
        mockRequest.body = {
          formId: 'invoice-form-123',
          action: 'preserve',
          dataSize: 1024,
          userId: 'test-user',
          sessionId: 'test-session',
          metadata: { formType: 'invoice' }
        };

        await logFormDataEvent(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              message: 'Form data event logged successfully'
            })
          })
        );
      });

      it('should return error for invalid action', async () => {
        mockRequest.body = {
          formId: 'test-form',
          action: 'invalid-action',
          dataSize: 1024
        };

        await logFormDataEvent(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INVALID_ACTION'
            })
          })
        );
      });

      it('should return error for missing required fields', async () => {
        mockRequest.body = {
          // Missing formId, action, and dataSize
          userId: 'test-user'
        };

        await logFormDataEvent(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'MISSING_REQUIRED_FIELDS'
            })
          })
        );
      });
    });

    describe('logPerformanceMetric', () => {
      it('should successfully log performance metric', async () => {
        mockRequest.body = {
          operation: 'token_refresh',
          duration: 1500,
          metadata: { tokenType: 'access' }
        };

        await logPerformanceMetric(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              message: 'Performance metric logged successfully'
            })
          })
        );
      });

      it('should return error for missing required fields', async () => {
        mockRequest.body = {
          // Missing operation and duration
          metadata: { test: 'data' }
        };

        await logPerformanceMetric(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'MISSING_REQUIRED_FIELDS'
            })
          })
        );
      });
    });

    describe('getSecurityMetrics', () => {
      it('should return security metrics with default date range', async () => {
        mockRequest.query = {};

        await getSecurityMetrics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              totalEvents: expect.any(Number),
              eventsByType: expect.any(Object),
              eventsBySeverity: expect.any(Object),
              averagePerformance: expect.any(Number),
              suspiciousActivityCount: expect.any(Number),
              dateRange: expect.objectContaining({
                start: expect.any(String),
                end: expect.any(String)
              })
            })
          })
        );
      });

      it('should return security metrics with custom date range', async () => {
        const startDate = new Date('2023-01-01').toISOString();
        const endDate = new Date('2023-01-02').toISOString();

        mockRequest.query = {
          startDate,
          endDate
        };

        await getSecurityMetrics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              dateRange: {
                start: startDate,
                end: endDate
              }
            })
          })
        );
      });

      it('should return error for invalid date range', async () => {
        mockRequest.query = {
          startDate: 'invalid-date',
          endDate: new Date().toISOString()
        };

        await getSecurityMetrics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INVALID_DATE_RANGE'
            })
          })
        );
      });

      it('should return error when start date is after end date', async () => {
        const startDate = new Date('2023-01-02').toISOString();
        const endDate = new Date('2023-01-01').toISOString();

        mockRequest.query = {
          startDate,
          endDate
        };

        await getSecurityMetrics(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INVALID_DATE_RANGE',
              message: 'Start date must be before end date'
            })
          })
        );
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete token refresh flow with logging', async () => {
      const operationId = 'refresh_test_123';
      const userId = 'user-123';
      const sessionId = 'session-123';

      // Start performance monitoring
      securityAuditService.startPerformanceMonitoring(operationId);

      // Simulate token refresh success
      securityAuditService.logTokenEvent(
        SecurityEventType.TOKEN_REFRESH_SUCCESS,
        mockRequest as Request,
        userId,
        sessionId,
        { tokenRotated: true }
      );

      // End performance monitoring
      const metrics = securityAuditService.endPerformanceMonitoring(
        operationId,
        mockRequest as Request,
        userId,
        sessionId
      );

      expect(metrics).toBeDefined();
      expect(metrics?.duration).toBeGreaterThan(0);
    });

    it('should handle session warning interaction flow', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';

      // Log session warning displayed
      securityAuditService.logUserInteraction({
        userId,
        sessionId,
        action: 'session_warning_displayed',
        component: 'SessionWarning',
        timestamp: new Date(),
        metadata: { timeRemainingMs: 300000 }
      });

      // Log session extended
      securityAuditService.logUserInteraction({
        userId,
        sessionId,
        action: 'session_extended',
        component: 'SessionWarning',
        timestamp: new Date(),
        metadata: { previousTimeRemainingMs: 300000 }
      });

      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should handle form data preservation flow', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const formId = 'invoice-form-456';

      // Log form data preserved
      securityAuditService.logFormDataAudit({
        userId,
        sessionId,
        formId,
        action: 'preserve',
        dataSize: 2048,
        timestamp: new Date(),
        metadata: { formType: 'invoice', reason: 'session_expiry_warning' }
      });

      // Log form data restored
      securityAuditService.logFormDataAudit({
        userId,
        sessionId,
        formId,
        action: 'restore',
        dataSize: 2048,
        timestamp: new Date(),
        metadata: { formType: 'invoice', trigger: 'user_login' }
      });

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});
