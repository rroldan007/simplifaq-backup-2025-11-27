import React from 'react';
import { Card } from '../ui/Card';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import type { InvoiceStatus } from './InvoiceStatusBadge';
import { Eye, Pencil, Send, Mail, FileText, Copy, Trash2 } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  issueDate: string;
  dueDate: string;
  currency: string;
  qrBillGenerated?: boolean;
  sentAt?: string;
  paidAt?: string;
  // Recurrence (optional)
  estRecurrente?: boolean;
  statutRecurrence?: 'actif' | 'inactif' | 'termine' | string;
  frequence?: 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | string;
  prochaineDateRecurrence?: string;
  dateFinRecurrence?: string;
}

interface InvoiceCardProps {
  invoice: Invoice;
  onView?: (invoiceId: string) => void;
  onEdit?: (invoiceId: string) => void;
  onDelete?: (invoiceId: string) => void;
  onSend?: (invoiceId: string) => void;
  onDuplicate?: (invoiceId: string) => void;
  onDownloadPdf?: (invoiceId: string) => void;
  onSendEmail?: (invoiceId: string) => void;
  onViewEmailHistory?: (invoiceId: string) => void;
}

export function InvoiceCard({
  invoice,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDuplicate,
  onDownloadPdf,
  onSendEmail,
  onViewEmailHistory
}: InvoiceCardProps) {
  const formatCurrency = (amount: number, currency = 'CHF') => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const getDaysUntilDue = () => {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();

  const getAvailableActions = () => {
    const actions = [];

    if (onView) {
      actions.push({
        label: 'Voir',
        onClick: () => onView(invoice.id),
        icon: <Eye className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (invoice.status === 'draft' && onEdit) {
      actions.push({
        label: 'Modifier',
        onClick: () => onEdit(invoice.id),
        icon: <Pencil className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (invoice.status === 'draft' && onSend) {
      actions.push({
        label: 'Envoyer',
        onClick: () => onSend(invoice.id),
        icon: <Send className="w-4 h-4" />,
        variant: 'primary' as const
      });
    }

    if (onSendEmail && invoice.status !== 'cancelled') {
      actions.push({
        label: 'Email',
        onClick: () => onSendEmail(invoice.id),
        icon: <Mail className="w-4 h-4" />,
        variant: 'primary' as const
      });
    }

    if (onDownloadPdf) {
      actions.push({
        label: 'PDF',
        onClick: () => onDownloadPdf(invoice.id),
        icon: <FileText className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (onViewEmailHistory && invoice.status !== 'draft') {
      actions.push({
        label: 'Historique',
        onClick: () => onViewEmailHistory(invoice.id),
        icon: <Copy className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (onDuplicate) {
      actions.push({
        label: 'Dupliquer',
        onClick: () => onDuplicate(invoice.id),
        icon: <Copy className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (invoice.status === 'draft' && onDelete) {
      actions.push({
        label: 'Supprimer',
        onClick: () => onDelete(invoice.id),
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'error' as const
      });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-3 sm:p-4">
        {/* Header - Número de factura y estado */}
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-medium text-[var(--color-text-primary)] truncate">
                #{invoice.invoiceNumber}
              </h3>
              {(() => {
                const status = invoice.statutRecurrence || (invoice.estRecurrente ? 'actif' : undefined);
                const isActive = status === 'actif';
                const isTerminated = status === 'termine';
                if (!isActive && !isTerminated) return null;
                const badgeClass = isActive
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200';
                const freqShort = invoice.frequence === 'MENSUEL' ? 'Mens.' : invoice.frequence === 'TRIMESTRIEL' ? 'Trim.' : invoice.frequence === 'SEMESTRIEL' ? 'Sem.' : undefined;
                return (
                  <span
                    title={isActive ? 'Facture récurrente (active)' : 'Récurrence terminée'}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${badgeClass}`}
                  >
                    <span className="mr-1">🔁</span>
                    {isActive ? 'Récurrente' : 'Récurrence terminée'}
                    {isActive && freqShort ? ` · ${freqShort}` : ''}
                  </span>
                );
              })()}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] truncate mt-0.5">
              {invoice.clientName}
            </p>
            {(invoice.prochaineDateRecurrence && ((invoice.statutRecurrence === 'actif') || (invoice.statutRecurrence === 'termine') || invoice.estRecurrente)) && (
              <p className="mt-1 text-[10px] sm:text-xs text-[var(--color-text-tertiary)]">
                Prochaine récurrence: {formatDate(invoice.prochaineDateRecurrence)}
                {invoice.dateFinRecurrence ? ` · jusqu'au ${formatDate(invoice.dateFinRecurrence)}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge 
              status={invoice.status as InvoiceStatus} 
              size="sm"
            />
            {invoice.paymentStatus === 'PAID' && <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Payée</span>}
            {invoice.paymentStatus === 'PARTIALLY_PAID' && <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Partiellement payée</span>}
            {invoice.paymentStatus === 'UNPAID' && invoice.status === 'sent' && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">Non payée</span>}
          </div>
        </div>

        {/* Montant TTC (incluant TVA si présente) */}
        <div className="mt-3 flex items-start justify-between">
          <div className="text-sm text-[var(--color-text-secondary)] leading-5">Montant TTC</div>
          <div className="text-right">
            <div className="text-lg sm:text-xl font-bold text-[var(--color-primary-700)] leading-6">
              {formatCurrency((invoice as any).total ?? invoice.amount, invoice.currency)}
            </div>
            {(invoice as any)?.tvaAmount ? (
              <div className="text-[11px] text-[var(--color-text-tertiary)]">dont TVA {formatCurrency(Number((invoice as any).tvaAmount), invoice.currency)}</div>
            ) : null}
          </div>
        </div>

      </div>

      {/* Dates et informations */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-[var(--color-text-secondary)]">Date d'émission</p>
          <p className="font-medium text-[var(--color-text-primary)]">
            {formatDate(invoice.issueDate)}
          </p>
        </div>
        <div>
          <p className="text-[var(--color-text-secondary)]">Date d'échéance</p>
          <div className="flex items-center space-x-2">
            <p className="font-medium text-[var(--color-text-primary)]">
              {formatDate(invoice.dueDate)}
            </p>
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <span className={`text-xs px-2 py-1 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]`}>
                {daysUntilDue < 0 
                  ? `${Math.abs(daysUntilDue)} jour${Math.abs(daysUntilDue) > 1 ? 's' : ''} de retard`
                  : daysUntilDue === 0
                    ? 'Échéance aujourd\'hui'
                    : `${daysUntilDue} jour${daysUntilDue > 1 ? 's' : ''} restant${daysUntilDue > 1 ? 's' : ''}`
                }
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Informations additionnelles */}
      {(invoice.sentAt || invoice.paidAt) && (
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {invoice.sentAt && (
            <div>
              <p className="text-[var(--color-text-secondary)]">Envoyée le</p>
              <p className="font-medium text-[var(--color-text-primary)]">
                {formatDate(invoice.sentAt)}
              </p>
            </div>
          )}
          {invoice.paidAt && (
            <div>
              <p className="text-[var(--color-text-secondary)]">Payée le</p>
              <p className="font-medium text-[var(--color-text-primary)]">
                {formatDate(invoice.paidAt)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--color-border-primary)]">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors border border-[var(--color-border-primary)] ${
                action.variant === 'primary'
                  ? 'btn-theme-primary text-white'
                  : action.variant === 'error'
                    ? 'text-error-theme bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)]'
                    : 'text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <span className="mr-1 inline-flex items-center">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}