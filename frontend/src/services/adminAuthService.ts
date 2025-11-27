/**
 * 🇨🇭 SimpliFaq - Admin Authentication Service
 * 
 * Centralized authentication service to eliminate hardcodeos and code duplication
 */

import { jwtDecode } from 'jwt-decode';

interface AdminToken {
  adminId: string;
  email: string;
  role: string;
  permissions: Record<string, string[]>;
  iat: number;
  exp: number;
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

class AdminAuthService {
  private static instance: AdminAuthService;
  private token: string | null = null;
  private user: AdminUser | null = null;
  private readonly TOKEN_KEY = 'adminToken';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  private loadFromStorage(): void {
    try {
      const storedToken = localStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this.setToken(storedToken);
      }
    } catch (error) {
      console.warn('[AdminAuthService] Error loading token from storage:', error);
      this.clearToken();
    }
  }

  private saveToStorage(): void {
    try {
      if (this.token) {
        localStorage.setItem(this.TOKEN_KEY, this.token);
      } else {
        localStorage.removeItem(this.TOKEN_KEY);
      }
    } catch (error) {
      console.warn('[AdminAuthService] Error saving token to storage:', error);
    }
  }

  setToken(token: string): void {
    this.token = token;
    try {
      const decoded = jwtDecode<AdminToken>(token);
      
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        this.clearToken();
        throw new Error('Token expired');
      }

      // Extract user info from token
      this.user = {
        id: decoded.adminId,
        email: decoded.email,
        firstName: '', // Will be loaded from API
        lastName: '', // Will be loaded from API
        role: decoded.role,
        permissions: decoded.permissions,
        twoFactorEnabled: false,
        createdAt: '', // Will be loaded from API
      };

      this.saveToStorage();
    } catch (error) {
      console.error('[AdminAuthService] Invalid token:', error);
      this.clearToken();
      throw error;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): AdminUser | null {
    return this.user;
  }

  updateUser(user: Partial<AdminUser>): void {
    if (this.user) {
      this.user = { ...this.user, ...user };
    }
  }

  isAuthenticated(): boolean {
    if (!this.token || !this.user) {
      return false;
    }

    try {
      const decoded = jwtDecode<AdminToken>(this.token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  hasPermission(resource: string, action: string): boolean {
    if (!this.user) return false;
    
    // Super admin has all permissions
    if (this.user.role === 'super_admin') return true;
    
    const resourcePermissions = this.user.permissions[resource];
    return resourcePermissions?.includes(action) || false;
  }

  hasRole(roles: string[]): boolean {
    if (!this.user) return false;
    return roles.includes(this.user.role);
  }

  clearToken(): void {
    this.token = null;
    this.user = null;
    this.saveToStorage();
  }

  // Get authorization header for API requests
  getAuthHeader(): { Authorization: string } | Record<string, never> {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  // Check if token needs refresh (expiring soon)
  shouldRefreshToken(): boolean {
    if (!this.token) return false;
    
    try {
      const decoded = jwtDecode<AdminToken>(this.token);
      const timeUntilExpiry = decoded.exp * 1000 - Date.now();
      // Refresh if less than 5 minutes remaining
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const adminAuthService = AdminAuthService.getInstance();

// Export types
export type { AdminUser, AdminToken };
