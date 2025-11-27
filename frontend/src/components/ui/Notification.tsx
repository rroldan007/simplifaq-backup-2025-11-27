import React, { useEffect } from 'react';

interface NotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onRemove: (id: string) => void;
  autoRemove?: boolean;
  duration?: number;
}

export function Notification({ 
  id, 
  message, 
  type, 
  onRemove, 
  autoRemove = true, 
  duration = 5000 
}: NotificationProps) {
  useEffect(() => {
    if (autoRemove) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, onRemove, autoRemove, duration]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icon: '✅',
          button: 'text-green-600 hover:text-green-800'
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: '❌',
          button: 'text-red-600 hover:text-red-800'
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'ℹ️',
          button: 'text-blue-600 hover:text-blue-800'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg shadow-sm ${styles.container}`}>
      <div className="flex items-center space-x-3">
        <span className="text-lg">{styles.icon}</span>
        <p className="text-sm font-medium">{message}</p>
      </div>
      
      <button
        onClick={() => onRemove(id)}
        className={`ml-4 text-sm font-medium transition-colors ${styles.button}`}
      >
        ✕
      </button>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>;
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationContainer({ 
  notifications, 
  onRemove, 
  position = 'top-right' 
}: NotificationContainerProps) {
  if (notifications.length === 0) return null;

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div className={`fixed ${getPositionStyles()} z-50 space-y-2 max-w-sm w-full`}>
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}