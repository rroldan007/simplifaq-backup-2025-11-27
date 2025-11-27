import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useEmail } from '../../hooks/useEmail';
import { api } from '../../services/api';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  clientEmail?: string;
  onEmailSent?: () => void;
  isQuote?: boolean;
}

export function SendEmailModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  clientEmail = '',
  onEmailSent,
  isQuote = false,
}: SendEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(clientEmail);
  const [senderEmail, setSenderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { sendInvoiceEmail, loading: emailLoading, error: emailError } = useEmail();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecipientEmail(clientEmail || '');
      setSenderEmail('');
      setMessage('');
      setShowAdvanced(false);
      setLocalError(null);
    }
  }, [isOpen, clientEmail]);

  const loading = emailLoading || localLoading;
  const error = emailError || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail.trim()) {
      setLocalError('Veuillez saisir une adresse email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      setLocalError('Format d\'email invalide');
      return;
    }

    let result: { success: boolean };

    if (isQuote) {
      // Use quotes API endpoint
      try {
        setLocalLoading(true);
        setLocalError(null);
        
        const response = await api.post<{
          messageId: string;
          sentTo: string;
          sentAt: string;
        }>(`/quotes/${invoiceId}/send-via-smtp`, {
          recipientEmail: recipientEmail.trim(),
          senderEmail: senderEmail.trim() || undefined,
          message: message.trim() || undefined,
        });

        if (response.data.success) {
          result = { success: true };
        } else {
          throw new Error(response.data.error?.message || 'Erreur lors de l\'envoi de l\'email');
        }
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error?.message || err?.message || 'Erreur lors de l\'envoi de l\'email';
        setLocalError(errorMessage);
        result = { success: false };
      } finally {
        setLocalLoading(false);
      }
    } else {
      // Use invoices API endpoint
      result = await sendInvoiceEmail(invoiceId, {
        recipientEmail: recipientEmail.trim(),
        senderEmail: senderEmail.trim() || undefined,
        message: message.trim() || undefined,
      });
    }

    if (result.success) {
      // Call onEmailSent first (it has the delay)
      onEmailSent?.();
      
      // Close modal
      onClose();
      
      // Reset form
      setRecipientEmail(clientEmail);
      setSenderEmail('');
      setMessage('');
      setShowAdvanced(false);
      setLocalError(null);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset form
      setRecipientEmail(clientEmail);
      setSenderEmail('');
      setMessage('');
      setShowAdvanced(false);
    }
  };

  const documentType = isQuote ? 'devis' : 'facture';
  const documentTypeCapitalized = isQuote ? 'Devis' : 'Facture';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Envoyer ${isQuote ? 'le devis' : 'la facture'} par email`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice/Quote Info */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h4 className="font-medium text-slate-900 mb-2">{documentTypeCapitalized} à envoyer</h4>
          <p className="text-sm text-slate-600">
            <span className="font-medium">Numéro:</span> {invoiceNumber}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {isQuote 
              ? 'Le devis sera envoyé en PDF.'
              : 'La facture sera envoyée en PDF avec le QR-Bill suisse intégré.'}
          </p>
        </div>

        {/* Recipient Email */}
        <div>
          <label htmlFor="recipientEmail" className="block text-sm font-medium text-slate-700 mb-1">
            Email du destinataire *
          </label>
          <Input
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="client@exemple.com"
            required
            disabled={loading}
          />
        </div>

        {/* Advanced Options Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={loading}
          >
            {showAdvanced ? '▼' : '▶'} Options avancées
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label htmlFor="senderEmail" className="block text-sm font-medium text-slate-700 mb-1">
                Email expéditeur (optionnel)
              </label>
              <Input
                id="senderEmail"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="Laisser vide pour utiliser l'email par défaut"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">
                Si vide, l'email de votre compte sera utilisé
              </p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                Message personnalisé (optionnel)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message personnalisé à ajouter à l'email..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">
                Ce message sera ajouté au template d'email standard
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <span className="text-red-600 text-sm">⚠️</span>
              <div className="ml-2">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <span className="text-blue-600 text-sm">ℹ️</span>
            <div className="ml-2">
              <p className="text-sm text-blue-800">
                L'email sera envoyé avec un template professionnel en français incluant:
              </p>
              <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc">
                <li>Détails {isQuote ? 'du devis' : 'de la facture'}</li>
                {!isQuote && <li>Instructions de paiement</li>}
                <li>PDF {isQuote ? 'du devis' : 'avec QR-Bill suisse'} en pièce jointe</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={!recipientEmail.trim() || loading}
          >
            <span className="mr-2">📧</span>
            {loading ? 'Envoi en cours...' : 'Envoyer l\'email'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}