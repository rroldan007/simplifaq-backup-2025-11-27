import React from 'react';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Eye, 
  Pencil, 
  Trash2, 
  FileText,
  Globe,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  canton?: string;
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModernClientCardProps {
  client: Client;
  onView?: (clientId: string) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  onCreateInvoice?: (clientId: string) => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'en': 'English'
};

export function ModernClientCard({
  client,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice
}: ModernClientCardProps) {
  const clientName = client.companyName || 
    [client.firstName, client.lastName].filter(Boolean).join(' ') || 
    'Client sans nom';
  
  const clientType = client.companyName ? 'Entreprise' : 'Particulier';
  const ClientIcon = client.companyName ? Building2 : User;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`card-theme rounded-2xl shadow-md hover:shadow-xl border-2 transition-all duration-200 overflow-hidden ${
        client.isActive 
          ? 'border-emerald-500/30 hover:border-emerald-500/50' 
          : 'border-[var(--color-border-primary)] opacity-75'
      }`}
    >
      {/* Header with Icon and Status */}
      <div className={`p-6 ${
        client.isActive 
          ? 'bg-emerald-500/10' 
          : 'bg-[var(--color-bg-secondary)]'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            client.isActive 
              ? 'bg-emerald-500/20 text-emerald-500' 
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
          }`}>
            <ClientIcon className="w-7 h-7" />
          </div>
          {!client.isActive && (
            <span className="px-3 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs font-medium rounded-full">
              Inactif
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1 line-clamp-2">
          {clientName}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1">
          <span>{clientType}</span>
          {client.vatNumber && (
            <>
              <span>•</span>
              <span className="text-xs">TVA: {client.vatNumber}</span>
            </>
          )}
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        {/* Email */}
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-text-secondary)] truncate">{client.email}</p>
          </div>
        </div>

        {/* Phone */}
        {client.phone && (
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text-secondary)]">{client.phone}</p>
            </div>
          </div>
        )}

        {/* Location */}
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {client.city}, {client.postalCode}
              <br />
              <span className="text-xs text-[var(--color-text-tertiary)]">{client.country}</span>
            </p>
          </div>
        </div>

        {/* Language and Payment Terms */}
        <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border-primary)]">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">{LANGUAGE_LABELS[client.language] || client.language}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">{client.paymentTerms}j</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex flex-wrap gap-2">
        {onView && (
          <button
            onClick={() => onView(client.id)}
            className="flex-1 min-w-[80px] px-3 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Voir</span>
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(client.id)}
            className="flex-1 min-w-[80px] px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            <span>Modifier</span>
          </button>
        )}
        {onCreateInvoice && (
          <button
            onClick={() => onCreateInvoice(client.id)}
            className="flex-1 min-w-[80px] px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Facturer</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(client.id)}
            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
