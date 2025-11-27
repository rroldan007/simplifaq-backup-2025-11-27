import { useState, useEffect } from 'react';
import { onboardingApi, type OnboardingStatus } from '../services/onboardingApi';

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await onboardingApi.getStatus();
      setStatus(data);
      
      // Show onboarding if not completed
      setShowOnboarding(!data.isCompleted);
    } catch (err) {
      console.error('Error loading onboarding status:', err);
      setError('Failed to load onboarding status');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadStatus();
  };

  const dismiss = () => {
    setShowOnboarding(false);
  };

  return {
    status,
    loading,
    error,
    showOnboarding,
    refresh,
    dismiss
  };
}
