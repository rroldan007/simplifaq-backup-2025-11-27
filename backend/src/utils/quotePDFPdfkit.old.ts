import { Quote, QuoteItem, Client, User } from '@prisma/client';
import { Writable } from 'stream';
import PDFDocument from 'pdfkit';
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
  console.warn('[PDF_FONTS] No suitable assets path found for fonts');
  return null;
};

export interface QuoteData {
  quote: Quote & { items: QuoteItem[]; client: Client; user: User };
  client: Client;
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
  }
  if (accentColor) {
    const lockHeaderAccent = template ? templatesWithFixedHeaderAccent.has(template) : false;
    if (!lockHeaderAccent) {
      finalStyles.headerBackground = accentColor;
      finalStyles.tableHeaderBackground = accentColor;
    }
    finalStyles.totalTextColor = accentColor;
  }
  return finalStyles;
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

export const generateQuotePDF = async (data: QuoteData, stream: Writable): Promise<void> => {
  const { quote, accentColor, template, lang } = data;
  const showHeader = data.showHeader !== false;
  
  // Priority: 1) Explicit parameters, 2) User defaults from DB, 3) System defaults
  const user = quote.user as any;
  const finalAccentColor = accentColor || user.pdfPrimaryColor;
  const finalTemplate = template || user.pdfTemplate;
  
  console.log('[PDF_GENERATION_START] Incoming data:', { template: data.template, accentColor: data.accentColor, quoteNumber: quote.quoteNumber });
  console.log('[PDF_TEMPLATE_RESOLUTION]', { paramTemplate: template, userTemplate: user.pdfTemplate, finalTemplate, paramColor: accentColor, userColor: user.pdfPrimaryColor, finalColor: finalAccentColor });
  const styles = getThemeStyles(finalTemplate, finalAccentColor);
  console.log('[PDF] Starting PDF generation for quote:', quote.quoteNumber);
  
  const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true, autoFirstPage: true });
  let __bytes = 0;
  try {
    (doc as any).on?.('data', (chunk: Buffer) => { __bytes += chunk?.length || 0; });
    (doc as any).once?.('error', (e: any) => { console.error('[QUOTE_PDF] PDFKit stream error', (e?.message || e)); });
  } catch {}
  
  doc.pipe(stream);
  try { 
    doc.info = { 
      Title: `Devis ${quote.quoteNumber}`, 
      Author: 'Simplitest', 
      Subject: `Devis ${quote.quoteNumber}`, 
      CreationDate: new Date(), 
      ModDate: new Date() 
    } as any; 
  } catch {} 
  
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
      
      for (const f of regularCandidates) { 
        const p = path.join(fontsDir, f); 
        if (fs.existsSync(p)) { regularPathFound = p; break; } 
      }
      for (const f of boldCandidates) { 
        const p = path.join(fontsDir, f); 
        if (fs.existsSync(p)) { boldPathFound = p; break; } 
      }
      
      if (regularPathFound) { 
        doc.registerFont('Inter-Regular', regularPathFound); 
        regularFontName = 'Inter-Regular'; 
      }
      if (boldPathFound) { 
        doc.registerFont('Inter-Bold', boldPathFound); 
        boldFontName = 'Inter-Bold'; 
      }
    }
  } catch (e) { 
    console.warn('[PDF] Failed to register Inter fonts, using built-in Helvetica.', (e as any)?.message || e); 
  }
  
  const margin = { top: 30, left: 40, right: 40, bottom: 30 };
  const contentWidth = doc.page.width - margin.left - margin.right;
  
  try { doc.font(regularFontName); } catch (e) { 
    console.warn('[PDF_FONTS] Failed to set active default font, continuing with PDFKit default.', (e as any)?.message || e); 
  }
  
  const headerHeight = 100;
  const headerLineOffset = 20;
  const whiteHeaderTemplates = new Set(['clean_creative', 'european_minimal', 'minimal_modern']);
  const hasWhiteHeader = data.template && whiteHeaderTemplates.has(data.template);
  
  // Draw header
  if (hasWhiteHeader) {
    doc.rect(0, 0, doc.page.width, headerHeight).fill('#FFFFFF');
    console.log(`[PDF_QUOTE] ${data.template} header: white background`);
  } else {
    doc.rect(0, 0, doc.page.width, headerHeight).fill(styles.headerBackground);
    console.log('[PDF_QUOTE] Header background drawn with color:', styles.headerBackground);
  }
  
  doc.save();
  doc.translate(margin.left, margin.top);
  doc.y = 0;
  
  // Logo
  const companyLogoUrl: string | undefined = (quote.user as any)?.logoUrl || undefined;
  const companyLogoPath = resolveLogoFsPath(companyLogoUrl);
  
  if (companyLogoPath) {
    const logoBuffer = await loadImageBuffer(companyLogoPath);
    if (logoBuffer) {
      const logoSize = (data.template === 'bold_statement') ? 56 : 50;
      const logoSpacing = 15; // Space between logo and text
      const logoX = 0;
      const logoY = 8; // Fixed position from top
      
      // Draw logo
      doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize });
      
      const userSettings = quote.user as any;
      const showCompanyName = userSettings.pdfShowCompanyNameWithLogo !== false;
      if (showHeader && showCompanyName) {
        // Text starts after logo + spacing
        const textStartX = logoSize + logoSpacing;
        const textStartY = 10; // Align with logo
        const leftTextWidth = contentWidth / 2 - textStartX;
        const companyDisplayName = quote.user.companyName || `${quote.user.firstName || ''} ${quote.user.lastName || ''}`.trim();
        
        // Company name
        doc.font(boldFontName).fontSize(12).fillColor(styles.headerText);
        doc.text(companyDisplayName, textStartX, textStartY, { width: leftTextWidth });
      }
    }
  }
  
  // Right header - Quote info
  const rightColX = contentWidth / 2;
  const rightColWidth = contentWidth / 2;
  const formatDate = (date: Date) => new Date(date).toLocaleDateString('fr-CH');
  const lineHeight = 11;
  let rightHeaderTextY = 4;
  
  doc.font(regularFontName).fontSize(8).fillColor(styles.headerText);
  doc.text('DEVIS', rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  rightHeaderTextY += lineHeight;
  doc.text(`#${quote.quoteNumber}`, rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  rightHeaderTextY += lineHeight + 2;
  doc.text(`Émis: ${formatDate(quote.issueDate)}`, rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  rightHeaderTextY += lineHeight;
  if (quote.validUntil) {
    doc.text(`Valide jusqu'au: ${formatDate(quote.validUntil)}`, rightColX, rightHeaderTextY, { width: rightColWidth, align: 'right' });
  }
  
  doc.restore();
  
  let linePosition = headerHeight + headerLineOffset;
  doc.strokeColor(styles.borderColor).lineWidth(0.5);
  doc.moveTo(0, linePosition).lineTo(doc.page.width, linePosition).stroke();
  
  doc.y = linePosition + 10;
  
  // Address section
  const infoStartY = doc.y;
  const colWidth = contentWidth / 2 - 20;
  
  doc.font(boldFontName).fontSize(9).fillColor(styles.bodyText);
  doc.text('De:', margin.left, infoStartY);
  doc.text('À:', margin.left + contentWidth / 2, infoStartY);
  
  doc.font(regularFontName).fontSize(9);
  const addressY = doc.y + 5;
  
  const companyDisplayName = quote.user.companyName || `${quote.user.firstName || ''} ${quote.user.lastName || ''}`.trim();
  
  // Build company info with conditional fields based on user PDF settings
  const userSettings = quote.user as any;
  const companyLines: string[] = [
    companyDisplayName,
    quote.user.street,
    `${quote.user.postalCode || ''} ${quote.user.city || ''}`.trim(),
    quote.user.country || ''
  ].filter(Boolean);
  
  // Add optional fields if enabled in user settings
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
  
  const companyAddress = companyLines.join('\n');
  const clientDisplayName = quote.client.companyName || `${quote.client.firstName || ''} ${quote.client.lastName || ''}`.trim();
  const clientAddress = [quote.client.street, `${quote.client.postalCode || ''} ${quote.client.city || ''}`.trim()].filter(Boolean).join('\n');
  
  doc.text(companyAddress, margin.left, addressY, { width: colWidth });
  doc.text(clientDisplayName, margin.left + contentWidth / 2, addressY);
  doc.text(clientAddress, { width: colWidth });
  
  doc.y = doc.y + 30;
  
  // Items table
  const tableTop = doc.y + 10;
  // Always use 3 decimal places for all units in quote PDFs
  const resolveQuantityDecimals = (_rawUnit?: unknown): 3 => {
    return 3;
  };
  const hasLineDiscounts = quote.items.some((item) => {
    const rawDiscount = (item as any)?.lineDiscountValue;
    const discountValue = typeof rawDiscount === 'string' ? parseFloat(rawDiscount) : Number(rawDiscount);
    return Number.isFinite(discountValue) && discountValue > 0;
  });
  try {
    console.log('[PDF_DEBUG] line discounts map', quote.items.map((item) => ({
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
  
  // Draw table header
  tableHeaders.forEach((header, i) => {
    const cellWidth = (colPositions[i+1] || margin.left + contentWidth) - colPositions[i];
    doc.rect(colPositions[i], tableTop, cellWidth, tableHeaderHeight).fillOpacity(1).fill('#F8FAFC');
    doc.rect(colPositions[i], tableTop, cellWidth, tableHeaderHeight).strokeOpacity(1).stroke('#E2E8F0');
    doc.font(boldFontName).fontSize(9).fillColor('#475569').text(header, colPositions[i] + cellPadding, tableTop + (tableHeaderHeight - 10) / 2, { width: cellWidth - (cellPadding * 2), align: i > 0 ? 'right' : 'left', lineGap: 2 });
  });
  
  let y = tableTop + tableHeaderHeight + 8;
  const rowPadding = 2;
  const rowHeight = 16;
  
  quote.items.forEach((item, index) => {
    if (y + rowHeight > doc.page.height - margin.bottom - 80) {
      doc.addPage();
      y = margin.top + 10;
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
    
    // Display discount if present
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
    // Use subtotalAfterDiscount if available, otherwise calculate
    const totalPrice = itemWithDiscount.subtotalAfterDiscount ? Number(itemWithDiscount.subtotalAfterDiscount).toFixed(2) : (Number(item.quantity) * Number(item.unitPrice)).toFixed(2);
    doc.text(totalPrice, colPositions[totalColIndex] + cellPadding, rowTextY, {
      width: colWidths[totalColIndex] - (cellPadding * 2),
      align: 'right',
      lineGap: 2,
    });
    
    y += rowHeight + rowPadding;
  });
  
  doc.y = y;
  
  // Totals section
  if (doc.y + 80 > doc.page.height - margin.bottom - 50) { doc.addPage(); doc.y = margin.top; }
  
  const totalsStartY = doc.y + 20;
  const totalLabelWidth = contentWidth * 0.6;
  const totalValueWidth = contentWidth * 0.3;
  const totalValueX = margin.left + totalLabelWidth + 20;
  
  const { subtotal, tvaAmount, total } = quote;
  const totalsLineHeight = 18;
  const labelOptions = { width: totalLabelWidth, align: 'right' as const };
  const valueOptions = { width: totalValueWidth, align: 'right' as const };
  
  doc.font(regularFontName).fontSize(9).fillColor(styles.bodyText);
  
  let currentY = totalsStartY;
  doc.text('Sous-total', margin.left, currentY, labelOptions);
  doc.text(formatAmount(Number(subtotal)), totalValueX, currentY, valueOptions);
  currentY += totalsLineHeight;
  
  // Global discount section if present
  const globalDiscountValue = (quote as any).globalDiscountValue;
  const globalDiscountType = (quote as any).globalDiscountType;
  const globalDiscountNote = (quote as any).globalDiscountNote;
  
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
  doc.text(`TVA (${quote.items[0]?.tvaRate ?? 0}%)`, margin.left, currentY, labelOptions);
  doc.text(formatAmount(Number(tvaAmount)), totalValueX, currentY, valueOptions);
  currentY += totalsLineHeight;
  
  const lineY = currentY - 2;
  doc.y = lineY + 10;
  
  doc.font(boldFontName).fontSize(11);
  const totalY = doc.y;
  doc.text('Total', margin.left, totalY, { ...labelOptions, align: 'right' as const });
  const totalText = `${formatAmount(Number(total))} ${quote.currency}`;
  doc.fillColor(styles.totalTextColor).text(totalText, totalValueX, totalY, { ...valueOptions, align: 'right' as const });
  
  // Notes section
  if (quote.notes) {
    doc.y += 30;
    doc.font(boldFontName).fontSize(9).fillColor(styles.bodyText);
    doc.text('Notes:', margin.left, doc.y);
    doc.font(regularFontName).fontSize(8);
    doc.text(quote.notes, margin.left, doc.y + 5, { width: contentWidth });
  }
  
  console.log('[PDF] Content rendering complete');
  
  await new Promise<void>((resolve, reject) => { 
    const onResolve = () => { 
      console.log('[QUOTE_PDF_BYTES]', __bytes); 
      console.log('[PDF] Document finalized successfully'); 
      setTimeout(resolve, 100); 
    };
    const onReject = (err: any) => { 
      console.error('[PDF] Document finalization error:', err); 
      reject(err); 
    };
    
    stream.once('finish', () => { console.log('[PDF] Stream finished'); });
    stream.once('close', () => { console.log('[PDF] Stream closed'); });
    doc.once('end', onResolve);
    doc.once('error', onReject);
    
    console.log('[PDF] Calling doc.end()...');
    try { doc.end(); console.log('[PDF] doc.end() called successfully'); } catch (e) { console.error('[PDF] Error calling doc.end():', e); onReject(e); } 
  });
};
