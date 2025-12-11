import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, CreditCard } from 'lucide-react';
import { api } from '../../../services/api';

interface FinancialStepProps {
  onComplete: () => void;
}

export default function FinancialStep({ onComplete }: FinancialStepProps) {
  const [iban, setIban] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadedRef.current) {
      loadUserData();
      dataLoadedRef.current = true;
    }
  }, []);

  const loadUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      // Backend returns { data: { user: {...} } }, api.get wraps it, so we access .user
      const userData = response.data.data as { user?: { iban?: string } };
      const user = userData.user || {};
      setIban(user.iban || '');
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const formatIBAN = (value: string) => {
    // Remove spaces and convert to uppercase
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    // Add space every 4 characters
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  };

  const handleIBANChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIBAN(e.target.value);
    setIban(formatted);
  };

  const validateIBAN = (iban: string): boolean => {
    const cleaned = iban.replace(/\s/g, '');
    // Basic Swiss IBAN validation (starts with CH, 21 characters)
    return /^CH\d{19}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateIBAN(iban)) {
      setError('IBAN suisse invalide. Format: CH00 0000 0000 0000 0000 0');
      return;
    }

    setLoading(true);

    try {
      await api.put('/auth/me', { iban: iban.replace(/\s/g, '') });
      onComplete();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="bg-blue-600 rounded-full p-3 h-fit">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 mb-2 text-lg">📋 Pourquoi l'IBAN est essentiel?</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span><strong>Génération automatique de QR-factures suisses</strong> sur toutes vos factures</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Vos clients peuvent <strong>payer en un scan</strong> avec leur app bancaire</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Conforme aux standards suisses <strong>ISO 20022</strong></span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span><strong>Réduction des erreurs</strong> de paiement et rapprochement automatique</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          IBAN suisse *
        </label>
        <input
          type="text"
          required
          value={iban}
          onChange={handleIBANChange}
          maxLength={26} // 21 chars + 5 spaces
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono"
          placeholder="CH00 0000 0000 0000 0000 0"
        />
        <p className="mt-1 text-sm text-gray-500">
          Format: CH suivi de 19 chiffres
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Exemple d'IBAN suisse:</h4>
        <code className="text-sm text-gray-700 font-mono">CH93 0076 2011 6238 5295 7</code>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? 'Sauvegarde...' : 'Continuer'}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
