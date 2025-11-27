/**
 * 🇨🇭 SimpliFaq - Admin Monitoring Routes
 * 
 * API endpoints for system monitoring, alerts, and health checks
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth, requireRole } from '../../middleware/adminAuth';
import { MonitoringService } from '../../services/monitoringService';
import { ApiResponse, AppError } from '../../types';

const router = Router();

// Apply admin authentication and role authorization to all routes
router.use(adminAuth);
router.use(requireRole(['super_admin', 'support_admin']));

// Validation schemas
const alertRuleUpdateSchema = z.object({
  name: z.string().optional(),
  metric: z.string().optional(),
  operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']).optional(),
  threshold: z.number().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  enabled: z.boolean().optional(),
  cooldownMinutes: z.number().min(1).optional(),
  notificationChannels: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const acknowledgeAlertSchema = z.object({
  acknowledgedBy: z.string().min(1, 'Acknowledged by is required'),
});

/**
 * GET /api/admin/monitoring/health
 * Get current system health status
 */
router.get('/health', async (req: Request, res: Response): Promise<Response> => {
  try {
    const metrics = await MonitoringService.collectSystemMetrics();
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy', // Would determine based on metrics
        timestamp: metrics.timestamp,
        uptime: metrics.uptime,
        services: {
          database: {
            status: metrics.database.status,
            responseTime: metrics.database.responseTime,
            connectionCount: metrics.database.connectionCount,
          },
          api: {
            status: metrics.api.status,
            responseTime: metrics.api.responseTime,
            errorRate: metrics.api.errorRate,
            requestCount: metrics.api.requestCount,
          },
        },
        resources: {
          memory: metrics.memory,
          cpu: metrics.cpu,
          disk: metrics.disk,
        },
        users: {
          active: metrics.activeUsers,
          total: metrics.totalTenants,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Health check error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'HEALTH_CHECK_ERROR', message: 'Erreur lors de la vérification de santé' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/monitoring/metrics
 * Get system metrics with optional time range
 */
router.get('/metrics', async (req: Request, res: Response): Promise<Response> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const current = req.query.current === 'true';

    let metrics;
    if (current) {
      metrics = [await MonitoringService.collectSystemMetrics()];
    } else {
      metrics = MonitoringService.getMetricsHistory(limit);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        metrics,
        count: metrics.length,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get metrics error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'METRICS_ERROR', message: 'Erreur lors de la récupération des métriques' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/monitoring/alerts
 * Get current alerts
 */
router.get('/alerts', async (req: Request, res: Response): Promise<Response> => {
  try {
    const status = req.query.status as string;
    const severity = req.query.severity as string;

    let alerts = MonitoringService.getActiveAlerts();

    // Filter by status
    if (status && status !== 'all') {
      alerts = alerts.filter(alert => alert.status === status);
    }

    // Filter by severity
    if (severity && severity !== 'all') {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Sort by triggered date (most recent first)
    alerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());

    const response: ApiResponse = {
      success: true,
      data: {
        alerts,
        count: alerts.length,
        summary: {
          active: alerts.filter(a => a.status === 'active').length,
          acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
          resolved: alerts.filter(a => a.status === 'resolved').length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length,
          },
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get alerts error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'ALERTS_ERROR', message: 'Erreur lors de la récupération des alertes' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * POST /api/admin/monitoring/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: alertId } = req.params;
    const validatedData = acknowledgeAlertSchema.parse(req.body);

    const success = MonitoringService.acknowledgeAlert(alertId, validatedData.acknowledgedBy);

    if (!success) {
      throw new AppError('Alerte non trouvée', 404, 'ALERT_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Alerte acquittée avec succès',
        alertId,
        acknowledgedBy: validatedData.acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Acknowledge alert error:', error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Données invalides', 
          details: error.issues 
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      return res.status(error.statusCode).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/monitoring/alert-rules
 * Get alert rules configuration
 */
router.get('/alert-rules', async (req: Request, res: Response): Promise<Response> => {
  try {
    const rules = MonitoringService.getAlertRules();

    const response: ApiResponse = {
      success: true,
      data: {
        rules,
        count: rules.length,
        summary: {
          enabled: rules.filter(r => r.enabled).length,
          disabled: rules.filter(r => !r.enabled).length,
          bySeverity: {
            critical: rules.filter(r => r.severity === 'critical').length,
            high: rules.filter(r => r.severity === 'high').length,
            medium: rules.filter(r => r.severity === 'medium').length,
            low: rules.filter(r => r.severity === 'low').length,
          },
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get alert rules error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'ALERT_RULES_ERROR', message: 'Erreur lors de la récupération des règles d\'alerte' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * PUT /api/admin/monitoring/alert-rules/:id
 * Update alert rule configuration
 */
router.put('/alert-rules/:id', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id: ruleId } = req.params;
    const validatedData = alertRuleUpdateSchema.parse(req.body);

    const success = MonitoringService.updateAlertRule(ruleId, validatedData);

    if (!success) {
      throw new AppError('Règle d\'alerte non trouvée', 404, 'ALERT_RULE_NOT_FOUND');
    }

    const updatedRules = MonitoringService.getAlertRules();
    const updatedRule = updatedRules.find(r => r.id === ruleId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Règle d\'alerte mise à jour avec succès',
        rule: updatedRule,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Update alert rule error:', error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse = {
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Données invalides', 
          details: error.issues 
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    if (error instanceof AppError) {
      const response: ApiResponse = {
        success: false,
        error: { code: error.code, message: error.message },
        timestamp: new Date().toISOString(),
      };
      return res.status(error.statusCode).json(response);
    }

    const response: ApiResponse = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/admin/monitoring/performance
 * Get performance analytics
 */
router.get('/performance', async (req: Request, res: Response): Promise<Response> => {
  try {
    const period = req.query.period as string || '24h';
    const metrics = MonitoringService.getMetricsHistory(100);

    // Calculate performance analytics
    const analytics = {
      averageResponseTime: 0,
      peakMemoryUsage: 0,
      averageCpuUsage: 0,
      uptimePercentage: 100,
      errorRate: 0,
      requestsPerMinute: 0,
    };

    if (metrics.length > 0) {
      analytics.averageResponseTime = metrics.reduce((sum, m) => sum + m.api.responseTime, 0) / metrics.length;
      analytics.peakMemoryUsage = Math.max(...metrics.map(m => m.memory.percentage));
      analytics.averageCpuUsage = metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / metrics.length;
      analytics.errorRate = metrics.reduce((sum, m) => sum + m.api.errorRate, 0) / metrics.length;
      analytics.requestsPerMinute = metrics.reduce((sum, m) => sum + m.api.requestCount, 0) / metrics.length;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        period,
        analytics,
        trends: {
          memoryTrend: metrics.slice(-10).map(m => ({ timestamp: m.timestamp, value: m.memory.percentage })),
          cpuTrend: metrics.slice(-10).map(m => ({ timestamp: m.timestamp, value: m.cpu.usage })),
          responseTrend: metrics.slice(-10).map(m => ({ timestamp: m.timestamp, value: m.api.responseTime })),
        },
        summary: {
          totalMetrics: metrics.length,
          timeRange: metrics.length > 0 ? {
            start: metrics[0].timestamp,
            end: metrics[metrics.length - 1].timestamp,
          } : null,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Get performance analytics error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'PERFORMANCE_ERROR', message: 'Erreur lors de la récupération des analyses de performance' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * POST /api/admin/monitoring/test-alert
 * Trigger a test alert (for testing purposes)
 */
router.post('/test-alert', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { severity = 'medium', message = 'Test alert' } = req.body;

    // This would trigger a test alert in a real implementation
    const testAlert = {
      id: `test_${Date.now()}`,
      ruleId: 'test_rule',
      ruleName: 'Test Alert Rule',
      metric: 'test.metric',
      currentValue: 100,
      threshold: 50,
      severity,
      status: 'active' as const,
      triggeredAt: new Date().toISOString(),
      message,
    };

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Alerte de test déclenchée avec succès',
        alert: testAlert,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);

  } catch (error) {
    console.error('Test alert error:', error);
    const response: ApiResponse = {
      success: false,
      error: { code: 'TEST_ALERT_ERROR', message: 'Erreur lors du déclenchement de l\'alerte de test' },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

export default router;