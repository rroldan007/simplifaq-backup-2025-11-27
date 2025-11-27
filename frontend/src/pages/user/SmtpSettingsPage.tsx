import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Server,
  Lock,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  BarChart3,
  Clock,
  Zap,
  Shield,
} from 'lucide-react';
import { api } from '../../services/api';

interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  provider: string;
  isActive: boolean;
  isVerified: boolean;
  lastTestedAt?: string;
  enableAutoSend: boolean;
  includeFooter: boolean;
  dailyLimit: number;
  emailsSentToday: number;
  lastResetAt: string;
}

interface SmtpPreset {
  host: string;
  port: number;
  secure: boolean;
  provider: string;
}

interface SmtpPresets {
  gmail: SmtpPreset;
  outlook: SmtpPreset;
  office365: SmtpPreset;
  sendgrid: SmtpPreset;
  mailgun: SmtpPreset;
}

interface EmailStats {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  byTemplate: Record<string, number>;
}

export default function SmtpSettingsPage() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [presets, setPresets] = useState<SmtpPresets | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
    provider: 'smtp' as 'smtp' | 'sendgrid' | 'ses' | 'mailgun',
    enableAutoSend: false,
    includeFooter: true,
    sendCopyToSender: false,
    testEmail: '',
  });

  const loadConfig = useCallback(async () => {
    try {
      console.log('[SmtpSettingsPage] Loading configuration...');
      setLoading(true);
      setError('');
      
      const [configRes, statsRes] = await Promise.all([
        api.getUserSmtpConfig().catch((err) => {
          console.error('[SmtpSettingsPage] Config load error:', err);
          return null;
        }),
        api.getUserSmtpStats(30).catch((err) => {
          console.error('[SmtpSettingsPage] Stats load error:', err);
          return null;
        }),
      ]);

      console.log('[SmtpSettingsPage] Config response:', configRes);
      console.log('[SmtpSettingsPage] Stats response:', statsRes);

      if (configRes?.config) {
        const cfg = configRes.config;
        setConfig(cfg);
        setFormData(prev => ({
          ...prev,
          host: cfg.host || '',
          port: cfg.port || 587,
          secure: cfg.secure || false,
          user: cfg.user || '',
          fromEmail: cfg.fromEmail || '',
          fromName: cfg.fromName || '',
          replyTo: cfg.replyTo || '',
          provider: cfg.provider || 'smtp',
          enableAutoSend: cfg.enableAutoSend || false,
          includeFooter: cfg.includeFooter !== false,
          sendCopyToSender: cfg.sendCopyToSender || false,
        }));
      }

      if (configRes?.presets) {
        setPresets(configRes.presets);
      }

      if (statsRes?.email) {
        setStats(statsRes.email);
      }

      // If no presets in config response, load them separately
      if (!configRes?.presets) {
        console.log('[SmtpSettingsPage] Loading presets separately...');
        try {
          const presetsRes = await api.getUserSmtpPresets();
          console.log('[SmtpSettingsPage] Presets response:', presetsRes);
          if (presetsRes?.presets) {
            setPresets(presetsRes.presets);
          }
        } catch (e) {
          console.error('[SmtpSettingsPage] Error loading SMTP presets:', e);
          // Don't set error here - presets are optional
        }
      }

      console.log('[SmtpSettingsPage] Configuration loaded successfully');
    } catch (err: any) {
      console.error('[SmtpSettingsPage] Unexpected error:', err);
      setError(err.message || 'Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependencies - only created once

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handlePresetSelect = (presetName: keyof SmtpPresets) => {
    if (!presets) return;
    const preset = presets[presetName];
    setFormData(prev => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
      provider: preset.provider as any,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSaving(true);

    try {
      const payload: any = {
        host: formData.host,
        port: formData.port,
        secure: formData.secure,
        user: formData.user,
        fromEmail: formData.fromEmail,
        fromName: formData.fromName,
        replyTo: formData.replyTo || null,
        provider: formData.provider,
        enableAutoSend: formData.enableAutoSend,
        includeFooter: formData.includeFooter,
        sendCopyToSender: formData.sendCopyToSender,
      };
      
      // Only include password if it's not empty (for updates)
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await api.updateUserSmtpConfig(payload);
      setSuccessMessage(res.message || 'Configuration enregistrée avec succès');
      setConfig(res.config);
      
      // Clear password field after save
      setFormData(prev => ({ ...prev, password: '' }));

      // Reload config
      setTimeout(() => {
        loadConfig();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!formData.testEmail) {
      setError('Veuillez entrer une adresse email de test');
      return;
    }

    setError('');
    setTestSuccess(null);
    setTesting(true);

    try {
      const res = await api.testUserSmtpConfig(formData.testEmail);

      setTestSuccess(true);
      setSuccessMessage(`Email de test envoyé avec succès à ${formData.testEmail}`);
      
      // Reload config to update verified status
      setTimeout(() => {
        loadConfig();
      }, 1000);
    } catch (err: any) {
      setTestSuccess(false);
      setError(err.message || 'Échec du test SMTP');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="h-8 w-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Configuration SMTP Personnalisée
          </h1>
        </div>
        <p className="text-gray-600">
          Configurez votre propre serveur SMTP pour envoyer des factures et devis à vos clients avec votre identité de marque.
        </p>
      </div>

      {/* Status & Stats Cards */}
      {config && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Statut</p>
                <p className="text-lg font-semibold text-gray-900 flex items-center gap-2 mt-1">
                  {config.isVerified ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-600">Vérifié</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-yellow-600">Non testé</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails envoyés (aujourd'hui)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {config.emailsSentToday} / {config.dailyLimit}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </div>

          {stats && (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total envoyés (30j)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSent}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Taux de succès</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.successRate}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-indigo-600 opacity-20" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Succès</p>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* SMTP Configuration Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-6 w-6 text-indigo-600" />
            Paramètres SMTP
          </h2>
        </div>

        <div className="p-6">
          {/* Presets */}
          {presets && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fournisseur pré-configuré
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.keys(presets).map((presetName) => (
                  <button
                    key={presetName}
                    type="button"
                    onClick={() => handlePresetSelect(presetName as keyof SmtpPresets)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    {presetName.charAt(0).toUpperCase() + presetName.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SMTP Server Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serveur SMTP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port *
                </label>
                <input
                  type="number"
                  required
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Security */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="secure"
                checked={formData.secure}
                onChange={(e) => setFormData(prev => ({ ...prev, secure: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="secure" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                Utiliser SSL (port 465) - Sinon TLS (port 587)
              </label>
            </div>

            {/* Authentication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'utilisateur SMTP *
                </label>
                <input
                  type="email"
                  required
                  value={formData.user}
                  onChange={(e) => setFormData(prev => ({ ...prev, user: e.target.value }))}
                  placeholder="votre-email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe SMTP *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!config} // Only required for new configs
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={config ? '(inchangé si vide)' : 'Mot de passe'}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Chiffré en AES-256 dans la base de données
                </p>
              </div>
            </div>

            {/* Sender Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email expéditeur *
                </label>
                <input
                  type="email"
                  required
                  value={formData.fromEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
                  placeholder="contact@votre-entreprise.ch"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom expéditeur *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fromName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromName: e.target.value }))}
                  placeholder="Votre Entreprise - Facturation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de réponse (optionnel)
              </label>
              <input
                type="email"
                value={formData.replyTo}
                onChange={(e) => setFormData(prev => ({ ...prev, replyTo: e.target.value }))}
                placeholder="support@votre-entreprise.ch"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Preferences */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Préférences d'envoi</h3>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includeFooter"
                  checked={formData.includeFooter}
                  onChange={(e) => setFormData(prev => ({ ...prev, includeFooter: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="includeFooter" className="text-sm text-gray-700">
                  Inclure le pied de page de conformité suisse (ORQR)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableAutoSend"
                  checked={formData.enableAutoSend}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableAutoSend: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="enableAutoSend" className="text-sm text-gray-700">
                  Envoyer automatiquement les factures après génération
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sendCopyToSender"
                  checked={formData.sendCopyToSender}
                  onChange={(e) => setFormData(prev => ({ ...prev, sendCopyToSender: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="sendCopyToSender" className="text-sm text-gray-700">
                  Envoyer une copie des emails à l'expéditeur (BCC)
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Enregistrer la configuration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Test Section */}
      {config && (
        <div className="mt-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-600" />
            Tester la configuration
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Envoyez un email de test pour vérifier que votre configuration fonctionne correctement.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={formData.testEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, testEmail: e.target.value }))}
              placeholder="email-de-test@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleTest}
              disabled={testing || !formData.testEmail}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Test en cours...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Envoyer un test
                </>
              )}
            </button>
          </div>
          {testSuccess !== null && (
            <div className={`mt-3 p-3 rounded-lg ${testSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {testSuccess ? (
                <span className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Test réussi ! Vérifiez votre boîte de réception.
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4" />
                  Échec du test. Vérifiez vos paramètres.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Aide & Configuration
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>Gmail:</strong> Utilisez un mot de passe d'application (pas votre mot de passe Gmail). Activez la validation en 2 étapes d'abord.</p>
          <p><strong>Outlook/Office 365:</strong> Utilisez votre adresse email complète comme nom d'utilisateur.</p>
          <p><strong>SendGrid:</strong> Utilisez 'apikey' comme nom d'utilisateur et votre clé API comme mot de passe.</p>
          <p><strong>Sécurité:</strong> Tous les mots de passe sont chiffrés avec AES-256-CBC avant d'être stockés.</p>
        </div>
      </div>
    </div>
  );
}
