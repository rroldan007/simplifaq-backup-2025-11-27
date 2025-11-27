
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Building2, User, Eye, Pencil, FileText, Trash2, Mail, Phone } from 'lucide-react';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    canton?: string;
  };
  vatNumber?: string;
  language: 'de' | 'fr' | 'it' | 'en';
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientCardProps {
  client: Client;
  onView?: (clientId: string) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
  onCreateInvoice?: (clientId: string) => void;
}

export function ClientCard({
  client,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice
}: ClientCardProps) {
  const getClientDisplayName = () => {
    const name = client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
    return name && name.length > 0 ? name : 'Client sans nom';
  };

  const getClientType = () => {
    return client.companyName ? 'Entreprise' : 'Particulier';
  };

  const getClientTypeIcon = () => {
    return client.companyName ? <Building2 className="w-6 h-6 text-[var(--color-text-secondary)]" /> : <User className="w-6 h-6 text-[var(--color-text-secondary)]" />;
  };

  const getLanguageLabel = (lang: string) => {
    const languages = {
      'fr': 'Français',
      'de': 'Allemand',
      'it': 'Italien',
      'en': 'Anglais'
    };
    return languages[lang as keyof typeof languages] || lang;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  };

  const getAvailableActions = () => {
    const actions = [];

    if (onView) {
      actions.push({
        label: 'Voir',
        onClick: () => onView(client.id),
        icon: <Eye className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (onEdit) {
      actions.push({
        label: 'Modifier',
        onClick: () => onEdit(client.id),
        icon: <Pencil className="w-4 h-4" />,
        variant: 'secondary' as const
      });
    }

    if (onCreateInvoice) {
      actions.push({
        label: '+ Facture',
        onClick: () => onCreateInvoice(client.id),
        icon: <FileText className="w-4 h-4" />,
        variant: 'primary' as const
      });
    }

    if (onDelete && client.isActive) {
      actions.push({
        label: 'Supprimer',
        onClick: () => onDelete(client.id),
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'error' as const
      });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--color-bg-secondary)]">
            {getClientTypeIcon()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                {getClientDisplayName()}
              </h3>
              <Badge variant={client.isActive ? 'success' : 'default'}>
                {client.isActive ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {getClientType()}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            Conditions de paiement
          </p>
          <p className="font-medium text-[var(--color-text-primary)]">
            {(client.paymentTerms ?? 0)} jour{(client.paymentTerms ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
            Contact
          </p>
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Mail className="w-4 h-4 mr-2 text-[var(--color-text-secondary)]" />
              <a 
                href={`mailto:${client.email}`}
                className="truncate text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)]"
              >
                {client.email}
              </a>
            </div>
            {client.phone && (
              <div className="flex items-center text-sm">
                <Phone className="w-4 h-4 mr-2 text-[var(--color-text-secondary)]" />
                <a 
                  href={`tel:${client.phone}`}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {client.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
            Adresse
          </p>
          <div className="text-sm text-[var(--color-text-secondary)]">
            <p>{client.address?.street ?? '-'}</p>
            <p>
              {client.address?.postalCode ?? '-'} {client.address?.city ?? ''}
              {client.address?.canton ? `, ${client.address.canton}` : ''}
            </p>
            <p>{client.address?.country ?? '-'}</p>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <p className="text-[var(--color-text-secondary)]">Langue</p>
          <p className="font-medium text-[var(--color-text-primary)]">
            {getLanguageLabel(client.language ?? 'fr')}
          </p>
        </div>
        
        {client.vatNumber && (
          <div>
            <p className="text-[var(--color-text-secondary)]">N° TVA</p>
            <p className="font-medium text-[var(--color-text-primary)] font-mono">
              {client.vatNumber}
            </p>
          </div>
        )}
        
        <div>
          <p className="text-[var(--color-text-secondary)]">Client depuis</p>
          <p className="font-medium text-[var(--color-text-primary)]">
            {formatDate(client.createdAt)}
          </p>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-bg-secondary)]">
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
            Notes
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {client.notes}
          </p>
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