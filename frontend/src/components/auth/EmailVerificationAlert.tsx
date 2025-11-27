import { useState } from 'react';
import { Mail, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function EmailVerificationAlert() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Si no hay usuario o está confirmado, no mostrar nada
  if (!user || user.emailConfirmed) {
    return null;
  }

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendStatus('idle');
    setMessage('');

    try {
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_BASE}/auth/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('simplifaq_token')}`,
        },
        body: JSON.stringify({
          email: user.email,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setResendStatus('success');
        setMessage('Email de confirmation renvoyé avec succès! Vérifiez votre boîte de réception.');
      } else {
        setResendStatus('error');
        setMessage(result.error?.message || 'Erreur lors de l\'envoi de l\'email.');
      }
    } catch (error) {
      setResendStatus('error');
      setMessage('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-2">
              ⚠️ Email non vérifié - Action requise
            </p>
            <p className="mb-3">
              Votre adresse email <span className="font-semibold">{user.email}</span> n'a pas encore été confirmée. 
              Pour accéder à toutes les fonctionnalités de SimpliFaq, veuillez vérifier votre email.
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                📧 <strong>Instructions:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                <li>Consultez votre boîte de réception (y compris les spams)</li>
                <li>Cherchez un email avec le sujet "Confirmez votre adresse email - SimpliFaq"</li>
                <li>Cliquez sur le bouton "✅ Confirmer mon adresse email"</li>
              </ol>
            </div>
            
            {resendStatus === 'success' && (
              <div className="mt-3 p-2 bg-green-100 border border-green-400 rounded-md">
                <div className="flex">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                  <p className="text-sm text-green-700">{message}</p>
                </div>
              </div>
            )}
            
            {resendStatus === 'error' && (
              <div className="mt-3 p-2 bg-red-100 border border-red-400 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                  <p className="text-sm text-red-700">{message}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleResendEmail}
              disabled={isResending}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Renvoyer l'email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
