/**
 * 🇨🇭 SimpliFaq - Company Settings Page
 * 
 * Company information and address management
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useAuth } from '../../hooks/useAuth';
import type { User } from '../../contexts/authTypes';
import { api } from '../../services/api';
import { sanitizeTextInput } from '../../utils/security';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { LogoUpload } from '../../components/settings/LogoUpload';
import { SwissAddressAutocomplete } from '../../components/clients/SwissAddressAutocomplete';

export function CompanyPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  // Company form state
  const [company, setCompany] = useState({
    companyName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    canton: '',
    country: 'Suisse',
    vatNumber: '',
    website: '',
  });

  // Sync form when user context updates
  useEffect(() => {
    if (!user) return;

    setCompany({
      companyName: user.companyName || '',
      email: user.email || '',
      phone: user.phone || '',
      street: user.address?.street || '',
      city: user.address?.city || '',
      postalCode: user.address?.postalCode || '',
      canton: user.address?.canton || '',
      country: user.address?.country || 'Suisse',
      vatNumber: (user as any)?.vatNumber || '',
      website: (user as any)?.website || '',
    });
  }, [user]);

  const handleSaveCompany = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        companyName: sanitizeTextInput(company.companyName),
        email: sanitizeTextInput(company.email),
        phone: sanitizeTextInput(company.phone),
        address: {
          street: sanitizeTextInput(company.street),
          city: sanitizeTextInput(company.city),
          postalCode: sanitizeTextInput(company.postalCode),
          canton: sanitizeTextInput(company.canton),
          country: sanitizeTextInput(company.country),
        },
        street: sanitizeTextInput(company.street),
        city: sanitizeTextInput(company.city),
        postalCode: sanitizeTextInput(company.postalCode),
        canton: sanitizeTextInput(company.canton),
        country: sanitizeTextInput(company.country),
        vatNumber: sanitizeTextInput(company.vatNumber),
        website: sanitizeTextInput(company.website),
      };
      const updated = await api.updateMyProfile(payload);
      updateUser(updated as User);
      showToast('Informations de l\'entreprise mises à jour avec succès', 'success');
    } catch (error) {
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Wait for user to load
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded shadow-md border text-sm ${
          toast.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
          toast.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
          'bg-slate-50 border-slate-300 text-slate-800'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Entreprise</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les informations de votre entreprise</p>
        </div>
      </div>

      {/* Company Information Card */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Informations de l'entreprise</h2>
          </div>
        </div>

        <form onSubmit={handleSaveCompany} className="p-6 space-y-6">
          {/* Logo Upload */}
          <div className="pb-6 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-3">Logo de l'entreprise</label>
            <LogoUpload currentLogoUrl={(user as any)?.logoUrl} />
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la société <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={company.companyName}
                onChange={(e) => setCompany(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nom de votre entreprise"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={company.email}
                onChange={(e) => setCompany(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="contact@entreprise.ch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={company.phone}
                onChange={(e) => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-base font-semibold text-gray-900">Adresse</h3>
            
            <div className="md:col-span-2">
              <SwissAddressAutocomplete
                label="Rue et numéro"
                value={company.street}
                onChange={(v) => setCompany(prev => ({ ...prev, street: v }))}
                onAddressSelected={(addr) => {
                  setCompany(prev => ({
                    ...prev,
                    street: addr.street || prev.street,
                    city: addr.city || prev.city,
                    postalCode: addr.postalCode || prev.postalCode,
                    canton: addr.canton || prev.canton,
                    country: addr.country || prev.country,
                  }));
                }}
                nativeInput
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <input
                  type="text"
                  value={company.postalCode}
                  onChange={(e) => setCompany(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => setCompany(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Lausanne"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canton</label>
                <input
                  type="text"
                  value={company.canton}
                  onChange={(e) => setCompany(prev => ({ ...prev, canton: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <input
                  type="text"
                  value={company.country}
                  onChange={(e) => setCompany(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Suisse"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro TVA</label>
              <input
                type="text"
                value={company.vatNumber}
                onChange={(e) => setCompany(prev => ({ ...prev, vatNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="CHE-123.456.789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
              <input
                type="url"
                value={company.website}
                onChange={(e) => setCompany(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.entreprise.ch"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
