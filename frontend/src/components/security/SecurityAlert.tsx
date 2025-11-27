import React, { useEffect, useState } from 'react';
import { securityLogger } from '../../utils/security';
import { Alert } from '../ui/Alert';

interface SecurityEvent {
  timestamp: string;
  event: string;
  details: unknown;
  userAgent: string;
  url: string;
}

interface SecurityAlertProps {
  showCriticalOnly?: boolean;
  maxAlerts?: number;
}

export const SecurityAlert: React.FC<SecurityAlertProps> = ({ 
  showCriticalOnly = true, 
  maxAlerts = 3 
}) => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const checkSecurityEvents = () => {
      const logs = securityLogger.getSecurityLogs();
      
      // Filtrer les événements critiques des dernières 24 heures
      const criticalEvents = logs.filter((log: SecurityEvent) => {
        const eventTime = new Date(log.timestamp).getTime();
        const now = Date.now();
        const isRecent = now - eventTime < 24 * 60 * 60 * 1000; // 24 heures
        
        const isCritical = [
          'AUTH_RATE_LIMIT_EXCEEDED',
          'AUTH_LOGIN_FAILED',
          'AUTH_TOKEN_CORRUPTED',
          'SECURITY_VIOLATION'
        ].includes(log.event);
        
        return showCriticalOnly ? (isRecent && isCritical) : isRecent;
      });

      setSecurityEvents(criticalEvents.slice(-maxAlerts));
      setShowAlerts(criticalEvents.length > 0);
    };

    checkSecurityEvents();
    
    // Vérifier les événements de sécurité toutes les 30 secondes
    const interval = setInterval(checkSecurityEvents, 30000);
    
    return () => clearInterval(interval);
  }, [showCriticalOnly, maxAlerts]);

  const getAlertMessage = (event: SecurityEvent): string => {
    switch (event.event) {
      case 'AUTH_RATE_LIMIT_EXCEEDED':
        return 'Trop de tentatives de connexion détectées. Votre compte pourrait être ciblé.';
      case 'AUTH_LOGIN_FAILED':
        return 'Tentative de connexion échouée détectée.';
      case 'AUTH_TOKEN_CORRUPTED':
        return 'Données d\'authentification corrompues détectées. Veuillez vous reconnecter.';
      case 'SECURITY_VIOLATION':
        return 'Violation de sécurité détectée. Veuillez vérifier votre activité récente.';
      default:
        return 'Événement de sécurité détecté.';
    }
  };

  const getAlertVariant = (event: SecurityEvent): 'error' | 'warning' | 'info' => {
    switch (event.event) {
      case 'AUTH_RATE_LIMIT_EXCEEDED':
      case 'SECURITY_VIOLATION':
        return 'error';
      case 'AUTH_LOGIN_FAILED':
      case 'AUTH_TOKEN_CORRUPTED':
        return 'warning';
      default:
        return 'info';
    }
  };

  const dismissAlert = (index: number) => {
    setSecurityEvents(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllAlerts = () => {
    setSecurityEvents([]);
    setShowAlerts(false);
  };

  if (!showAlerts || securityEvents.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {securityEvents.map((event, index) => (
        <Alert
          key={`${event.timestamp}-${index}`}
          variant={getAlertVariant(event)}
          dismissible
          onDismiss={() => dismissAlert(index)}
        >
          {getAlertMessage(event)}
        </Alert>
      ))}
      
      {securityEvents.length > 1 && (
        <button
          onClick={clearAllAlerts}
          className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Effacer toutes les alertes
        </button>
      )}
    </div>
  );
};