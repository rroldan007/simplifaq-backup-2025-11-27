import { useEffect, useState } from 'react';
import { securityLogger } from '../utils/security';

export interface SecurityEvent {
  timestamp: string;
  event: string;
  details: unknown;
  userAgent: string;
  url: string;
}

/**
 * useSecurityAlerts
 * Returns a count of critical security events detected within the last 24 hours.
 */
export const useSecurityAlerts = () => {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const checkAlerts = () => {
      const logs = securityLogger.getSecurityLogs();
      const criticalEvents = logs.filter((log: SecurityEvent) => {
        const eventTime = new Date(log.timestamp).getTime();
        const now = Date.now();
        const isRecent = now - eventTime < 24 * 60 * 60 * 1000;

        const isCritical = [
          'AUTH_RATE_LIMIT_EXCEEDED',
          'AUTH_LOGIN_FAILED',
          'AUTH_TOKEN_CORRUPTED',
          'SECURITY_VIOLATION',
        ].includes(log.event);

        return isRecent && isCritical;
      });

      setAlertCount(criticalEvents.length);
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);

    return () => clearInterval(interval);
  }, []);

  return { alertCount };
};
