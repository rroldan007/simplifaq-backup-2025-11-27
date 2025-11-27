/**
 * 🇨🇭 SimpliFaq - Admin Advanced Settings (Real Data Only)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Database, Shield, Settings, ExternalLink, CheckCircle, XCircle } from 'lucide-react';

interface EmailSettings {
  smtpConfig: {
    host: string;
    port: number;
    fromEmail: string;
    isVerified: boolean;
  } | null;
  emailRateLimit: number;
  emailQueueEnabled: boolean;
}

export const AdvancedSettingsPage: React.FC = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/email-settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setEmailSettings(data.data);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const SettingCard = ({ icon: Icon, title, description, linkTo, status }: any) => (
    <Link
      to={linkTo}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
            {status && (
              <div className="flex items-center gap-2 mt-2">
                {status.isConfigured ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {status.message}
                </span>
              </div>
            )}
          </div>
        </div>
        <ExternalLink className="w-5 h-5 text-gray-400" />
      </div>
    </Link>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Paramètres Avancés Système
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configuration globale du système
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Settings */}
        <SettingCard
          icon={Mail}
          title="Configuration SMTP Globale"
          description="Paramètres d'envoi d'emails système (bienvenida, reset password, etc.)"
          linkTo="/admin/smtp-config"
          status={
            !loading && emailSettings?.smtpConfig
              ? {
                  isConfigured: emailSettings.smtpConfig.isVerified,
                  message: emailSettings.smtpConfig.isVerified
                    ? `Configuré: ${emailSettings.smtpConfig.fromEmail}`
                    : 'Configuré mais non vérifié',
                }
              : {
                  isConfigured: false,
                  message: 'Non configuré',
                }
          }
        />

        {/* Backup Settings */}
        <SettingCard
          icon={Database}
          title="Gestionnaire de Sauvegarde"
          description="Créer, restaurer et gérer les sauvegardes de base de données"
          linkTo="/admin/backup-manager"
          status={{
            isConfigured: true,
            message: 'Disponible',
          }}
        />

        {/* Security Settings */}
        <SettingCard
          icon={Shield}
          title="Audit et Sécurité"
          description="Logs d'audit, sessions admin et sécurité du système"
          linkTo="/admin/audit-logs"
          status={{
            isConfigured: true,
            message: 'Actif',
          }}
        />

        {/* System Settings */}
        <SettingCard
          icon={Settings}
          title="Santé Système"
          description="Monitoring, performance et statut des services"
          linkTo="/admin/system-health"
          status={{
            isConfigured: true,
            message: 'Monitoring actif',
          }}
        />
      </div>

      {/* Email Settings Summary */}
      {!loading && emailSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ℹ️ Paramètres Email Actuels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configuration SMTP</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {emailSettings.smtpConfig
                  ? `${emailSettings.smtpConfig.host}:${emailSettings.smtpConfig.port}`
                  : 'Non configuré'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email expéditeur</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {emailSettings.smtpConfig?.fromEmail || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Limite d'envoi</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {emailSettings.emailRateLimit} emails/heure
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">File d'attente</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {emailSettings.emailQueueEnabled ? 'Activée' : 'Désactivée'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          💡 Conseils
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Configurez d'abord SMTP pour que tous les emails système fonctionnent</li>
          <li>• Créez des sauvegardes régulières de la base de données</li>
          <li>• Vérifiez régulièrement les logs d'audit pour la sécurité</li>
          <li>• Surveillez la santé du système pour prévenir les problèmes</li>
        </ul>
      </div>
    </div>
  );
};
