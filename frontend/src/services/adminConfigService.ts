/**
 * 🇨🇭 SimpliFaq - Admin Configuration Service
 * 
 * Centralized configuration to eliminate hardcodeos and environment duplication
 */

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  isActive?: boolean;
  isVerified?: boolean;
  lastTestedAt?: string;
  includeUnsubscribe: boolean;
  trackOpens: boolean;
  trackClicks: boolean;
  maxRetries: number;
  retryDelay: number;
}

interface AdminConfig {
  jwt: {
    secret: string;
    expiresIn: string;
  };
  smtp: {
    defaultConfig: Partial<SmtpConfig>;
    providers: Record<string, Partial<SmtpConfig>>;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    twoFactorAuth: boolean;
    auditLogging: boolean;
    rateLimiting: boolean;
  };
}

class AdminConfigService {
  private static instance: AdminConfigService;
  private config: AdminConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): AdminConfigService {
    if (!AdminConfigService.instance) {
      AdminConfigService.instance = new AdminConfigService();
    }
    return AdminConfigService.instance;
  }

  private loadConfig(): AdminConfig {
    return {
      jwt: {
        secret: import.meta.env.VITE_JWT_SECRET || 'fallback-secret-change-in-production',
        expiresIn: '24h',
      },
      smtp: {
        defaultConfig: {
          host: import.meta.env.VITE_SMTP_HOST || '',
          port: parseInt(import.meta.env.VITE_SMTP_PORT || '587'),
          secure: import.meta.env.VITE_SMTP_SECURE === 'true',
          user: import.meta.env.VITE_SMTP_USER || '',
          fromEmail: import.meta.env.VITE_SMTP_FROM_EMAIL || 'noreply@simplifaq.com',
          fromName: import.meta.env.VITE_SMTP_FROM_NAME || 'SimpliFaq',
          provider: 'smtp',
          includeUnsubscribe: true,
          trackOpens: false,
          trackClicks: false,
          maxRetries: 3,
          retryDelay: 300,
        },
        providers: {
          gmail: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            info: 'Use Google App Password',
          },
          outlook: {
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            info: 'Microsoft account with modern auth',
          },
          sendgrid: {
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            info: 'Use API key as password',
          },
        },
      },
      api: {
        baseUrl: import.meta.env.VITE_API_URL || '/api',
        timeout: 30000,
      },
      features: {
        twoFactorAuth: import.meta.env.VITE_ENABLE_2FA === 'true',
        auditLogging: import.meta.env.VITE_ENABLE_AUDIT_LOG === 'true',
        rateLimiting: import.meta.env.VITE_ENABLE_RATE_LIMIT === 'true',
      },
    };
  }

  getConfig(): AdminConfig {
    return { ...this.config };
  }

  getJwtConfig() {
    return this.config.jwt;
  }

  getSmtpConfig() {
    return this.config.smtp;
  }

  getApiConfig() {
    return this.config.api;
  }

  getFeatures() {
    return this.config.features;
  }

  getSmtpProvider(providerName: string): Partial<SmtpConfig> | undefined {
    return this.config.smtp.providers[providerName];
  }

  updateConfig(updates: Partial<AdminConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Validate SMTP configuration
  validateSmtpConfig(config: Partial<SmtpConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.host) errors.push('SMTP host is required');
    if (!config.port || config.port < 1 || config.port > 65535) errors.push('Valid SMTP port is required');
    if (!config.user) errors.push('SMTP username is required');
    if (!config.fromEmail) errors.push('From email is required');
    if (!config.fromName) errors.push('From name is required');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get environment-specific settings
  getEnvironmentConfig(): 'development' | 'staging' | 'production' {
    const env = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV || 'development';
    return env as 'development' | 'staging' | 'production';
  }

  // Check if feature is enabled
  isFeatureEnabled(feature: keyof AdminConfig['features']): boolean {
    return this.config.features[feature];
  }
}

// Export singleton instance
export const adminConfigService = AdminConfigService.getInstance();

// Export types
export type { SmtpConfig, AdminConfig };
