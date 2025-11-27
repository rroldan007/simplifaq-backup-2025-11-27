import React, { useMemo } from 'react';
import type { User } from '../../contexts/authTypes';
import { getLogoUrl } from '../../utils/assets';
import type { InvoicePreviewData } from '../invoices/templates/ElegantClassic';
import { ElegantClassic } from '../invoices/templates/ElegantClassic';
import { MinimalModern } from '../invoices/templates/MinimalModern';
import { FormalPro } from '../invoices/templates/FormalPro';
import { CreativePremium } from '../invoices/templates/CreativePremium';
import { CleanCreative } from '../invoices/templates/CleanCreative';
import { BoldStatement } from '../invoices/templates/BoldStatement';

interface PDFPreviewProps {
  user: User;
  companyData: {
    companyName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
    phone?: string;
    website?: string;
  };
}

// Map of template keys to components
const TEMPLATE_COMPONENTS: Record<string, React.ComponentType<{ data: InvoicePreviewData; accentColor?: string; showHeader?: boolean }>> = {
  'swiss_classic': ElegantClassic,
  'european_minimal': MinimalModern,
  'swiss_blue': FormalPro,
  'german_formal': CreativePremium,
  'elegant_classic': ElegantClassic,
  'minimal_modern': MinimalModern,
  'formal_pro': FormalPro,
  'creative_premium': CreativePremium,
  'clean_creative': CleanCreative,
  'bold_statement': BoldStatement,
};

/**
 * Preview component that respects PDF configuration settings
 */
export const PDFPreview: React.FC<PDFPreviewProps> = ({ user, companyData }) => {
  const accentColor = user.pdfPrimaryColor || '#4F46E5';
  const template = (user as any).pdfTemplate || 'swiss_classic';
  const logoUrl = getLogoUrl(user.logoUrl);
  const showHeader = (user as any).pdfShowCompanyNameWithLogo !== false;

  const roundToCHF05 = (amount: number, currency?: string) => {
    if ((currency || '').toUpperCase() === 'CHF') {
      return Math.round(amount * 20) / 20;
    }
    return amount;
  };
  
  // Get the template component
  const TemplateComponent = TEMPLATE_COMPONENTS[template] || ElegantClassic;
  
  // Build preview data that respects user settings
  const previewData: InvoicePreviewData = useMemo(() => {
    const userAny = user as any;
    const companyDisplayName = companyData.companyName || `${userAny.firstName || ''} ${userAny.lastName || ''}`.trim() || 'Votre société';
    const companyLines: string[] = [
      companyDisplayName,
      companyData.street,
      `${companyData.postalCode || ''} ${companyData.city || ''}`.trim(),
      companyData.country,
    ].filter(Boolean);

    if (userAny.pdfShowVAT !== false && companyData.vatNumber) {
      companyLines.push(`TVA: ${companyData.vatNumber}`);
    }
    if (userAny.pdfShowPhone !== false && companyData.phone) {
      companyLines.push(`Tél: ${companyData.phone}`);
    }
    if (userAny.pdfShowEmail !== false && userAny.email) {
      companyLines.push(`Email: ${userAny.email}`);
    }
    if (userAny.pdfShowWebsite !== false && companyData.website) {
      companyLines.push(`Web: ${companyData.website}`);
    }
    if (userAny.pdfShowIBAN === true && userAny.iban) {
      companyLines.push(`IBAN: ${userAny.iban}`);
    }

    const subtotal = 320;
    const tax = 24.64;
    const total = subtotal + tax;
    const currency = 'CHF';

    return {
      companyName: companyDisplayName,
      companyAddress: companyLines.join('\n'),
      clientName: 'Client Démo',
      clientAddress: 'Rue de Démo 1\n1000 Lausanne\nSuisse',
      invoiceNumber: 'FAC-2025-001',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
      items: [
        { description: 'Service A', quantity: 2, unitPrice: 120, total: 240 },
        { description: 'Produit B', quantity: 1, unitPrice: 80, total: 80 },
      ],
      currency,
      subtotal,
      tax,
      total: roundToCHF05(total, currency),
      logoUrl: logoUrl || undefined,
      quantityDecimals: (userAny.quantityDecimals === 3 ? 3 : 2) as 2 | 3,
    };
  }, [companyData, logoUrl, user]);

  return (
    <div className="transform scale-90 origin-top">
      <TemplateComponent 
        data={previewData} 
        accentColor={accentColor}
        showHeader={showHeader}
      />
    </div>
  );
};
