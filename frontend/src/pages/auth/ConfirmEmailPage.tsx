import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface ConfirmEmailResponse {
  message: string;
  emailConfirmed: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    emailConfirmed: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Token de confirmation manquant');
        return;
      }

      try {
        const response = await api.get<ConfirmEmailResponse>(`/auth/confirm-email?token=${token}`);
        
        // El método api.get envuelve la respuesta en { data: { success, data } }
        if (response.data && response.data.success) {
          const confirmData = response.data.data as ConfirmEmailResponse;
          setStatus('success');
          setMessage(confirmData.message || 'Votre adresse email a été confirmée avec succès !');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Erreur lors de la confirmation');
        }
      } catch (error: unknown) {
        setStatus('error');
        setMessage(
          error instanceof Error ? error.message : 
          'Token de confirmation invalide ou expiré'
        );
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            SimpliFaq
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Confirmation de votre email
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <div>
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Confirmation en cours...</p>
              </div>
            )}

            {status === 'success' && (
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Email confirmé !
                </h3>
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-sm text-gray-500">
                  Un email de bienvenue vous a été envoyé. Vous allez être redirigé vers la page de connexion...
                </p>
              </div>
            )}

            {status === 'error' && (
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Erreur de confirmation
                </h3>
                <p className="text-gray-600 mb-4">{message}</p>
                <button
                  onClick={() => navigate('/register')}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Retour à l'inscription
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2024 SimpliFaq. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
