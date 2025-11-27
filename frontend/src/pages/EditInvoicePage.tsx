import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { GuidedInvoiceWizard } from '../components/invoices/GuidedInvoiceWizard';
import type { InvoiceFormData } from '../components/invoices/GuidedInvoiceWizard';

// Minimal shapes used on this page (with productId and unit)
interface InvoiceItemLite {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total?: number;
  order?: number;
  productId?: string;
  unit?: string;
}

interface InvoiceLite {
  id: string;
  invoiceNumber: string;
  client?: { id?: string } | null;
  clientName?: string;
  issueDate: string;
  dueDate: string;
  currency?: 'CHF' | 'EUR' | string;
  items: InvoiceItemLite[];
  notes?: string;
  terms?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

const EditInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceLite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchInvoice() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const inv = await api.getInvoice(id);
        if (mounted) setInvoice(inv);
      } catch (e: unknown) {
        const message = (e && typeof e === 'object' && 'message' in e)
          ? String((e as { message?: unknown }).message)
          : 'Erreur de chargement';
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchInvoice();
    return () => { mounted = false; };
  }, [id]);

  const handleSubmit = async (values: InvoiceFormData) => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      // Helper function to format date to yyyy-MM-dd
      const formatDate = (dateValue: unknown): string | undefined => {
        if (!dateValue) return undefined;
        const date = new Date(dateValue as string);
        if (isNaN(date.getTime())) return undefined;
        return date.toISOString().split('T')[0]; // Extract yyyy-MM-dd part
      };

      // Map form values to update payload expected by API
      // Build base payload
      const payloadBase: any = {
        invoiceNumber: values.invoiceNumber,
        clientId: values.client?.id as string | undefined,
        issueDate: formatDate(values.issueDate),
        dueDate: formatDate(values.dueDate),
        notes: values.notes || undefined,
        terms: values.terms || undefined,
        language: (values.language || 'fr') as 'fr' | 'de' | 'it' | 'en',
        currency: (values.currency || 'CHF') as 'CHF' | 'EUR',
        // Recurrence fields
        ...(typeof values.estRecurrente !== 'undefined' ? { estRecurrente: Boolean(values.estRecurrente) } : {}),
        ...(values.frequence ? { frequence: values.frequence } : {}),
        ...(values.prochaineDateRecurrence ? { prochaineDateRecurrence: formatDate(values.prochaineDateRecurrence) } : {}),
        ...(values.dateFinRecurrence ? { dateFinRecurrence: formatDate(values.dateFinRecurrence) } : {}),
      };

      // Only include items if invoice is not sent/paid
      const isLocked = ['sent','paid'].includes(String(invoice?.status || ''));
      const payload = isLocked
        ? payloadBase
        : {
            ...payloadBase,
            items: (values.items || []).map((it, idx: number) => ({
              description: it.description,
              quantity: Number(it.quantity) || 0,
              unitPrice: Number(it.unitPrice) || 0,
              tvaRate: Number(it.tvaRate ?? 0),
              total: Number(it.quantity) * Number(it.unitPrice),
              order: typeof it.order === 'number' ? it.order : idx,
              productId: it.productId,
              unit: it.unit,
            })),
          };

      await api.updateInvoice(id, payload);
      navigate(`/invoices/${id}`);
    } catch (e: unknown) {
      const message = (e && typeof e === 'object' && 'message' in e)
        ? String((e as { message?: unknown }).message)
        : "Erreur lors de l'enregistrement";
      setError(message);
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
        <p className="text-slate-600 mt-4">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Erreur</h2>
        <p className="text-slate-600 mb-4">{error}</p>
        <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded">Retour</button>
      </Card>
    );
  }

  if (!invoice) return null;

  // Helper function to format date to yyyy-MM-dd for form inputs
  const formatDateForInput = (dateValue: unknown) => {
    if (!dateValue) return '';
    const date = new Date(dateValue as string);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0]; // Extract yyyy-MM-dd part
  };

  // Transform invoice data to ensure dates are in correct format for form
  const formInitialData: Partial<InvoiceFormData> = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: formatDateForInput(invoice.issueDate),
    dueDate: formatDateForInput(invoice.dueDate),
    // Prefill client when available
    client: (function() {
      const c: any = (invoice as any).client;
      if (!c || typeof c !== 'object') return null;
      return {
        id: String(c.id || ''),
        companyName: typeof c.companyName === 'string' ? c.companyName : undefined,
        firstName: typeof c.firstName === 'string' ? c.firstName : undefined,
        lastName: typeof c.lastName === 'string' ? c.lastName : undefined,
        email: String(c.email || ''),
        address: {
          street: String(c.street || c.addressLine1 || ''),
          city: String(c.city || ''),
          postalCode: String(c.postalCode || ''),
          country: String(c.country || 'CH'),
        },
        vatNumber: typeof c.vatNumber === 'string' ? c.vatNumber : undefined,
      } as InvoiceFormData['client'];
    })(),
    items: (invoice.items || []).map(it => ({
      id: it.id ?? '',
      description: it.description,
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      tvaRate: Number(it.tvaRate ?? 0),
      total: Number(it.quantity) * Number(it.unitPrice),
      order: typeof it.order === 'number' ? it.order : 0,
      productId: it.productId,
      unit: it.unit,
    })),
    notes: invoice.notes,
    terms: invoice.terms,
    // language and currency left undefined to keep current defaults in wizard
    // Recurrence: prefill from invoice if present
    estRecurrente: (invoice as any).estRecurrente as unknown as boolean | undefined,
    frequence: (invoice as any).frequence as unknown as InvoiceFormData['frequence'] | undefined,
    prochaineDateRecurrence: formatDateForInput((invoice as any).prochaineDateRecurrence),
    dateFinRecurrence: formatDateForInput((invoice as any).dateFinRecurrence),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Modifier la facture #{invoice.invoiceNumber}</h1>
        {(['sent','paid'].includes(String(invoice.status))) && (
          <span className="px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800 border border-amber-200" title="Les articles et prix sont verrouillés pour les factures envoyées/payées">
            Articles verrouillés
          </span>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/invoices/${id}/print`)}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            title="Imprimer / Exporter PDF"
          >
            Imprimer / PDF
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto">
        <Card className="p-6">
          <GuidedInvoiceWizard
            mode="edit"
            initialData={formInitialData}
            loading={saving}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            lockItems={['sent','paid'].includes(String(invoice.status))}
          />
        </Card>
      </div>
    </div>
  );
};

export default EditInvoicePage;
