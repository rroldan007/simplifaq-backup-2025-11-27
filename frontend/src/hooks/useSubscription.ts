import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import type { Plan } from '../components/billing/PlanCard';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  plan: Plan;
}

export interface UsageStats {
  invoicesThisMonth: number;
  invoicesLimit: number;
  clientsTotal: number;
  clientsLimit: number;
  productsTotal: number;
  productsLimit: number;
  storageUsed: number;
  storageLimit: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscription();
      loadUsage();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get<{ success: boolean; data: Subscription }>(
        `${API_URL}/api/subscriptions/current`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success && response.data.data) {
        setSubscription(response.data.data);
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Impossible de charger votre abonnement');
    }
  };

  const loadUsage = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get<{ success: boolean; data: UsageStats }>(
        `${API_URL}/api/subscriptions/usage`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success && response.data.data) {
        setUsage(response.data.data);
      }
    } catch (err) {
      console.error('Error loading usage:', err);
      // Don't set error here, usage is not critical
    } finally {
      setIsLoading(false);
    }
  };

  const changePlan = async (newPlanId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_URL}/api/subscriptions/change-plan`,
        { planId: newPlanId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        await loadSubscription();
        await loadUsage();
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error changing plan:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors du changement de plan');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_URL}/api/subscriptions/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        await loadSubscription();
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error cancelling subscription:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors de l\'annulation');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateSubscription = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${API_URL}/api/subscriptions/reactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        await loadSubscription();
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Error reactivating subscription:', err);
      setError(err.response?.data?.error?.message || 'Erreur lors de la réactivation');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const isFeatureAvailable = (feature: keyof Plan): boolean => {
    if (!subscription) return false;
    const value = subscription.plan[feature];
    return typeof value === 'boolean' ? value : false;
  };

  const isLimitReached = (resource: 'invoices' | 'clients' | 'products' | 'storage'): boolean => {
    if (!usage || !subscription) return false;

    switch (resource) {
      case 'invoices':
        return usage.invoicesThisMonth >= usage.invoicesLimit;
      case 'clients':
        return usage.clientsTotal >= usage.clientsLimit;
      case 'products':
        return usage.productsTotal >= usage.productsLimit;
      case 'storage':
        return usage.storageUsed >= usage.storageLimit;
      default:
        return false;
    }
  };

  const getUsagePercentage = (resource: 'invoices' | 'clients' | 'products' | 'storage'): number => {
    if (!usage) return 0;

    switch (resource) {
      case 'invoices':
        return usage.invoicesLimit > 0 ? (usage.invoicesThisMonth / usage.invoicesLimit) * 100 : 0;
      case 'clients':
        return usage.clientsLimit > 0 ? (usage.clientsTotal / usage.clientsLimit) * 100 : 0;
      case 'products':
        return usage.productsLimit > 0 ? (usage.productsTotal / usage.productsLimit) * 100 : 0;
      case 'storage':
        return usage.storageLimit > 0 ? (usage.storageUsed / usage.storageLimit) * 100 : 0;
      default:
        return 0;
    }
  };

  return {
    subscription,
    usage,
    isLoading,
    error,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    isFeatureAvailable,
    isLimitReached,
    getUsagePercentage,
    refresh: async () => {
      await loadSubscription();
      await loadUsage();
    },
  };
}
