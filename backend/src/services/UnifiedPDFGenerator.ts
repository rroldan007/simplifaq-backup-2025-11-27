import { Invoice, Client, User, InvoiceItem } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { SwissQRBill } from 'swissqrbill/pdf';
import path from 'path';
import fs from 'fs';
import { Writable } from 'stream';
import { ThemeConfig, getThemeConfig } from '../themes/ThemeDefinitions';

// --- Interfaces ---

export interface DocumentData {
  type: 'INVOICE' | 'QUOTE';
  documentNumber: string;
  date: Date;
  dueDate?: Date; // ValidUntil for Quote
  currency: string;
  subtotal: number;
  tvaAmount: number;
  total: number;
  language: string;
  items: Array<{
    description: string;
    details?: string; // Additional details shown in smaller font below description
    quantity: number | string;
    unitPrice: number | string;
    tvaRate: number;
    total: number;
    unit?: string;
    lineDiscountValue?: number;
    lineDiscountType?: 'PERCENT' | 'AMOUNT';
  }>;
  globalDiscount?: {
    value: number;
    type: 'PERCENT' | 'AMOUNT';
    note?: string;
  };
  sender: {
    companyName?: string;
    firstName?: string;
    lastName?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    vatNumber?: string;
    iban?: string;
    logoUrl?: string;
  };
  recipient: {
    companyName?: string;
    firstName?: string;
    lastName?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  settings: {
    template?: string;
    accentColor?: string;
    showDecimals?: 2 | 3;
    // Advanced Customization
    logoPosition?: 'left' | 'center' | 'right';
    logoSize?: 'small' | 'medium' | 'large';
    fontColorHeader?: string;
    fontColorBody?: string;
    tableHeadColor?: string;
    totalBgColor?: string;
    totalTextColor?: string;
  };
  qrData?: any; // Only for invoices
}

// --- Assets Helper ---

const resolveAssetsPath = (): string | null => {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'assets'),
    path.resolve(__dirname, '..', '..', 'fonts'),
    path.resolve(__dirname, '..', '..', 'src', 'assets'),
  ];
  for (const base of candidates) {
    try {
      const fontsDir = path.join(base, 'fonts');
      if (fs.existsSync(fontsDir)) return base;
    } catch {}
  }
  return null;
};

const loadImageBuffer = async (filePath: string): Promise<Buffer | null> => {
  try {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return null; // Remote not supported for now without fetch
    
    let finalPath = filePath;
    if (!path.isAbsolute(filePath)) {
      finalPath = path.resolve(__dirname, '..', '..', filePath.replace(/^\//, ''));
    }
    
    if (fs.existsSync(finalPath)) {
      return await fs.promises.readFile(finalPath);
    }
  } catch (error) {
    console.error(`[PDF] Failed to load image: ${filePath}`, error);
  }
  return null;
};

// --- Formatting Helpers ---

const formatCurrency = (amount: number, currency: string = 'CHF') => {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency }).format(amount);
};

const formatNumber = (num: number | string, decimals: number = 2) => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  return isFinite(n) ? n.toFixed(decimals) : (0).toFixed(decimals);
};

// --- Color Contrast Helpers ---

/**
 * Calculate relative luminance of a color (WCAG formula)
 * @param hexColor - Color in hex format (#RRGGBB or #RGB)
 * @returns Luminance value between 0 (darkest) and 1 (brightest)
 */
const getLuminance = (hexColor: string): number => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  const fullHex = hex.length === 3 
    ? hex.split('').map(c => c + c).join('')
    : hex;
  
  // Extract RGB components
  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const gamma = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  
  // Calculate relative luminance (WCAG formula)
  return 0.2126 * gamma(r) + 0.7152 * gamma(g) + 0.0722 * gamma(b);
};

/**
 * Determine if background is dark and needs light text
 * @param backgroundColor - Background color in hex format
 * @returns true if background is dark (needs light text), false if light (needs dark text)
 */
const isDarkBackground = (backgroundColor: string): boolean => {
  const luminance = getLuminance(backgroundColor);
  return luminance < 0.5; // Threshold: values below 0.5 are considered dark
};

/**
 * Get the best text color for a given background color
 * @param backgroundColor - Background color in hex format
 * @param darkTextColor - Color to use on light backgrounds
 * @param lightTextColor - Color to use on dark backgrounds
 * @returns The appropriate text color for optimal contrast
 */
const getContrastingTextColor = (
  backgroundColor: string,
  darkTextColor: string = '#000000',
  lightTextColor: string = '#FFFFFF'
): string => {
  return isDarkBackground(backgroundColor) ? lightTextColor : darkTextColor;
};

// --- Main Generator Class ---

export class UnifiedPDFGenerator {
  private doc: any;
  private data: DocumentData;
  private theme: ThemeConfig;
  private fonts: { regular: string; bold: string };

  constructor(data: DocumentData, stream: Writable) {
    this.data = data;
    this.theme = getThemeConfig(data.settings.template, data.settings.accentColor);
    
    // Apply Advanced Customization Overrides
    if (data.settings.logoPosition) {
      this.theme.layout.logoPosition = data.settings.logoPosition;
    }
    if (data.settings.logoSize) {
      const sizes: Record<string, number> = { small: 40, medium: 60, large: 80 };
      const size = sizes[data.settings.logoSize];
      if (size) this.theme.layout.logoHeight = size;
    }
    if (data.settings.fontColorHeader) {
      this.theme.colors.text.header = data.settings.fontColorHeader;
    }
    if (data.settings.fontColorBody) {
      this.theme.colors.text.body = data.settings.fontColorBody;
    }
    if (data.settings.tableHeadColor) {
      this.theme.colors.background.tableHeader = data.settings.tableHeadColor;
    }
    if (data.settings.totalBgColor) {
      this.theme.colors.primary = data.settings.totalBgColor;
    }
    if (data.settings.totalTextColor) {
      this.theme.colors.text.inverse = data.settings.totalTextColor;
    }

    this.doc = new PDFDocument({
      size: 'A4',
      margin: 0, // We handle margins manually
      bufferPages: true,
      autoFirstPage: true
    });

    this.doc.pipe(stream);
    this.fonts = this.registerFonts();
  }

  private registerFonts() {
    const assetsPath = resolveAssetsPath();
    let regular = 'Helvetica';
    let bold = 'Helvetica-Bold';

    if (assetsPath) {
      const fontsDir = path.join(assetsPath, 'fonts');
      const regPath = path.join(fontsDir, 'Inter-Regular.ttf');
      const boldPath = path.join(fontsDir, 'Inter-Bold.ttf');

      if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
        this.doc.registerFont('Inter-Regular', regPath);
        this.doc.registerFont('Inter-Bold', boldPath);
        regular = 'Inter-Regular';
        bold = 'Inter-Bold';
      }
    }
    return { regular, bold };
  }

  public async generate() {
    // 1. Header (Logo + Company Info + Doc Info)
    const headerBottomY = await this.drawHeader();

    // 2. Recipient Info (Start below header content with padding)
    const recipientEndY = this.drawRecipient(headerBottomY + 30);

    // 3. Items Table
    this.drawTable(recipientEndY + 40);

    // 4. Totals
    this.drawTotals();

    // 5. Footer / QR Bill
    this.drawFooterAndQR();

    this.doc.end();
  }

  private async drawHeader(): Promise<number> {
    const { margins, headerHeight } = this.theme.layout;
    
    // Always draw header background (even if white, for consistency)
    // This ensures the header area is properly defined
    this.doc.rect(0, 0, this.doc.page.width, headerHeight)
      .fill(this.theme.colors.background.header);

    // Logo
    let logoOffset = 0;
    let logoWidth = 0;
    let logoBottomY = margins.top;

    if (this.data.sender.logoUrl) {
      const logoBuffer = await loadImageBuffer(this.data.sender.logoUrl);
      if (logoBuffer) {
        const logoHeight = this.theme.layout.logoHeight;
        const yPos = Math.max(margins.top, 15); // Minimum 15px padding from top
        let xPos = margins.left;
        
        if (this.theme.layout.logoPosition === 'right') {
          xPos = this.doc.page.width - margins.right - logoHeight;
        } else if (this.theme.layout.logoPosition === 'center') {
          xPos = (this.doc.page.width - logoHeight) / 2;
        }

        // Draw the logo and capture its actual width
        const imgInfo = this.doc.image(logoBuffer, xPos, yPos, { height: logoHeight });
        
        // Calculate actual width based on aspect ratio
        // PDFKit returns the image with width property after placement
        logoWidth = imgInfo.width || logoHeight; // Fallback to height if width not available
        
        logoOffset = logoHeight + 20; // Vertical offset (for positioning below logo)
        logoBottomY = yPos + logoHeight;
      }
    }

    // Document Title & ID
    // Logic: If logo is right, text is left. If logo is left/center, text is right.
    const titleAlign = this.theme.layout.logoPosition === 'right' ? 'left' : 'right';
    const titleY = Math.max(margins.top, 15); // Consistent with logo and sender info

    // Use dynamic contrast for title text based on header background
    const titleTextColor = getContrastingTextColor(
      this.theme.colors.background.header,
      this.theme.colors.text.header,
      '#FFFFFF'
    );
    
    this.doc.fillColor(titleTextColor);
    this.doc.font(this.fonts.bold).fontSize(this.theme.fonts.sizes.h1);
    const title = this.data.type === 'INVOICE' ? 'FACTURE' : 'DEVIS';
    this.doc.text(title, margins.left, titleY, { align: titleAlign, width: this.doc.page.width - margins.left - margins.right });

    this.doc.fontSize(this.theme.fonts.sizes.h2);
    this.doc.text(`#${this.data.documentNumber}`, margins.left, titleY + 35, { align: titleAlign, width: this.doc.page.width - margins.left - margins.right });

    // Sender Info - Position based on logo location
    // Logic: 
    // If logo is LEFT: Sender info goes to the RIGHT of logo (side by side)
    // If logo is RIGHT: Sender info goes TOP LEFT
    // If logo is CENTER: Sender info goes TOP LEFT
    
    let senderX = margins.left;
    let senderY = Math.max(margins.top, 15); // Minimum 15px padding from top
    let senderWidth = 250; // Default width for sender info
    
    if (this.theme.layout.logoPosition === 'left' && this.data.sender.logoUrl && logoWidth > 0) {
        // Logo on left: Put sender info to the RIGHT of logo (side by side)
        senderX = margins.left + logoWidth + 20; // Logo width + spacing
        senderY = Math.max(margins.top, 15); // Align with logo but ensure minimum padding
        senderWidth = this.doc.page.width - senderX - margins.right - 150; // Leave space for title on right
    } else if (this.theme.layout.logoPosition === 'right') {
        // Logo on right: Sender info on TOP LEFT
        senderX = margins.left;
        senderY = Math.max(margins.top, 15);
        senderWidth = this.doc.page.width - margins.left - margins.right - logoWidth - 20; // Don't overlap with logo
    } else {
        // Center or no logo: Sender info on LEFT
        senderX = margins.left;
        senderY = Math.max(margins.top, 15);
        senderWidth = 250;
    }
    
    // Dynamically determine text color based on header background for optimal contrast
    const senderTextColor = getContrastingTextColor(
      this.theme.colors.background.header, 
      this.theme.colors.text.body, 
      '#FFFFFF'
    );
    
    this.doc.fillColor(senderTextColor);
    this.doc.fontSize(this.theme.fonts.sizes.body).font(this.fonts.bold);
    
    const companyName = this.data.sender.companyName || `${this.data.sender.firstName} ${this.data.sender.lastName}`;
    
    this.doc.text(companyName, senderX, senderY, { align: 'left', width: senderWidth });
    
    // Address lines use same contrasting color for consistency
    this.doc.font(this.fonts.regular).fontSize(this.theme.fonts.sizes.small);
    
    const addressLines = [
      this.data.sender.street,
      `${this.data.sender.postalCode} ${this.data.sender.city}`,
      this.data.sender.country,
      this.data.sender.vatNumber ? `TVA: ${this.data.sender.vatNumber}` : null,
      this.data.sender.phone,
      this.data.sender.email,
      this.data.sender.website
    ].filter(Boolean);

    let currentY = senderY + 15;
    const lineHeight = 12;
    const availableHeight = headerHeight - (currentY - margins.top) - 10; // Leave 10px bottom padding
    const maxLines = Math.floor(availableHeight / lineHeight);
    
    // Only show lines that fit within the header height
    const visibleLines = addressLines.slice(0, maxLines);
    
    visibleLines.forEach(line => {
      if (line && currentY + lineHeight <= headerHeight - 5) { // Safety check
        this.doc.text(line, senderX, currentY, { width: senderWidth });
        currentY += lineHeight;
      }
    });

    // Return the header height (fixed) to ensure consistent layout
    // Title block position is already calculated separately
    return headerHeight;
  }

  private drawRecipient(startY: number): number {
    const { margins } = this.theme.layout;
    const yPos = startY;

    // "To" Label
    this.doc.fillColor(this.theme.colors.text.muted).fontSize(this.theme.fonts.sizes.small);
    this.doc.text('Destinataire:', margins.left, yPos);

    // Recipient Address Block
    this.doc.fillColor(this.theme.colors.text.body).fontSize(this.theme.fonts.sizes.body).font(this.fonts.bold);
    const rName = this.data.recipient.companyName || `${this.data.recipient.firstName} ${this.data.recipient.lastName}`;
    
    this.doc.text(rName, margins.left, yPos + 15);
    
    this.doc.font(this.fonts.regular);
    const rLines = [
      this.data.recipient.street,
      `${this.data.recipient.postalCode} ${this.data.recipient.city}`,
      this.data.recipient.country
    ].filter(Boolean);

    let rY = yPos + 30;
    rLines.forEach(line => {
      if (line) {
        this.doc.text(line, margins.left, rY);
        rY += 15;
      }
    });

    // Dates (Right side aligned with recipient)
    const rightColX = this.doc.page.width / 2 + 50;
    const dateY = yPos;

    this.doc.fillColor(this.theme.colors.text.muted).fontSize(this.theme.fonts.sizes.small);
    this.doc.text('Date d\'émission:', rightColX, dateY);
    this.doc.fillColor(this.theme.colors.text.body).fontSize(this.theme.fonts.sizes.body);
    this.doc.text(this.data.date.toLocaleDateString('fr-CH'), rightColX, dateY + 15);

    if (this.data.dueDate) {
      const label = this.data.type === 'INVOICE' ? 'Échéance:' : 'Valide jusqu\'au:';
      this.doc.fillColor(this.theme.colors.text.muted).fontSize(this.theme.fonts.sizes.small);
      this.doc.text(label, rightColX, dateY + 40);
      this.doc.fillColor(this.theme.colors.text.body).fontSize(this.theme.fonts.sizes.body);
      this.doc.text(this.data.dueDate.toLocaleDateString('fr-CH'), rightColX, dateY + 55);
    }

    // Return bottom of recipient block to push table down
    return Math.max(rY, dateY + 70); 
  }

  private drawTable(startY: number) {
    const { margins } = this.theme.layout;
    const tableWidth = this.doc.page.width - margins.left - margins.right;
    
    // Columns: Desc (50%), Qty (10%), Unit (10%), Price (15%), Total (15%)
    const cols = [
      { name: 'Description', width: tableWidth * 0.5, align: 'left' },
      { name: 'Qté', width: tableWidth * 0.1, align: 'right' },
      { name: 'Prix', width: tableWidth * 0.2, align: 'right' },
      { name: 'Total', width: tableWidth * 0.2, align: 'right' }
    ];

    let currentX = margins.left;
    let currentY = startY;

    // Table Header
    this.doc.rect(margins.left, currentY - 5, tableWidth, 25)
      .fill(this.theme.colors.background.tableHeader);
    
    // Dynamically determine text color based on table header background for optimal contrast
    const tableHeaderTextColor = getContrastingTextColor(
      this.theme.colors.background.tableHeader,
      this.theme.colors.text.header,
      '#FFFFFF'
    );
    
    this.doc.fillColor(tableHeaderTextColor)
      .font(this.fonts.bold)
      .fontSize(this.theme.fonts.sizes.small);

    cols.forEach((col, index) => {
      const padding = 5; // 5px padding on each side
      const textX = index === 0 ? currentX + padding : currentX; // Left padding only for first column
      const textWidth = index === cols.length - 1 ? col.width - padding : col.width; // Right padding for last column
      this.doc.text(col.name, textX, currentY + 2, { width: textWidth - padding, align: col.align as any });
      currentX += col.width;
    });

    currentY += 25;

    // Rows
    this.doc.font(this.fonts.regular).fontSize(this.theme.fonts.sizes.body);
    
    this.data.items.forEach((item, index) => {
      // Calculate amounts and discount
      const subtotalBefore = Number(item.quantity) * Number(item.unitPrice);
      const lineTotal = Number(item.total);
      const computedDiscountAmount = Math.max(0, subtotalBefore - lineTotal);
      // Consider tiny rounding differences
      const hasDiscount = computedDiscountAmount > 0.0001;
      
      // Calculate dynamic row height based on content
      const padding = 5;
      const descriptionLineHeight = 15;
      const detailsLineHeight = 12;
      const discountLineHeight = 15;
      
      // Measure description height (PDFKit heightOfString)
      const descHeight = this.doc.heightOfString(item.description, { width: cols[0].width - padding });
      const numDescLines = Math.ceil(descHeight / descriptionLineHeight);
      
      // Measure details height if present
      let detailsHeight = 0;
      if (item.details) {
        // Temporarily set font size to measure details
        const currentFontSize = this.doc.fontSize();
        this.doc.fontSize(this.theme.fonts.sizes.small);
        detailsHeight = this.doc.heightOfString(item.details, { width: cols[0].width - padding });
        this.doc.fontSize(currentFontSize); // Restore font size
      }
      
      let rowHeight = Math.max(20, descHeight + (detailsHeight > 0 ? detailsHeight + 4 : 0));
      if (hasDiscount) rowHeight += discountLineHeight + 3; // Extra line for discount
      
      console.log(`[PDF] Item "${item.description}":`, {
        hasDiscount,
        numDescLines,
        descHeight,
        detailsHeight,
        rowHeight,
        lineDiscountValue: item.lineDiscountValue,
        lineDiscountType: item.lineDiscountType
      });
      
      // Zebra striping with dynamic height
      if (index % 2 !== 0 && this.theme.colors.background.altRow !== '#FFFFFF') {
        this.doc.rect(margins.left, currentY - 5, tableWidth, rowHeight + 5)
          .fill(this.theme.colors.background.altRow);
      }

      this.doc.fillColor(this.theme.colors.text.body);
      currentX = margins.left;

      // Description (main title)
      this.doc.font(this.fonts.regular).fontSize(this.theme.fonts.sizes.body);
      this.doc.text(item.description, currentX + padding, currentY, { width: cols[0].width - padding });
      
      // Additional details in smaller font below description
      if (item.details && detailsHeight > 0) {
        const detailsY = currentY + descHeight + 2;
        this.doc.font(this.fonts.regular).fontSize(this.theme.fonts.sizes.small);
        this.doc.fillColor(this.theme.colors.text.muted);
        this.doc.text(item.details, currentX + padding, detailsY, { width: cols[0].width - padding });
        this.doc.fillColor(this.theme.colors.text.body);
        this.doc.font(this.fonts.regular).fontSize(this.theme.fonts.sizes.body);
      }
      
      currentX += cols[0].width;

      // Qty, Price, Total - align to top of row
      const qtyY = currentY;
      
      // Qty
      const decimals = this.data.settings.showDecimals || 2;
      const qty = Number(item.quantity).toFixed(decimals);
      const unit = item.unit ? ` ${item.unit}` : '';
      this.doc.text(`${qty}${unit}`, currentX, qtyY, { width: cols[1].width - padding, align: 'right' });
      currentX += cols[1].width;

      // Price
      this.doc.text(formatNumber(item.unitPrice), currentX, qtyY, { width: cols[2].width - padding, align: 'right' });
      currentX += cols[2].width;

      // Total
      this.doc.text(formatNumber(item.total), currentX, qtyY, { width: cols[3].width - padding, align: 'right' });

      // Update currentY using the actual measured heights
      currentY += descHeight + (detailsHeight > 0 ? detailsHeight + 4 : 0) + 5; // +5 for row spacing

      // Show discount if present
      if (hasDiscount) {
        // Prefer explicit value/type if provided, else fall back to computed percent
        let discountLabel = 'Rabais';
        if (item.lineDiscountType === 'PERCENT' && item.lineDiscountValue && item.lineDiscountValue > 0) {
          discountLabel = `Rabais: -${item.lineDiscountValue}%`;
        } else if (subtotalBefore > 0) {
          const perc = Math.round((computedDiscountAmount / subtotalBefore) * 1000) / 10; // one decimal
          discountLabel = `Rabais: -${perc}%`;
        }

        // Draw discount on new line with red color
        this.doc.fillColor('#DC2626').fontSize(9).font(this.fonts.regular);
        // Left side: discount label
        this.doc.text(discountLabel, margins.left + 10, currentY, { width: cols[0].width + cols[1].width - 10 });
        // Right side: discount amount (computed from totals)
        const discountX = margins.left + cols[0].width + cols[1].width + cols[2].width;
        this.doc.text(`-${formatNumber(computedDiscountAmount)}`, discountX, currentY, {
          width: cols[3].width,
          align: 'right'
        });

        currentY += 15;
        // Reset to normal style
        this.doc.fillColor(this.theme.colors.text.body)
          .fontSize(this.theme.fonts.sizes.body)
          .font(this.fonts.regular);
      } else {
        currentY += 5;
      }

      // Page Break check
      if (currentY > this.doc.page.height - 150) { // More space for totals
        this.doc.addPage();
        currentY = margins.top;
      }
    });

    // Add spacing before totals and set Y position explicitly
    currentY += 15;
    this.doc.y = currentY;
  }

  private drawTotals() {
    const { margins } = this.theme.layout;
    const rightColX = this.doc.page.width - margins.right - 200;
    const width = 200;

    // Divider
    this.doc.moveTo(rightColX, this.doc.y).lineTo(this.doc.page.width - margins.right, this.doc.y).strokeColor(this.theme.colors.secondary).stroke();
    this.doc.moveDown(0.5);

    // Subtotal
    this.drawTotalRow('Sous-total', this.data.subtotal, false);

    // Global Discount
    console.log('[UnifiedPDFGenerator] globalDiscount check:', {
      hasGlobalDiscount: !!this.data.globalDiscount,
      globalDiscount: this.data.globalDiscount
    });
    
    if (this.data.globalDiscount && this.data.globalDiscount.value > 0) {
       console.log('[UnifiedPDFGenerator] Drawing global discount:', this.data.globalDiscount);
       const discVal = this.data.globalDiscount.value;
       const discType = this.data.globalDiscount.type;
       
       // Calculate discount amount
       let discountAmount = 0;
       if (discType === 'PERCENT') {
         discountAmount = this.data.subtotal * (discVal / 100);
       } else {
         discountAmount = Math.min(discVal, this.data.subtotal);
       }
       
       // Label with percentage/amount
       const label = discType === 'PERCENT' ? `Rabais global (${discVal}%)` : 'Rabais global';
       
       // Draw discount row in red using same pattern as drawTotalRow
       const { margins } = this.theme.layout;
       const rightColX = this.doc.page.width - margins.right - 200;
       const width = 200;
       
       const currentY = this.doc.y;
       this.doc.fillColor('#DC2626');
       this.doc.font(this.fonts.regular).fontSize(10);
       this.doc.text(label, rightColX, currentY, { width: width / 2, align: 'left' });
       this.doc.text(`-${formatNumber(discountAmount)}`, rightColX + width / 2, currentY, { width: width / 2, align: 'right' });
       this.doc.moveDown(0.5);
       
       // Show discount note if present
       if (this.data.globalDiscount.note) {
         this.doc.fillColor(this.theme.colors.text.muted).fontSize(8).font(this.fonts.regular);
         this.doc.text(this.data.globalDiscount.note, rightColX, this.doc.y, { width: width, align: 'left' });
         this.doc.moveDown(0.5);
       }
       
       // Reset color
       this.doc.fillColor(this.theme.colors.text.body);
    }

    // TVA breakdown by rate
    const tvaByRate = new Map<number, { base: number; tva: number }>();
    this.data.items.forEach(item => {
      const subtotalBefore = Number(item.quantity) * Number(item.unitPrice);
      let discountAmount = 0;
      
      if (item.lineDiscountValue && item.lineDiscountValue > 0) {
        if (item.lineDiscountType === 'PERCENT') {
          discountAmount = subtotalBefore * (item.lineDiscountValue / 100);
        } else {
          discountAmount = Math.min(item.lineDiscountValue, subtotalBefore);
        }
      }
      
      const baseAmount = subtotalBefore - discountAmount;
      const tvaAmount = baseAmount * (item.tvaRate / 100);
      
      if (!tvaByRate.has(item.tvaRate)) {
        tvaByRate.set(item.tvaRate, { base: 0, tva: 0 });
      }
      
      const current = tvaByRate.get(item.tvaRate)!;
      current.base += baseAmount;
      current.tva += tvaAmount;
    });
    
    // Show TVA breakdown for each rate
    const sortedRates = Array.from(tvaByRate.keys()).sort((a, b) => b - a);
    sortedRates.forEach(rate => {
      const data = tvaByRate.get(rate)!;
      if (rate > 0) {
        this.drawTotalRow(`TVA ${rate}%`, data.tva, false);
      }
    });
    
    // Total TVA
    if (sortedRates.length > 1) {
      this.drawTotalRow(`TVA Total`, this.data.tvaAmount, false);
    } else if (sortedRates.length === 1 && sortedRates[0] === 0) {
      // If only 0% TVA, show it explicitly
      this.drawTotalRow(`TVA 0%`, 0, false);
    }

    this.doc.moveDown(0.5);
    
    // Grand Total - Simple text without background (clean design)
    const totalY = this.doc.y;
    this.doc.fillColor(this.theme.colors.text.body);
    this.doc.font(this.fonts.bold).fontSize(12);
    this.doc.text(`Total ${this.data.currency}`, rightColX, totalY, { width: width / 2, align: 'left' });
    this.doc.text(formatNumber(this.data.total), rightColX + width / 2, totalY, { width: width / 2, align: 'right' });
    
    this.doc.moveDown();
  }

  private drawTotalRow(label: string, amount: number, isBold: boolean) {
     const { margins } = this.theme.layout;
     const rightColX = this.doc.page.width - margins.right - 200;
     const width = 200;
     
     this.doc.fillColor(this.theme.colors.text.body);
     this.doc.font(isBold ? this.fonts.bold : this.fonts.regular).fontSize(10);
     this.doc.text(label, rightColX, this.doc.y, { width: width / 2, align: 'left' });
     this.doc.text(formatNumber(amount), rightColX + width / 2, this.doc.y - 12, { width: width / 2, align: 'right' }); // Simple offset hack
     this.doc.moveDown(0.5);
  }

  private drawFooterAndQR() {
     // QR Bill Logic (Only for Invoices with QR Data)
     if (this.data.type === 'INVOICE' && this.data.qrData) {
        console.log('[QRBILL_DEBUG] QR Data received:', JSON.stringify(this.data.qrData, null, 2));
        try {
           // Map to the exact structure that swissqrbill library expects
           // Based on working OLD code: creditor.account, address (not addressLine1), zip (not postalCode)
           const qrBillInput: any = {
              creditor: {
                 name: this.data.qrData.creditor.name,
                 address: this.data.qrData.creditor.addressLine1, // Library expects 'address'
                 zip: this.data.qrData.creditor.postalCode,        // Library expects 'zip'
                 city: this.data.qrData.creditor.city,
                 country: this.data.qrData.creditor.country,
                 account: this.data.qrData.creditorAccount         // INSIDE creditor object
              },
              amount: this.data.qrData.amount,
              currency: this.data.qrData.currency,
              reference: this.data.qrData.reference,
              referenceType: this.data.qrData.referenceType,
              unstructuredMessage: this.data.qrData.unstructuredMessage
           };
           
           // Add debtor if present
           if (this.data.qrData.debtor) {
              qrBillInput.debtor = {
                 name: this.data.qrData.debtor.name,
                 address: this.data.qrData.debtor.addressLine1,  // Library expects 'address'
                 zip: this.data.qrData.debtor.postalCode,         // Library expects 'zip'
                 city: this.data.qrData.debtor.city,
                 country: this.data.qrData.debtor.country
              };
           }
           
           console.log('[QRBILL_DEBUG] Mapped input for library:', JSON.stringify(qrBillInput, null, 2));
           
           const qrBill = new SwissQRBill(qrBillInput, { language: 'FR' });
           console.log('[QRBILL_DEBUG] SwissQRBill instance created.');
           
           // Check space. Swiss QR Bill needs bottom ~105mm (~298 pts).
           // Use a safe threshold to ensure it fits cleanly at the bottom.
           if (this.doc.y > this.doc.page.height - 350) {
              this.doc.addPage();
              console.log('[QRBILL_DEBUG] Added new page for QR Bill due to insufficient space.');
           }
           
           qrBill.attachTo(this.doc);
           console.log('[QRBILL_DEBUG] QR Bill attached to document.');
        } catch (e: any) {
           console.error('[QRBILL_ERROR] Failed to attach QR Bill:', e);
           
           // Print error on PDF so user can see it
           const errorMsg = e.message || 'Erreur inconnue';
           this.doc.addPage();
           this.doc.fillColor('red').fontSize(12);
           this.doc.text('Erreur lors de la génération du QR-Bill:', 50, 50);
           this.doc.fontSize(10).text(errorMsg, 50, 70);
           this.doc.text('Veuillez vérifier votre IBAN et les adresses (émetteur et destinataire).', 50, 90);
           
           if (this.data.qrData) {
              this.doc.fillColor('black').fontSize(8);
              this.doc.text('Données techniques:', 50, 120);
              this.doc.text(JSON.stringify(this.data.qrData, null, 2), 50, 135);
           }
        }
     } else {
        console.log('[QRBILL_DEBUG] QR Bill skipped. Type:', this.data.type, 'Has qrData:', !!this.data.qrData);
        if (this.data.type === 'INVOICE' && !this.data.qrData) {
             // Warn user on PDF if QR data is missing completely
             this.doc.fillColor('red').fontSize(10);
             this.doc.text('QR-Bill non généré: Données manquantes (IBAN ou Adresse)', this.theme.layout.margins.left, this.doc.page.height - 50);
        } else {
             // Simple Footer for Quotes or Non-QR
             const { margins } = this.theme.layout;
             this.doc.fontSize(8).fillColor(this.theme.colors.text.muted);
             this.doc.text('Merci de votre confiance.', margins.left, this.doc.page.height - 50, { align: 'center', width: this.doc.page.width - margins.left * 2 });
        }
     }
  }
}
