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
  Globe
} from 'lucide-react';

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

interface CompactClientRowProps {
  client: Client;
  onView?: (clientId: string) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  onCreateInvoice?: (clientId: string) => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  'fr': 'FR',
  'de': 'DE',
  'it': 'IT',
  'en': 'EN'
};

export function CompactClientRow({
  client,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice
}: CompactClientRowProps) {
  const clientName = client.companyName || 
    [client.firstName, client.lastName].filter(Boolean).join(' ') || 
    'Client sans nom';
  
  const clientType = client.companyName ? 'Entreprise' : 'Particulier';
  const ClientIcon = client.companyName ? Building2 : User;

  return (
    <>
      {/* Client Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            client.isActive 
              ? 'bg-emerald-100 text-emerald-600' 
              : 'bg-slate-200 text-slate-500'
          }`}>
            <ClientIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{clientName}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{clientType}</span>
              {client.vatNumber && (
                <>
                  <span>•</span>
                  <span>TVA: {client.vatNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Contact */}
      <td className="px-6 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="truncate">{client.email}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>
      </td>

      {/* Location */}
      <td className="px-6 py-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-600">
            <p>{client.city}, {client.postalCode}</p>
            <p className="text-xs text-slate-500">{client.country}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <div className="space-y-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            client.isActive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-slate-200 text-slate-600'
          }`}>
            {client.isActive ? 'Actif' : 'Inactif'}
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="w-3 h-3" />
            <span>{LANGUAGE_LABELS[client.language]}</span>
            <span>•</span>
            <span>{client.paymentTerms}j</span>
          </div>
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          {onView && (
            <button
              onClick={() => onView(client.id)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Voir"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(client.id)}
              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onCreateInvoice && (
            <button
              onClick={() => onCreateInvoice(client.id)}
              className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Créer une facture"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(client.id)}
              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </>
  );
}
