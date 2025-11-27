/**
 * 🇨🇭 SimpliFaq - Admin Dashboard Type Definitions
 * 
 * Centralized types for the admin dashboard components and API services.
 */

export interface RevenueChartDataPoint {
  month: string;
  revenue: number;
  invoiceCount: number;
}

export interface UsageData {
  resourceType: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

// Received from API, used in SaaSMetrics component
export interface OverviewData {
  totalUsers: number;
  activeUsers: number;
  connectedUsers?: number;
  newUsersInPeriod: number;
  userGrowthRate: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  totalInvoices: number;
  invoicesInPeriod: number;
  totalRevenue: number;
  revenueInPeriod: number;
  revenueGrowthRate: number;
}

// For the UserGrowthChart component
export interface UserGrowthChartDataPoint {
  month: string;
  users: number;
}

// Main data structure for the Admin Dashboard from the API
export interface AdminDashboardData {
  overview: OverviewData;
  charts: {
    userGrowth: UserGrowthChartDataPoint[];
    revenueGrowth: RevenueChartDataPoint[];
  };
  systemHealth: { [key: string]: string };
  period: {
    start: string;
    end: string;
    label: string;
  };
}

export interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'healthy' | 'warning' | 'error';
      responseTime: number;
      connectionCount: number;
    };
    api: {
      status: 'healthy' | 'warning' | 'error';
      responseTime: number;
      errorRate: number;
      requestCount: number;
    };
  };
  resources: {
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
  };
  users: {
    active: number;
    total: number;
  };
}
