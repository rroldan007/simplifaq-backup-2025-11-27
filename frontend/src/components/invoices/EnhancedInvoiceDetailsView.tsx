import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { InvoiceStatusSelector } from './InvoiceStatusSelector';
import type { InvoiceStatus } from './InvoiceStatusBadge';
import { getLogoUrl } from '../../utils/assets';
import { useAuth } from '../../hooks/useAuth';
import { ElegantClassic } from './templates/ElegantClassic';
import { MinimalModern } from './templates/MinimalModern';
import { FormalPro } from './templates/FormalPro';
import { CreativePremium } from './templates/CreativePremium';
import { CleanCreative } from './templates/CleanCreative';
import { BoldStatement } from './templates/BoldStatement';
import type { InvoicePreviewData } from './templates/ElegantClassic';

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
  onCancelRecurrence,
  onBack,
  loading = {}
}) => {
  const { user } = useAuth(); // Get authenticated user data

  // Resolve template and accent color from authenticated user (fallback to invoice.user)
  const companyUser = (user || invoice.user) as CompanyUserInfo | undefined;
  const selectedTemplate = (companyUser as any)?.pdfTemplate || 'elegant_classic';
  const accentColor = (companyUser as any)?.pdfPrimaryColor || '#4F46E5';
  const showHeader = (companyUser as any)?.pdfShowCompanyNameWithLogo !== false;

  const formatDate = (date?: string) => {
    return date ? new Intl.DateTimeFormat('fr-CH').format(new Date(date)) : '—';
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-slate-100 text-slate-800'
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

  // Build preview data for advanced templates
  const buildPreviewData = (): InvoicePreviewData => {
    const client: ClientInfo = invoice.client || {};
    const companyUser: CompanyUserInfo | undefined = (user as CompanyUserInfo) || undefined;
    const items: InvoiceItem[] = invoice.items || [];
    // Resolve quantity decimals from invoice.user first, then authenticated user; default to 2
    const invUser: CompanyUserInfo | undefined = invoice.user;
    const resolvedQtyDecimals = (invUser?.quantityDecimals ?? companyUser?.quantityDecimals) === 3 ? 3 : 2;
    const quantityDecimals: 2 | 3 = (resolvedQtyDecimals === 3 ? 3 : 2);

    const subtotal = items.reduce((sum: number, item: InvoiceItem) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);

    // Apply global discount
    const globalDiscountValue = Number(invoice.globalDiscountValue) || 0;
    const globalDiscountType = invoice.globalDiscountType || 'PERCENT';
    let discountAmount = 0;
    if (globalDiscountValue > 0) {
      if (globalDiscountType === 'PERCENT') {
        discountAmount = subtotal * (globalDiscountValue / 100);
      } else {
        discountAmount = Math.min(globalDiscountValue, subtotal);
      }
    }
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calculate TVA on discounted subtotal
    const totalTVA = items.reduce((sum: number, item: InvoiceItem) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const tvaRate = Number(item.tvaRate) || 0;
      const itemSubtotal = qty * price;
      const itemProportion = subtotal > 0 ? itemSubtotal / subtotal : 0;
      const itemDiscountedSubtotal = itemSubtotal - (discountAmount * itemProportion);
      return sum + (itemDiscountedSubtotal * tvaRate) / 100;
    }, 0);

    const total = subtotalAfterDiscount + totalTVA;

    return {
      logoUrl: getLogoUrl(companyUser?.logoUrl) || undefined,
      companyName: companyUser?.companyName || 'Votre Entreprise',
      companyAddress: [
        companyUser?.street,
        [companyUser?.postalCode, companyUser?.city].filter(Boolean).join(' '),
        companyUser?.country,
      ]
        .filter((l) => !!l && String(l).trim().length > 0)
        .join('\n'),
      clientName: client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client',
      clientAddress: [
        client.street,
        [client.postalCode, client.city].filter(Boolean).join(' '),
        client.country,
      ]
        .filter((l) => !!l && String(l).trim().length > 0)
        .join('\n'),
      invoiceNumber: invoice.invoiceNumber || invoice.id || 'N/A',
      issueDate: invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('fr-CH') : '—',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-CH') : '—',
      items: items.map((item: InvoiceItem) => ({
        description: item.description || '—',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        unit: item.unit,
      })),
      currency: invoice.currency || 'CHF',
      subtotal,
      discount: discountAmount > 0 ? {
        value: globalDiscountValue,
        type: globalDiscountType,
        amount: discountAmount,
        note: invoice.globalDiscountNote
      } : undefined,
      tax: totalTVA,
      total,
      quantityDecimals,
    };
  };

  // Render the appropriate template
  const renderTemplate = () => {
    const previewData = buildPreviewData();
    
    switch (selectedTemplate) {
      case 'minimal_modern':
      case 'european_minimal':
        return <MinimalModern data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'formal_pro':
      case 'swiss_blue':
        return <FormalPro data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'creative_premium':
      case 'german_formal':
        return <CreativePremium data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'clean_creative':
        return <CleanCreative data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'bold_statement':
        return <BoldStatement data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'elegant_classic':
      case 'swiss_classic':
      default:
        return <ElegantClassic data={previewData} accentColor={accentColor} showHeader={showHeader} />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="p-2"
              >
                ← Retour
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Facture #{invoice.invoiceNumber}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {getStatusLabel(invoice.status)}
                </span>
                <span className="text-sm text-slate-500">
                  • {formatDate(invoice.issueDate)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={onEdit}
            >
              ✏️ Modifier
            </Button>
            <Button
              variant="secondary"
              onClick={onDownloadPdf}
            >
              📄 Télécharger PDF
            </Button>
            <Button
              variant="primary"
              onClick={onAddPayment}
            >
              💰 Enregistrer un paiement
            </Button>
          </div>
        </div>

        {/* Recurrence summary (only when active or terminated) */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          {(() => {
            const inv: any = invoice || {};
            const status: string | undefined = inv.statutRecurrence || (inv.estRecurrente ? 'actif' : undefined);
            const isActive = status === 'actif';
            const isTerminated = status === 'termine';
            if (!isActive && !isTerminated) return null;
            const badgeClass = isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800';
            const freq: string | undefined = inv.frequence;
            const freqLabel = freq === 'MENSUEL' ? 'Mensuelle' : freq === 'TRIMESTRIEL' ? 'Trimestrielle' : freq === 'SEMESTRIEL' ? 'Semestrielle' : undefined;
            const next: string | undefined = inv.prochaineDateRecurrence;
            const end: string | undefined = inv.dateFinRecurrence;
            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                    <span className="mr-1">🔁</span>
                    {isActive ? 'Récurrente (active)' : 'Récurrence terminée'}
                  </span>
                  {freqLabel && isActive && (
                    <span className="text-xs text-slate-600">• Fréquence: {freqLabel}</span>
                  )}
                </div>
                {(next || end) && (
                  <div className="text-xs text-slate-600">
                    {next && (
                      <span>Prochaine récurrence: {formatDate(next)}</span>
                    )}
                    {next && end && <span> · </span>}
                    {end && (
                      <span>Jusqu'au: {formatDate(end)}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Historique des paiements</h3>
          {invoice.payments && invoice.payments.length > 0 ? (
            <ul className="space-y-4">
              {invoice.payments.map(payment => (
                <li key={payment.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-800">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: invoice.currency || 'CHF' }).format(payment.amount)}</p>
                    <p className="text-sm text-slate-500">{new Intl.DateTimeFormat('fr-CH').format(new Date(payment.paymentDate))}</p>
                    {payment.notes && <p className="text-xs text-slate-400 mt-1">{payment.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">Aucun paiement enregistré pour cette facture.</p>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-medium text-slate-700">
              Changer le statut :
            </label>
            <InvoiceStatusSelector
              currentStatus={(invoice.status || 'draft').toLowerCase() as InvoiceStatus}
              onStatusChange={onStatusChange}
              disabled={loading.status}
            />
          </div>
        </div>
      </Card>

      <Card className="p-8 bg-white">
        <div className="max-w-4xl mx-auto">
          {renderTemplate()}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="secondary"
            onClick={onSend}
            disabled={loading.send}
            className="w-full"
          >
            {loading.send ? '📤 Envoi...' : '📤 Envoyer par email'}
          </Button>
          <Button
            variant="secondary"
            onClick={onDuplicate}
            disabled={loading.duplicate}
            className="w-full"
          >
            {loading.duplicate ? '📋 Duplication...' : '📋 Dupliquer'}
          </Button>
          {onCancelRecurrence && (
            <Button
              variant="secondary"
              onClick={onCancelRecurrence}
              disabled={loading.cancelRecurrence}
              className="w-full"
            >
              {loading.cancelRecurrence ? '⏹️ Annulation...' : '⏹️ Annuler récurrence'}
            </Button>
          )}
          {!onCancelRecurrence && (
            <Button
              variant="secondary"
              onClick={onEdit}
              className="w-full"
              title="Configurer ou activer la récurrence"
            >
              ⚙️ Gérer récurrence
            </Button>
          )}
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={loading.delete}
            className="w-full"
          >
            {loading.delete ? '🗑️ Suppression...' : '🗑️ Supprimer'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedInvoiceDetailsView;