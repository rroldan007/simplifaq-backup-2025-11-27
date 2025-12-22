import React, { useState, useEffect } from 'react';
import { Mail, Server, Send, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminApi } from '../../services/adminApi';
import { adminConfigService, type SmtpConfig } from '../../services/adminConfigService';

interface SmtpStats {
  totalSent: number;
  totalFailed: number;
  totalQueued: number;
  totalDelivered: number;
  successRate: number;
}

export const SmtpConfigPage: React.FC = () => {
  const { isAuthenticated, hasPermission } = useAdminAuth();
  const [config, setConfig] = useState<SmtpConfig>({
    ...adminConfigService.getSmtpConfig().defaultConfig,
    password: '',
    replyTo: '',
    provider: 'smtp',
  });

  const [stats, setStats] = useState<SmtpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Common SMTP providers presets from centralized config
  const providers = adminConfigService.getSmtpConfig().providers;

  useEffect(() => {
    loadConfig();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = async () => {
    try {
      if (!isAuthenticated || !hasPermission('smtp', 'read')) {
        setMessage({ type: 'error', text: 'Permissions insuffisantes' });
        return;
      }

      const response = await adminApi.getSmtpConfig();
      
      if (response.success && response.data?.config) {
        setConfig(response.data.config);
      }
    } catch (error) {
      console.error('Error loading SMTP config:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement de la configuration' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (!isAuthenticated || !hasPermission('smtp', 'read')) {
        return;
      }

      const response = await adminApi.getSmtpStats();
      
      if (response.success && response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !hasPermission('smtp', 'write')) {
      setMessage({ type: 'error', text: 'Permissions insuffisantes' });
      return;
    }

    // Validate config using centralized service
    const validation = adminConfigService.validateSmtpConfig(config);
    if (!validation.isValid) {
      setMessage({ type: 'error', text: validation.errors.join(', ') });
      return;
    }

    setSaving(true);
    try {
      const response = await adminApi.updateSmtpConfig(config);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Configuration SMTP enregistrée avec succès' });
        await loadConfig();
      } else {
        setMessage({ type: 'error', text: response.error?.message || 'Erreur lors de l\'enregistrement' });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!isAuthenticated || !hasPermission('smtp', 'test')) {
      setMessage({ type: 'error', text: 'Permissions insuffisantes' });
      return;
    }

    if (!testEmail) {
      setMessage({ type: 'error', text: 'Veuillez entrer une adresse email de test' });
      return;
    }

    setTesting(true);
    try {
      const response = await adminApi.testSmtpConfig(testEmail);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Email de test envoyé avec succès' });
        await loadStats(); // Refresh stats
      } else {
        setMessage({ type: 'error', text: response.error?.message || 'Erreur lors de l\'envoi' });
      }
    } catch (error) {
      console.error('Error testing config:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'envoi' });
    } finally {
      setTesting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const applyPreset = (presetKey: string) => {
    const preset = providers[presetKey];
    if (preset) {
      setConfig({
        ...config,
        host: preset.host || '',
        port: preset.port || 587,
        secure: preset.secure || false,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Configuration SMTP Globale
        </h1>
        <p className="mt-2 text-gray-600">
          Configurez le serveur SMTP pour tous les emails transactionnels du système
        </p>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-600">Emails Envoyés</div>
            <div className="text-2xl font-bold text-green-600">{stats.totalSent}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-600">Échecs</div>
            <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-600">En Attente</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.totalQueued}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm text-gray-600">Taux de Succès</div>
            <div className="text-2xl font-bold text-indigo-600">{stats.successRate}%</div>
          </div>
        </div>
      )}

      {/* Config Status */}
      {config.isActive && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <div className="font-medium text-blue-900">Configuration Active</div>
            <div className="text-sm text-blue-700">
              {config.isVerified ? '✅ Vérifiée' : '⚠️ Non vérifiée'} • 
              Dernière test: {config.lastTestedAt ? new Date(config.lastTestedAt).toLocaleString('fr-CH') : 'Jamais'}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Quick Presets */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Fournisseurs Courants</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(providers).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key as keyof typeof providers)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition text-sm"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Form */}
        <div className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">Paramètres du Serveur SMTP</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serveur SMTP *
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="smtp.example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisateur SMTP *
              </label>
              <input
                type="text"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de Passe *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.password || ''}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.secure}
                onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">
                SSL/TLS (Port 465)
              </span>
            </label>
            <span className="text-sm text-gray-500">
              {config.secure ? '🔒 Connexion sécurisée (SSL)' : '🔓 STARTTLS (Port 587)'}
            </span>
          </div>

          <hr />

          <h2 className="text-lg font-semibold">Informations de l'Expéditeur</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Expéditeur *
              </label>
              <input
                type="email"
                value={config.fromEmail}
                onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                placeholder="noreply@simplifaq.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'Expéditeur *
              </label>
              <input
                type="text"
                value={config.fromName}
                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                placeholder="SimpliFaq"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reply-To (Optionnel)
              </label>
              <input
                type="email"
                value={config.replyTo || ''}
                onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
                placeholder="support@simplifaq.com"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <hr />

          <h2 className="text-lg font-semibold">Options Avancées</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.includeUnsubscribe}
                onChange={(e) => setConfig({ ...config, includeUnsubscribe: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">
                Inclure lien de désabonnement (GDPR)
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.trackOpens}
                onChange={(e) => setConfig({ ...config, trackOpens: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">
                Suivre les ouvertures d'emails
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.trackClicks}
                onChange={(e) => setConfig({ ...config, trackClicks: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">
                Suivre les clics dans les emails
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tentatives de Réessai
              </label>
              <input
                type="number"
                value={config.maxRetries}
                onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) })}
                min="0"
                max="10"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Délai entre Réessais (secondes)
              </label>
              <input
                type="number"
                value={config.retryDelay}
                onChange={(e) => setConfig({ ...config, retryDelay: parseInt(e.target.value) })}
                min="0"
                max="3600"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="p-6 border-t bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Tester la Configuration</h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="votre-email@example.com"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleTest}
              disabled={testing || !testEmail}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Test...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer Email Test
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Un email de test sera envoyé pour vérifier la configuration
          </p>
        </div>

        {/* Actions */}
        <div className="p-6 border-t flex justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Server className="h-4 w-4" />
                Enregistrer la Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Conseils de Configuration</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Gmail :</strong> Utilisez un mot de passe d'application (compte Google → Sécurité → Mots de passe d'application)</li>
          <li>• <strong>Port 587 :</strong> STARTTLS (recommandé), <strong>Port 465 :</strong> SSL/TLS direct</li>
          <li>• <strong>SendGrid/Mailgun :</strong> Meilleure délivrabilité pour volumes élevés</li>
          <li>• <strong>Sécurité :</strong> Les mots de passe sont chiffrés en AES-256 dans la base de données</li>
          <li>• <strong>Conformité GDPR :</strong> Activez le lien de désabonnement pour respecter la réglementation</li>
        </ul>
      </div>
    </div>
  );
};

export default SmtpConfigPage;
