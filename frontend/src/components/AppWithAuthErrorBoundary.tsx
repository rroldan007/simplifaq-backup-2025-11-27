/**
 * Example App Component with Authentication Error Boundary Integration
 * Shows how to properly integrate the auth error boundary system
 */

import React from 'react';
import { AuthErrorBoundary, AuthError, AuthErrorType } from './AuthErrorBoundary';
import { AuthErrorRecovery } from './AuthErrorRecovery';
import { useAuthErrorHandler } from '../hooks/useAuthErrorHandler';
import { formDataPreservationService } from '../services/formDataPreservationService';

// Example protected component that might throw auth errors
const ProtectedContent = () => {
  const errorHandler = useAuthErrorHandler({
    enableAutoRetry: true,
    maxRetries: 3,
    onError: (error) => {
      console.log('Auth error occurred:', error.type);
    },
    onRecovery: () => {
      console.log('Successfully recovered from auth error');
    }
  });

  const handleApiCall = async () => {
    try {
      // Simulate an API call that might fail with auth error
      const response = await fetch('/api/protected-endpoint', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError('Unauthorized access', AuthErrorType.TOKEN_EXPIRED, 401);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Use error handler to process the error
      await errorHandler.handleError(error as Error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Protected Content</h2>
      <p className="mb-4">This content is protected and requires authentication.</p>
      
      <button
        onClick={handleApiCall}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Make Protected API Call
      </button>
    </div>
  );
};

// Example form component with data preservation
const InvoiceForm = () => {
  const [formData, setFormData] = React.useState({
    clientName: '',
    amount: '',
    description: ''
  });

  const errorHandler = useAuthErrorHandler({
    onError: async (error) => {
      // Preserve form data when auth error occurs
      if (error.type === AuthErrorType.TOKEN_EXPIRED || error.type === AuthErrorType.SESSION_TIMEOUT) {
        await formDataPreservationService.preserveFormData(
          'invoice-form',
          formData,
          { formType: 'invoice', expirationMinutes: 60 }
        );
      }
    }
  });

  React.useEffect(() => {
    // Try to restore form data on component mount
    const restoreFormData = async () => {
      const restoredData = await formDataPreservationService.restoreFormData('invoice-form');
      if (restoredData) {
        // Validate and set form data with proper typing
        const validatedData = {
          clientName: String(restoredData.clientName || ''),
          amount: String(restoredData.amount || ''),
          description: String(restoredData.description || '')
        };
        setFormData(validatedData);
        // Clean up after restoration
        await formDataPreservationService.removeFormData('invoice-form');
      }
    };

    restoreFormData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError('Session expired during form submission', AuthErrorType.TOKEN_EXPIRED, 401);
        }
        throw new Error('Failed to submit form');
      }

      // Clear form on success
      setFormData({ clientName: '', amount: '', description: '' });
      await formDataPreservationService.removeFormData('invoice-form');
      
    } catch (error) {
      await errorHandler.handleError(error as Error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Create Invoice</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Client Name</label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            rows={3}
          />
        </div>
        
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create Invoice
        </button>
      </form>
    </div>
  );
};

// Custom error fallback for specific use cases
const CustomAuthErrorFallback = (error: AuthError, retry: () => void) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <AuthErrorRecovery
          error={error}
          onRetry={retry}
          className="mb-6"
        />
        
        {/* Additional context-specific information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            What happened to my data?
          </h3>
          <p className="text-sm text-blue-700">
            Don't worry! If you were filling out a form, your data has been safely preserved 
            and will be restored when you log back in.
          </p>
        </div>
      </div>
    </div>
  );
};

// Main app component with error boundary
export const AppWithAuthErrorBoundary = () => {
  return (
    <AuthErrorBoundary
      fallback={CustomAuthErrorFallback}
      enableRetry={true}
      maxRetries={3}
      retryDelay={2000}
      onError={(error) => {
        // Custom error handling logic
        console.error('App-level auth error:', error);
        
        // Could send to error reporting service
        // errorReportingService.report(error, errorInfo);
      }}
    >
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Simplitest Invoice App
              </h1>
              <nav className="space-x-4">
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </a>
                <a href="/invoices" className="text-gray-600 hover:text-gray-900">
                  Invoices
                </a>
                <a href="/clients" className="text-gray-600 hover:text-gray-900">
                  Clients
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Protected content that might throw auth errors */}
            <AuthErrorBoundary
              enableRetry={true}
              maxRetries={2}
              className="bg-white rounded-lg shadow"
            >
              <ProtectedContent />
            </AuthErrorBoundary>

            {/* Form with data preservation */}
            <AuthErrorBoundary
              enableRetry={true}
              maxRetries={1}
              className="bg-white rounded-lg shadow"
            >
              <InvoiceForm />
            </AuthErrorBoundary>
          </div>
        </main>
      </div>
    </AuthErrorBoundary>
  );
};

export default AppWithAuthErrorBoundary;
