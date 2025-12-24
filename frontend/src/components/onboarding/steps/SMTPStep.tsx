import React, { useState } from 'react';
import { ArrowRight, Mail, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SMTPStepProps {
  onComplete: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function SMTPStep({ onComplete, onSkip }: SMTPStepProps) {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<'skip' | 'configure' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfigureNow = () => {
    console.log('[SMTPStep] Navigating to SMTP settings');
    // Navigate to SMTP settings
    navigate('/settings/smtp');
  };

  const handleSkip = async () => {
    console.log('[SMTPStep] handleSkip called');
    setChoice('skip');
    setIsProcessing(true);
    try {
      await onSkip();
      console.log('[SMTPStep] Skip successful');
    } catch (error) {
      console.error('[SMTPStep] Error skipping:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = async () => {
    console.log('[SMTPStep] handleContinue called with choice:', choice);
    setIsProcessing(true);
    try {
      if (choice === 'skip') {
        console.log('[SMTPStep] Calling onSkip...');
        await onSkip();
        console.log('[SMTPStep] onSkip completed');
      } else {
        handleConfigureNow();
      }
    } catch (error) {
      console.error('[SMTPStep] Error in handleContinue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="bg-purple-600 rounded-full p-3 h-fit">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-purple-900 mb-2 text-lg">📧 Configuration SMTP pour l'envoi de factures</h4>
            <div className="space-y-2 text-sm text-purple-800">
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span><strong>Envoyez vos factures directement</strong> depuis votre propre email d'entreprise</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span><strong>Professionnalisme accru</strong> - vos clients reçoivent les factures de votre domaine</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span><strong>Traçabilité complète</strong> - gardez une copie de tous les emails envoyés</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span><strong>Compatible</strong> avec Gmail, Outlook, SMTP personnalisé</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">Configuration optionnelle</h4>
            <p className="text-sm text-amber-800">
              Vous pouvez passer cette étape et la configurer plus tard depuis <strong>Paramètres → SMTP</strong>.
              Sans SMTP, vous devrez télécharger et envoyer manuellement vos factures.
            </p>
          </div>
        </div>
      </div>

      {/* Choice cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleConfigureNow}
          className={`p-6 border-2 rounded-xl text-left transition-all hover:shadow-md ${
            choice === 'configure'
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Configurer maintenant</h3>
              <p className="text-sm text-gray-600">
                Configurez votre SMTP pour envoyer directement vos factures (recommandé)
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setChoice('skip')}
          className={`p-6 border-2 rounded-xl text-left transition-all hover:shadow-md ${
            choice === 'skip'
              ? 'border-gray-600 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="bg-gray-100 rounded-lg p-2">
              <ArrowRight className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Passer pour l'instant</h3>
              <p className="text-sm text-gray-600">
                Configurer plus tard depuis les paramètres
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={handleSkip}
          disabled={isProcessing}
          className="px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Passer cette étape
        </button>
        {choice === 'skip' && (
          <button
            type="button"
            onClick={handleContinue}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Traitement...</span>
              </>
            ) : (
              <>
                Continuer
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
