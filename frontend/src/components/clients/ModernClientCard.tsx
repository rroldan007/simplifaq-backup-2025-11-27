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
      className={`bg-white rounded-2xl shadow-md hover:shadow-xl border-2 transition-all duration-200 overflow-hidden ${
        client.isActive 
          ? 'border-emerald-200 hover:border-emerald-300' 
          : 'border-slate-200 opacity-75'
      }`}
    >
      {/* Header with Icon and Status */}
      <div className={`p-6 ${
        client.isActive 
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50' 
          : 'bg-slate-50'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            client.isActive 
              ? 'bg-emerald-100 text-emerald-600' 
              : 'bg-slate-200 text-slate-500'
          }`}>
            <ClientIcon className="w-7 h-7" />
          </div>
          {!client.isActive && (
            <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
              Inactif
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-1 line-clamp-2">
          {clientName}
        </h3>
        <p className="text-sm text-slate-600 flex items-center gap-1">
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
          <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-600 truncate">{client.email}</p>
          </div>
        </div>

        {/* Phone */}
        {client.phone && (
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-600">{client.phone}</p>
            </div>
          </div>
        )}

        {/* Location */}
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-600">
              {client.city}, {client.postalCode}
              <br />
              <span className="text-xs text-slate-500">{client.country}</span>
            </p>
          </div>
        </div>

        {/* Language and Payment Terms */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">{LANGUAGE_LABELS[client.language] || client.language}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">{client.paymentTerms}j</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex flex-wrap gap-2">
        {onView && (
          <button
            onClick={() => onView(client.id)}
            className="flex-1 min-w-[80px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Voir</span>
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(client.id)}
            className="flex-1 min-w-[80px] px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            <span>Modifier</span>
          </button>
        )}
        {onCreateInvoice && (
          <button
            onClick={() => onCreateInvoice(client.id)}
            className="flex-1 min-w-[80px] px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Facturer</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(client.id)}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
