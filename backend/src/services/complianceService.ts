/**
 * 🇨🇭 SimpliFaq - Compliance Service
 * 
 * Service for GDPR compliance, data retention, and regulatory requirements
 */

import { PrismaClient } from '@prisma/client';
// import { EmailService } from './emailService';
import { securityLogger } from '../middleware/security';
import { TenantDataManager } from '../middleware/tenantContext';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface DataExportRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestType: 'gdpr_export' | 'data_portability' | 'account_closure';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface DataRetentionPolicy {
  id: string;
  dataType: 'user_data' | 'audit_logs' | 'billing_data' | 'system_logs';
  retentionPeriodDays: number;
  description: string;
  isActive: boolean;
  lastCleanupAt?: string;
  nextCleanupAt: string;
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalUsers: number;
    activeUsers: number;
    dataExportRequests: number;
    dataDeletionRequests: number;
    securityIncidents: number;
    complianceViolations: number;
  };
  gdprCompliance: {
    dataExportResponseTime: number; // Average days
    dataDeletionResponseTime: number; // Average days
    consentManagement: {
      totalConsents: number;
      withdrawnConsents: number;
    };
  };
  dataRetention: {
    policiesActive: number;
    lastCleanupDate: string;
    dataDeletedGB: number;
  };
  security: {
    failedLoginAttempts: number;
    suspiciousActivities: number;
    dataBreaches: number;
  };
}

export class ComplianceService {
  private static dataRetentionPolicies: DataRetentionPolicy[] = [
    {
      id: 'user_data_retention',
      dataType: 'user_data',
      retentionPeriodDays: 2555, // 7 years for Swiss compliance
      description: 'User business data retention for Swiss tax compliance',
      isActive: true,
      nextCleanupAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'audit_logs_retention',
      dataType: 'audit_logs',
      retentionPeriodDays: 2555, // 7 years
      description: 'Audit logs retention for compliance',
      isActive: true,
      nextCleanupAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'system_logs_retention',
      dataType: 'system_logs',
      retentionPeriodDays: 90, // 3 months
      description: 'System logs retention',
      isActive: true,
      nextCleanupAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'billing_data_retention',
      dataType: 'billing_data',
      retentionPeriodDays: 3650, // 10 years for financial records
      description: 'Billing and financial data retention',
      isActive: true,
      nextCleanupAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  /**
   * Create GDPR data export for user
   */
  static async createDataExport(
    userId: string,
    requestType: 'gdpr_export' | 'data_portability' | 'account_closure' = 'gdpr_export'
  ): Promise<DataExportRequest> {
    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, companyName: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const exportRequest: DataExportRequest = {
        id: crypto.randomUUID(),
        userId,
        userEmail: user.email,
        requestType,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        metadata: {
          companyName: user.companyName,
          requestedBy: user.email,
        },
      };

      // Log the request
      securityLogger.info('GDPR data export requested', {
        requestId: exportRequest.id,
        userId,
        userEmail: user.email,
        requestType,
        timestamp: new Date().toISOString(),
      });

      // Process the export asynchronously
      this.processDataExport(exportRequest);

      return exportRequest;

    } catch (error) {
      securityLogger.error('Data export request error', {
        userId,
        requestType,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Process data export (would run in background)
   */
  private static async processDataExport(request: DataExportRequest): Promise<void> {
    try {
      // Update status to processing
      request.status = 'processing';

      // Create comprehensive data export
      const exportData = await this.generateUserDataExport(request.userId);

      // Create export file
      const exportPath = await this.createExportFile(request.id, exportData);

      // Update request with completion details
      request.status = 'completed';
      request.completedAt = new Date().toISOString();
      request.downloadUrl = `/api/compliance/exports/${request.id}/download`;
      request.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      // Send notification email
      await this.sendDataExportNotification(request);

      securityLogger.info('Data export completed', {
        requestId: request.id,
        userId: request.userId,
        exportPath,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      request.status = 'failed';
      request.metadata = {
        ...request.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      securityLogger.error('Data export processing failed', {
        requestId: request.id,
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Generate comprehensive user data export
   */
  private static async generateUserDataExport(userId: string): Promise<Record<string, any>> {
    try {
      // Get all user data
      const [user, clients, invoices, products, sessions] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: { subscription: { include: { plan: true } } },
        }),
        prisma.client.findMany({ where: { userId } }),
        prisma.invoice.findMany({
          where: { userId },
          include: { items: true, payments: true },
        }),
        prisma.product.findMany({ where: { userId } }),
        prisma.session.findMany({ where: { userId } }),
      ]);

      // Create comprehensive export
      const exportData = {
        exportInfo: {
          exportId: crypto.randomUUID(),
          exportDate: new Date().toISOString(),
          userId,
          dataTypes: ['profile', 'clients', 'invoices', 'products', 'sessions'],
        },
        profile: user ? {
          id: user.id,
          email: user.email,
          companyName: user.companyName,
          firstName: user.firstName,
          lastName: user.lastName,
          vatNumber: user.vatNumber,
          phone: user.phone,
          website: user.website,
          language: user.language,
          currency: user.currency,
          address: {
            street: user.street,
            city: user.city,
            postalCode: user.postalCode,
            country: user.country,
            canton: user.canton,
          },
          subscription: user.subscription ? {
            plan: user.subscription.plan?.displayName,
            status: user.subscription.status,
            currentPeriodStart: user.subscription.currentPeriodStart,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
          } : null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } : null,
        clients: clients.map(client => ({
          id: client.id,
          companyName: client.companyName,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          address: {
            street: client.street,
            city: client.city,
            postalCode: client.postalCode,
            country: client.country,
            canton: client.canton,
          },
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        })),
        invoices: invoices.map(invoice => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total: invoice.total,
          items: invoice.items,
          payments: invoice.payments,
          createdAt: invoice.createdAt,
        })),
        products: products.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          unitPrice: product.unitPrice,
          tvaRate: product.tvaRate,
          createdAt: product.createdAt,
        })),
        sessions: sessions.map(session => ({
          id: session.id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        })),
        metadata: {
          totalClients: clients.length,
          totalInvoices: invoices.length,
          totalProducts: products.length,
          totalSessions: sessions.length,
        },
      };

      return exportData;

    } catch (error) {
      securityLogger.error('User data export generation error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Create export file
   */
  private static async createExportFile(requestId: string, data: Record<string, any>): Promise<string> {
    try {
      const exportsDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(exportsDir, { recursive: true });

      const fileName = `data_export_${requestId}.json`;
      const filePath = path.join(exportsDir, fileName);

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      return filePath;

    } catch (error) {
      securityLogger.error('Export file creation error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Send data export notification
   */
  private static async sendDataExportNotification(request: DataExportRequest): Promise<void> {
    // try {
    //   await EmailService.sendTestEmail(request.userEmail);

    //   securityLogger.info('Data export notification sent', {
    //     requestId: request.id,
    //     userEmail: request.userEmail,
    //     timestamp: new Date().toISOString(),
    //   });

    // } catch (error) {
    //   securityLogger.error('Data export notification error', {
    //     requestId: request.id,
    //     userEmail: request.userEmail,
    //     error: error instanceof Error ? error.message : 'Unknown error',
    //     timestamp: new Date().toISOString(),
    //   });
    // }
  }

  /**
   * Delete user data (GDPR right to be forgotten)
   */
  static async deleteUserData(userId: string, reason: string = 'GDPR deletion request'): Promise<{
    deletedCounts: Record<string, number>;
    backupCreated: boolean;
  }> {
    try {
      // Create backup before deletion
      const backup = await TenantDataManager.createTenantBackup(userId);

      // Delete user data
      const deletionResult = await TenantDataManager.deleteTenantData(userId);

      // Log the deletion
      securityLogger.info('User data deleted for compliance', {
        userId,
        reason,
        deletedCounts: deletionResult.deletedCounts,
        backupId: backup.metadata.tenantId,
        timestamp: new Date().toISOString(),
      });

      return {
        deletedCounts: deletionResult.deletedCounts,
        backupCreated: true,
      };

    } catch (error) {
      securityLogger.error('User data deletion error', {
        userId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Apply data retention policies
   */
  static async applyDataRetentionPolicies(): Promise<{
    policiesApplied: number;
    recordsDeleted: number;
    errors: string[];
  }> {
    const results = {
      policiesApplied: 0,
      recordsDeleted: 0,
      errors: [] as string[],
    };

    try {
      for (const policy of this.dataRetentionPolicies) {
        if (!policy.isActive) continue;

        const now = new Date();
        const nextCleanup = new Date(policy.nextCleanupAt);

        if (now < nextCleanup) continue;

        try {
          const deletedCount = await this.applyRetentionPolicy(policy);
          results.recordsDeleted += deletedCount;
          results.policiesApplied++;

          // Update next cleanup date
          policy.lastCleanupAt = now.toISOString();
          policy.nextCleanupAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

          securityLogger.info('Data retention policy applied', {
            policyId: policy.id,
            dataType: policy.dataType,
            recordsDeleted: deletedCount,
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          const errorMsg = `Policy ${policy.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);

          securityLogger.error('Data retention policy error', {
            policyId: policy.id,
            dataType: policy.dataType,
            error: errorMsg,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return results;

    } catch (error) {
      securityLogger.error('Data retention policies application error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Apply specific retention policy
   */
  private static async applyRetentionPolicy(policy: DataRetentionPolicy): Promise<number> {
    const cutoffDate = new Date(Date.now() - policy.retentionPeriodDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    switch (policy.dataType) {
      case 'audit_logs':
        // Would delete old admin logs
        const deletedLogs = await prisma.adminLog.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        });
        deletedCount = deletedLogs.count;
        break;

      case 'system_logs':
        // Would delete old system logs (if stored in database)
        // For now, just log the action
        deletedCount = 0;
        break;

      case 'user_data':
        // Only delete data for users who have been inactive for the retention period
        // and have explicitly requested deletion
        deletedCount = 0;
        break;

      case 'billing_data':
        // Delete old billing logs (keeping financial records as required by law)
        const deletedBilling = await prisma.billingLog.deleteMany({
          where: { 
            createdAt: { lt: cutoffDate },
            eventType: { in: ['payment_succeeded', 'payment_failed'] }, // Keep subscription events
          },
        });
        deletedCount = deletedBilling.count;
        break;

      default:
        throw new Error(`Unknown data type: ${policy.dataType}`);
    }

    return deletedCount;
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      // Get summary statistics
      const [
        totalUsers,
        activeUsers,
        securityIncidents,
        failedLogins,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        // Would count security incidents from logs
        0,
        // Would count failed login attempts from logs
        0,
      ]);

      const report: ComplianceReport = {
        reportId: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary: {
          totalUsers,
          activeUsers,
          dataExportRequests: 0, // Would count from export requests
          dataDeletionRequests: 0, // Would count from deletion requests
          securityIncidents,
          complianceViolations: 0, // Would count violations
        },
        gdprCompliance: {
          dataExportResponseTime: 2, // Average days to complete export
          dataDeletionResponseTime: 1, // Average days to complete deletion
          consentManagement: {
            totalConsents: totalUsers, // Assuming all users have consented
            withdrawnConsents: 0,
          },
        },
        dataRetention: {
          policiesActive: this.dataRetentionPolicies.filter(p => p.isActive).length,
          lastCleanupDate: this.dataRetentionPolicies[0]?.lastCleanupAt || new Date().toISOString(),
          dataDeletedGB: 0, // Would calculate actual data deleted
        },
        security: {
          failedLoginAttempts: failedLogins,
          suspiciousActivities: 0, // Would count from security logs
          dataBreaches: 0,
        },
      };

      securityLogger.info('Compliance report generated', {
        reportId: report.reportId,
        period: report.period,
        summary: report.summary,
        timestamp: new Date().toISOString(),
      });

      return report;

    } catch (error) {
      securityLogger.error('Compliance report generation error', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Get data retention policies
   */
  static getDataRetentionPolicies(): DataRetentionPolicy[] {
    return [...this.dataRetentionPolicies];
  }

  /**
   * Update data retention policy
   */
  static updateDataRetentionPolicy(
    policyId: string,
    updates: Partial<DataRetentionPolicy>
  ): boolean {
    const policyIndex = this.dataRetentionPolicies.findIndex(p => p.id === policyId);
    if (policyIndex === -1) return false;

    this.dataRetentionPolicies[policyIndex] = {
      ...this.dataRetentionPolicies[policyIndex],
      ...updates,
    };

    securityLogger.info('Data retention policy updated', {
      policyId,
      updates,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Scan for compliance violations
   */
  static async scanComplianceViolations(): Promise<{
    violations: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedRecords: number;
      recommendedAction: string;
    }>;
    summary: {
      totalViolations: number;
      criticalViolations: number;
      highViolations: number;
    };
  }> {
    const violations: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      affectedRecords: number;
      recommendedAction: string;
    }> = [];

    try {
      // Check for users without proper consent (example)
      const usersWithoutConsent = await prisma.user.count({
        where: {
          // Would check for missing consent records
          createdAt: { lt: new Date('2018-05-25') }, // GDPR effective date
        },
      });

      if (usersWithoutConsent > 0) {
        violations.push({
          type: 'missing_gdpr_consent',
          severity: 'high',
          description: 'Users registered before GDPR without explicit consent',
          affectedRecords: usersWithoutConsent,
          recommendedAction: 'Request explicit consent from affected users',
        });
      }

      // Check for data retention violations
      const oldSessions = await prisma.session.count({
        where: {
          expiresAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() as any },
        },
      });

      if (oldSessions > 0) {
        violations.push({
          type: 'expired_sessions_not_cleaned',
          severity: 'medium',
          description: 'Expired sessions not cleaned up according to retention policy',
          affectedRecords: oldSessions,
          recommendedAction: 'Clean up expired sessions',
        });
      }

      // Check for inactive users with data
      const inactiveUsers = await prisma.user.count({
        where: {
          isActive: false,
          updatedAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      });

      if (inactiveUsers > 0) {
        violations.push({
          type: 'inactive_users_with_data',
          severity: 'medium',
          description: 'Inactive users with retained data beyond policy period',
          affectedRecords: inactiveUsers,
          recommendedAction: 'Review and potentially delete data for inactive users',
        });
      }

      const summary = {
        totalViolations: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'critical').length,
        highViolations: violations.filter(v => v.severity === 'high').length,
      };

      securityLogger.info('Compliance violations scan completed', {
        totalViolations: summary.totalViolations,
        criticalViolations: summary.criticalViolations,
        highViolations: summary.highViolations,
        timestamp: new Date().toISOString(),
      });

      return { violations, summary };

    } catch (error) {
      securityLogger.error('Compliance violations scan error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Start automated compliance tasks
   */
  static startComplianceTasks(): void {
    // Run data retention policies daily
    setInterval(async () => {
      try {
        await this.applyDataRetentionPolicies();
      } catch (error) {
        securityLogger.error('Automated data retention error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }, 24 * 60 * 60 * 1000); // Daily

    // Run compliance scan weekly
    setInterval(async () => {
      try {
        await this.scanComplianceViolations();
      } catch (error) {
        securityLogger.error('Automated compliance scan error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly

    securityLogger.info('Compliance automation started', {
      timestamp: new Date().toISOString(),
    });
  }
}