import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { InvoiceStatusSelector } from './InvoiceStatusSelector';
import type { InvoiceStatus } from './InvoiceStatusBadge';
import { ModernInvoicePDFViewer } from './ModernInvoicePDFViewer';

interface ClientInfo {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

interface InvoiceItem {
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  tvaRate?: number | string;
  unit?: string;
}

interface CompanyUserInfo {
  logoUrl?: string;
  companyName?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  quantityDecimals?: 2 | 3 | number | null;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}

interface InvoiceData {
  id?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  status: InvoiceStatus | string;
  currency?: string;
  client?: ClientInfo;
  items?: InvoiceItem[];
  user?: CompanyUserInfo;
  payments?: Payment[];
  globalDiscountValue?: number;
  globalDiscountType?: 'PERCENT' | 'AMOUNT';
  globalDiscountNote?: string;
}

interface EnhancedInvoiceDetailsViewProps {
  invoice: InvoiceData;
  onStatusChange: (status: InvoiceStatus) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDownloadPdf: () => void;
  onSend: () => void;
  onAddPayment: () => void;
  onCancelRecurrence?: () => void;
  onBack?: () => void;
  loading?: {
    status?: boolean;
    duplicate?: boolean;
    delete?: boolean;
    send?: boolean;
    cancelRecurrence?: boolean;
  };
}

export const EnhancedInvoiceDetailsView: React.FC<EnhancedInvoiceDetailsViewProps> = ({
  invoice,
  onStatusChange,
  onEdit,
  onDuplicate,
  onDelete,
  onDownloadPdf,
  onSend,
  onAddPayment,
  // onCancelRecurrence is available for future use via props.onCancelRecurrence if needed
  onBack,
  loading = {}
}) => {

  const formatDate = (date?: string) => {
    return date ? new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium' }).format(new Date(date)) : '—';
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800 ring-slate-200',
      sent: 'bg-blue-50 text-blue-700 ring-blue-200',
      paid: 'bg-green-50 text-green-700 ring-green-200',
      overdue: 'bg-red-50 text-red-700 ring-red-200',
      cancelled: 'bg-gray-50 text-gray-600 ring-gray-200'
    };
    return statusMap[status] || statusMap.draft;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      overdue: 'En retard',
      cancelled: 'Annulée'
    };
    return statusMap[status?.toLowerCase()] || status || 'Brouillon';
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER SECTION */}
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Title & Status */}
          <div className="flex items-start gap-4">
             {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="p-2 hover:bg-white/50 transition-colors rounded-full"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Button>
            )}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Facture {invoice.invoiceNumber || 'Brouillon'}
                </h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusColor(invoice.status)}`}>
                  {getStatusLabel(invoice.status)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Émise le {formatDate(invoice.issueDate)}</span>
                </div>
                {invoice.client && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{invoice.client.companyName || `${invoice.client.firstName} ${invoice.client.lastName}`}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Primary Actions */}
          <div className="flex items-center gap-3">
            <div className="flex bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
              <InvoiceStatusSelector
                currentStatus={(invoice.status || 'draft').toLowerCase() as InvoiceStatus}
                onStatusChange={onStatusChange}
                disabled={loading.status}
              />
            </div>
            <Button
              onClick={onEdit}
              className="bg-white/80 backdrop-blur-sm hover:bg-slate-50 text-slate-700 border border-slate-200/60 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 rounded-xl px-4"
            >
              <span className="mr-2 text-lg">✏️</span> Modifier
            </Button>
            <Button
              variant="primary"
              onClick={onAddPayment}
              className="bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white shadow-lg shadow-slate-900/20 transition-all hover:shadow-slate-900/30 hover:-translate-y-0.5 rounded-xl px-5 border-0"
            >
              <span className="mr-2 text-lg">💰</span> Enregistrer paiement
            </Button>
          </div>
        </div>
      </div>

      {/* INFO CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Payment History Card */}
        <div className="lg:col-span-2">
           <Card className="h-full border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-green-100 rounded-md text-green-600">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
                Historique des paiements
              </h3>
              {invoice.payments && invoice.payments.length > 0 && (
                 <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-700 rounded-full">
                   {invoice.payments.length} paiement(s)
                 </span>
              )}
            </div>
            <div className="p-6">
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="space-y-3">
                  {invoice.payments.map(payment => (
                    <div key={payment.id} className="group flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl hover:border-green-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                          💰
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-lg">
                            {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: invoice.currency || 'CHF' }).format(payment.amount)}
                          </p>
                          <p className="text-xs text-slate-500">Reçu le {new Intl.DateTimeFormat('fr-CH').format(new Date(payment.paymentDate))}</p>
                        </div>
                      </div>
                      {payment.notes && (
                        <span className="text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-lg max-w-xs truncate">
                          {payment.notes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Aucun paiement enregistré</p>
                  <p className="text-slate-400 text-xs mt-1">Les paiements apparaîtront ici une fois enregistrés</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 2. Quick Actions & Recurrence Card */}
        <div className="space-y-6">
          <Card className="border-slate-200/60 shadow-sm p-5 bg-white/80 backdrop-blur-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
              Actions Rapides
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={onSend}
                disabled={loading.send}
                className="w-full justify-start text-sm h-auto py-3 px-4 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 rounded-xl transition-all group"
              >
                <span className="mr-3 text-lg group-hover:scale-110 transition-transform">📤</span> 
                {loading.send ? 'Envoi...' : 'Envoyer'}
              </Button>
              <Button
                variant="secondary"
                onClick={onDuplicate}
                disabled={loading.duplicate}
                className="w-full justify-start text-sm h-auto py-3 px-4 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 rounded-xl transition-all group"
              >
                <span className="mr-3 text-lg group-hover:scale-110 transition-transform">📋</span> 
                {loading.duplicate ? 'Copie...' : 'Dupliquer'}
              </Button>
              <Button
                variant="secondary"
                onClick={onEdit} // Assuming managing recurrence is editing for now
                className="w-full justify-start text-sm h-auto py-3 px-4 col-span-2 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-700 rounded-xl transition-all group"
              >
                <span className="mr-3 text-lg group-hover:scale-110 transition-transform">⚙️</span> 
                Gérer la récurrence
              </Button>
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={loading.delete}
                className="w-full justify-start text-sm h-auto py-3 px-4 col-span-2 bg-red-50/50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 hover:text-red-700 rounded-xl transition-all group"
              >
                <span className="mr-3 text-lg group-hover:scale-110 transition-transform">🗑️</span> 
                {loading.delete ? 'Suppression...' : 'Supprimer la facture'}
              </Button>
            </div>
          </Card>

           {/* Recurrence Status (if active) */}
           {(() => {
              type RecurrenceInvoice = { statutRecurrence?: string; estRecurrente?: boolean; frequence?: string; prochaineDateRecurrence?: string; dateFinRecurrence?: string };
              const inv = (invoice || {}) as RecurrenceInvoice;
              const status: string | undefined = inv.statutRecurrence || (inv.estRecurrente ? 'actif' : undefined);
              const isActive = status === 'actif';
              
              if (isActive) {
                 const freqLabel = inv.frequence === 'MENSUEL' ? 'Mensuelle' : inv.frequence === 'TRIMESTRIEL' ? 'Trimestrielle' : 'Annuelle';
                 return (
                   <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-indigo-900">Récurrence Active</h4>
                        <p className="text-xs text-indigo-700 mt-1">Fréquence: {freqLabel}</p>
                        {inv.prochaineDateRecurrence && (
                          <p className="text-xs text-indigo-600 mt-1">Prochaine: {formatDate(inv.prochaineDateRecurrence)}</p>
                        )}
                      </div>
                   </div>
                 );
              }
              return null;
           })()}
        </div>
      </div>

      {/* NEW MODERN PDF VIEWER COMPONENT */}
      {invoice.id && (
        <div className="animate-fade-in-up">
          <ModernInvoicePDFViewer 
            invoiceId={invoice.id} 
            onDownloadPdf={onDownloadPdf}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedInvoiceDetailsView;
