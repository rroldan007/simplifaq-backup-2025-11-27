import { Invoice, Client, User, InvoiceItem } from '@prisma/client';
import { Writable } from 'stream';
import PDFDocument from 'pdfkit';
import { SwissQRBill } from 'swissqrbill/pdf';
import path from 'path';
import fs from 'fs';

const resolveAssetsPath = (): string | null => {
  const candidates = [
    path.resolve(__dirname, '..', 'assets'),
    path.resolve(__dirname, '..', 'fonts'),
    path.resolve(__dirname, '..', '..', 'src', 'assets'),
    path.resolve(__dirname, '..', '..', 'src'),
  ];
  for (const base of candidates) {
    try {
      const fontsDir = path.join(base, 'fonts');
      const bold = path.join(fontsDir, 'Inter-Bold.ttf');
      const regular = path.join(fontsDir, 'Inter-Regular.ttf');
      if (fs.existsSync(bold) && fs.existsSync(regular)) {
        console.log('[PDF_FONTS] Using fonts from:', fontsDir);
        return base;
      }
    } catch {}
  }
  for (const base of candidates) {
    try {
      if (fs.existsSync(base)) {
        console.warn('[PDF_FONTS] Base path exists but Inter TTFs not found under', path.join(base, 'fonts'));
        return base;
      }
    } catch {}
  }
  console.warn('[PDF_FONTS] No suitable assets path found for fonts');
  return null;
};

export interface InvoiceData {
  invoice: Invoice & { items: InvoiceItem[]; client: Client; user: User };
  client: Client;
  qrData: any;
  accentColor?: string;
  template?: string;
  lang?: string;
  showHeader?: boolean;
}

interface PdfThemeStyles {
  headerBackground: string;
  headerText: string;
  tableHeaderBackground: string;
  tableHeaderText: string;
  totalTextColor: string;
  bodyText: string;
  borderColor: string;
}

const themes: Record<string, Partial<PdfThemeStyles>> = {
  elegant_classic: { headerBackground: '#4F46E5', headerText: '#FFFFFF', tableHeaderBackground: '#4F46E5', tableHeaderText: '#FFFFFF', totalTextColor: '#4F46E5', borderColor: '#E5E7EB' },
  minimal_modern: { headerBackground: '#FFFFFF', headerText: '#1E293B', tableHeaderBackground: '#F8FAFC', tableHeaderText: '#475569', totalTextColor: '#374151', borderColor: '#E5E7EB' },
  formal_pro: { headerBackground: '#1F2937', headerText: '#FFFFFF', tableHeaderBackground: '#1F2937', tableHeaderText: '#FFFFFF', totalTextColor: '#1F2937', borderColor: '#E5E7EB' },
  creative_premium: { headerBackground: '#7C3AED', headerText: '#FFFFFF', tableHeaderBackground: '#7C3AED', tableHeaderText: '#FFFFFF', totalTextColor: '#7C3AED', borderColor: '#E5E7EB' },
  clean_creative: { headerBackground: '#FFFFFF', headerText: '#1F2937', tableHeaderBackground: '#F3F4F6', tableHeaderText: '#1F2937', totalTextColor: '#059669', borderColor: '#D1D5DB' },
  bold_statement: { headerBackground: '#DC2626', headerText: '#FFFFFF', tableHeaderBackground: '#DC2626', tableHeaderText: '#FFFFFF', totalTextColor: '#DC2626', borderColor: '#DC2626' },
  professional: { headerBackground: '#1E40AF', headerText: '#FFFFFF', tableHeaderBackground: '#1E40AF', tableHeaderText: '#FFFFFF', totalTextColor: '#1E40AF', borderColor: '#1E40AF' },
  swiss_classic: { headerBackground: '#DC143C', headerText: '#FFFFFF', tableHeaderBackground: '#DC143C', tableHeaderText: '#FFFFFF', totalTextColor: '#DC143C', borderColor: '#E5E7EB' },
  european_minimal: { headerBackground: '#FFFFFF', headerText: '#334155', tableHeaderBackground: '#F8FAFC', tableHeaderText: '#64748B', totalTextColor: '#475569', borderColor: '#CBD5E1' },
  swiss_blue: { headerBackground: '#0369A1', headerText: '#FFFFFF', tableHeaderBackground: '#0369A1', tableHeaderText: '#FFFFFF', totalTextColor: '#0369A1', borderColor: '#E0F2FE' },
  german_formal: { headerBackground: '#18181B', headerText: '#FFFFFF', tableHeaderBackground: '#27272A', tableHeaderText: '#FFFFFF', totalTextColor: '#18181B', borderColor: '#D4D4D8' },
};

const templatesWithFixedHeaderAccent = new Set<string>([
  'minimal_modern',
  'european_minimal',
  'clean_creative'
]);

const getThemeStyles = (template?: string, accentColor?: string): PdfThemeStyles => {
  const defaultStyles: PdfThemeStyles = { headerBackground: '#4F46E5', headerText: '#FFFFFF', tableHeaderBackground: '#4F46E5', tableHeaderText: '#FFFFFF', totalTextColor: '#4F46E5', bodyText: '#333333', borderColor: '#E5E7EB' };
  let finalStyles = { ...defaultStyles };
  if (template && themes[template]) {
    finalStyles = { ...defaultStyles, ...themes[template] };
    console.log(`[PDF_THEME] Using predefined theme colors for '${template}':`, finalStyles);
  }
  if (accentColor) {
    const lockHeaderAccent = template ? templatesWithFixedHeaderAccent.has(template) : false;
    if (!lockHeaderAccent) {
      finalStyles.headerBackground = accentColor;
      finalStyles.tableHeaderBackground = accentColor;
    }
    finalStyles.totalTextColor = accentColor;
    console.log(`[PDF_THEME] Applying accent color '${accentColor}'`, { lockHeaderAccent, resultingStyles: finalStyles });
  }
  return finalStyles;
};

const roundToCHF05 = (amount: number, currency?: string): number => {
  if ((currency || '').toUpperCase() === 'CHF') {
    return Math.round(amount * 20) / 20;
  }
  return amount;
};

const formatAmount = (amount: number): string => {
  const fixed = Number(amount).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withApos = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${withApos}.${decPart}`;
};

const loadImageBuffer = async (filePath: string): Promise<Buffer | null> => {
  try {
    const absolutePath = path.resolve(filePath);
    if (fs.existsSync(absolutePath)) {
      return await fs.promises.readFile(absolutePath);
    }
  } catch (error) {
    console.error(`[PDF] Failed to load image from ${filePath}:`, error);
  }
  return null;
};

const resolveLogoFsPath = (logoUrl?: string): string | null => {
  if (!logoUrl || typeof logoUrl !== 'string') return null;
  try {
    if (path.isAbsolute(logoUrl) && fs.existsSync(logoUrl)) return logoUrl;
    if (/^https?:\/\//i.test(logoUrl)) {
      console.warn('[PDF] Logo is a remote URL; skipping FS read:', logoUrl);
      return null;
    }
    const relativePath = logoUrl.startsWith('/') ? logoUrl.substring(1) : logoUrl;
    const backendRoot = path.resolve(__dirname, '..', '..');
    const candidate = path.join(backendRoot, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    console.warn('[PDF] Logo not found at resolved path', candidate);
  } catch (e) {
    console.error('[PDF] Error resolving logo path:', e);
  }
  return null;
};

export const generateInvoicePDF = async (data: InvoiceData, stream: Writable): Promise<void> => {
  const { invoice, qrData, accentColor, template, lang } = data;
  const showHeader = data.showHeader !== false;
  console.log('[PDF_GENERATION_START] Incoming data:', { template: data.template, accentColor: data.accentColor, invoiceNumber: invoice.invoiceNumber });
  
  // Priority: 1) Explicit parameters, 2) User defaults from DB, 3) System defaults
  const user = invoice.user as any;
  const finalAccentColor = accentColor || user.pdfPrimaryColor;
  const finalTemplate = template || user.pdfTemplate;
  console.log('[PDF_TEMPLATE_RESOLUTION]', { paramTemplate: template, userTemplate: user.pdfTemplate, finalTemplate, paramColor: accentColor, userColor: user.pdfPrimaryColor, finalColor: finalAccentColor });
  
  const styles = getThemeStyles(finalTemplate, finalAccentColor);
  console.log('[PDF_THEME] Applied theme styles:', { template: data.template || '(default)', accentColor: data.accentColor || '(default)', headerBackground: styles.headerBackground, totalTextColor: styles.totalTextColor, allStyles: styles });
  console.log('[PDF] Starting PDF generation for invoice:', invoice.invoiceNumber);
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true, autoFirstPage: true });
  let __bytes = 0;
  try {
    (doc as any).on?.('data', (chunk: Buffer) => { __bytes += chunk?.length || 0; });
    (doc as any).once?.('error', (e: any) => { console.error('[INVOICE_PDF] PDFKit stream error', (e?.message || e)); });
  } catch {}
  doc.pipe(stream);
  try { doc.info = { Title: `Facture ${invoice.invoiceNumber}`, Author: 'Simplitest', Subject: `Facture ${invoice.invoiceNumber}`, CreationDate: new Date(), ModDate: new Date() } as any; } catch {} 
  const assetsPath = resolveAssetsPath();
  let regularFontName = 'Helvetica';
  let boldFontName = 'Helvetica-Bold';
  try {
    if (assetsPath) {
      const fontsDir = path.join(assetsPath, 'fonts');
      const regularCandidates = ['Inter-Regular.ttf', 'Inter.ttf', 'InterVariable.ttf'];
      const boldCandidates = ['Inter-Bold.ttf', 'Inter-SemiBold.ttf', 'Inter-Black.ttf'];
      let regularPathFound: string | null = null;
      let boldPathFound: string | null = null;
      for (const f of regularCandidates) { const p = path.join(fontsDir, f); if (fs.existsSync(p)) { regularPathFound = p; break; } }
      for (const f of boldCandidates) { const p = path.join(fontsDir, f); if (fs.existsSync(p)) { boldPathFound = p; break; } }
      if (regularPathFound) { doc.registerFont('Inter-Regular', regularPathFound); regularFontName = 'Inter-Regular'; console.log('[PDF_FONTS] Registered regular font:', regularPathFound); }
      if (boldPathFound) { doc.registerFont('Inter-Bold', boldPathFound); boldFontName = 'Inter-Bold'; console.log('[PDF_FONTS] Registered bold font:', boldPathFound); }
      if (!regularPathFound || !boldPathFound) { console.warn('[PDF_FONTS] Missing Inter TTF variant(s). Using Helvetica fallback for any missing weight.', { regularPathFound, boldPathFound }); }
    }
  } catch (e) { console.warn('[PDF] Failed to register Inter fonts, using built-in Helvetica.', (e as any)?.message || e); }
  const margin = { top: 30, left: 40, right: 40, bottom: 30 };
  const contentWidth = doc.page.width - margin.left - margin.right;
  console.log('[PDF] Document initialized, page count:', doc.bufferedPageRange().count);
  try { doc.font(regularFontName); console.log('[PDF_FONTS] Active default font set:', { regularFontName, boldFontName }); } catch (e) { console.warn('[PDF_FONTS] Failed to set active default font, continuing with PDFKit default.', (e as any)?.message || e); }
  
  // Prepare company info first to calculate header height
  const userSettings = invoice.user as any;
  const companyDisplayName = invoice.user.companyName || `${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim();
  const companyLines: string[] = [
    companyDisplayName,
    invoice.user.street,
    `${invoice.user.postalCode || ''} ${invoice.user.city || ''}`.trim(),
    invoice.user.country || ''
  ].filter(Boolean);
  if (userSettings.pdfShowVAT !== false && userSettings.vatNumber) {
    companyLines.push(`TVA: ${userSettings.vatNumber}`);
  }
  if (userSettings.pdfShowPhone !== false && userSettings.phone) {
    companyLines.push(`Tél: ${userSettings.phone}`);
  }
  if (userSettings.pdfShowEmail !== false && userSettings.email) {
    companyLines.push(`Email: ${userSettings.email}`);
  }
  if (userSettings.pdfShowWebsite !== false && userSettings.website) {
    companyLines.push(`Web: ${userSettings.website}`);
  }
  if (userSettings.pdfShowIBAN === true && userSettings.iban) {
    companyLines.push(`IBAN: ${userSettings.iban}`);
  }
  
  // Calculate dynamic header height based on content
  const calculateHeaderHeight = () => {
    const minHeaderHeight = 100;
    // More compact calculation for tighter header
    // Line height at fontSize 8 with lineGap 2 ~= 10px per line
    const estimatedHeight = 35 + (companyLines.length * 10) + 25; // Compact spacing
    const finalHeight = Math.max(estimatedHeight, minHeaderHeight);
    console.log(`[PDF_HEADER] Calculating header height: ${companyLines.length} lines, final height: ${finalHeight}px`);
    return finalHeight;
  };
  const headerHeight = calculateHeaderHeight();
  const headerLineOffset = 10; // Reduced to minimize space after header
  const whiteHeaderTemplates = new Set(['clean_creative', 'european_minimal', 'minimal_modern']);
  const hasWhiteHeader = data.template && whiteHeaderTemplates.has(data.template);
  
  const repaintHeaderBand = () => {
    if (hasWhiteHeader) {
      doc.rect(0, 0, doc.page.width, headerHeight).fill('#FFFFFF');
      console.log(`[PDF] ${data.template} header (repaint): white background`);
    } else {
      doc.rect(0, 0, doc.page.width, headerHeight).fill(styles.headerBackground);
      console.log('[PDF] Header background repainted with color:', styles.headerBackground);
    }
    const linePositionLocal = headerHeight + headerLineOffset;
    doc.strokeColor(styles.borderColor).lineWidth(0.5);
    doc.moveTo(0, linePositionLocal).lineTo(doc.page.width, linePositionLocal).stroke();
    return linePositionLocal;
  };
  let linePosition = margin.top;
  if (hasWhiteHeader) { 
    doc.rect(0, 0, doc.page.width, headerHeight).fill('#FFFFFF'); 
    console.log(`[PDF] ${data.template} header: white background`); 
  } else { 
    doc.rect(0, 0, doc.page.width, headerHeight).fill(styles.headerBackground); 
    console.log('[PDF] Header background drawn with color:', styles.headerBackground); 
  }
  
  const companyAddress = companyLines.join('\n');
  const companyLogoUrl: string | undefined = (invoice.user as any)?.logoUrl || undefined;
  let headerCompanyPrinted = false;
  
  // Draw logo BEFORE translate (in absolute coordinates)
  console.log('[PDF_LOGO] Company logo URL from invoice.user:', companyLogoUrl);
  const companyLogoPath = resolveLogoFsPath(companyLogoUrl);
  console.log('[PDF_LOGO] Resolved logo filesystem path:', companyLogoPath);
  let logoDrawn = false;
  if (companyLogoPath) {
    const logoBuffer = await loadImageBuffer(companyLogoPath);
    console.log('[PDF_LOGO] Logo buffer loaded:', logoBuffer ? 'SUCCESS' : 'FAILED');
    if (logoBuffer) {
      const logoSize = (data.template === 'bold_statement') ? 56 : 50;
      // Draw in ABSOLUTE coordinates (before translate)
      const logoX = margin.left;
      const logoY = margin.top + 8;
      
      // Draw logo in absolute position
      doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize });
      logoDrawn = true;
      console.log('[PDF_LOGO] Logo drawn in ABSOLUTE position:', { x: logoX, y: logoY, size: logoSize });
    } else {
      console.warn('[PDF_LOGO] Company logo path resolved but could not be read:', companyLogoPath);
    }
  } else if (companyLogoUrl) {
    console.warn('[PDF_LOGO] Company logo URL provided but no filesystem path could be resolved:', companyLogoUrl);
  }
  
  // Now do translate for text positioning
  doc.save();
  doc.translate(margin.left, margin.top);
  doc.y = 0;
  
  console.log('[PDF_LOGO] Header text decision:', { 
    logoDrawn, 
    showHeader,
    pdfShowCompanyNameWithLogo: (invoice.user as any).pdfShowCompanyNameWithLogo
  });
  
  // Render text based on whether logo was drawn
  if (logoDrawn) {
    console.log('[PDF_LOGO] Logo was drawn, positioning text to the right');
    const logoSize = (data.template === 'bold_statement') ? 56 : 50;
    // Position text to the right of the logo with enough spacing
    const textStartX = logoSize + 15; // 15pt spacing after logo
    const textStartY = 10; // Align with logo
    
    // Use remaining space for text
    const leftTextWidth = (contentWidth / 2) - textStartX;
    
    console.log('[PDF_LOGO] Text positioning (with logo):', { 
      logoSize, 
      textStartX, 
      leftTextWidth,
      contentWidth 
    });
    
    if (showHeader) {
      // Company name
      doc.font(boldFontName).fontSize(12).fillColor(styles.headerText);
      doc.text(companyDisplayName, textStartX, textStartY, { 
        width: leftTextWidth
      });
      
      // Address lines below company name
      const headerAddressLines = companyLines.slice(1).join('\n');
      if (headerAddressLines) {
        const addressY = textStartY + doc.heightOfString(companyDisplayName, { width: leftTextWidth }) + 3;
        doc.font(regularFontName).fontSize(8).fillColor(styles.headerText);
        doc.text(headerAddressLines, textStartX, addressY, { 
          width: leftTextWidth, 
          lineGap: 2, // Reduced from 2.5 for tighter spacing
          height: headerHeight - addressY - 10 // Ensure text doesn't overflow header
        });
      }
    }
    headerCompanyPrinted = true;
  }
  
  if (!headerCompanyPrinted && showHeader) {
    const leftTextWidth = contentWidth / 2;
    doc.font(boldFontName).fontSize(13).fillColor(styles.headerText).text(companyDisplayName, 0, 4, { width: leftTextWidth });
    const headerAddressLines = companyLines.slice(1).join('\n');
    if (headerAddressLines) {
      const addressYPos = 4 + doc.heightOfString(companyDisplayName, { width: leftTextWidth }) + 4;
      doc.font(regularFontName).fontSize(8).fillColor(styles.headerText).text(headerAddressLines, 0, addressYPos, { 
        width: leftTextWidth, 
        lineGap: 2, // Reduced from 2.5 for tighter spacing
        height: headerHeight - addressYPos - 10 
      });
    }
  }
  const rightColX = contentWidth / 2;
  const rightColWidth = contentWidth / 2;
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('fr-CH');
  const lineHeight = 11;
  let rightHeaderTextY = 4;
  doc.font(regularFontName).fontSize(8).fillColor(styles.headerText);
  // Show "DEVIS" for quotes, "FACTURE" for invoices
  const documentTitle = invoice.isQuote ? 'DEVIS' : 'FACTURE';
  doc.text(documentTitle, rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  rightHeaderTextY += lineHeight;
  doc.text(`#${invoice.invoiceNumber}`, rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  rightHeaderTextY += lineHeight + 2;
  doc.text(`Émise: ${formatDate(invoice.issueDate)}`, rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  rightHeaderTextY += lineHeight;
  // Show "Valide jusqu'au" for quotes, "Échéance" for invoices
  const dueDateLabel = invoice.isQuote ? 'Valide jusqu\'au' : 'Échéance';
  doc.text(`${dueDateLabel}: ${formatDate(invoice.dueDate)}`, rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  doc.restore();
  linePosition = headerHeight + headerLineOffset;
  doc.strokeColor(styles.borderColor).lineWidth(0.5);
  doc.moveTo(0, linePosition).lineTo(doc.page.width, linePosition).stroke();
  console.log(`[PDF] Header border drawn at position: ${linePosition} (${headerLineOffset}pt below header)`);
  doc.y = linePosition + 5; // Reduced from 10 to 5 for tighter spacing
  const infoStartY = doc.y;
  const colWidth = contentWidth / 2 - 20;
  
  // Only show client info ("À:") - company info already in header
  doc.font(boldFontName).fontSize(9).fillColor(styles.bodyText);
  doc.text('À:', margin.left, infoStartY);
  doc.font(regularFontName).fontSize(9);
  const addressY = doc.y + 5;
  const clientDisplayName = invoice.client.companyName || `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim();
  const clientAddress = [invoice.client.street, `${invoice.client.postalCode || ''} ${invoice.client.city || ''}`.trim()].filter(Boolean).join('\n');
  
  doc.text(clientDisplayName, margin.left, addressY);
  doc.text(clientAddress, { width: colWidth });
  doc.y = doc.y + 20; // Reduced from 30 since we removed one section
  const tableTop = doc.y + 10;
  const baseQuantityDecimals: 2 | 3 = ((invoice?.user as any)?.quantityDecimals === 3 ? 3 : 2) as 2 | 3;
  const resolveQuantityDecimals = (rawUnit: unknown): 2 | 3 => {
    if (!rawUnit || typeof rawUnit !== 'string') {
      return baseQuantityDecimals;
    }
    const unit = rawUnit.toLowerCase();
    if (unit.includes('kg') || unit.includes('kilogram')) {
      return 3;
    }
    return baseQuantityDecimals;
  };
  const hasLineDiscounts = invoice.items.some((item) => {
    const rawDiscount = (item as any)?.lineDiscountValue;
    const discountValue = typeof rawDiscount === 'string' ? parseFloat(rawDiscount) : Number(rawDiscount);
    return Number.isFinite(discountValue) && discountValue > 0;
  });
  try {
    console.log('[PDF_DEBUG] line discounts map', invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      unit: (item as any)?.unit,
      productUnit: (item as any)?.product?.unit,
      lineDiscountValue: (item as any)?.lineDiscountValue,
      hasDiscount: Number.isFinite(typeof (item as any)?.lineDiscountValue === 'string' ? parseFloat((item as any)?.lineDiscountValue) : Number((item as any)?.lineDiscountValue)) && Number((item as any)?.lineDiscountValue) > 0
    })), { hasLineDiscounts });
  } catch (e) {
    console.warn('[PDF_DEBUG] failed to log line discounts', e);
  }
  const tableHeaders = hasLineDiscounts
    ? ['Description', 'Qté', 'PU', 'Rabais', 'Total']
    : ['Description', 'Qté', 'PU', 'Total'];
  const colWidths = hasLineDiscounts
    ? [contentWidth * 0.4, contentWidth * 0.1, contentWidth * 0.16, contentWidth * 0.14, contentWidth * 0.2]
    : [contentWidth * 0.5, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.2];
  const colPositions = [margin.left];
  for (let i = 0; i < colWidths.length; i++) { colPositions.push(colPositions[i] + colWidths[i]); }
  const tableHeaderHeight = 20;
  const cellPadding = 8;
  const drawItemsTableHeader = (yTop: number) => {
    tableHeaders.forEach((header, i) => {
      const cellWidth = (colPositions[i+1] || margin.left + contentWidth) - colPositions[i];
      doc.rect(colPositions[i], yTop, cellWidth, tableHeaderHeight).fillOpacity(1).fill('#F8FAFC');
      doc.rect(colPositions[i], yTop, cellWidth, tableHeaderHeight).strokeOpacity(1).stroke('#E2E8F0');
      const align = i === 0 ? 'left' : 'right';
      doc.font(boldFontName).fontSize(9).fillColor('#475569').text(header, colPositions[i] + cellPadding, yTop + (tableHeaderHeight - 10) / 2, { width: cellWidth - (cellPadding * 2), align, lineGap: 2 });
    });
  };
  drawItemsTableHeader(tableTop);
  let y = tableTop + tableHeaderHeight + 8;
  const rowPadding = 2;
  const rowHeight = 16;
  invoice.items.forEach((item, index) => {
    if (y + rowHeight > doc.page.height - margin.bottom - 130) {
      doc.addPage();
      const lp = repaintHeaderBand();
      y = (lp || headerHeight) + 10;
    }
    const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(margin.left, y - rowPadding/2, contentWidth, rowHeight + rowPadding).fill(bgColor);
    colPositions.forEach((x, i) => {
      const cellWidth = (colPositions[i+1] || margin.left + contentWidth) - x;
      doc.rect(x, y - rowPadding/2, cellWidth, rowHeight + rowPadding).stroke('#E2E8F0');
    });
    doc.font(regularFontName).fontSize(9).fillColor(styles.bodyText);
    const rowTextY = y + (rowHeight - 10) / 2;
    const descriptionWidth = colWidths[0] - (cellPadding * 2);
    doc.text(item.description, colPositions[0] + cellPadding, rowTextY, { width: descriptionWidth, align: 'left', lineGap: 2 });

    const quantityNum = typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity);
    const unitSource = (item as any)?.unit || (item as any)?.product?.unit;
    const decimals = resolveQuantityDecimals(unitSource);
    try {
      console.log('[PDF_DEBUG] quantity formatting', {
        itemId: item.id,
        description: item.description,
        quantity: quantityNum,
        unit: (item as any)?.unit,
        productUnit: (item as any)?.product?.unit,
        resolvedUnit: unitSource,
        decimals
      });
    } catch (e) {
      console.warn('[PDF_DEBUG] failed to log quantity formatting', e);
    }
    const displayQuantity = isFinite(quantityNum) ? quantityNum.toFixed(decimals) : (0).toFixed(decimals);
    const quantityColIndex = 1;
    doc.text(displayQuantity, colPositions[quantityColIndex] + cellPadding, rowTextY, {
      width: colWidths[quantityColIndex] - (cellPadding * 2),
      align: 'right',
      lineGap: 2,
    });

    const displayUnitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice).toFixed(2) : Number(item.unitPrice).toFixed(2);
    const unitPriceColIndex = hasLineDiscounts ? 2 : 2;
    doc.text(displayUnitPrice, colPositions[unitPriceColIndex] + cellPadding, rowTextY, {
      width: colWidths[unitPriceColIndex] - (cellPadding * 2),
      align: 'right',
      lineGap: 2,
    });

    const itemWithDiscount = item as any;
    const hasDiscountForRow = hasLineDiscounts && Number(itemWithDiscount.lineDiscountValue || 0) > 0;
    if (hasLineDiscounts) {
      let discountText = '-';
      if (hasDiscountForRow) {
        if (itemWithDiscount.lineDiscountType === 'PERCENT') {
          discountText = `-${Number(itemWithDiscount.lineDiscountValue).toFixed(1)}%`;
        } else {
          discountText = `-${Number(itemWithDiscount.lineDiscountValue).toFixed(2)}`;
        }
      }
      const discountColIndex = 3;
      doc.text(discountText, colPositions[discountColIndex] + cellPadding, rowTextY, {
        width: colWidths[discountColIndex] - (cellPadding * 2),
        align: 'right',
        lineGap: 2,
      });
    }

    const totalColIndex = hasLineDiscounts ? 4 : 3;
    const totalPrice = itemWithDiscount.subtotalAfterDiscount ? Number(itemWithDiscount.subtotalAfterDiscount).toFixed(2) : (Number(item.quantity) * Number(item.unitPrice)).toFixed(2);
    doc.text(totalPrice, colPositions[totalColIndex] + cellPadding, rowTextY, {
      width: colWidths[totalColIndex] - (cellPadding * 2),
      align: 'right',
      lineGap: 2,
    });
    const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity);
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : Number(item.unitPrice);
    y += rowHeight + rowPadding;
  });
  doc.y = y;
  if (doc.y + 80 > doc.page.height - margin.bottom - 150) { doc.addPage(); doc.y = margin.top; }
  const totalsStartY = doc.y + 20;
  const totalLabelWidth = contentWidth * 0.6;
  const totalValueWidth = contentWidth * 0.3;
  const totalValueX = margin.left + totalLabelWidth + 20;
  const { subtotal, tvaAmount, total } = invoice;
  const displayTotal = Number(total);
  const totalsLineHeight = 18;
  const labelOptions = { width: totalLabelWidth, align: 'right' as const };
  const valueOptions = { width: totalValueWidth, align: 'right' as const };
  doc.font(regularFontName).fontSize(9).fillColor(styles.bodyText);
  
  let currentY = totalsStartY;
  doc.text('Sous-total', margin.left, currentY, labelOptions);
  doc.text(formatAmount(Number(subtotal)), totalValueX, currentY, valueOptions);
  currentY += totalsLineHeight;
  
  // Global discount section if present
  const globalDiscountValue = (invoice as any).globalDiscountValue;
  const globalDiscountType = (invoice as any).globalDiscountType;
  const globalDiscountNote = (invoice as any).globalDiscountNote;
  
  if (globalDiscountValue && globalDiscountValue > 0) {
    // Display global discount
    const discountLabel = globalDiscountType === 'PERCENT' 
      ? `Rabais global (${Number(globalDiscountValue).toFixed(1)}%)`
      : 'Rabais global';
    
    let globalDiscountAmount = 0;
    if (globalDiscountType === 'PERCENT') {
      globalDiscountAmount = Number(subtotal) * (Number(globalDiscountValue) / 100);
    } else {
      globalDiscountAmount = Math.min(Number(globalDiscountValue), Number(subtotal));
    }
    
    doc.fillColor('#DC2626'); // Red color for discount
    doc.text(discountLabel, margin.left, currentY, labelOptions);
    doc.text(`-${formatAmount(globalDiscountAmount)}`, totalValueX, currentY, valueOptions);
    currentY += totalsLineHeight;
    
    // Display note if present
    if (globalDiscountNote && globalDiscountNote.trim()) {
      doc.font(regularFontName).fontSize(8).fillColor('#6B7280');
      doc.text(`"${globalDiscountNote.trim()}"`, margin.left, currentY, { width: totalLabelWidth, align: 'right' as const });
      currentY += 12;
    }
    
    // Subtotal after discount
    const subtotalAfterDiscount = Number(subtotal) - globalDiscountAmount;
    doc.font(regularFontName).fontSize(9).fillColor('#059669'); // Green color
    doc.text('Sous-total après rabais', margin.left, currentY, labelOptions);
    doc.text(formatAmount(subtotalAfterDiscount), totalValueX, currentY, valueOptions);
    currentY += totalsLineHeight;
    
    doc.fillColor(styles.bodyText); // Reset color
  }
  
  doc.font(regularFontName).fontSize(9).fillColor(styles.bodyText);
  doc.text(`TVA (${invoice.items[0]?.tvaRate ?? 0}%)`, margin.left, currentY, labelOptions);
  doc.text(formatAmount(Number(tvaAmount)), totalValueX, currentY, valueOptions);
  currentY += totalsLineHeight;
  
  const lineY = currentY - 2;
  doc.y = lineY + 10;
  doc.font(boldFontName).fontSize(11);
  const totalY = doc.y;
  doc.text('Total', margin.left, totalY, { ...labelOptions, align: 'right' as const });
  const totalText = `${formatAmount(displayTotal)} ${invoice.currency}`;
  doc.fillColor(styles.totalTextColor).text(totalText, totalValueX, totalY, { ...valueOptions, align: 'right' as const });
  const afterTotalLineY = totalY + totalsLineHeight + 2;
  if (data.template !== 'clean_creative') { doc.strokeColor('#ccc').lineWidth(0.5).moveTo(totalValueX - 10, afterTotalLineY).lineTo(margin.left + contentWidth - 10, afterTotalLineY).stroke(); }
  if (qrData && qrData.creditor && qrData.creditorAccount) {
    const qrAmount = roundToCHF05(qrData?.amount ?? Number(total) ?? 0, qrData?.currency || invoice.currency);
    const qrBillData = {
      creditor: { name: qrData.creditor.name, address: qrData.creditor.addressLine1, zip: qrData.creditor.postalCode, city: qrData.creditor.city, country: qrData.creditor.country, account: qrData.creditorAccount },
      ...(qrData.debtor ? { debtor: { name: qrData.debtor.name, address: qrData.debtor.addressLine1, zip: qrData.debtor.postalCode, city: qrData.debtor.city, country: qrData.debtor.country } } : {}),
      amount: qrAmount,
      currency: qrData.currency || invoice.currency,
      reference: qrData.reference,
      referenceType: qrData.referenceType,
      unstructuredMessage: qrData.unstructuredMessage,
    };
    try {
      console.log('[QRBILL] Attempting to render QR Bill with data:', JSON.stringify({
        hasCreditor: !!qrBillData.creditor,
        hasDebtor: !!qrBillData.debtor,
        creditorAccount: qrBillData.creditor.account,
        amount: qrBillData.amount,
        currency: qrBillData.currency,
        referenceType: qrBillData.referenceType,
        reference: qrBillData.reference
      }, null, 2));
      const qrBill = new SwissQRBill(qrBillData as any, { language: 'FR' });
      console.log('[QRBILL] ✅ SwissQRBill instance created successfully');
      const qrHeight = 105;
      const qrBillBottomMargin = 10;
      const qrBillY = doc.page.height - (qrHeight * 2.83465) - (qrBillBottomMargin * 2.83465);
      if (doc.y > qrBillY) { doc.addPage(); }
      doc.fillColor('#000000').strokeColor('#000000');
      qrBill.attachTo(doc);
      console.log('[QRBILL] ✅ QR Bill attached to PDF successfully');
    } catch (err) { 
      console.error('[QRBILL] ❌ Failed to render SwissQRBill, skipping.', { 
        message: (err as any)?.message,
        stack: (err as any)?.stack,
        qrBillData: JSON.stringify(qrBillData, null, 2)
      }); 
    }
  } else { console.warn('[QRBILL] Missing creditor.account (IBAN). Skipping QR Bill rendering.'); }
  console.log('[PDF] Content rendering complete, final page count:', doc.bufferedPageRange().count);
  console.log('[PDF] Current Y position:', doc.y);
  try { if (doc.bufferedPageRange().count === 0) { doc.addPage(); } } catch {} 
  console.log('[PDF] Safety content added, final page count:', doc.bufferedPageRange().count);
  await new Promise<void>((resolve, reject) => { 
    const onResolve = () => { console.log('[INVOICE_PDF_BYTES]', __bytes); console.log('[PDF] Document finalized successfully'); setTimeout(resolve, 100); };
    const onReject = (err: any) => { console.error('[PDF] Document finalization error:', err); reject(err); };
    stream.once('finish', () => { console.log('[PDF] Stream finished'); });
    stream.once('close', () => { console.log('[PDF] Stream closed'); });
    doc.once('end', onResolve);
    doc.once('error', onReject);
    console.log('[PDF] Calling doc.end()...');
    try { doc.end(); console.log('[PDF] doc.end() called successfully'); } catch (e) { console.error('[PDF] Error calling doc.end():', e); onReject(e); } 
  });
};