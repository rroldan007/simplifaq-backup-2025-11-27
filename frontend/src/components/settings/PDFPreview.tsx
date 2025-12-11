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

// Theme color configurations matching backend ThemeDefinitions.ts
const THEME_COLORS: Record<string, {
  primary: string;
  headerBg: string;
  tableHeaderBg: string;
  headerText: string;
  bodyText: string;
  altRow: string;
}> = {
  swiss_minimal: {
    primary: '#000000',
    headerBg: '#FFFFFF',
    tableHeaderBg: '#FAFAFA',
    headerText: '#000000',
    bodyText: '#111111',
    altRow: '#FFFFFF'
  },
  modern_blue: {
    primary: '#2563EB',
    headerBg: '#EFF6FF',
    tableHeaderBg: '#EFF6FF',
    headerText: '#1E3A8A',
    bodyText: '#334155',
    altRow: '#F8FAFC'
  },
  creative_bold: {
    primary: '#7C3AED',
    headerBg: '#7C3AED',
    tableHeaderBg: '#7C3AED',
    headerText: '#FFFFFF',
    bodyText: '#1F2937',
    altRow: '#F9FAFB'
  }
};

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
const TEMPLATE_COMPONENTS: Record<string, React.ComponentType<{ 
  data: InvoicePreviewData; 
  accentColor?: string; 
  showHeader?: boolean;
  logoPosition?: 'left' | 'center' | 'right';
  logoSize?: 'small' | 'medium' | 'large';
  fontColorHeader?: string;
  fontColorBody?: string;
  tableHeadColor?: string;
  headerBgColor?: string;
  altRowColor?: string;
}>> = {
  // New Unified Themes Mapped to Best Available Preview Components
  'swiss_minimal': ElegantClassic,
  'modern_blue': FormalPro,
  'creative_bold': BoldStatement,
  
  // Legacy mappings for backward compatibility if needed
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
  type UserWithPdfSettings = { pdfTemplate?: string; pdfShowCompanyNameWithLogo?: boolean; firstName?: string; lastName?: string };
  const userPdf = user as UserWithPdfSettings;
  const template = userPdf.pdfTemplate || 'swiss_classic';
  const logoUrl = getLogoUrl(user.logoUrl);
  const showHeader = userPdf.pdfShowCompanyNameWithLogo !== false;
  
  // Get theme colors (NO hardcoding)
  const themeColors = THEME_COLORS[template] || THEME_COLORS.swiss_minimal;
  
  // Apply custom primary color if set, otherwise use theme default
  const customPrimaryColor = user.pdfPrimaryColor;
  const accentColor = customPrimaryColor || themeColors.primary;
  
  // Determine header background color (apply custom color for creative_bold and modern_blue)
  let headerBgColor = themeColors.headerBg;
  let tableHeaderBgColor = themeColors.tableHeaderBg;
  if (customPrimaryColor && (template === 'creative_bold' || template === 'modern_blue')) {
    headerBgColor = customPrimaryColor;
    tableHeaderBgColor = customPrimaryColor;
  }

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
    const companyDisplayName = companyData.companyName || `${userPdf.firstName || ''} ${userPdf.lastName || ''}`.trim() || 'Votre société';
    const companyLines: string[] = [
      companyDisplayName,
      companyData.street,
      `${companyData.postalCode || ''} ${companyData.city || ''}`.trim(),
      companyData.country,
    ].filter(Boolean);

    type UserPdfOptions = { pdfShowVAT?: boolean; pdfShowPhone?: boolean; pdfShowEmail?: boolean; pdfShowWebsite?: boolean; pdfShowIBAN?: boolean; email?: string; iban?: string; quantityDecimals?: number };
    const userOpts = user as UserPdfOptions;
    if (userOpts.pdfShowVAT !== false && companyData.vatNumber) {
      companyLines.push(`TVA: ${companyData.vatNumber}`);
    }
    if (userOpts.pdfShowPhone !== false && companyData.phone) {
      companyLines.push(`Tél: ${companyData.phone}`);
    }
    if (userOpts.pdfShowEmail !== false && userOpts.email) {
      companyLines.push(`Email: ${userOpts.email}`);
    }
    if (userOpts.pdfShowWebsite !== false && companyData.website) {
      companyLines.push(`Web: ${companyData.website}`);
    }
    if (userOpts.pdfShowIBAN === true && userOpts.iban) {
      companyLines.push(`IBAN: ${userOpts.iban}`);
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
      quantityDecimals: (userOpts.quantityDecimals === 3 ? 3 : 2) as 2 | 3,
    };
  }, [companyData, logoUrl, user]);

  return (
    <div className="transform scale-90 origin-top">
      <TemplateComponent 
        data={previewData} 
        accentColor={accentColor}
        showHeader={showHeader}
        logoPosition={(user as any).pdfLogoPosition || 'left'}
        logoSize={(user as any).pdfLogoSize || 'medium'}
        fontColorHeader={(user as any).pdfFontColorHeader || themeColors.headerText}
        fontColorBody={(user as any).pdfFontColorBody || themeColors.bodyText}
        tableHeadColor={(user as any).pdfTableHeadColor || tableHeaderBgColor}
        headerBgColor={headerBgColor}
        altRowColor={themeColors.altRow}
      />
    </div>
  );
};
