import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../../../services/api';

interface CompanyInfoStepProps {
  onComplete: () => void;
}

export default function CompanyInfoStep({ onComplete }: CompanyInfoStepProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    postalCode: '',
    canton: '',
    phone: '',
    website: '',
    vatNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    if (!dataLoadedRef.current) {
      loadUserData();
      dataLoadedRef.current = true;
    }
  }, []);

  const loadUserData = async () => {
    setLoadingData(true);
    try {
      const response = await api.get('/auth/me');
      type UserData = { companyName?: string; firstName?: string; lastName?: string; street?: string; city?: string; postalCode?: string; canton?: string; phone?: string; website?: string; vatNumber?: string };
      // Backend returns { data: { user: {...} } }, api.get wraps it, so we access .user
      const userData = response.data.data as { user?: UserData };
      const user = userData.user || {} as UserData;
      setFormData({
        companyName: user.companyName || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        street: user.street || '',
        city: user.city || '',
        postalCode: user.postalCode || '',
        canton: user.canton || '',
        phone: user.phone || '',
        website: user.website || '',
        vatNumber: user.vatNumber || ''
      });
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Update user profile
      await api.put('/auth/me', formData);
      onComplete();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const cantons = [
    'AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 'JU', 'LU',
    'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'
  ];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos informations...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-gray-600">
        Vérifiez et complétez les informations de votre entreprise. Ces informations apparaîtront sur vos factures.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l'entreprise *
          </label>
          <input
            type="text"
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Chocolaterie Suisse SA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prénom *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Adresse *
          </label>
          <input
            type="text"
            required
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Rue du Commerce 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code postal *
          </label>
          <input
            type="text"
            required
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="1200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ville *
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Genève"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Canton
          </label>
          <select
            value={formData.canton}
            onChange={(e) => setFormData({ ...formData, canton: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Sélectionner...</option>
            {cantons.map(canton => (
              <option key={canton} value={canton}>{canton}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="+41 22 123 45 67"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Site web
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://www.exemple.ch"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro TVA
          </label>
          <input
            type="text"
            value={formData.vatNumber}
            onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="CHE-123.456.789"
          />
        </div>
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
