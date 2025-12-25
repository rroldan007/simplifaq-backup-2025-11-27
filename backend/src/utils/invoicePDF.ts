import * as puppeteer from 'puppeteer';
import { SwissQRBillData } from './swissQRBill';
import { SwissQRBill } from 'swissqrbill/svg';
import { getAccessibleAccentColor } from './pdfColorUtils';

/**
 * InvoicePDF component with Swiss QR Bill integration
 * Handles multi-page support with QR Bill on last page and dynamic content height calculation
 */

export interface InvoiceData {
  invoiceNumber: string;
  logoUrl?: string; // Optional company logo URL or file path
  issueDate: Date;
  dueDate: Date;
  language?: 'fr' | 'de' | 'it' | 'en';
  
  // Company information
  company: {
    name: string;
    address: string;
    street?: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    iban?: string;
  };
  
  // Client information
  client: {
    name: string;
    address: string;
    street?: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
  };
  
  // Invoice items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    taxRate?: number; // Alias for tvaRate
    total: number;
    unit?: string;
    lineDiscountValue?: number;
    lineDiscountType?: 'PERCENT' | 'AMOUNT';
    discountAmount?: number;
    subtotalBeforeDiscount?: number;
    subtotalAfterDiscount?: number;
  }>;
  
  // Totals
  subtotal: number;
  tvaAmount?: number;
  taxAmount?: number; // Alias for tvaAmount
  total: number;
  currency: 'CHF' | 'EUR';
  
  // Discounts
  globalDiscount?: {
    value: number;
    type: 'PERCENT' | 'AMOUNT';
    note?: string;
  };
  
  // Additional information
  notes?: string;
  terms?: string;
}

export interface PDFAdvancedConfig {
  elements?: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    locked: boolean;
    visible: boolean;
    fontSize?: number;
    align?: string;
    resizable?: boolean;
  }>;
  backgroundImages?: Array<{
    id: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    opacity: number;
    visible: boolean;
    src: string;
  }>;
  colors?: {
    primary: string;
    tableHeader: string;
    headerBg: string;
    textHeader: string;
    textBody: string;
  };
  theme?: {
    key: string;
    name?: string;
  };
  // Page numbering options
  showPageNumbers?: boolean;
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-right';
  pageNumberFormat?: 'simple' | 'full'; // 'simple' = "1", 'full' = "Page 1 / 3"
}

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  language?: 'de' | 'fr' | 'it' | 'en';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  qrBillOnSeparatePage?: boolean;
  // Visual template/styling options (used by both HTML and PDFKit renderers)
  template?: 'elegant_classic' | 'minimal_modern' | 'formal_pro' | 'creative_premium' | 'clean_creative' | 'bold_statement';
  accentColor?: string; // Hex color for accents (e.g., headers/totals)
  advancedConfig?: PDFAdvancedConfig; // Advanced editor configuration
}

// Type for resolved options with defaults
type ResolvedPDFOptions = {
  format: 'A4' | 'Letter';
  language: 'de' | 'fr' | 'it' | 'en';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  qrBillOnSeparatePage: boolean;
  template: 'elegant_classic' | 'minimal_modern' | 'formal_pro' | 'creative_premium' | 'clean_creative' | 'bold_statement';
  accentColor: string;
  advancedConfig?: PDFAdvancedConfig;
};

// Default PDF options
const DEFAULT_PDF_OPTIONS: ResolvedPDFOptions = {
  format: 'A4',
  language: 'fr',
  margins: {
    top: 20,
    right: 15,
    bottom: 0, // No bottom margin to prevent extra page
    left: 15,
  },
  qrBillOnSeparatePage: false,
  template: 'elegant_classic',
  accentColor: '#0B1F3A',
};

// Helper to resolve options with defaults
function resolveOptions(options: PDFGenerationOptions): ResolvedPDFOptions {
  return {
    ...DEFAULT_PDF_OPTIONS,
    ...options,
    margins: { ...DEFAULT_PDF_OPTIONS.margins, ...options.margins },
  };
}

/**
 * Main function to generate invoice PDF with integrated Swiss QR Bill
 */
export async function generateInvoicePDFWithQRBill(
  invoiceData: InvoiceData,
  qrBillData: SwissQRBillData,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const opts = resolveOptions(options);

  let browser: puppeteer.Browser | null = null;

  try {
    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
    });

    const page = await browser.newPage();

    // Set page format and viewport
    await page.setViewport({ width: 794, height: 1123 }); // A4 dimensions in pixels at 96 DPI

    // Generate the complete HTML content with integrated QR Bill
    const htmlContent = generateInvoiceHTML(invoiceData, qrBillData, opts);

    // Forward console logs from page to backend console
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Metrics]') || text.includes('[QR Bill]') || text.includes('[PDF Generation]') || text.includes('===')) {
        console.log(`[Puppeteer] ${text}`);
      }
    });

    // Set HTML content and wait for it to load
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for layout to stabilize
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('[PDF Generation] Page loaded and ready');

    // Page numbering configuration - needed BEFORE calculateContentMetrics
    // Default to 'top-right' to avoid conflicts with table content and QR Bill at bottom
    const showPageNumbers = opts.advancedConfig?.showPageNumbers ?? false;
    const pageNumberPosition = opts.advancedConfig?.pageNumberPosition ?? 'top-right';
    
    // Calculate actual PDF margins for Puppeteer and @page (must match!)
    // Using 10mm for top margin to allow more content per page
    const pdfTopMarginMM = showPageNumbers && pageNumberPosition === 'top-right' ? 10 : opts.margins.top;
    const pdfBottomMarginMM = showPageNumbers && pageNumberPosition !== 'top-right' ? 20 : opts.margins.bottom;
    
    // Calculate content height and determine if QR Bill fits on last page
    const contentMetrics = await calculateContentMetrics(page, pdfTopMarginMM, pdfBottomMarginMM);
    const pageNumberFormat = opts.advancedConfig?.pageNumberFormat ?? 'full';
    
    // Build header/footer templates for page numbers
    let headerTemplate = '<span></span>';
    let footerTemplate = '<span></span>';
    
    if (showPageNumbers) {
      const pageNumText = pageNumberFormat === 'full' 
        ? 'Page <span class="pageNumber"></span> / <span class="totalPages"></span>'
        : '<span class="pageNumber"></span>';
      
      // Style based on position - minimal styling to avoid blank pages
      const baseStyle = 'font-size: 9px; font-family: Arial, sans-serif; color: #666; width: 100%; margin: 0; padding: 0;';
      
      if (pageNumberPosition === 'bottom-center') {
        footerTemplate = `<div style="${baseStyle} text-align: center; margin-top: 5px;">${pageNumText}</div>`;
      } else if (pageNumberPosition === 'bottom-right') {
        footerTemplate = `<div style="${baseStyle} text-align: right; padding-right: 15mm; margin-top: 5px;">${pageNumText}</div>`;
      } else if (pageNumberPosition === 'top-right') {
        headerTemplate = `<div style="${baseStyle} text-align: right; padding-right: 15mm; margin-bottom: 5px;">${pageNumText}</div>`;
      }
    }
    
    // Page numbering configuration
    const showPageNumbers = opts.advancedConfig?.showPageNumbers ?? false;
    const pageNumberPosition = opts.advancedConfig?.pageNumberPosition ?? 'bottom-center';
    const pageNumberFormat = opts.advancedConfig?.pageNumberFormat ?? 'full';
    
    // Build header/footer templates for page numbers
    let headerTemplate = '<span></span>';
    let footerTemplate = '<span></span>';
    
    if (showPageNumbers) {
      const pageNumText = pageNumberFormat === 'full' 
        ? 'Page <span class="pageNumber"></span> / <span class="totalPages"></span>'
        : '<span class="pageNumber"></span>';
      
      // Style based on position - minimal styling to avoid blank pages
      const baseStyle = 'font-size: 9px; font-family: Arial, sans-serif; color: #666; width: 100%; margin: 0; padding: 0;';
      
      if (pageNumberPosition === 'bottom-center') {
        footerTemplate = `<div style="${baseStyle} text-align: center; margin-top: 5px;">${pageNumText}</div>`;
      } else if (pageNumberPosition === 'bottom-right') {
        footerTemplate = `<div style="${baseStyle} text-align: right; padding-right: 15mm; margin-top: 5px;">${pageNumText}</div>`;
      } else if (pageNumberPosition === 'top-right') {
        headerTemplate = `<div style="${baseStyle} text-align: right; padding-right: 15mm; margin-bottom: 5px;">${pageNumText}</div>`;
      }
    }
    
    // Generate PDF with proper page breaks
    // Note: displayHeaderFooter requires at least some margin to render header/footer
    const pdfBuffer = await page.pdf({
      format: opts.format,
      margin: {
        top: showPageNumbers && pageNumberPosition === 'top-right' ? '12mm' : `${opts.margins.top}mm`,
        right: `${opts.margins.right}mm`,
        bottom: showPageNumbers && pageNumberPosition !== 'top-right' ? '20mm' : `${opts.margins.bottom}mm`,
        left: `${opts.margins.left}mm`,
      },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: showPageNumbers,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate,
      omitBackground: false,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF with QR Bill:', error);
    throw new Error(`Erreur lors de la génération du PDF de facture: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Calculates content metrics and positions QR Bill appropriately
 * This runs in Puppeteer context BEFORE PDF generation
 */
async function calculateContentMetrics(
  page: puppeteer.Page,
  pdfTopMarginMM: number = 20,
  pdfBottomMarginMM: number = 0
): Promise<{
  contentHeight: number;
  availableHeight: number;
  needsNewPageForQRBill: boolean;
}> {
  const metrics = await page.evaluate((topMargin: number, bottomMargin: number) => {
    const doc = (globalThis as any).document;
    const MM_TO_PX = 96 / 25.4;
    const PAGE_HEIGHT_MM = 297;
    const QR_BILL_HEIGHT_MM = 105;
    const QR_BILL_TOP_MM = PAGE_HEIGHT_MM - QR_BILL_HEIGHT_MM; // 192mm
    const SAFETY_MARGIN_MM = 5; // Reduced from 10 to allow more content per page
    
    // Use actual margins passed from caller
    const PDF_TOP_MARGIN_MM = topMargin;
    const PDF_BOTTOM_MARGIN_MM = bottomMargin;
    
    const container = doc.querySelector('.invoice-container');
    const qrBill = doc.querySelector('.qr-bill-container');
    
    if (!container || !qrBill) {
      console.log('[Metrics] Missing container or qrBill');
      return { contentHeight: 0, availableHeight: PAGE_HEIGHT_MM - 40, needsNewPageForQRBill: false };
    }

    // Measure content height by summing individual element heights
    // This is more reliable than scrollHeight which can be affected by pagination
    let maxContentBottomPx = 0;
    let maxElementInfo = 'none';
    
    // For advanced theme: header-container + flow-content
    const headerContainer = doc.querySelector('.header-container') as any;
    const flowContent = doc.querySelector('.flow-content') as any;
    
    // For standard theme: invoice-content
    const invoiceContent = doc.querySelector('.invoice-content') as any;
    
    if (headerContainer && flowContent) {
      // Advanced theme - DON'T try to measure, let CSS handle page breaks
      // Just ensure QR Bill has page-break-before: avoid applied
      maxContentBottomPx = 0; // Will trigger "fits on page" logic
      maxElementInfo = 'css-only';
      console.log('[Metrics] Using CSS-only approach for advanced theme');
    } else if (invoiceContent) {
      // Standard theme - measure children (excluding QR Bill)
      let contentHeight = 0;
      const children = invoiceContent.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as any;
        if (!child.classList?.contains('qr-bill-container')) {
          contentHeight += child.offsetHeight || 0;
        }
      }
      maxContentBottomPx = contentHeight;
      maxElementInfo = 'invoice-content-children';
      console.log('[Metrics] Invoice content children:', contentHeight, 'px');
    }
    
    console.log('[Metrics] Total content height:', maxContentBottomPx, 'px');
    
    // Convert to mm and calculate remaining space on last page
    // @page margin affects where HTML breaks pages
    // PDF_TOP_MARGIN_MM reflects the @page margin-top (15mm for top-right numbering)
    const HTML_PAGE_HEIGHT_MM = PAGE_HEIGHT_MM; // 297mm - full A4 height
    const CSS_PAGE_HEIGHT_MM = PAGE_HEIGHT_MM - PDF_TOP_MARGIN_MM; // 282mm with top numbering, 297mm without
    
    const maxContentBottomMM = maxContentBottomPx / MM_TO_PX;
    
    // Simple calculation: does content + QR Bill fit on a single page?
    // If content is on first page and there's room for QR, keep it together
    const totalWithQRMM = maxContentBottomMM + QR_BILL_HEIGHT_MM + SAFETY_MARGIN_MM;
    const fitsOnSinglePage = totalWithQRMM <= CSS_PAGE_HEIGHT_MM;
    
    // For multi-page invoices, calculate remaining space on last page
    let usedInLastPageMM = maxContentBottomMM % CSS_PAGE_HEIGHT_MM;
    if (usedInLastPageMM === 0 && maxContentBottomMM > 0) {
      usedInLastPageMM = CSS_PAGE_HEIGHT_MM;
    }
    const spaceRemainingMM = CSS_PAGE_HEIGHT_MM - usedInLastPageMM;
    const fitsOnLastPage = fitsOnSinglePage || (spaceRemainingMM >= (QR_BILL_HEIGHT_MM + SAFETY_MARGIN_MM));
    
    console.log('[Metrics] CSS page height:', CSS_PAGE_HEIGHT_MM, 'mm');
    
    console.log('[Metrics] HTML page height:', HTML_PAGE_HEIGHT_MM, 'mm');
    const needsNewPageForQRBill = !fitsOnLastPage;
    
    console.log('=== PDF Content Metrics ===');
    console.log('[Metrics] Max content bottom:', maxContentBottomMM.toFixed(2), 'mm');
    console.log('[Metrics] Max element:', maxElementInfo);
    console.log('[Metrics] Space remaining on last page:', spaceRemainingMM.toFixed(2), 'mm');
    console.log('[Metrics] Fits on last page?', fitsOnLastPage);
    console.log('[Metrics] Needs new page for QR Bill?', needsNewPageForQRBill);
    
    // APPLY QR BILL POSITIONING - USE SPACER TO PUSH TO BOTTOM
    // Use effective page height (already accounts for margins)
    
    if (needsNewPageForQRBill) {
      console.log('[Metrics] ⏭️  MOVING QR BILL TO NEW PAGE (at bottom)');
      
      // Calculate spacer to push QR Bill to bottom of new page
      // CSS page height = 277mm, QR Bill = 105mm, so spacer = 172mm
      const spacerHeightMM = CSS_PAGE_HEIGHT_MM - QR_BILL_HEIGHT_MM;
      const spacerHeightPx = spacerHeightMM * MM_TO_PX;
      console.log('[Metrics] Creating spacer: height =', spacerHeightMM, 'mm =', spacerHeightPx.toFixed(0), 'px');
      
      // Create spacer that forces page break and pushes QR to bottom
      const spacer = doc.createElement('div');
      spacer.className = 'qr-bill-spacer';
      spacer.style.pageBreakBefore = 'always';
      spacer.style.height = spacerHeightPx + 'px';
      spacer.style.width = '100%';
      spacer.style.margin = '0';
      spacer.style.padding = '0';
      
      // Insert spacer before QR Bill
      if (qrBill.parentNode) {
        qrBill.parentNode.insertBefore(spacer, qrBill);
        console.log('[Metrics] Spacer inserted successfully');
      } else {
        console.log('[Metrics] ERROR: qrBill has no parentNode');
      }
      
      // Style QR Bill - keep CSS margin-bottom for @page compensation
      qrBill.style.position = 'relative';
      qrBill.style.width = '210mm';
      qrBill.style.height = '105mm';
      qrBill.style.marginTop = '0';
      qrBill.style.marginLeft = '0';
      qrBill.style.marginRight = '0';
      // margin-bottom is set in CSS to compensate for @page margin
      qrBill.style.pageBreakBefore = 'avoid';
      qrBill.style.pageBreakInside = 'avoid';
      qrBill.style.background = 'white';
    } else {
      console.log('[Metrics] ✅ QR BILL FITS ON LAST PAGE - no spacer needed, flow naturally');
      
      // Don't add spacers - just let QR Bill flow naturally after content
      // This ensures it stays on the same page as the content
      qrBill.style.position = 'relative';
      qrBill.style.width = '210mm';
      qrBill.style.height = '105mm';
      qrBill.style.margin = '0';
      qrBill.style.marginTop = '10mm'; // Small gap after totals
      qrBill.style.pageBreakBefore = 'avoid';
      qrBill.style.pageBreakInside = 'avoid';
      qrBill.style.background = 'white';
    }
    console.log('===========================');

    return {
      contentHeight: maxContentBottomMM,
      availableHeight: QR_BILL_TOP_MM,
      needsNewPageForQRBill,
    };
  }, pdfTopMarginMM, pdfBottomMarginMM) as { contentHeight: number; availableHeight: number; needsNewPageForQRBill: boolean };

  console.log('[PDF Generation] Content metrics:', metrics);
  return metrics;
}

/**
 * Helper to check if an element is visible in advanced config
 */
export function isElementVisible(elementId: string, advancedConfig?: any): boolean {
  if (!advancedConfig?.elements) return true;
  const element = advancedConfig.elements.find((el: any) => el.id === elementId);
  return element ? element.visible !== false : true;
}

/**
 * Helper to get element position from advanced config
 */
export function getElementPosition(elementId: string, advancedConfig?: any): { x: number; y: number; width: number; height: number } | null {
  if (!advancedConfig?.elements) return null;
  const element = advancedConfig.elements.find((el: any) => el.id === elementId);
  if (!element) return null;
  return {
    x: element.position.x,
    y: element.position.y,
    width: element.size.width,
    height: element.size.height
  };
}

/**
 * Helper to get colors from advanced config
 */
export function getColors(advancedConfig?: any, defaultColor: string = '#000000'): any {
  if (!advancedConfig?.colors) {
    return {
      primary: defaultColor,
      tableHeader: defaultColor,
      headerBg: '#f3f4f6',
      textHeader: '#ffffff',
      textBody: '#374151'
    };
  }
  return advancedConfig.colors;
}

/**
 * Helper: Convert px (from 595x842 editor) to mm (210x297 PDF)
 */
export function pxToMM(px: number, isWidth: boolean): number {
  const EDITOR_WIDTH = 595;
  const EDITOR_HEIGHT = 842;
  const PDF_WIDTH_MM = 210;
  const PDF_HEIGHT_MM = 297;
  
  if (isWidth) {
    return (px / EDITOR_WIDTH) * PDF_WIDTH_MM;
  } else {
    return (px / EDITOR_HEIGHT) * PDF_HEIGHT_MM;
  }
}

/**
 * Render element based on advanced config position
 */
export function renderPositionedElement(
  element: any,
  invoiceData: InvoiceData,
  colors: any,
  documentType: 'FACTURE' | 'DEVIS' = 'FACTURE'
): string {
  const leftMM = pxToMM(element.position.x, true);
  const topMM = pxToMM(element.position.y, false);
  const widthMM = pxToMM(element.size.width, true);
  const heightMM = pxToMM(element.size.height, false);
  
  const baseStyle = `position: absolute; left: ${leftMM}mm; top: ${topMM}mm; width: ${widthMM}mm; height: ${heightMM}mm; z-index: 10;`;
  
  let content = '';
  
  switch (element.id) {
    case 'logo':
      if (invoiceData.company.logoUrl || invoiceData.logoUrl) {
        const logoUrl = invoiceData.company.logoUrl?.startsWith('http') 
          ? invoiceData.company.logoUrl 
          : 'http://localhost:3001/' + (invoiceData.company.logoUrl || invoiceData.logoUrl);
        content = `<img src="${logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="Logo" />`;
      }
      break;
    
    case 'company_name':
      content = `<div style="font-size: ${element.fontSize || 18}px; font-weight: ${element.fontWeight || 'bold'}; color: ${colors.primary};">${invoiceData.company.name}</div>`;
      break;
    
    case 'company_info':
      content = `
        <div style="font-size: 10px; line-height: 1.4;">
          ${invoiceData.company.address}<br/>
          ${invoiceData.company.postalCode} ${invoiceData.company.city}<br/>
          ${invoiceData.company.country}<br/>
          ${invoiceData.company.vatNumber ? `TVA: ${invoiceData.company.vatNumber}<br/>` : ''}
          ${invoiceData.company.phone ? `Tél: ${invoiceData.company.phone}<br/>` : ''}
          ${invoiceData.company.email ? `Email: ${invoiceData.company.email}` : ''}
        </div>
      `;
      break;
    
    case 'doc_title':
      content = `<div style="font-size: ${element.fontSize || 24}px; font-weight: ${element.fontWeight || 'bold'}; color: ${colors.primary}; text-align: ${element.align || 'left'};">${documentType}</div>`;
      break;
    
    case 'doc_number':
      content = `<div style="font-size: ${element.fontSize || 12}px; text-align: ${element.align || 'left'};">N° ${invoiceData.invoiceNumber}</div>`;
      break;
    
    case 'client_info':
      content = `
        <div style="font-size: 10px; line-height: 1.4;">
          <strong>Facturé à:</strong><br/>
          <strong>${invoiceData.client.name}</strong><br/>
          ${invoiceData.client.address}<br/>
          ${invoiceData.client.postalCode} ${invoiceData.client.city}<br/>
          ${invoiceData.client.country}
          ${invoiceData.client.vatNumber ? `<br/>TVA: ${invoiceData.client.vatNumber}` : ''}
        </div>
      `;
      break;
    
    default:
      content = `<div style="font-size: 10px;">${element.label || element.id}</div>`;
  }
  
  return `<div style="${baseStyle} overflow: hidden;">${content}</div>`;
}

/**
 * Generates complete HTML content for invoice with integrated QR Bill
 */
function generateInvoiceHTML(
  invoiceData: InvoiceData,
  qrBillData: SwissQRBillData,
  options: ResolvedPDFOptions
): string {
  const { language, advancedConfig } = options;
  const colors = getColors(advancedConfig, options.accentColor);
  const discountPreferredColor = '#059669';
  const discountLineColor = getAccessibleAccentColor('#ffffff', discountPreferredColor);
  // For totals section, background is white, so use green directly
  const discountTotalsColor = '#059669'; // Green on white background

  // Calculate margins for CSS
  // Bottom margin is 0 to let QR flow naturally
  const pageBottomMarginMM = 0;
  
  const showPageNumbers = advancedConfig?.showPageNumbers ?? false;
  const pageNumberPosition = advancedConfig?.pageNumberPosition ?? 'top-right';
  
  // Top margin needs to be set if we have top page numbers, otherwise 0 (handled by padding in first page)
  // Using 10mm instead of 15mm to allow more content per page
  const pageTopMarginMM = (showPageNumbers && pageNumberPosition === 'top-right') ? 10 : 0;

  // Generate QR Bill HTML
  const qrBillHTML = generateQRBillHTML(qrBillData, options);

  // Format dates in French
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Check if unit is kilogram (handles various forms: kg, Kilogramme, kilogramme, kilo, etc.)
  const isKilogramUnit = (unit?: string | null): boolean => {
    if (!unit) return false;
    const lower = unit.toLowerCase().trim();
    const kgVariants = ['kg', 'kilogramme', 'kilogrammes', 'kilogram', 'kilograms', 'kilo', 'kilos'];
    return kgVariants.some(v => lower === v || lower.includes(v));
  };

  // Format quantity with appropriate decimals (3 for kg, 2 for others)
  const formatQuantity = (quantity: number, unit?: string): string => {
    if (isKilogramUnit(unit)) {
      // For kg, always show exactly 3 decimals
      return quantity.toFixed(3);
    }
    // For other units, show up to 2 decimals, remove trailing zeros
    const formatted = quantity.toFixed(2);
    return parseFloat(formatted).toString();
  };

  // Check if any item has discounts
  const hasLineDiscounts = invoiceData.items.some(item => item.lineDiscountValue && item.lineDiscountValue > 0);

  // Debug: Log discount data
  console.log('[PDF] invoiceData.globalDiscount:', invoiceData.globalDiscount);
  console.log('[PDF] Items with discounts:', invoiceData.items.map(item => ({
    desc: item.description,
    lineDiscountValue: item.lineDiscountValue,
    lineDiscountType: item.lineDiscountType
  })));

  // Generate invoice items HTML with page break awareness
  const itemsHTML = invoiceData.items.map((item, index) => {
    // Check if this item has a discount to determine which amount to display
    const hasLineDiscount = (item.lineDiscountValue ?? 0) > 0 || (item.discountAmount ?? 0) > 0;
    // Show subtotalBeforeDiscount (100%) in the line if there's a discount, otherwise show total
    const lineDisplayTotal = hasLineDiscount 
      ? (item.subtotalBeforeDiscount ?? (item.quantity * item.unitPrice))
      : item.total;
    
    let itemHTML = `
    <tr class="invoice-item ${index > 0 && index % 15 === 0 ? 'page-break-before' : ''}">
      <td class="item-description">${item.description}</td>
      <td class="item-quantity">${formatQuantity(item.quantity, item.unit)}</td>
      <td class="item-price">${formatCurrency(item.unitPrice, invoiceData.currency)}</td>
      <td class="item-tva">${item.tvaRate.toFixed(2)}%</td>
      <td class="item-total">${formatCurrency(lineDisplayTotal, invoiceData.currency)}</td>
    </tr>`;
    
    // Add discount row if item has discount
    if (hasLineDiscount) {
      const baseSubtotal = item.subtotalBeforeDiscount ?? (item.quantity * item.unitPrice);

      let discountAmountValue = item.discountAmount ?? null;
      if (discountAmountValue === null) {
        if (item.lineDiscountType === 'PERCENT') {
          const percent = item.lineDiscountValue || 0;
          discountAmountValue = Math.max(baseSubtotal - item.total, 0);
        } else if (item.lineDiscountType === 'AMOUNT') {
          discountAmountValue = item.lineDiscountValue ?? 0;
        } else {
          discountAmountValue = Math.max(baseSubtotal - item.total, 0);
        }
      }

      const positiveDiscountAmount = discountAmountValue && discountAmountValue > 0
        ? Math.abs(discountAmountValue)
        : 0;

      let discountLabel: string;
      let discountAmountSuffix = '';

      if (item.lineDiscountValue && item.lineDiscountValue > 0) {
        discountLabel = item.lineDiscountType === 'PERCENT'
          ? `${item.lineDiscountValue}%`
          : formatCurrency(item.lineDiscountValue, invoiceData.currency);
        if (positiveDiscountAmount > 0) {
          discountAmountSuffix = ` (-${formatCurrency(positiveDiscountAmount, invoiceData.currency)})`;
        }
      } else if (positiveDiscountAmount > 0) {
        discountLabel = `-${formatCurrency(positiveDiscountAmount, invoiceData.currency)}`;
      } else {
        discountLabel = 'Remise appliquée';
      }

      itemHTML += `
    <tr class="discount-row">
      <td colspan="5" style="text-align: left; padding: 6px 18px; font-size: 9px; color: ${discountLineColor}; background: rgba(5, 150, 105, 0.08); border-bottom: 1px solid rgba(5, 150, 105, 0.12);">
        <em>Remise: ${discountLabel}${discountAmountSuffix}</em>
      </td>
    </tr>`;
    }
    
    return itemHTML;
  }).join('');

  // Calculate TVA breakdown
  const tvaBreakdown = invoiceData.items.reduce((acc, item) => {
    const rate = item.tvaRate;
    if (!acc[rate]) {
      acc[rate] = { net: 0, tva: 0, total: 0 };
    }
    const net = item.total / (1 + rate / 100);
    const tva = item.total - net;
    acc[rate].net += net;
    acc[rate].tva += tva;
    acc[rate].total += item.total;
    return acc;
  }, {} as Record<number, { net: number; tva: number; total: number }>);

  const tvaBreakdownHTML = Object.entries(tvaBreakdown).map(([rate, amounts]) => `
    <tr class="tax-row">
      <td>TVA ${parseFloat(rate).toFixed(2)}%</td>
      <td style="text-align: right;">${formatCurrency(amounts.tva, invoiceData.currency)}</td>
    </tr>
  `).join('');

  const hasGlobalDiscount = !!(invoiceData.globalDiscount && invoiceData.globalDiscount.value > 0);
  console.log('[PDF] Global Discount Check:', {
    hasGlobalDiscount,
    globalDiscount: invoiceData.globalDiscount,
    value: invoiceData.globalDiscount?.value,
    type: invoiceData.globalDiscount?.type
  });
  const globalDiscountValue = hasGlobalDiscount ? Number(invoiceData.globalDiscount!.value) : 0;
  const globalDiscountDisplayValue = hasGlobalDiscount
    ? (invoiceData.globalDiscount!.type === 'PERCENT'
        ? `${globalDiscountValue}%`
        : formatCurrency(globalDiscountValue, invoiceData.currency))
    : '';
  const globalDiscountAmount = hasGlobalDiscount
    ? (invoiceData.globalDiscount!.type === 'PERCENT'
        ? invoiceData.subtotal * globalDiscountValue / 100
        : globalDiscountValue)
    : 0;

  // Generate global discount HTML
  const globalDiscountHTML = hasGlobalDiscount 
    ? `
    <tr class="discount-row" style="color: ${discountTotalsColor};">
      <td style="color: ${discountTotalsColor};">
        Remise globale${invoiceData.globalDiscount?.note ? `: ${invoiceData.globalDiscount.note}` : ''} 
        (${globalDiscountDisplayValue})
      </td>
      <td style="text-align: right; color: ${discountTotalsColor};">
        -${formatCurrency(globalDiscountAmount, invoiceData.currency)}
      </td>
    </tr>`
    : '';

  const globalDiscountCustomHTML = hasGlobalDiscount
    ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: ${discountTotalsColor};">
                <span>Remise globale${invoiceData.globalDiscount?.note ? `: ${invoiceData.globalDiscount.note}` : ''} (${globalDiscountDisplayValue})</span>
                <span>- ${formatCurrency(globalDiscountAmount, invoiceData.currency)}</span>
              </div>
            `
    : '';

  // Generate background images HTML if advanced config has them
  // Frontend editor uses 595x842px (A4 at 72 DPI)
  // PDF uses 210x297mm
  // Conversion: px to mm -> (px / 595) * 210 for width, (px / 842) * 297 for height
  const EDITOR_WIDTH = 595;
  const EDITOR_HEIGHT = 842;
  const PDF_WIDTH_MM = 210;
  const PDF_HEIGHT_MM = 297;
  
  const backgroundImagesHTML = advancedConfig?.backgroundImages
    ? advancedConfig.backgroundImages
        .filter(img => img.visible !== false)
        .map(img => {
          let leftMM = (img.position.x / EDITOR_WIDTH) * PDF_WIDTH_MM;
          let topMM = (img.position.y / EDITOR_HEIGHT) * PDF_HEIGHT_MM;
          let widthMM = (img.size.width / EDITOR_WIDTH) * PDF_WIDTH_MM;
          let heightMM = (img.size.height / EDITOR_HEIGHT) * PDF_HEIGHT_MM;
          
          // Clip to page boundaries to prevent PDF scaling
          if (leftMM < 0) {
            widthMM += leftMM;
            leftMM = 0;
          }
          if (topMM < 0) {
            heightMM += topMM;
            topMM = 0;
          }
          if (leftMM + widthMM > PDF_WIDTH_MM) {
            widthMM = PDF_WIDTH_MM - leftMM;
          }
          if (topMM + heightMM > PDF_HEIGHT_MM) {
            heightMM = PDF_HEIGHT_MM - topMM;
          }
          
          // Skip if completely outside page
          if (widthMM <= 0 || heightMM <= 0) return '';
          
          return `
          <div class="background-image" style="position: absolute; left: ${leftMM}mm; top: ${topMM}mm; width: ${widthMM}mm; height: ${heightMM}mm; opacity: ${img.opacity || 1}; z-index: 1; pointer-events: none; overflow: hidden;">
            <img src="${img.src.startsWith('http') ? img.src : 'http://localhost:3001/' + img.src}" style="width: 100%; height: 100%; object-fit: cover;" alt="Background" />
          </div>
          `;
        })
        .join('')
    : '';

  // Check if we have custom positioning from advancedConfig
  const useCustomPositioning = advancedConfig?.elements && advancedConfig.elements.length > 0;
  
  // Check if there's a positioned QR Bill zone
  const hasPositionedQRBillZone = useCustomPositioning && 
    advancedConfig?.elements?.some((el: any) => el.id === 'qr_bill_zone' && el.visible !== false);

  // Debug log to see what we're receiving
  if (useCustomPositioning && advancedConfig?.elements) {
    console.log('[PDF Generation] Using custom positioning with', advancedConfig.elements.length, 'elements');
    console.log('[PDF Generation] Has positioned QR Bill zone:', hasPositionedQRBillZone);
  } else {
    console.log('[PDF Generation] Using default template (no advancedConfig.elements)');
  }

  // Generate positioned elements if custom config exists
  let contentHTML = '';
  
  if (useCustomPositioning && advancedConfig.elements) {
    // HYBRID APPROACH CORRECTED:
    // - Header elements (logo, company, client, title, number) use ABSOLUTE positioning on page 1
    // - Table and totals use FLOW positioning for proper page breaks
    // - QR Bill uses ABSOLUTE positioning at bottom of last page
    
    const headerElementIds = ['logo', 'company_name', 'company_info', 'client_info', 'doc_title', 'doc_number'];
    
    // Render header elements with ABSOLUTE positioning (respects theme editor)
    const headerElements = advancedConfig.elements
      .filter((el: any) => el.visible !== false && headerElementIds.includes(el.id))
      .map((el: any) => renderPositionedElement(el, invoiceData, colors))
      .join('');
    
    // Get table config for flow content positioning
    const tableConfig = advancedConfig.elements.find((el: any) => el.id === 'table' && el.visible !== false);
    const tableTopMM = tableConfig ? pxToMM(tableConfig.position.y, false) : 80;
    const tableLeftMM = tableConfig ? pxToMM(tableConfig.position.x, true) : 20;
    const tableWidthMM = tableConfig ? pxToMM(tableConfig.size.width, true) : 170;
    
    // Render ONLY table and totals in flow layout
    const flowElements = advancedConfig.elements
      .filter((el: any) => el.visible !== false && (el.id === 'table' || el.id === 'totals'))
      .map((el: any) => {
        if (el.id === 'table') {
          const widthMM = pxToMM(el.size.width, true);
          
          // Get table style from advanced config (default: classic)
          const tableStyle = (advancedConfig as any)?.tableStyle || 'classic';
          
          // Define styles based on tableStyle
          let tableContainerStyle = '';
          let headerRowStyle = '';
          let headerCellStyle = '';
          let bodyRowStyle = (index: number) => '';
          
          if (tableStyle === 'classic') {
            // Classic: Zebra striping with alternating row colors
            tableContainerStyle = 'border: 1px solid #ddd; border-radius: 4px;';
            headerRowStyle = `background-color: ${colors.tableHeader}; color: ${colors.textHeader};`;
            headerCellStyle = 'padding: 6px; border: 1px solid #ddd;';
            bodyRowStyle = (index: number) => index % 2 === 0 ? 'background-color: white;' : `background-color: ${colors.altRow || '#f9fafb'};`;
          } else if (tableStyle === 'modern') {
            // Modern: Clean design with subtle borders
            tableContainerStyle = '';
            headerRowStyle = `border-bottom: 2px solid ${colors.primary}; color: ${colors.textHeader};`;
            headerCellStyle = 'padding: 6px; border: none;';
            bodyRowStyle = () => 'border-bottom: 1px solid #e5e7eb;';
          } else if (tableStyle === 'bordered') {
            // Bordered: Full grid with borders on all cells
            tableContainerStyle = `border: 2px solid ${colors.primary};`;
            headerRowStyle = `background-color: ${colors.tableHeader}; color: ${colors.textHeader}; border-bottom: 2px solid ${colors.primary};`;
            headerCellStyle = `padding: 6px; border-right: 1px solid ${colors.primary};`;
            bodyRowStyle = () => `border-bottom: 1px solid ${colors.primary};`;
          } else if (tableStyle === 'minimal') {
            // Minimal: No borders, only subtle separators
            tableContainerStyle = '';
            headerRowStyle = `color: ${colors.primary};`;
            headerCellStyle = 'padding: 6px; border: none;';
            bodyRowStyle = () => 'border-bottom: 1px solid #f3f4f6;';
          } else {
            // Bold: Strong header with heavy borders
            tableContainerStyle = 'border: 2px solid #d1d5db; border-radius: 4px;';
            headerRowStyle = `background-color: ${colors.primary}; color: white; border-bottom: 4px solid ${colors.primary};`;
            headerCellStyle = 'padding: 8px; border: none; font-weight: bold;';
            bodyRowStyle = () => 'border-bottom: 2px solid #d1d5db;';
          }
          
          // Generate styled item rows with discount support
          const styledItemsHTML = invoiceData.items.map((item, index) => {
            const rowStyle = bodyRowStyle(index);
            const cellBorder = tableStyle === 'bordered' ? `border-right: 1px solid ${colors.primary};` : '';
            const cellPadding = tableStyle === 'bold' ? 'padding: 8px;' : 'padding: 6px;';
            
            // Check if this item has a discount to determine which amount to display
            const hasLineDiscount = (item.lineDiscountValue ?? 0) > 0 || (item.discountAmount ?? 0) > 0;
            // Show subtotalBeforeDiscount (100%) in the line if there's a discount, otherwise show total
            const lineDisplayTotal = hasLineDiscount 
              ? (item.subtotalBeforeDiscount ?? (item.quantity * item.unitPrice))
              : item.total;
            
            let itemHTML = `
              <tr style="${rowStyle}">
                <td style="${cellPadding} text-align: left; ${cellBorder}">${item.description}</td>
                <td style="${cellPadding} text-align: center; ${cellBorder} width: 60px;">${formatQuantity(item.quantity, item.unit)}</td>
                <td style="${cellPadding} text-align: right; ${cellBorder} width: 70px;">${formatCurrency(item.unitPrice, invoiceData.currency)}</td>
                <td style="${cellPadding} text-align: right; ${cellBorder} width: 50px;">${item.tvaRate.toFixed(2)}%</td>
                <td style="${cellPadding} text-align: right; width: 70px; ${tableStyle === 'bold' ? 'font-weight: bold;' : ''}">${formatCurrency(lineDisplayTotal, invoiceData.currency)}</td>
              </tr>
            `;
            
            // Add discount row if item has discount (already determined above)
            if (hasLineDiscount) {
              const baseSubtotal = item.subtotalBeforeDiscount ?? (item.quantity * item.unitPrice);

              let discountAmountValue = item.discountAmount ?? null;
              if (discountAmountValue === null) {
                if (item.lineDiscountType === 'PERCENT') {
                  const percent = item.lineDiscountValue || 0;
                  discountAmountValue = Math.max(baseSubtotal - item.total, 0);
                } else if (item.lineDiscountType === 'AMOUNT') {
                  discountAmountValue = item.lineDiscountValue ?? 0;
                } else {
                  discountAmountValue = Math.max(baseSubtotal - item.total, 0);
                }
              }

              const positiveDiscountAmount = discountAmountValue && discountAmountValue > 0
                ? Math.abs(discountAmountValue)
                : 0;

              let discountLabel: string;
              let discountAmountSuffix = '';

              if (item.lineDiscountValue && item.lineDiscountValue > 0) {
                discountLabel = item.lineDiscountType === 'PERCENT'
                  ? `${item.lineDiscountValue}%`
                  : formatCurrency(item.lineDiscountValue, invoiceData.currency);
                if (positiveDiscountAmount > 0) {
                  discountAmountSuffix = ` (-${formatCurrency(positiveDiscountAmount, invoiceData.currency)})`;
                }
              } else if (positiveDiscountAmount > 0) {
                discountLabel = `-${formatCurrency(positiveDiscountAmount, invoiceData.currency)}`;
              } else {
                discountLabel = 'Remise appliquée';
              }

              itemHTML += `
              <tr class="discount-row">
                <td colspan="5" style="text-align: left; padding: 6px 18px; font-size: 9px; color: ${discountLineColor}; background: rgba(5, 150, 105, 0.08); border-bottom: 1px solid rgba(5, 150, 105, 0.12);">
                  <em>Remise: ${discountLabel}${discountAmountSuffix}</em>
                </td>
              </tr>`;
            }
            
            return itemHTML;
          }).join('');

          // Table uses FLOW positioning for page break support
          return `
            <div class="flow-table" data-element-id="table" style="margin-left: ${tableLeftMM}mm; margin-right: ${210 - tableLeftMM - tableWidthMM}mm; width: ${tableWidthMM}mm;">
              <table style="width: 100%; border-collapse: collapse; font-size: 9px; ${tableContainerStyle}">
                <thead style="display: table-header-group;">
                  <tr style="${headerRowStyle}">
                    <th style="${headerCellStyle} text-align: left;">Description</th>
                    <th style="${headerCellStyle} text-align: center; width: 60px;">Qté</th>
                    <th style="${headerCellStyle} text-align: right; width: 70px;">Prix Unit.</th>
                    <th style="${headerCellStyle} text-align: right; width: 50px;">TVA</th>
                    <th style="${headerCellStyle.replace('border-right', 'border-right: none')} text-align: right; width: 70px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${styledItemsHTML}
                </tbody>
              </table>
            </div>
          `;
        } else if (el.id === 'totals') {
          const widthMM = pxToMM(el.size.width, true);
          
          // Get totals style from advanced config (default: filled)
          const totalsStyle = (advancedConfig as any)?.totalsStyle || 'filled';
          
          // Define styles based on totalsStyle
          let containerStyle = '';
          let totalBorderStyle = '';
          
          if (totalsStyle === 'filled') {
            // Filled: background color with white text
            containerStyle = `background: ${colors.primary}; color: white;`;
            totalBorderStyle = 'border-top: 1px solid rgba(255,255,255,0.3);';
          } else if (totalsStyle === 'outlined') {
            // Outlined: border with colored text
            containerStyle = `background: transparent; color: ${colors.textBody}; border: 2px solid ${colors.primary};`;
            totalBorderStyle = `border-top: 1px solid ${colors.primary}; color: ${colors.primary};`;
          } else {
            // Minimal: no background, colored text only
            containerStyle = `background: transparent; color: ${colors.textBody};`;
            totalBorderStyle = `border-top: 1px solid ${colors.primary}; color: ${colors.primary};`;
          }

          // Totals uses FLOW positioning, aligned to right of table
          return `
            <div class="flow-totals" data-element-id="totals" style="margin-left: auto; margin-right: ${210 - tableLeftMM - tableWidthMM}mm; margin-top: 8mm; margin-bottom: 15mm; width: ${widthMM}mm; ${containerStyle} padding: 10px; border-radius: 8px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
                <span>Sous-total:</span>
                <span>${formatCurrency(invoiceData.subtotal, invoiceData.currency)}</span>
              </div>
              ${Object.entries(tvaBreakdown).map(([rate, amounts]) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
                  <span>TVA ${parseFloat(rate).toFixed(2)}%:</span>
                  <span>${formatCurrency(amounts.tva, invoiceData.currency)}</span>
                </div>
              `).join('')}
              ${globalDiscountCustomHTML}
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; ${totalBorderStyle} padding-top: 8px;">
                <span>TOTAL:</span>
                <span>${formatCurrency(invoiceData.total, invoiceData.currency)}</span>
              </div>
            </div>
          `;
        }
        return '';
      })
      .filter((html: string) => html.trim() !== '')
      .join('');
    
    // HEADER CONTAINER APPROACH:
    // 1. Header container occupies space on Page 1 (height = tableTopMM)
    // 2. Absolute elements are positioned relative to this container
    // 3. Flow content follows naturally
    
    contentHTML = `
      <div class="header-container" style="position: relative; width: 100%; min-height: ${tableTopMM}mm;">
        ${headerElements}
      </div>
      <div class="flow-content" style="position: relative; z-index: 10; padding-bottom: 5mm;">
        ${flowElements}
      </div>
    `;
  } else {
    // Use default template with normal flow
    contentHTML = `
      <div class="invoice-content">
          <!-- Invoice Header -->
          ${isElementVisible('logo', advancedConfig) || isElementVisible('company_name', advancedConfig) || isElementVisible('company_info', advancedConfig) ? `
          <div class="header">
            <div style="display: flex; align-items: flex-start; gap: 20px;">
              ${isElementVisible('logo', advancedConfig) && (invoiceData.company.logoUrl || invoiceData.logoUrl) ? `
              <div class="company-logo" style="flex-shrink: 0;">
                <img src="${invoiceData.company.logoUrl?.startsWith('http') ? invoiceData.company.logoUrl : 'http://localhost:3001/' + (invoiceData.company.logoUrl || invoiceData.logoUrl)}" alt="Logo" style="max-height: 80px; max-width: 180px; object-fit: contain;" />
              </div>
              ` : ''}
              ${isElementVisible('company_info', advancedConfig) ? `
              <div class="company-info">
                ${isElementVisible('company_name', advancedConfig) ? `<h1 style="color: ${colors.primary}">${invoiceData.company.name}</h1>` : ''}
                <p>${invoiceData.company.address}</p>
                <p>${invoiceData.company.postalCode} ${invoiceData.company.city}</p>
                <p>${invoiceData.company.country}</p>
                ${invoiceData.company.vatNumber ? `<p>TVA: ${invoiceData.company.vatNumber}</p>` : ''}
                ${invoiceData.company.phone ? `<p>Tél: ${invoiceData.company.phone}</p>` : ''}
                ${invoiceData.company.email ? `<p>Email: ${invoiceData.company.email}</p>` : ''}
              </div>
              ` : ''}
            </div>
            ${isElementVisible('doc_title', advancedConfig) || isElementVisible('doc_number', advancedConfig) ? `
            <div class="invoice-info">
              ${isElementVisible('doc_title', advancedConfig) ? `<h2 style="color: ${colors.primary}">FACTURE</h2>` : ''}
              ${isElementVisible('doc_number', advancedConfig) ? `<div class="invoice-number">N° ${invoiceData.invoiceNumber}</div>` : ''}
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <!-- Invoice Details -->
          ${isElementVisible('client_info', advancedConfig) ? `
          <div class="invoice-details">
            <div class="client-info">
              <h3 style="color: ${colors.primary}">Facturé à:</h3>
              <p><strong>${invoiceData.client.name}</strong></p>
              <p>${invoiceData.client.address}</p>
              <p>${invoiceData.client.postalCode} ${invoiceData.client.city}</p>
              <p>${invoiceData.client.country}</p>
              ${invoiceData.client.vatNumber ? `<p>TVA: ${invoiceData.client.vatNumber}</p>` : ''}
            </div>
            <div class="invoice-meta">
              <h3 style="color: ${colors.primary}">Détails de la facture:</h3>
              <p><strong>Date de facture:</strong> ${formatDate(invoiceData.issueDate)}</p>
              <p><strong>Date d'échéance:</strong> ${formatDate(invoiceData.dueDate)}</p>
              <p><strong>Devise:</strong> ${invoiceData.currency}</p>
            </div>
          </div>
          ` : ''}
          
          <!-- Invoice Items -->
          ${isElementVisible('table', advancedConfig) ? `
          <div class="items-section">
            <table class="items-table">
              <thead>
                <tr style="background-color: ${colors.tableHeader}; color: ${colors.textHeader};">
                  <th>Description</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>TVA</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          <!-- Totals -->
          ${isElementVisible('totals', advancedConfig) ? `
          <div class="totals-section">
            <table class="totals-table">
              <tr class="subtotal-row">
                <td>Sous-total:</td>
                <td style="text-align: right;">${formatCurrency(invoiceData.subtotal, invoiceData.currency)}</td>
              </tr>
              ${tvaBreakdownHTML}
              ${globalDiscountHTML}
              <tr class="total-row" style="color: ${colors.primary}">
                <td>TOTAL:</td>
                <td style="text-align: right;">${formatCurrency(invoiceData.total, invoiceData.currency)}</td>
              </tr>
            </table>
          </div>
          ` : ''}
          
          <!-- Terms -->
          ${invoiceData.terms ? `
            <div class="terms">
              <p><strong>Conditions de paiement:</strong> ${invoiceData.terms}</p>
            </div>
          ` : ''}
      </div>
    `;
  }

  // Generate final HTML with background images and content
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facture ${invoiceData.invoiceNumber}</title>
      <style>
        ${getInvoiceCSS(colors, pageBottomMarginMM, pageTopMarginMM)}
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Background Images - Fixed to Page 1 only -->
        <div class="background-layer">
          ${backgroundImagesHTML}
        </div>
        
        ${contentHTML}
        
        <!-- Swiss QR Bill -->
        ${qrBillHTML}
      </div>

      <script>
        (function() {
          const MM_TO_PX = 96 / 25.4; // 1 mm in pixels at 96 DPI

          function mmToPx(mm) {
            return mm * MM_TO_PX;
          }

          function setElementTop(element, topMM) {
            if (!element) return;
            element.style.top = mmToPx(topMM) + 'px';
          }

          function getElementTopMM(element) {
            if (!element) return 0;
            const match = element.getAttribute('data-top-mm');
            return match ? parseFloat(match) || 0 : 0;
          }

          // With the hybrid layout, table and totals use document flow
          // CSS handles page breaks - no JavaScript positioning needed
          function markRowsForPageBreaks() {
            const table = document.querySelector('.flow-table table, .items-table');
            if (!table) return;
            
            // Mark discount rows to avoid breaking
            const discountRows = table.querySelectorAll('tr.discount-row');
            discountRows.forEach((row) => {
              row.style.pageBreakInside = 'avoid';
            });
            
            console.log('[Flow Layout] Table rows marked for page break handling');
          }

          // QR Bill positioning is now handled by calculateContentMetrics in Puppeteer context
          // No client-side manipulation needed - this prevents conflicts

          function init() {
            try {
              markRowsForPageBreaks();
              console.log('[Init] Layout initialized - QR Bill positioned by server');
            } catch (e) {
              console.error('[Init Error]', e);
            }
          }

          init();
        })();
      </script>
    </body>
    </html>
  `;
}

/**
 * Generates CSS styles for the invoice PDF
 */
export function getInvoiceCSS(colors?: { primary: string; tableHeader: string; headerBg: string; textHeader: string; textBody: string }, pageBottomMarginMM: number = 0, pageTopMarginMM: number = 0): string {
  const primaryColor = colors?.primary || '#000000';
  const tableHeaderColor = colors?.tableHeader || '#000000';
  const textBodyColor = colors?.textBody || '#374151';
  return `
    @page {
      size: A4;
      margin: ${pageTopMarginMM}mm 0 ${pageBottomMarginMM}mm 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #2c3e50;
      background: white;
      margin: 0;
      padding: 0;
    }
    
    .invoice-container {
      width: 210mm;
      position: relative;
      margin: 0;
      padding: 0;
      page-break-after: avoid;
    }
    
    .background-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 210mm;
      max-height: 100vh;
      z-index: 0;
      pointer-events: none;
    }
    
    .background-image {
      position: absolute !important;
      z-index: 1 !important;
      pointer-events: none;
    }
    
    /* Flow content for table and totals (can break across pages) */
    .flow-content {
      position: relative;
      z-index: 10;
      padding-bottom: 5mm;
    }
    
    .flow-table {
      page-break-inside: auto;
      page-break-before: avoid;
      break-before: avoid;
    }
    
    .flow-table thead {
      display: table-header-group;
    }
    
    .flow-table tbody tr {
      page-break-inside: avoid;
    }
    
    .flow-totals {
      /* Keep totals together and with preceding content */
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-before: avoid;
      break-before: avoid;
    }
    
    .invoice-content {
      position: relative;
      z-index: 10;
      padding: 20mm;
      min-height: calc(297mm - 105mm);
      background: transparent;
    }
    
    /* Clean European Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e8ecef;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-info h1 {
      font-size: 24pt;
      font-weight: 300;
      color: #2c3e50;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    
    .company-info p {
      margin: 3px 0;
      font-size: 9pt;
      color: #7f8c8d;
      font-weight: 400;
    }
    
    .invoice-info {
      text-align: right;
      min-width: 200px;
    }
    
    .invoice-info h2 {
      font-size: 16pt;
      font-weight: 600;
      color: #34495e;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .invoice-number {
      font-size: 14pt;
      font-weight: 700;
      color: #3498db;
      margin-bottom: 8px;
    }
    
    /* Modern Invoice Details Section */
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 35px;
      gap: 30px;
    }
    
    .client-info, .invoice-meta {
      flex: 1;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 4px;
      border-left: 4px solid #3498db;
    }
    
    .client-info h3, .invoice-meta h3 {
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 12px;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .client-info p, .invoice-meta p {
      margin: 4px 0;
      font-size: 9pt;
      color: #34495e;
    }
    
    .items-section {
      margin-bottom: 25px;
    }
    
    /* Modern European Table Style */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .items-table th {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
      color: white;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: none;
    }
    
    .items-table thead,
    .positioned-table thead {
      display: table-header-group;
    }

    .items-table tfoot,
    .positioned-table tfoot {
      display: table-footer-group;
    }
    
    /* Ensure table headers repeat on page breaks */
    .positioned-table table {
      page-break-inside: auto;
    }
    
    .positioned-table thead {
      display: table-header-group;
    }
    
    .positioned-table tbody tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .items-table td {
      padding: 12px 15px;
      font-size: 9pt;
      border-bottom: 1px solid #ecf0f1;
      background: white;
    }
    
    .items-table tr:nth-child(even) td {
      background: #f8f9fa;
    }
    
    .items-table tr:hover td {
      background: #e8f4fd;
    }
    
    .items-table tr,
    .items-table td,
    .items-table th {
      page-break-inside: avoid !important;
    }

    .items-table tr {
      break-inside: avoid;
    }

    .item-quantity, .item-price, .item-tva, .item-total {
      text-align: right;
      font-weight: 500;
    }
    
    .invoice-item.page-break-before {
      page-break-before: always;
    }
    
    .invoice-item {
      page-break-inside: avoid;
    }
    
    /* Modern Totals Section */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    
    .totals-table {
      width: 350px;
      border-collapse: collapse;
      background: white;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .totals-table td {
      padding: 10px 20px;
      border-bottom: 1px solid #ecf0f1;
      font-size: 10pt;
    }
    
    .totals-table .subtotal-row td {
      color: #7f8c8d;
      font-weight: 500;
    }
    
    .totals-table .tax-row td {
      color: #95a5a6;
      font-weight: 500;
    }
    
    .totals-table .total-row {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      font-weight: 700;
      font-size: 12pt;
      border: none;
    }
    
    .totals-table .total-row td {
      border: none;
      padding: 15px 20px;
    }
    
    /* Modern Notes Section */
    .notes {
      margin-bottom: 25px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 6px;
      border-left: 4px solid #3498db;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .notes h4 {
      margin-bottom: 12px;
      font-size: 11pt;
      font-weight: 600;
      color: #2c3e50;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .notes p {
      color: #34495e;
      line-height: 1.6;
      font-size: 9pt;
    }
    
    /* Modern Terms Section */
    .terms {
      font-size: 8pt;
      color: #7f8c8d;
      margin-bottom: 25px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
      page-break-inside: avoid;
      line-height: 1.5;
    }
    
    .terms h4 {
      font-size: 9pt;
      font-weight: 600;
      color: #34495e;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* QR Bill spacer - pushes QR Bill to bottom of page */
    .qr-bill-spacer {
      width: 100%;
      margin: 0;
      padding: 0;
    }
    
    /* QR Bill container */
    .qr-bill-container {
      display: block;
      position: relative;
      width: 210mm;
      height: 105mm;
      margin: 0;
      padding: 0;
      background: white;
      page-break-inside: avoid;
      page-break-before: avoid;
      break-before: avoid;
    }
    
    /* Perforation line */
    .perforation-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background: repeating-linear-gradient(
        to right,
        #333 0px,
        #333 5px,
        transparent 5px,
        transparent 10px
      );
    }
    
    /* Ensure proper page breaks for print */
    @media print {
      .qr-bill-container {
        page-break-inside: avoid !important;
      }
      
      /* Prevent empty page at end */
      html, body {
        height: auto !important;
        overflow: visible !important;
      }
    }
    
    /* Page break utilities */
    .page-break {
      page-break-before: always;
    }
    
    .no-break {
      page-break-inside: avoid;
    }
    
    .avoid-break-after {
      page-break-after: avoid;
    }
  `;
}

/**
 * Generates HTML content for Swiss QR Bill using official swissqrbill library
 * This replaces the obsolete manual implementation with the correct, compliant version
 */
function generateQRBillHTML(qrBillData: SwissQRBillData, options: ResolvedPDFOptions): string {
  const { language } = options;

  try {
    // Map SwissQRBillData to the format expected by swissqrbill library
    const qrBillInput: any = {
      currency: qrBillData.currency,
      amount: qrBillData.amount,
      reference: qrBillData.reference || undefined,
      creditor: {
        name: qrBillData.creditor.name,
        address: qrBillData.creditor.addressLine1,
        zip: qrBillData.creditor.postalCode,
        city: qrBillData.creditor.city,
        country: qrBillData.creditor.country,
        account: qrBillData.creditorAccount
      },
      debtor: qrBillData.debtor ? {
        name: qrBillData.debtor.name,
        address: qrBillData.debtor.addressLine1,
        zip: qrBillData.debtor.postalCode,
        city: qrBillData.debtor.city,
        country: qrBillData.debtor.country
      } : undefined,
      message: qrBillData.unstructuredMessage || undefined,
      additionalInformation: qrBillData.billInformation || undefined
    };

    // Generate SVG using official library
    const qrBill = new SwissQRBill(qrBillInput);
    
    // Convert to SVG string with appropriate options
    const svg = qrBill.toString();
    
    console.log('[generateQRBillHTML] Official Swiss QR Bill SVG generated successfully');

    // Return the official Swiss QR Bill SVG wrapped in a container
    // Styles are applied dynamically by calculateContentMetrics
    return `
      <div class="qr-bill-container" id="qr-bill">
        <div class="perforation-line"></div>
        ${svg}
      </div>
    `;
  } catch (error) {
    console.error('[generateQRBillHTML] Error generating Swiss QR Bill:', error);
    // Fallback HTML in case of error
    return `
      <div class="qr-bill-container" style="
        width: 210mm;
        height: 105mm;
        page-break-inside: avoid;
        page-break-before: avoid;
        margin: 0;
        padding: 0;
        background: white;
        position: relative;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ff0000;
      ">
        <div class="perforation-line"></div>
        <div style="text-align: center; color: #ff0000;">
          <p style="font-size: 14pt; font-weight: bold;">Erreur QR Bill</p>
          <p style="font-size: 10pt;">Impossible de générer le Swiss QR Bill</p>
        </div>
      </div>
    `;
  }
}

/**
 * Validates PDF generation options
 */
export function validatePDFOptions(options: PDFGenerationOptions): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (options.format && !['A4', 'Letter'].includes(options.format)) {
    errors.push('Format doit être A4 ou Letter');
  }

  if (options.language && !['de', 'fr', 'it', 'en'].includes(options.language)) {
    errors.push('Langue doit être de, fr, it ou en');
  }

  if (options.margins) {
    const { top, right, bottom, left } = options.margins;
    if (top < 0 || right < 0 || bottom < 0 || left < 0) {
      errors.push('Les marges doivent être positives');
    }
    if (top > 50 || right > 50 || bottom > 50 || left > 50) {
      errors.push('Les marges ne peuvent pas dépasser 50mm');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}