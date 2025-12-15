import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Types
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requiresTwoFactor?: boolean;
  message?: string;
}

interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: Record<string, string[]>;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface CreateAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'support_admin' | 'billing_admin';
  permissions: Record<string, string[]>;
}

interface UserSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  role?: 'user' | 'admin' | 'super_admin' | 'all';
  plan?: string;
  sortBy?: 'createdAt' | 'email' | 'companyName' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
}

interface SubscriptionSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'all';
  planId?: string;
  planName?: string;
  sortBy?: 'createdAt' | 'currentPeriodEnd' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  period?: '7d' | '30d' | '90d' | '1y';
}

class AdminApiService {
  public api: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.api = axios.create({
            baseURL: '/api/admin',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.setAuthToken(null);
          localStorage.removeItem('adminToken');
          window.location.href = '/admin/login';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  // Set authentication token
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  // Authentication endpoints
  async login(data: LoginRequest): Promise<ApiResponse> {
    return this.api.post('/auth/login', data);
  }

  async logout(): Promise<ApiResponse> {
    return this.api.post('/auth/logout');
  }

  async getProfile(): Promise<ApiResponse<AdminUser>> {
    return this.api.get('/auth/profile');
  }

  async createAdmin(data: CreateAdminRequest): Promise<ApiResponse<AdminUser>> {
    return this.api.post('/auth/create', data);
  }

  // 2FA endpoints
  async setup2FA(): Promise<ApiResponse<{ secret: string; qrCode: string; manualEntryKey: string }>> {
    return this.api.post('/auth/2fa/setup');
  }

  async enable2FA(data: { secret: string; token: string }): Promise<ApiResponse> {
    return this.api.post('/auth/2fa/enable', data);
  }

  async disable2FA(): Promise<ApiResponse> {
    return this.api.post('/auth/2fa/disable');
  }

  // User management endpoints
  async getUsers(params: UserSearchParams = {}): Promise<ApiResponse> {
    return this.api.get('/users', { params });
  }

  async getUser(id: string): Promise<ApiResponse> {
    return this.api.get(`/users/${id}`);
  }

  async updateUser(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put(`/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.api.delete(`/users/${id}`);
  }

  async deleteUserPermanently(id: string): Promise<ApiResponse> {
    return this.api.delete(`/users/${id}/permanent`);
  }

  async getUserStats(): Promise<ApiResponse> {
    return this.api.get('/users/stats/overview');
  }

  async createUser(userData: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.post('/users', userData);
  }

  async updateUserRole(userId: string, role: 'user' | 'admin' | 'super_admin'): Promise<ApiResponse> {
    return this.api.put(`/users/${userId}/role`, { role });
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse> {
    return this.api.put(`/users/${userId}/status`, { isActive });
  }

  async changeUserPlan(userId: string, data: { planId: string; immediate?: boolean }): Promise<ApiResponse> {
    return this.api.post(`/users/${userId}/change-plan`, data);
  }

  // Subscription management endpoints
  async getSubscriptions(params: SubscriptionSearchParams = {}): Promise<ApiResponse> {
    return this.api.get('/subscriptions', { params });
  }

  async getSubscription(id: string): Promise<ApiResponse> {
    return this.api.get(`/subscriptions/${id}`);
  }

  async updateSubscription(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put(`/subscriptions/${id}`, data);
  }

  // Change subscription plan (admin action)
  async changeSubscriptionPlan(
    id: string,
    data: { planId: string; immediate?: boolean; scheduledDate?: string; prorated?: boolean; reason?: string }
  ): Promise<ApiResponse> {
    return this.api.post(`/subscriptions/${id}/change-plan`, data);
  }

  async cancelSubscription(id: string, immediate: boolean = false): Promise<ApiResponse> {
    return this.api.post(`/subscriptions/${id}/cancel`, { immediate });
  }

  async getSubscriptionStats(): Promise<ApiResponse> {
    return this.api.get('/subscriptions/stats/overview');
  }

  // Analytics endpoints
  async getDashboardAnalytics(params: AnalyticsParams = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/dashboard', { params });
  }

  async getUsageAnalytics(params: AnalyticsParams = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/usage', { params });
  }

  async getRevenueAnalytics(params: AnalyticsParams = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/revenue', { params });
  }



  // Settings endpoints
  async getSettings(): Promise<ApiResponse> {
    return this.api.get('/settings');
  }

  async updateSettings(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put('/settings', data);
  }

  async getSwissComplianceAnalytics(params: AnalyticsParams = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/swiss-compliance', { params });
  }

  async getAdminLogs(params: { page?: number; limit?: number } = {}): Promise<ApiResponse> {
    return this.api.get('/logs', { params });
  }

  // Plans management
  async getPlans(): Promise<ApiResponse> {
    return this.api.get('/plans');
  }

  async createPlan(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.post('/plans', data);
  }

  async updatePlan(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put(`/plans/${id}`, data);
  }

  async deletePlan(id: string): Promise<ApiResponse> {
    return this.api.delete(`/plans/${id}`);
  }

  // Email templates management
  async getEmailTemplates(): Promise<ApiResponse> {
    return this.api.get('/email-templates');
  }

  async updateEmailTemplate(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put(`/email-templates/${id}`, data);
  }

  // Feature flags management
  async getFeatureFlags(): Promise<ApiResponse> {
    return this.api.get('/feature-flags');
  }

  async updateFeatureFlag(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put(`/feature-flags/${id}`, data);
  }

  // Invoice management endpoints
  async getInvoices(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/invoices', { params });
  }

  async getInvoice(id: string): Promise<ApiResponse> {
    return this.api.get(`/invoices/${id}`);
  }

  async updateInvoiceStatus(id: string, status: string): Promise<ApiResponse> {
    return this.api.put(`/invoices/${id}/status`, { status });
  }

  async downloadInvoicePdf(id: string): Promise<ApiResponse> {
    return this.api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  }

  // Analytics endpoints
  async getAnalytics(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics', { params });
  }

  async getUserGrowthData(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/user-growth', { params });
  }

  async getRevenueData(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/revenue', { params });
  }

  // Monitoring endpoints
  async getSystemHealth(): Promise<ApiResponse> {
    // Use general health endpoint since /system/health doesn't exist
    return this.api.get('/health');
  }

  async getSystemLogs(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/monitoring/logs', { params });
  }

  async getRecentActivity(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/recent-activity', { params });
  }

  async getTopUsers(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/top-users', { params });
  }

  // System settings endpoints
  async getSystemConfig(): Promise<ApiResponse> {
    return this.api.get('/system/config');
  }

  async updateSystemConfig(config: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put('/system/config', config);
  }

  async clearCache(): Promise<ApiResponse> {
    return this.api.post('/system/cache/clear');
  }

  // SMTP Configuration endpoints
  async getSmtpConfig(): Promise<ApiResponse> {
    return this.api.get('/smtp/config');
  }

  async updateSmtpConfig(config: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.post('/smtp/config', config);
  }

  async testSmtpConfig(testEmail: string, configId?: string): Promise<ApiResponse> {
    return this.api.post('/smtp/config/test', { testEmail, configId });
  }

  async getSmtpStats(): Promise<ApiResponse> {
    return this.api.get('/smtp/stats');
  }

  // Settings endpoints
  async getSystemSettings(): Promise<ApiResponse> {
    return this.api.get('/settings/system');
  }

  async updateSystemSettings(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put('/settings/system', data);
  }

  async getAdminSettings(): Promise<ApiResponse> {
    return this.api.get('/settings/admin');
  }

  async updateAdminSettings(data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put('/settings/admin', data);
  }

  async testEmailSettings(): Promise<ApiResponse> {
    return this.api.post('/settings/test-email');
  }

  // Billing endpoints
  async getBillingOverview(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/billing/overview', { params });
  }

  async getPayments(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/billing/payments', { params });
  }

  async getRefunds(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/billing/refunds', { params });
  }

  async processRefund(paymentId: string, amount: number, reason: string): Promise<ApiResponse> {
    return this.api.post(`/billing/payments/${paymentId}/refund`, { amount, reason });
  }

  // Support endpoints
  async getSupportTickets(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/support/tickets', { params });
  }

  async getSupportTicket(id: string): Promise<ApiResponse> {
    return this.api.get(`/support/tickets/${id}`);
  }

  async updateSupportTicket(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put(`/support/tickets/${id}`, data);
  }

  async createSupportTicketReply(ticketId: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.post(`/support/tickets/${ticketId}/replies`, data);
  }

  async addSupportResponse(ticketId: string, data: { message: string; isInternal?: boolean }): Promise<ApiResponse> {
    return this.api.post(`/support/tickets/${ticketId}/responses`, data);
  }

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], data: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.post('/users/bulk-update', { userIds, data });
  }

  async exportUsers(params: Record<string, unknown> = {}): Promise<Blob> {
    const response = await this.api.get('/users/export', {
      params,
      responseType: 'blob',
    });
    // Interceptor returns response.data, which is Blob when responseType is 'blob'
    return response as unknown as Blob;
  }

  async exportSubscriptions(params: Record<string, unknown> = {}): Promise<Blob> {
    const response = await this.api.get('/subscriptions/export', {
      params,
      responseType: 'blob',
    });
    return response as unknown as Blob;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.api.get('/health');
  }
}

// Create and export singleton instance
export const adminApi = new AdminApiService();

// Export types
export type {
  ApiResponse,
  LoginRequest,
  AdminUser,
  CreateAdminRequest,
  UserSearchParams,
  SubscriptionSearchParams,
  AnalyticsParams,
};