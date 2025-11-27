import React, { useState, useEffect } from 'react';
import { X, Mail, FileText, User, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../services/api';

interface SendInvoiceEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  clientEmail?: string;
  clientName?: string;
  onSuccess: () => void;
}

interface EmailPreview {
  subject: string;
  body: string;
  recipientEmail: string;
  attachmentName: string;
}

export const SendInvoiceEmailModal: React.FC<SendInvoiceEmailModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  clientEmail,
  clientName,
  onSuccess,
}) => {
  const [email, setEmail] = useState(clientEmail || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadPreview();
    }
    // TODO: REVISAR DEPENDENCIAS - Falta: loadPreview (necesita useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoiceId]);

  const loadPreview = async () => {
    try {
      setLoadingPreview(true);
      setError('');
      const previewData = await api.previewInvoiceEmail(invoiceId);
      setPreview(previewData);
      setEmail(previewData.recipientEmail || clientEmail || '');
      setSubject(previewData.subject || '');
      setBody(previewData.body || '');
    } catch (err: any) {
      console.error('Error loading email preview:', err);
      setError(err?.message || 'Erreur lors du chargement de l\'aperçu');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async () => {
    if (!email) {
      setError('Veuillez entrer une adresse email');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await api.sendInvoiceEmail(invoiceId, {
        recipientEmail: email,
        customSubject: subject,
        customBody: body,
      });

      setSent(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error sending invoice email:', err);
      let errorMessage = err?.message || 'Erreur lors de l\'envoi de l\'email';
      
      // Enhanced error messages for common issues
      if (errorMessage.includes('400') || errorMessage.includes('EMAIL_SEND_FAILED')) {
        errorMessage = '⚠️ Configuration SMTP manquante ou incorrecte. Veuillez configurer votre serveur SMTP dans les paramètres pour envoyer des emails.';
      } else if (errorMessage.includes('EAUTH') || errorMessage.includes('Invalid login')) {
        errorMessage = '🔐 Identifiants SMTP invalides. Vérifiez votre nom d\'utilisateur et mot de passe SMTP dans les paramètres.';
      } else if (errorMessage.includes('ECONNECTION') || errorMessage.includes('ETIMEDOUT')) {
        errorMessage = '🌐 Impossible de se connecter au serveur SMTP. Vérifiez votre connexion internet et les paramètres SMTP.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setSubject('');
      setBody('');
      setError('');
      setSent(false);
      setPreview(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {sent ? 'Email envoyé !' : 'Envoyer la facture par email'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Email envoyé avec succès !
              </h3>
              <p className="text-gray-600 text-center">
                La facture <span className="font-medium">{invoiceNumber}</span> a été envoyée à{' '}
                <span className="font-medium">{email}</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                avec le PDF en pièce jointe
              </p>
            </div>
          ) : loadingPreview ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client Info */}
              <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{clientName || 'Client'}</h3>
                  <p className="text-sm text-gray-600">
                    Facture: <span className="font-medium">{invoiceNumber}</span>
                  </p>
                </div>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destinataire *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Sujet de l'email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Body Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Message personnalisé"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={loading}
                />
              </div>

              {/* Attachment Info */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {preview?.attachmentName || `Facture_${invoiceNumber}.pdf`}
                  </p>
                  <p className="text-xs text-gray-500">PDF en pièce jointe</p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!sent && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Envoi immédiat</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleClose}
                variant="secondary"
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSend}
                variant="primary"
                disabled={loading || loadingPreview || !email}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
