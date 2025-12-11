import React, { useState, useEffect } from 'react';

export function ConfirmEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Token de confirmation manquant');
        return;
      }

      try {
        const response = await fetch(`/api/auth/confirm-email?token=${token}`);
        const data = await response.json();
        
        if (data.success) {
          setStatus('success');
          setMessage('Votre adresse email a été confirmée avec succès !');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Erreur lors de la confirmation');
        }
      } catch {
        setStatus('error');
        setMessage('Erreur de connexion au serveur');
      }
    };

    confirmEmail();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🇨🇭 SimpliFaq
          </h1>
          <p className="text-gray-600">
            Confirmation d'email
          </p>
        </div>
        
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Confirmation en cours...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <p className="text-green-600 font-medium">{message}</p>
            <p className="text-sm text-gray-500">Vous allez être redirigé vers la page de connexion...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <p className="text-red-600 font-medium">{message}</p>
            <a 
              href="/login"
              className="inline-block text-blue-600 hover:text-blue-800 text-sm"
            >
              Retour à la connexion
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
