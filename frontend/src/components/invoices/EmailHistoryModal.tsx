import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useEmail, type EmailHistory } from '../../hooks/useEmail';

interface EmailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
}

export function EmailHistoryModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
}: EmailHistoryModalProps) {
  const [historyData, setHistoryData] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    currentStatus: string;
    emailHistory: EmailHistory[];
  } | null>(null);

  const { getEmailHistory, loading, error } = useEmail();

  const loadEmailHistory = useCallback(async () => {
    const data = await getEmailHistory(invoiceId);
    if (data) {
      setHistoryData(data);
    }
  }, [getEmailHistory, invoiceId]);

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadEmailHistory();
    }
  }, [isOpen, invoiceId, loadEmailHistory]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Envoyé';
      case 'failed':
        return 'Échec';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email_sent':
        return 'Email envoyé';
      case 'invoice_sent':
        return 'Facture envoyée';
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email_sent':
        return '📧';
      case 'invoice_sent':
        return '📄';
      default:
        return '📋';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Historique des emails">
      <div className="space-y-6">
        {/* Invoice Info */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h4 className="font-medium text-slate-900 mb-2">Facture {invoiceNumber}</h4>
          {historyData && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Statut actuel:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                historyData.currentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                historyData.currentStatus === 'sent' ? 'bg-blue-100 text-blue-800' :
                historyData.currentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {historyData.currentStatus === 'paid' ? 'Payée' :
                 historyData.currentStatus === 'sent' ? 'Envoyée' :
                 historyData.currentStatus === 'overdue' ? 'En retard' :
                 historyData.currentStatus === 'draft' ? 'Brouillon' :
                 historyData.currentStatus}
              </span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <span className="text-red-600">⚠️</span>
              <div className="ml-2">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Email History */}
        {historyData && !loading && (
          <div>
            <h4 className="font-medium text-slate-900 mb-4">
              Historique des envois ({historyData.emailHistory.length})
            </h4>

            {historyData.emailHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="text-4xl mb-4 block">📭</span>
                <p>Aucun email envoyé pour cette facture</p>
                <p className="text-sm mt-2">
                  Les emails envoyés apparaîtront ici avec leur statut et date d'envoi
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData.emailHistory.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm">{getTypeIcon(entry.type)}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">
                          {getTypeLabel(entry.type)}
                        </p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(entry.status)}`}>
                          {getStatusLabel(entry.status)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 mt-1">
                        Envoyé à: <span className="font-medium">{entry.recipient}</span>
                      </p>
                      
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}