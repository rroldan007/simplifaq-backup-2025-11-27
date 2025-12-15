/**
 * 🇨🇭 SimpliFaq - Admin API Service (Refactored)
 * 
 * Enhanced API service using centralized auth and config services
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { adminAuthService } from './adminAuthService';
import { adminConfigService } from './adminConfigService';

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

class AdminApiServiceRefactored {
  public api: AxiosInstance;

  constructor() {
    const config = adminConfigService.getApiConfig();
    
    this.api = axios.create({
      baseURL: `${config.baseUrl}/admin`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const authHeader = adminAuthService.getAuthHeader();
        if (authHeader.Authorization) {
          config.headers.Authorization = authHeader.Authorization;
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
          adminAuthService.clearToken();
          window.location.href = '/admin/login';
        }
        return Promise.reject(error.response?.data || error);
      }
    );
  }

  // Authentication endpoints
  async login(data: LoginRequest): Promise<ApiResponse> {
    const response: ApiResponse = await this.api.post('/auth/login', data);
    
    if (response.success && response.data) {
      type LoginPayload = { accessToken?: string; token?: string };
      const payload = response.data as LoginPayload;
      const token = payload.accessToken || payload.token;
      
      if (token) {
        adminAuthService.setToken(token);
      }
    }
    
    return response;
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response: ApiResponse = await this.api.post('/auth/logout');
      return response;
    } finally {
      adminAuthService.clearToken();
    }
  }

  async getProfile(): Promise<ApiResponse<AdminUser>> {
    const response: ApiResponse<AdminUser> = await this.api.get('/auth/profile');
    
    if (response.success && response.data) {
      adminAuthService.updateUser(response.data);
    }
    
    return response;
  }

  // User management endpoints
  async getUsers(params: Record<string, unknown> = {}): Promise<ApiResponse> {
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

  async createUser(userData: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.post('/users', userData);
  }

  // Plans endpoints
  async getPlans(): Promise<ApiResponse> {
    return this.api.get('/plans');
  }

  async createPlan(planData: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.post('/plans', planData);
  }

  async updatePlan(id: string, planData: Record<string, unknown>): Promise<ApiResponse> {
    return this.api.put(`/plans/${id}`, planData);
  }

  async deletePlan(id: string): Promise<ApiResponse> {
    return this.api.delete(`/plans/${id}`);
  }

  async changeUserPlan(userId: string, data: { planId: string; immediate?: boolean; scheduledDate?: string; prorated?: boolean; reason?: string }): Promise<ApiResponse> {
    return this.api.post(`/subscriptions/users/${userId}/change-plan`, data);
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

  // Analytics endpoints
  async getDashboardAnalytics(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/dashboard', { params });
  }

  async getUserGrowthData(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/user-growth', { params });
  }

  async getRevenueData(params: Record<string, unknown> = {}): Promise<ApiResponse> {
    return this.api.get('/analytics/revenue', { params });
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

  // Utility methods
  isAuthenticating(): boolean {
    return !adminAuthService.isAuthenticated();
  }

  hasPermission(resource: string, action: string): boolean {
    return adminAuthService.hasPermission(resource, action);
  }

  hasRole(roles: string[]): boolean {
    return adminAuthService.hasRole(roles);
  }

  getCurrentUser(): AdminUser | null {
    return adminAuthService.getUser();
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.api.get('/health');
  }
}

// Create and export singleton instance
export const adminApiService = new AdminApiServiceRefactored();

// Export types
export type {
  ApiResponse,
  LoginRequest,
  AdminUser,
};
