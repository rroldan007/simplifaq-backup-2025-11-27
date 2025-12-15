import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useCurrentUser } from '../hooks/useAuth';
import { getLogoUrl } from '../utils/assets';
import type { InvoicePreviewData } from '../components/invoices/templates/ElegantClassic';
import { ElegantClassic } from '../components/invoices/templates/ElegantClassic';
import { MinimalModern } from '../components/invoices/templates/MinimalModern';
import { FormalPro } from '../components/invoices/templates/FormalPro';
import { CreativePremium } from '../components/invoices/templates/CreativePremium';
import { CleanCreative } from '../components/invoices/templates/CleanCreative';
import { BoldStatement } from '../components/invoices/templates/BoldStatement';

// Minimal local types sufficient for preview needs
interface InvoiceItemLite {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate?: number;
  total?: number;
  order?: number;
  unit?: string;
}

interface InvoiceClientLite {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  addressLine1?: string;
}

interface InvoiceLite {
  id: string;
  invoiceNumber: string;
  clientName?: string;
  client?: InvoiceClientLite;
  issueDate: string;
  dueDate: string;
  currency?: 'CHF' | 'EUR' | string;
  items: InvoiceItemLite[];
  notes?: string;
  terms?: string;
}

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const [invoice, setInvoice] = useState<InvoiceLite | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  type UserPdfSettings = { pdfTemplate?: string; pdfPrimaryColor?: string };
  const userPdf = user as UserPdfSettings | null;
  const selectedTemplate = userPdf?.pdfTemplate || 'elegant_classic';
  const accentColor = userPdf?.pdfPrimaryColor || '#4F46E5';
  const [showHeader, setShowHeader] = useState<boolean>(true);

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
        const message = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : 'Erreur de chargement';
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchInvoice();
    // Default to showing header
    setShowHeader(true);
    return () => { mounted = false; };
  }, [id]);

  const previewData: InvoicePreviewData | null = useMemo(() => {
    if (!invoice) return null;
    const resolvedQtyDecimals = (user?.quantityDecimals === 3) ? 3 : 2;
    const quantityDecimals: 2 | 3 = resolvedQtyDecimals;
    const items = (invoice.items || []).map((it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unitPrice) || 0;
      return {
        description: it.description || '',
        quantity: qty,
        unitPrice: price,
        total: qty * price,
        unit: it.unit,
      };
    });
    const subtotal = items.reduce((s: number, it: { total: number }) => s + it.total, 0);
    const tax = (invoice.items || []).reduce((s: number, it: InvoiceItemLite) => {
      const rate = Number(it.tvaRate || 0) / 100;
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unitPrice) || 0;
      return s + qty * price * rate;
    }, 0);
    const total = subtotal + tax;

    const companyAddress = [
      user?.address?.street,
      [user?.address?.postalCode, user?.address?.city].filter(Boolean).join(' '),
      user?.address?.country,
    ]
      .filter((l) => !!l && String(l).trim().length > 0)
      .join('\n');

    const invClient: InvoiceClientLite = invoice.client || {};
    const computedClientName: string = invoice.clientName
      || invClient.companyName
      || [invClient.firstName, invClient.lastName].filter(Boolean).join(' ')
      || 'Client';
    const clientAddress = [
      invClient?.address?.street || invClient?.addressLine1,
      [invClient?.address?.postalCode, invClient?.address?.city].filter(Boolean).join(' '),
      invClient?.address?.country,
    ]
      .filter((l) => !!l && String(l).trim().length > 0)
      .join('\n');

    const currency = invoice.currency || 'CHF';

    return {
      companyName: user?.companyName || 'Ma Société SA',
      companyAddress: companyAddress || 'Adresse entreprise',
      clientName: computedClientName,
      clientAddress: clientAddress || 'Adresse client',
      invoiceNumber: invoice.invoiceNumber || 'FAC-XXXX',
      issueDate: invoice.issueDate || new Date().toLocaleDateString('fr-CH'),
      dueDate: invoice.dueDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toLocaleDateString('fr-CH'),
      items,
      currency,
      subtotal,
      tax,
      total,
      logoUrl: getLogoUrl(user?.logoUrl) || undefined,
      quantityDecimals,
    } as InvoicePreviewData;
  }, [invoice, user]);

  useEffect(() => {
    if (!loading && invoice && previewData) {
      let cancelled = false;
      const doPrint = async () => {
        try {
          // Wait for fonts to be fully ready to avoid fallback fonts in the print PDF
          const docWithFonts = document as unknown as { fonts?: { ready?: Promise<unknown> } };
          if (docWithFonts.fonts && docWithFonts.fonts.ready && typeof docWithFonts.fonts.ready.then === 'function') {
            await docWithFonts.fonts.ready;
          } else {
            // Fallback small delay if Font Loading API isn't available
            await new Promise((r) => setTimeout(r, 300));
          }
        } catch {
          // ignore font readiness errors
        }
        if (!cancelled) {
          window.print();
        }
      };
      doPrint();
      return () => { cancelled = true; };
    }
  }, [loading, invoice, previewData]);

  const renderPreview = () => {
    if (!previewData) return null;
    switch (selectedTemplate) {
      case 'clean_creative':
        return <CleanCreative data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'bold_statement':
        return <BoldStatement data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'minimal_modern':
        return <MinimalModern data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'formal_pro':
        return <FormalPro data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'creative_premium':
        return <CreativePremium data={previewData} accentColor={accentColor} showHeader={showHeader} />;
      case 'elegant_classic':
      default:
        return <ElegantClassic data={previewData} accentColor={accentColor} showHeader={showHeader} />;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="container mx-auto p-4 print:p-0">
        <div className="max-w-4xl mx-auto invoice-doc" data-theme="light">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
