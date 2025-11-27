import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ClientSelector } from './ClientSelector';
import { InvoiceItemsTable } from './InvoiceItemsTable';
import { EnhancedInvoiceDetails } from './EnhancedInvoiceDetails';
import { useClients } from '../../hooks/useClients';
import { useAutoFormPreservation } from '../../hooks/useFormDataPreservation';
import { useAuth } from '../../hooks/useAuth';
import { tokenManager } from '../../services/tokenManager';

interface Client {
  id: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  vatNumber?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total: number;
  order: number;
}

interface InvoiceFormData {
  invoiceNumber: string;
  client: Client | null;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  language: 'fr' | 'de' | 'it' | 'en';
  currency: 'CHF' | 'EUR';
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => void;
  onCancel?: () => void;
  onPreview?: (data: InvoiceFormData) => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

export function InvoiceForm({
  initialData,
  onSubmit,
  onCancel,
  onPreview,
  loading = false,
  mode = 'create'
}: InvoiceFormProps) {
  // Load real clients from API so ClientSelector uses valid IDs
  const { clients, loading: clientsLoading } = useClients({});
  const { isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    client: null,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    items: [],
    notes: '',
    terms: '',
    language: 'fr',
    currency: 'CHF',
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restoredDataNotification, setRestoredDataNotification] = useState<string | null>(null);
  const [isRestoringData, setIsRestoringData] = useState(false);
  // Removed unused isSubmittedSuccessfully state

  // Form data preservation with auto-save
  const formPreservation = useAutoFormPreservation(
    `invoice-form-${mode}`,
    formData as unknown as Record<string, unknown>,
    {
      expiryHours: 48, // Keep form data for 2 days
      encrypt: true, // Encrypt invoice data as it may contain sensitive client info
      sensitiveFields: ['vatNumber', 'email', 'notes'], // Additional sensitive fields
      debounceMs: 2000, // Save every 2 seconds of inactivity
    }
  );

  // Generate invoice number if creating new invoice
  useEffect(() => {
    if (mode === 'create' && !formData.invoiceNumber) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setFormData(prev => ({
        ...prev,
        invoiceNumber: `FAC-${year}${month}-${random}`
      }));
    }
  }, [mode, formData.invoiceNumber]);

  // Handle form data restoration after authentication
  useEffect(() => {
    const handleDataRestoration = async () => {
      if (!isAuthenticated || initialData || isRestoringData) return;

      try {
        setIsRestoringData(true);
        const restoredData = await formPreservation.restoreMostRecent();
        
        if (restoredData && Object.keys(restoredData).length > 0) {
          // Safely validate and coerce restored data structure
          const restored = restoredData as Partial<InvoiceFormData>;
          const validatedData: InvoiceFormData = {
            invoiceNumber: typeof restored.invoiceNumber === 'string' ? restored.invoiceNumber : formData.invoiceNumber,
            client: (restored.client as Client) ?? null,
            issueDate: typeof restored.issueDate === 'string' ? restored.issueDate : formData.issueDate,
            dueDate: typeof restored.dueDate === 'string' ? restored.dueDate : formData.dueDate,
            items: Array.isArray(restored.items) ? (restored.items as InvoiceItem[]) : [],
            notes: typeof restored.notes === 'string' ? restored.notes : '',
            terms: typeof restored.terms === 'string' ? restored.terms : '',
            language: (restored.language as InvoiceFormData['language']) ?? 'fr',
            currency: (restored.currency as InvoiceFormData['currency']) ?? 'CHF',
          };

          // Only restore if there's meaningful data
          const hasData = Boolean(
            validatedData.client || 
            validatedData.items.length > 0 || 
            (validatedData.notes ?? '').trim() || 
            (validatedData.terms ?? '').trim()
          );

          if (hasData) {
            setFormData(validatedData);
            setRestoredDataNotification(
              `Vos données de facture ont été restaurées automatiquement. ` +
              `Dernière sauvegarde: ${new Date().toLocaleString('fr-CH')}`
            );
            
            // Auto-hide notification after 10 seconds
            setTimeout(() => {
              setRestoredDataNotification(null);
            }, 10000);
          }
        }
      } catch (error) {
        console.error('Failed to restore form data:', error);
      } finally {
        setIsRestoringData(false);
      }
    };

    handleDataRestoration();
  }, [isAuthenticated, initialData, formPreservation, formData.invoiceNumber, formData.issueDate, formData.dueDate, isRestoringData]);

  // Listen for token expiration to preserve data before logout
  useEffect(() => {
    const handleTokenExpiration = async () => {
      try {
        // Force save current form data before logout
        if (formData && (formData.client || formData.items.length > 0)) {
          await formPreservation.preserveData(formData as unknown as Record<string, unknown>);
        }
      } catch (error) {
        console.error('Failed to preserve form data on token expiration:', error);
      }
    };

    const handleTokenExpired = () => {
      handleTokenExpiration();
    };

    tokenManager.onTokenExpired(handleTokenExpired);

    return () => {
      tokenManager.removeListener('token_expired', handleTokenExpired);
    };
  }, [formData, formPreservation]);

  const updateFormData = (field: keyof InvoiceFormData, value: InvoiceFormData[keyof InvoiceFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Le numéro de facture est requis';
    }

    if (!formData.client) {
      newErrors.client = 'Veuillez sélectionner un client';
    }

    if (!formData.issueDate) {
      newErrors.issueDate = 'La date d\'émission est requise';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'La date d\'échéance est requise';
    }

    if (formData.issueDate && formData.dueDate && formData.dueDate < formData.issueDate) {
      newErrors.dueDate = 'La date d\'échéance doit être postérieure à la date d\'émission';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Veuillez ajouter au moins un article';
    }

    // Validate items
    const itemErrors = formData.items.some(item => 
      !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0
    );
    
    if (itemErrors) {
      newErrors.items = 'Veuillez compléter tous les articles correctement';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Clear preserved data on successful submission
      formPreservation.clearFormData().catch(error => {
        console.error('Failed to clear preserved form data:', error);
      });
      
      onSubmit(formData);
    }
  };

  const handlePreview = () => {
    if (validateForm() && onPreview) {
      onPreview(formData);
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const totalTva = formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * (item.tvaRate / 100));
    }, 0);
    
    return {
      subtotal,
      totalTva,
      total: subtotal + totalTva
    };
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Data Restoration Notification */}
      {restoredDataNotification && (
        <div className="rounded-lg p-4 mb-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-[var(--color-primary-600)] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-[var(--color-primary-700)]">
                Données restaurées
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {restoredDataNotification}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setRestoredDataNotification(null)}
                className="inline-flex text-[var(--color-primary-500)] hover:text-[var(--color-primary-600)] focus:outline-none focus:text-[var(--color-primary-600)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {mode === 'create' 
              ? 'Créez une nouvelle facture avec QR Bill suisse'
              : 'Modifiez les détails de votre facture'
            }
          </p>
        </div>
      )}
      
      <div className="flex space-x-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
        )}
          {onPreview && (
            <Button type="button" variant="secondary" onClick={handlePreview}>
              <span className="mr-2">👁️</span>
              Aperçu
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={loading}>
            <span className="mr-2">💾</span>
            {mode === 'create' ? 'Créer la facture' : 'Enregistrer'}
          </Button>
        </div>
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Invoice details */}
          <Card className="p-6">
            <EnhancedInvoiceDetails
              data={{
                invoiceNumber: formData.invoiceNumber,
                language: formData.language,
                issueDate: formData.issueDate,
                dueDate: formData.dueDate,
                currency: formData.currency,
              }}
              onChange={updateFormData}
              errors={errors}
            />
          </Card>

          {/* Client selection */}
          <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Client *
          </h2>
          
          {errors.client && (
            <div className="mb-4 text-sm text-error-theme">
              {errors.client}
            </div>
          )}
            
            <ClientSelector
              clients={clients}
              selectedClient={formData.client}
              onClientSelect={(client) => updateFormData('client', client)}
              loading={clientsLoading}
            />
          </Card>

          {/* Invoice items */}
          <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Articles *
          </h2>
          
          {errors.items && (
            <div className="mb-4 text-sm text-error-theme">
              {errors.items}
            </div>
          )}
            
            <InvoiceItemsTable
              items={formData.items}
              onItemsChange={(items) => updateFormData('items', items)}
              currency={formData.currency}
            />
          </Card>

          {/* Additional information */}
          <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Informations supplémentaires
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Notes internes, instructions particulières..."
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Conditions de paiement (optionnel)
              </label>
              <textarea
                value={formData.terms}
                onChange={(e) => updateFormData('terms', e.target.value)}
                placeholder="Conditions de paiement, modalités, etc..."
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent"
              />
            </div>
          </div>
        </Card>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Résumé
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Articles :</span>
              <span className="font-medium">{formData.items.length}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Sous-total :</span>
              <span className="font-medium">
                {new Intl.NumberFormat('fr-CH', {
                  style: 'currency',
                  currency: formData.currency
                }).format(totals.subtotal)}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">TVA :</span>
              <span className="font-medium">
                {new Intl.NumberFormat('fr-CH', {
                  style: 'currency',
                  currency: formData.currency
                }).format(totals.totalTva)}
              </span>
            </div>
            
            <div className="border-t border-[var(--color-border-primary)] pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total :</span>
                <span>
                  {new Intl.NumberFormat('fr-CH', {
                    style: 'currency',
                    currency: formData.currency
                  }).format(totals.total)}
                </span>
              </div>
            </div>
          </div>

            {/* QR Bill info */}
          <div className="mt-6 p-4 rounded-lg bg-[var(--color-bg-secondary)]">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">🇨🇭</span>
              <span className="font-medium text-[var(--color-text-primary)]">Swiss QR Bill</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Un QR Bill sera automatiquement généré selon les standards suisses.
            </p>
          </div>

            {/* Client info */}
          {formData.client && (
            <div className="mt-6 p-4 rounded-lg bg-[var(--color-bg-secondary)]">
              <h4 className="font-medium text-[var(--color-text-primary)] mb-2">Client</h4>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {formData.client.companyName || 
                 `${formData.client.firstName} ${formData.client.lastName}`}
              </p>
              {(formData.client.address?.city || formData.client.address?.country) && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  {formData.client.address?.city || '—'}{formData.client.address?.country ? `, ${formData.client.address.country}` : ''}
                </p>
              )}
            </div>
          )}
        </Card>
        </div>
      </div>
    </form>
  );
}

 