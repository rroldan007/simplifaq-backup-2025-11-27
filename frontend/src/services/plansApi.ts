import axios from 'axios';
import type { Plan } from '../components/billing/PlanCard';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Get all active plans (public endpoint)
 */
export async function getPublicPlans(): Promise<Plan[]> {
  try {
    const response = await axios.get<ApiResponse<Plan[]>>(
      `${API_URL}/api/plans/public`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'Failed to fetch plans');
  } catch (error) {
    console.error('Error fetching public plans:', error);
    throw error;
  }
}

/**
 * Get plan details by ID (public endpoint)
 */
export async function getPlanById(planId: string): Promise<Plan> {
  try {
    const response = await axios.get<ApiResponse<Plan>>(
      `${API_URL}/api/plans/public/${planId}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error?.message || 'Failed to fetch plan');
  } catch (error) {
    console.error('Error fetching plan:', error);
    throw error;
  }
}

/**
 * Get user's current plan (authenticated endpoint)
 */
export async function getCurrentUserPlan(token: string): Promise<Plan | null> {
  try {
    const response = await axios.get<ApiResponse<Plan>>(
      `${API_URL}/api/users/me/plan`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching current plan:', error);
    return null;
  }
}
