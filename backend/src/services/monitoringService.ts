/**
 * 🇨🇭 SimpliFaq - Monitoring Service
 * 
 * Service for system health monitoring, performance tracking, and alerting
 */

import { PrismaClient } from '@prisma/client';
// import { EmailService } from './emailService';
import { securityLogger } from '../middleware/security';
import os from 'os';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connectionCount: number;
    responseTime: number;
    status: 'healthy' | 'warning' | 'error';
  };
  api: {
    responseTime: number;
    errorRate: number;
    requestCount: number;
    status: 'healthy' | 'warning' | 'error';
  };
  activeUsers: number;
  totalTenants: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
  description?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  message: string;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private static alertRules: AlertRule[] = [
    {
      id: 'memory_usage_high',
      name: 'High Memory Usage',
      metric: 'memory.percentage',
      operator: 'gt',
      threshold: 85,
      severity: 'high',
      enabled: true,
      cooldownMinutes: 15,
      notificationChannels: ['email', 'log'],
      description: 'Memory usage is above 85%',
    },
    {
      id: 'cpu_usage_high',
      name: 'High CPU Usage',
      metric: 'cpu.usage',
      operator: 'gt',
      threshold: 80,
      severity: 'high',
      enabled: true,
      cooldownMinutes: 10,
      notificationChannels: ['email', 'log'],
      description: 'CPU usage is above 80%',
    },
    {
      id: 'disk_usage_high',
      name: 'High Disk Usage',
      metric: 'disk.percentage',
      operator: 'gt',
      threshold: 90,
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 30,
      notificationChannels: ['email', 'log'],
      description: 'Disk usage is above 90%',
    },
    {
      id: 'database_slow',
      name: 'Slow Database Response',
      metric: 'database.responseTime',
      operator: 'gt',
      threshold: 1000,
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 5,
      notificationChannels: ['email', 'log'],
      description: 'Database response time is above 1000ms',
    },
    {
      id: 'api_error_rate_high',
      name: 'High API Error Rate',
      metric: 'api.errorRate',
      operator: 'gt',
      threshold: 5,
      severity: 'high',
      enabled: true,
      cooldownMinutes: 10,
      notificationChannels: ['email', 'log'],
      description: 'API error rate is above 5%',
    },
  ];

  private static activeAlerts: Map<string, Alert> = new Map();
  private static lastAlertTimes: Map<string, number> = new Map();
  private static metricsHistory: SystemMetrics[] = [];

  /**
   * Collect comprehensive system metrics
   */
  static async collectSystemMetrics(): Promise<SystemMetrics> {
    const startTime = performance.now();

    try {
      // Memory metrics
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // CPU metrics
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      // Database metrics
      const dbStartTime = performance.now();
      const dbHealthCheck = await this.checkDatabaseHealth();
      const dbResponseTime = performance.now() - dbStartTime;

      // Get active users and tenants
      const [activeUsers, totalTenants] = await Promise.all([
        this.getActiveUsersCount(),
        this.getTotalTenantsCount(),
      ]);

      // API metrics (would be collected from middleware in real implementation)
      const apiMetrics = await this.getApiMetrics();

      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: Math.round((usedMemory / totalMemory) * 100),
        },
        cpu: {
          usage: await this.getCpuUsage(),
          loadAverage,
        },
        disk: {
          used: 0, // Would implement actual disk usage check
          total: 0,
          percentage: 0,
        },
        database: {
          connectionCount: await this.getDatabaseConnectionCount(),
          responseTime: dbResponseTime,
          status: dbHealthCheck ? 'healthy' : 'error',
        },
        api: {
          responseTime: apiMetrics.responseTime,
          errorRate: apiMetrics.errorRate,
          requestCount: apiMetrics.requestCount,
          status: apiMetrics.errorRate > 5 ? 'error' : apiMetrics.responseTime > 1000 ? 'warning' : 'healthy',
        },
        activeUsers,
        totalTenants,
      };

      // Store metrics in history (keep last 1000 entries)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory.shift();
      }

      // Check for alerts
      await this.checkAlertRules(metrics);

      return metrics;

    } catch (error) {
      securityLogger.error('System metrics collection error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Return basic metrics even if some collection fails
      return {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0, loadAverage: [0, 0, 0] },
        disk: { used: 0, total: 0, percentage: 0 },
        database: { connectionCount: 0, responseTime: 0, status: 'error' },
        api: { responseTime: 0, errorRate: 0, requestCount: 0, status: 'error' },
        activeUsers: 0,
        totalTenants: 0,
      };
    }
  }

  /**
   * Check database health
   */
  private static async checkDatabaseHealth(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get CPU usage percentage
   */
  private static async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const percentage = (totalUsage / 1000000) * 100; // Convert to percentage
        resolve(Math.min(100, Math.max(0, percentage)));
      }, 100);
    });
  }

  /**
   * Get database connection count
   */
  private static async getDatabaseConnectionCount(): Promise<number> {
    try {
      // This would depend on your database setup
      // For PostgreSQL, you could query pg_stat_activity
      return 1; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get active users count (logged in within last 24 hours)
   */
  private static async getActiveUsersCount(): Promise<number> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return await prisma.session.count({
        where: {
          createdAt: { gte: yesterday.toISOString() as any },
        },
      });
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get total tenants count
   */
  private static async getTotalTenantsCount(): Promise<number> {
    try {
      return await prisma.user.count({
        where: { isActive: true },
      });
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get API metrics (would be collected from middleware)
   */
  private static async getApiMetrics(): Promise<{
    responseTime: number;
    errorRate: number;
    requestCount: number;
  }> {
    // In a real implementation, this would collect metrics from middleware
    // For now, return mock data
    return {
      responseTime: Math.random() * 500 + 100, // 100-600ms
      errorRate: Math.random() * 2, // 0-2%
      requestCount: Math.floor(Math.random() * 1000) + 100,
    };
  }

  /**
   * Check alert rules against current metrics
   */
  private static async checkAlertRules(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      if (Date.now() - lastAlertTime < cooldownMs) continue;

      const currentValue = this.getMetricValue(metrics, rule.metric);
      if (currentValue === null) continue;

      const shouldAlert = this.evaluateCondition(currentValue, rule.operator, rule.threshold);

      if (shouldAlert) {
        await this.triggerAlert(rule, currentValue, metrics);
        this.lastAlertTimes.set(rule.id, Date.now());
      } else {
        // Check if we should resolve an existing alert
        const existingAlert = this.activeAlerts.get(rule.id);
        if (existingAlert && existingAlert.status === 'active') {
          await this.resolveAlert(existingAlert.id);
        }
      }
    }
  }

  /**
   * Get metric value from metrics object using dot notation
   */
  private static getMetricValue(metrics: SystemMetrics, metricPath: string): number | null {
    try {
      const parts = metricPath.split('.');
      let value: any = metrics;
      
      for (const part of parts) {
        value = value[part];
        if (value === undefined || value === null) return null;
      }
      
      return typeof value === 'number' ? value : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Evaluate alert condition
   */
  private static evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private static async triggerAlert(rule: AlertRule, currentValue: number, metrics: SystemMetrics): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      status: 'active',
      triggeredAt: new Date().toISOString(),
      message: `${rule.name}: ${rule.metric} is ${currentValue} (threshold: ${rule.threshold})`,
      metadata: { metrics },
    };

    this.activeAlerts.set(rule.id, alert);

    // Send notifications
    await this.sendAlertNotifications(alert, rule.notificationChannels);

    securityLogger.warn('Alert triggered', {
      alertId,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resolve an alert
   */
  private static async resolveAlert(alertId: string): Promise<void> {
    const alert = Array.from(this.activeAlerts.values()).find(a => a.id === alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();

    // Send resolution notification
    await this.sendAlertResolutionNotification(alert);

    securityLogger.info('Alert resolved', {
      alertId,
      ruleName: alert.ruleName,
      resolvedAt: alert.resolvedAt,
      timestamp: new Date().toISOString(),
    });

    this.activeAlerts.delete(alert.ruleId);
  }

  /**
   * Send alert notifications
   */
  private static async sendAlertNotifications(alert: Alert, channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'log':
            this.logAlert(alert);
            break;
          // Could add more channels like Slack, Discord, etc.
        }
      } catch (error) {
        securityLogger.error('Alert notification failed', {
          alertId: alert.id,
          channel,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Send email alert
   */
  private static async sendEmailAlert(alert: Alert): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const subject = `[SimpliFaq] ${alert.severity.toUpperCase()} Alert: ${alert.ruleName}`;
    const message = `
      Alert Details:
      - Rule: ${alert.ruleName}
      - Metric: ${alert.metric}
      - Current Value: ${alert.currentValue}
      - Threshold: ${alert.threshold}
      - Severity: ${alert.severity}
      - Triggered At: ${alert.triggeredAt}
      
      Message: ${alert.message}
    `;

    // await EmailService.sendTestEmail(adminEmail);
  }

  /**
   * Log alert
   */
  private static logAlert(alert: Alert): void {
    const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
    securityLogger[logLevel]('System alert', {
      alertId: alert.id,
      ruleName: alert.ruleName,
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      severity: alert.severity,
      message: alert.message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send alert resolution notification
   */
  private static async sendAlertResolutionNotification(alert: Alert): Promise<void> {
    securityLogger.info('Alert resolved notification', {
      alertId: alert.id,
      ruleName: alert.ruleName,
      resolvedAt: alert.resolvedAt,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current active alerts
   */
  static getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get metrics history
   */
  static getMetricsHistory(limit: number = 100): SystemMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Get alert rules
   */
  static getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Update alert rule
   */
  static updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Acknowledge alert
   */
  static acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = Array.from(this.activeAlerts.values()).find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = acknowledgedBy;

    securityLogger.info('Alert acknowledged', {
      alertId,
      acknowledgedBy,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Start monitoring (should be called on server startup)
   */
  static startMonitoring(intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        securityLogger.error('Monitoring interval error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }, intervalMs);

    securityLogger.info('Monitoring service started', {
      intervalMs,
      timestamp: new Date().toISOString(),
    });
  }
}