import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, MapPin, FileText, CheckCircle, Clock, AlertCircle, XCircle, DollarSign } from 'lucide-react';
import { api } from '../../services/api';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  notes?: string;
  isActive?: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  total?: number;
  currency: string;
  paymentStatus?: string;
}

interface ClientDetailModalProps {
  clientId: string;
  onClose: () => void;
}

const getStatusBadge = (status: string, paymentStatus?: string) => {
  const statusLower = status.toLowerCase();
  const paymentLower = paymentStatus?.toLowerCase();
  
  if (paymentLower === 'paid' || statusLower === 'paid') {
    return {
      label: 'Payée',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-200'
    };
  }
  
  if (statusLower === 'overdue') {
    return {
      label: 'En retard',
      icon: AlertCircle,
      className: 'bg-red-100 text-red-800 border-red-200'
    };
  }
  
  if (statusLower === 'sent') {
    return {
      label: 'Envoyée',
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    };
  }
  
  if (statusLower === 'draft') {
    return {
      label: 'Brouillon',
      icon: FileText,
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    };
  }
  
  if (statusLower === 'cancelled') {
    return {
      label: 'Annulée',
      icon: XCircle,
      className: 'bg-gray-100 text-gray-600 border-gray-200'
    };
  }
  
  return {
    label: status,
    icon: FileText,
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  };
};

const formatCurrency = (amount: number, currency: string = 'CHF') => {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export function ClientDetailModal({ clientId, onClose }: ClientDetailModalProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load client details
        const clientData = await api.getClient(clientId);
        setClient(clientData);

        // Load client invoices using clientId filter
        const invoicesResponse = await api.getInvoices({ 
          clientId: clientId,
          limit: 100 
        });
        
        // Normalize response
        const invoices = invoicesResponse?.invoices || [];        
        setInvoices(invoices as Invoice[]);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
        console.error('Error loading client data:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadClientData();
  }, [clientId]);

  const clientName = client?.companyName || 
    `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 
    'Client';

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || inv.total || 0), 0);
  const paidInvoices = invoices.filter(inv => 
    inv.status?.toLowerCase() === 'paid' || inv.paymentStatus?.toLowerCase() === 'paid'
  );
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amount || inv.total || 0), 0);
  const totalPending = totalInvoiced - totalPaid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {clientName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{clientName}</h2>
              {client?.vatNumber && (
                <p className="text-sm text-gray-500">TVA: {client.vatNumber}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && client && (
            <div className="space-y-6">
              {/* Client Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations du client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{client.phone}</span>
                    </div>
                  )}
                  {(client.street || client.city) && (
                    <div className="flex items-start gap-2 text-sm md:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600">
                        {client.street && <div>{client.street}</div>}
                        {(client.postalCode || client.city) && (
                          <div>{client.postalCode} {client.city}</div>
                        )}
                        {client.country && <div>{client.country}</div>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Total facturé</span>
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(totalInvoiced)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">{invoices.length} facture(s)</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Payé</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(totalPaid)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">{paidInvoices.length} facture(s)</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-900">En attente</span>
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(totalPending)}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    {invoices.length - paidInvoices.length} facture(s)
                  </p>
                </div>
              </div>

              {/* Invoices List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Factures ({invoices.length})
                </h3>
                
                {invoices.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Aucune facture pour ce client</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((invoice) => {
                      const statusInfo = getStatusBadge(invoice.status, invoice.paymentStatus);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {invoice.invoiceNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span>Émise: {formatDate(invoice.issueDate)}</span>
                                <span>Échéance: {formatDate(invoice.dueDate)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {formatCurrency(invoice.amount || invoice.total || 0, invoice.currency)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              {client.notes && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-2">Notes</h4>
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
