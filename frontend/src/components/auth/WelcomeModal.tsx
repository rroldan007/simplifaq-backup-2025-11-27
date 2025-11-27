import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface WelcomeModalProps {
  firstName: string;
  companyName: string;
  onClose?: () => void;
}

export function WelcomeModal({ firstName, companyName, onClose }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const handleContinue = useCallback(() => {
    setShow(false);
    setTimeout(() => {
      if (onClose) onClose();
      navigate('/dashboard');
    }, 300);
  }, [navigate, onClose]);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setShow(true), 100);

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleContinue]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          show ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={handleContinue}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-500 w-full max-w-lg ${
            show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {/* Confetti Background Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                <svg 
                  className="w-4 h-4 text-yellow-400"
                  style={{
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="relative px-8 py-10 text-center">
            {/* Success Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-bounce-slow">
              <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Welcome Message */}
            <h2 className="mb-3 text-3xl font-bold text-gray-900">
              🎉 Bienvenue {firstName}!
            </h2>
            
            <p className="mb-6 text-lg text-gray-600">
              Votre compte <span className="font-semibold text-blue-600">{companyName}</span> est maintenant actif!
            </p>

            {/* Success Message */}
            <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-6 border border-blue-200">
              <p className="text-sm text-gray-700 mb-4">
                ✅ Compte créé avec succès<br />
                📧 Email de confirmation envoyé<br />
                🚀 Prêt à créer votre première facture
              </p>
            </div>

            {/* Next Steps */}
            <div className="mb-8 text-left">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Commencez dès maintenant
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-3 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                  <div>
                    <strong className="text-gray-900">Ajoutez vos clients</strong>
                    <br />
                    <span>Créez votre base de clients en quelques clics</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
                  <div>
                    <strong className="text-gray-900">Créez votre première facture</strong>
                    <br />
                    <span>Avec QR-facture suisse automatique et calcul TVA</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
                  <div>
                    <strong className="text-gray-900">Envoyez et recevez</strong>
                    <br />
                    <span>Envoi par email et suivi des paiements en temps réel</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <button
              onClick={handleContinue}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-105"
            >
              Accéder au tableau de bord ({countdown}s)
            </button>

            <p className="mt-4 text-xs text-gray-500">
              Redirection automatique dans {countdown} seconde{countdown !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-confetti {
          animation: confetti linear infinite;
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
