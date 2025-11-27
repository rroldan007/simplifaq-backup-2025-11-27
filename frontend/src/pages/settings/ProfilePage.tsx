/**
 * 🇨🇭 SimpliFaq - Profile Settings Page
 * 
 * User profile management including personal information and password change
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useAuth } from '../../hooks/useAuth';
import type { User } from '../../contexts/authTypes';
import { api } from '../../services/api';
import { sanitizeTextInput } from '../../utils/security';
import { ArrowLeft, User as UserIcon, Lock, Save } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  // Profile form state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Password form state
  const [pwd, setPwd] = useState({ old: '', neu: '', conf: '' });

  // Sync form when user context updates
  useEffect(() => {
    if (!user) return;

    setProfile({
      firstName: (user as any)?.firstName || '',
      lastName: (user as any)?.lastName || '',
      email: user?.email || '',
      phone: (user as any)?.phone || '',
    });
  }, [user]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: sanitizeTextInput(profile.firstName),
        lastName: sanitizeTextInput(profile.lastName),
        phone: sanitizeTextInput(profile.phone),
      };
      const updated = await api.updateMyProfile(payload);
      updateUser(updated as User);
      showToast('Profil mis à jour avec succès', 'success');
    } catch (error) {
      showToast('Erreur lors de la mise à jour du profil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pwd.old || !pwd.neu || !pwd.conf) {
      showToast('Veuillez compléter tous les champs du mot de passe', 'error');
      return;
    }
    if (pwd.neu.length < 8) {
      showToast('Le nouveau mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }
    if (pwd.neu !== pwd.conf) {
      showToast('La confirmation du mot de passe ne correspond pas', 'error');
      return;
    }
    setChangingPwd(true);
    try {
      await api.changePassword(pwd.old, pwd.neu);
      setPwd({ old: '', neu: '', conf: '' });
      showToast('Mot de passe modifié avec succès', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erreur lors du changement du mot de passe", 'error');
    } finally {
      setChangingPwd(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez vos informations personnelles</p>
        </div>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Informations personnelles</h2>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre prénom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre nom"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Votre email"
            />
            <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Votre téléphone"
            />
          </div>

          <div className="flex justify-end pt-4">
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

      {/* Password Change Card */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h2>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={pwd.old}
              onChange={(e) => setPwd(prev => ({ ...prev, old: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Votre mot de passe actuel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={pwd.neu}
              onChange={(e) => setPwd(prev => ({ ...prev, neu: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 8 caractères"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères recommandés</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={pwd.conf}
              onChange={(e) => setPwd(prev => ({ ...prev, conf: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirmer le mot de passe"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={changingPwd}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {changingPwd ? 'Modification...' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
