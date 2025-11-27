import React from 'react';
import { getLogoUrl } from '../../utils/assets';
import { useAuth } from '../../hooks/useAuth';
import { ElegantClassic } from './templates/ElegantClassic';
import { MinimalModern } from './templates/MinimalModern';
import { FormalPro } from './templates/FormalPro';
import { CreativePremium } from './templates/CreativePremium';
import { CleanCreative } from './templates/CleanCreative';
import { BoldStatement } from './templates/BoldStatement';
import type { InvoicePreviewData } from './templates/ElegantClassic';

interface InvoiceItemMinimal {
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  tvaRate?: number | string;
  unit?: string;
}

interface InvoiceUserMinimal {
  logoUrl?: string;
  companyName?: string;
  quantityDecimals?: number;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  pdfTemplate?: string;
  pdfPrimaryColor?: string;
}

interface InvoiceClientMinimal {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

interface InvoicePreviewInvoice {
  id?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  items?: InvoiceItemMinimal[];
  user?: InvoiceUserMinimal;
  client?: InvoiceClientMinimal;
}

interface InvoicePreviewProps {
  invoice: InvoicePreviewInvoice | null | undefined;
  template?: 'elegant_classic' | 'minimal_modern' | 'formal_pro' | 'creative_premium' | 'clean_creative' | 'bold_statement';
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
  invoice, 
  template 
}) => {
  const { user: authUser } = useAuth();
  const invoiceUser = (invoice?.user || {}) as InvoiceUserMinimal;
  const resolvedTemplate = template
    || invoiceUser.pdfTemplate
    || (authUser as any)?.pdfTemplate
    || 'elegant_classic';
  const accentColor = invoiceUser.pdfPrimaryColor
    || (authUser as any)?.pdfPrimaryColor
    || '#4F46E5';
  if (!invoice) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-slate-500">
        Aucune facture sélectionnée
      </div>
    );
  }

  const client: InvoiceClientMinimal = invoice.client || {};
  const invoiceCompany: InvoiceUserMinimal = invoice.user || {};
  const items: InvoiceItemMinimal[] = Array.isArray(invoice.items) ? invoice.items : [];
  // Use invoice.user.quantityDecimals if provided; default to 2
  const resolvedQtyDecimals = (invoiceCompany?.quantityDecimals) === 3 ? 3 : 2;
  const quantityDecimals: 2 | 3 = resolvedQtyDecimals as 2 | 3;

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: InvoiceItemMinimal) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const totalTVA = items.reduce((sum: number, item: InvoiceItemMinimal) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const tvaRate = Number(item.tvaRate) || 0;
    return sum + (qty * price * tvaRate / 100);
  }, 0);

  const total = subtotal + totalTVA;

  // Build preview data for advanced templates
  const previewData: InvoicePreviewData = {
    logoUrl: getLogoUrl(invoiceCompany?.logoUrl || (authUser as any)?.logoUrl) || undefined,
    companyName: invoiceCompany?.companyName || authUser?.companyName || 'Votre Entreprise',
    companyAddress: [
      invoiceCompany?.address?.street || authUser?.address?.street,
      [
        invoiceCompany?.address?.postalCode || authUser?.address?.postalCode,
        invoiceCompany?.address?.city || authUser?.address?.city,
      ].filter(Boolean).join(' '),
      invoiceCompany?.address?.country || authUser?.address?.country,
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
    items: items.map((item: InvoiceItemMinimal) => ({
      description: item.description || '—',
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      unit: item.unit,
    })),
    currency: invoice.currency || 'CHF',
    subtotal,
    tax: totalTVA,
    total,
    quantityDecimals,
  };

  // Render the appropriate template
  const renderTemplate = () => {
    switch (resolvedTemplate) {
      case 'minimal_modern':
        return <MinimalModern data={previewData} accentColor={accentColor} />;
      case 'formal_pro':
        return <FormalPro data={previewData} accentColor={accentColor} />;
      case 'creative_premium':
        return <CreativePremium data={previewData} accentColor={accentColor} />;
      case 'clean_creative':
        return <CleanCreative data={previewData} accentColor={accentColor} />;
      case 'bold_statement':
        return <BoldStatement data={previewData} accentColor={accentColor} />;
      default:
        return <ElegantClassic data={previewData} accentColor={accentColor} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {renderTemplate()}
    </div>
  );
};

export default InvoicePreview;
