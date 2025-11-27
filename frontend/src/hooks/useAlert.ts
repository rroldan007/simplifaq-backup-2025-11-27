import { useCallback, useState } from 'react';

export type AlertItem = {
  id: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  autoClose?: number;
};

export function useAlert() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const addAlert = useCallback((alert: Omit<AlertItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: AlertItem = { ...alert, id };

    setAlerts((prev) => [...prev, newAlert]);

    if (alert.autoClose) {
      setTimeout(() => {
        removeAlert(id);
      }, alert.autoClose);
    }
  }, [removeAlert]);

  return {
    alerts,
    addAlert,
    removeAlert,
    clearAlerts,
  } as const;
}
