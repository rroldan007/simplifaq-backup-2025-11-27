import React from 'react';
import { 
  Pencil, 
  Trash2, 
  Download, 
  Send,
  Copy,
  CheckCircle2,
  FileText,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Devis {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  issueDate: string;
  dueDate: string;
  currency: string;
}

interface CompactDevisRowProps {
  invoice: Devis;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDownloadPdf?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onSend?: (id: string) => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
  sent: { label: 'Envoyé', icon: Send, color: 'text-blue-600', bg: 'bg-blue-100' },
  paid: { label: 'Accepté', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  overdue: { label: 'Expiré', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  cancelled: { label: 'Refusé', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
};

export function CompactDevisRow({
  invoice,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  onDuplicate,
  onSend
}: CompactDevisRowProps) {
  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG['draft'];
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ backgroundColor: 'rgba(250, 245, 255, 0.8)' }}
      className="flex items-center gap-4 px-4 py-3 border-b border-purple-200 hover:bg-purple-50 transition-colors duration-150 cursor-pointer"
      onClick={() => onView?.(invoice.id)}
    >
      {/* Status Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${statusConfig.bg} flex items-center justify-center`}>
        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
      </div>

      {/* Devis Number */}
      <div className="w-28 flex-shrink-0">
        <p className="font-semibold text-slate-900 text-sm">{invoice.invoiceNumber}</p>
      </div>

      {/* Client Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-900 truncate font-medium">{invoice.clientName}</p>
      </div>

      {/* Date */}
      <div className="w-24 flex-shrink-0 hidden md:block">
        <p className="text-xs text-slate-600">
          {new Date(invoice.issueDate).toLocaleDateString('fr-CH', { 
            day: '2-digit', 
            month: 'short',
            year: 'numeric'
          })}
        </p>
      </div>

      {/* Status Badge */}
      <div className="w-28 flex-shrink-0 hidden lg:block">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </span>
      </div>

      {/* Amount */}
      <div className="w-32 flex-shrink-0 text-right">
        <p className="font-bold text-slate-900 text-sm">
          {invoice.amount.toLocaleString('fr-CH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} {invoice.currency}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(invoice.id);
          }}
          className="p-1.5 hover:bg-purple-200 rounded-lg transition-colors duration-150"
          title="Modifier"
        >
          <Pencil className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownloadPdf?.(invoice.id);
          }}
          className="p-1.5 hover:bg-purple-200 rounded-lg transition-colors duration-150"
          title="Télécharger PDF"
        >
          <Download className="w-4 h-4 text-slate-600" />
        </button>
        {invoice.status === 'draft' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSend?.(invoice.id);
            }}
            className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors duration-150"
            title="Envoyer"
          >
            <Send className="w-4 h-4 text-purple-600" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate?.(invoice.id);
          }}
          className="p-1.5 hover:bg-purple-200 rounded-lg transition-colors duration-150 hidden sm:block"
          title="Dupliquer"
        >
          <Copy className="w-4 h-4 text-slate-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(invoice.id);
          }}
          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors duration-150"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </motion.div>
  );
}
