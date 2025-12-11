import React from 'react';
import { getLogoUrl } from '../../utils/assets';
import { useAuth } from '../../hooks/useAuth';
import { calculateLineItemDiscount, calculateDiscountAmount, calculateProportionalGlobalDiscount } from '../../utils/discountCalculations';
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
  lineDiscountValue?: number;
  lineDiscountType?: 'PERCENT' | 'AMOUNT';
  subtotalBeforeDiscount?: number;
  discountAmount?: number;
  subtotalAfterDiscount?: number;
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
  globalDiscountValue?: number;
  globalDiscountType?: 'PERCENT' | 'AMOUNT';
  globalDiscountNote?: string;
  subtotal?: number;
  tvaAmount?: number;
  total?: number;
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
  type UserWithPdfSettings = { pdfTemplate?: string; pdfPrimaryColor?: string; logoUrl?: string } | null;
  const userWithSettings = authUser as UserWithPdfSettings;
  const resolvedTemplate = template
    || invoiceUser.pdfTemplate
    || userWithSettings?.pdfTemplate
    || 'elegant_classic';
  const accentColor = invoiceUser.pdfPrimaryColor
    || userWithSettings?.pdfPrimaryColor
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

  // Calculate totals with discounts
  // Use invoice totals if available (already calculated by backend)
  const invoiceSubtotal = invoice.subtotal ? Number(invoice.subtotal) : null;
  const invoiceTvaAmount = invoice.tvaAmount ? Number(invoice.tvaAmount) : null;
  const invoiceTotal = invoice.total ? Number(invoice.total) : null;

  // Calculate from items if invoice totals not available
  let subtotalAfterLineDiscounts = 0;
  items.forEach((item: InvoiceItemMinimal) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    
    const lineDiscountConfig = item.lineDiscountValue && item.lineDiscountValue > 0 && item.lineDiscountType
      ? { value: item.lineDiscountValue, type: item.lineDiscountType }
      : undefined;
    
    const { subtotalAfterDiscount } = calculateLineItemDiscount(qty, price, lineDiscountConfig);
    subtotalAfterLineDiscounts += subtotalAfterDiscount;
  });

  // Apply global discount
  const globalDiscountConfig = invoice.globalDiscountValue && invoice.globalDiscountValue > 0 && invoice.globalDiscountType
    ? { value: invoice.globalDiscountValue, type: invoice.globalDiscountType }
    : undefined;
  
  const globalDiscountAmount = calculateDiscountAmount(subtotalAfterLineDiscounts, globalDiscountConfig);

  const subtotalAfterAllDiscounts = subtotalAfterLineDiscounts - globalDiscountAmount;

  // Calculate TVA on final subtotal (after all discounts)
  let totalTVA = 0;
  items.forEach((item: InvoiceItemMinimal) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const tvaRate = Number(item.tvaRate) || 0;
    
    const lineDiscountConfig = item.lineDiscountValue && item.lineDiscountValue > 0 && item.lineDiscountType
      ? { value: item.lineDiscountValue, type: item.lineDiscountType }
      : undefined;
    
    const { subtotalAfterDiscount: itemAfterLineDiscount } = calculateLineItemDiscount(qty, price, lineDiscountConfig);
    
    // Apply proportional global discount
    const itemGlobalDiscount = calculateProportionalGlobalDiscount(
      itemAfterLineDiscount,
      subtotalAfterLineDiscounts,
      globalDiscountAmount
    );
    const itemFinalSubtotal = itemAfterLineDiscount - itemGlobalDiscount;
    
    totalTVA += (itemFinalSubtotal * (tvaRate / 100));
  });

  // Use invoice totals if available, otherwise use calculated ones
  const subtotal = invoiceSubtotal !== null ? invoiceSubtotal : subtotalAfterLineDiscounts;
  const tax = invoiceTvaAmount !== null ? invoiceTvaAmount : totalTVA;
  const total = invoiceTotal !== null ? invoiceTotal : (subtotalAfterAllDiscounts + totalTVA);

  // Build preview data for advanced templates
  const previewData: InvoicePreviewData = {
    logoUrl: getLogoUrl(invoiceCompany?.logoUrl || userWithSettings?.logoUrl) || undefined,
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
    items: items.map((item: InvoiceItemMinimal) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const itemSubtotal = qty * price;
      
      return {
        description: item.description || '—',
        quantity: qty,
        unitPrice: price,
        total: Number(item.subtotalAfterDiscount) || (qty * price),
        unit: item.unit,
        lineDiscountValue: item.lineDiscountValue,
        lineDiscountType: item.lineDiscountType,
        subtotalBeforeDiscount: Number(item.subtotalBeforeDiscount) || itemSubtotal,
        discountAmount: Number(item.discountAmount) || 0,
      };
    }),
    currency: invoice.currency || 'CHF',
    subtotal,
    discount: (invoice.globalDiscountValue && invoice.globalDiscountValue > 0) ? {
      value: Number(invoice.globalDiscountValue),
      type: invoice.globalDiscountType || 'PERCENT',
      amount: globalDiscountAmount,
      note: invoice.globalDiscountNote,
    } : undefined,
    tax,
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
