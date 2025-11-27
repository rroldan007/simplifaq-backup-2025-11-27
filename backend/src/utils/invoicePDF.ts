import * as puppeteer from 'puppeteer';
import { SwissQRBillData } from './swissQRBill';

/**
 * InvoicePDF component with Swiss QR Bill integration
 * Handles multi-page support with QR Bill on last page and dynamic content height calculation
 */

export interface InvoiceData {
  invoiceNumber: string;
  logoUrl?: string; // Optional company logo URL or file path
  issueDate: Date;
  dueDate: Date;
  
  // Company information
  company: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
  };
  
  // Client information
  client: {
    name: string;
    address: string;
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
    total: number;
  }>;
  
  // Totals
  subtotal: number;
  tvaAmount: number;
  total: number;
  currency: 'CHF' | 'EUR';
  
  // Additional information
  notes?: string;
  terms?: string;
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
}

// Default PDF options
const DEFAULT_PDF_OPTIONS: Required<PDFGenerationOptions> = {
  format: 'A4',
  language: 'fr',
  margins: {
    top: 20,
    right: 15,
    bottom: 20,
    left: 15,
  },
  qrBillOnSeparatePage: false,
  template: 'elegant_classic',
  accentColor: '#0B1F3A',
};

/**
 * Main function to generate invoice PDF with integrated Swiss QR Bill
 */
export async function generateInvoicePDFWithQRBill(
  invoiceData: InvoiceData,
  qrBillData: SwissQRBillData,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_PDF_OPTIONS, ...options };

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

    // Set HTML content and wait for it to load
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Calculate content height and determine if QR Bill fits on last page
    const contentMetrics = await calculateContentMetrics(page);
    
    // Generate PDF with proper page breaks
    const pdfBuffer = await page.pdf({
      format: opts.format,
      margin: {
        top: `${opts.margins.top}mm`,
        right: `${opts.margins.right}mm`,
        bottom: `${opts.margins.bottom}mm`,
        left: `${opts.margins.left}mm`,
      },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
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
 * Calculates content metrics to determine optimal page layout
 */
async function calculateContentMetrics(page: puppeteer.Page): Promise<{
  contentHeight: number;
  availableHeight: number;
  needsNewPageForQRBill: boolean;
}> {
  const metrics = await page.evaluate(() => {
    const content = (globalThis as any).document?.querySelector('.invoice-content');
    const qrBill = (globalThis as any).document?.querySelector('.qr-bill-container');
    
    if (!content || !qrBill) {
      return { contentHeight: 0, availableHeight: 0, needsNewPageForQRBill: false };
    }

    const contentHeight = content.getBoundingClientRect().height;
    const qrBillHeight = 105; // QR Bill height in mm converted to pixels
    const pageHeight = 297; // A4 height in mm
    const margins = 40; // Top and bottom margins in mm
    const availableHeight = pageHeight - margins;
    
    // Check if content + QR Bill fits on one page
    const totalHeight = contentHeight + qrBillHeight;
    const needsNewPageForQRBill = totalHeight > availableHeight;

    return {
      contentHeight,
      availableHeight,
      needsNewPageForQRBill,
    };
  });

  return metrics;
}

/**
 * Generates complete HTML content for invoice with integrated QR Bill
 */
function generateInvoiceHTML(
  invoiceData: InvoiceData,
  qrBillData: SwissQRBillData,
  options: Required<PDFGenerationOptions>
): string {
  const { language } = options;

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

  // Generate invoice items HTML with page break awareness
  const itemsHTML = invoiceData.items.map((item, index) => `
    <tr class="invoice-item ${index > 0 && index % 15 === 0 ? 'page-break-before' : ''}">
      <td class="item-description">${item.description}</td>
      <td class="item-quantity">${item.quantity}</td>
      <td class="item-price">${formatCurrency(item.unitPrice, invoiceData.currency)}</td>
      <td class="item-tva">${item.tvaRate.toFixed(2)}%</td>
      <td class="item-total">${formatCurrency(item.total, invoiceData.currency)}</td>
    </tr>
  `).join('');

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

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facture ${invoiceData.invoiceNumber}</title>
      <style>
        ${getInvoiceCSS()}
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Main Invoice Content -->
        <div class="invoice-content">
          <!-- Invoice Header -->
          <div class="header">
            <div class="company-info">
              <h1>${invoiceData.company.name}</h1>
              <p>${invoiceData.company.address}</p>
              <p>${invoiceData.company.postalCode} ${invoiceData.company.city}</p>
              <p>${invoiceData.company.country}</p>
              ${invoiceData.company.vatNumber ? `<p>TVA: ${invoiceData.company.vatNumber}</p>` : ''}
              ${invoiceData.company.phone ? `<p>Tél: ${invoiceData.company.phone}</p>` : ''}
              ${invoiceData.company.email ? `<p>Email: ${invoiceData.company.email}</p>` : ''}
            </div>
            <div class="invoice-info">
              <h2>FACTURE</h2>
              <div class="invoice-number">N° ${invoiceData.invoiceNumber}</div>
            </div>
          </div>
          
          <!-- Invoice Details -->
          <div class="invoice-details">
            <div class="client-info">
              <h3>Facturé à:</h3>
              <p><strong>${invoiceData.client.name}</strong></p>
              <p>${invoiceData.client.address}</p>
              <p>${invoiceData.client.postalCode} ${invoiceData.client.city}</p>
              <p>${invoiceData.client.country}</p>
              ${invoiceData.client.vatNumber ? `<p>TVA: ${invoiceData.client.vatNumber}</p>` : ''}
            </div>
            <div class="invoice-meta">
              <h3>Détails de la facture:</h3>
              <p><strong>Date de facture:</strong> ${formatDate(invoiceData.issueDate)}</p>
              <p><strong>Date d'échéance:</strong> ${formatDate(invoiceData.dueDate)}</p>
              <p><strong>Devise:</strong> ${invoiceData.currency}</p>
            </div>
          </div>
          
          <!-- Invoice Items -->
          <div class="items-section">
            <table class="items-table">
              <thead>
                <tr>
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
          
          <!-- Totals -->
          <div class="totals-section">
            <table class="totals-table">
              <tr class="subtotal-row">
                <td>Sous-total:</td>
                <td style="text-align: right;">${formatCurrency(invoiceData.subtotal, invoiceData.currency)}</td>
              </tr>
              ${tvaBreakdownHTML}
              <tr class="total-row">
                <td>TOTAL:</td>
                <td style="text-align: right;">${formatCurrency(invoiceData.total, invoiceData.currency)}</td>
              </tr>
            </table>
          </div>
          
          <!-- Notes -->
          ${invoiceData.notes ? `
            <div class="notes">
              <h4>Notes:</h4>
              <p>${invoiceData.notes}</p>
            </div>
          ` : ''}
          
          <!-- Terms -->
          ${invoiceData.terms ? `
            <div class="terms">
              <p><strong>Conditions de paiement:</strong> ${invoiceData.terms}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Swiss QR Bill - Always on last page -->
        <div class="qr-bill-container">
          <div class="perforation-line"></div>
          ${qrBillHTML}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates CSS styles for the invoice PDF
 */
function getInvoiceCSS(): string {
  return `
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #2c3e50;
      background: white;
    }
    
    .invoice-container {
      width: 210mm;
      min-height: 297mm;
      position: relative;
    }
    
    .invoice-content {
      padding: 25mm 20mm 0 20mm;
      min-height: calc(297mm - 105mm - 25mm);
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
    
    /* QR Bill container - Always at bottom of last page */
    .qr-bill-container {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 210mm;
      height: 105mm;
      page-break-inside: avoid;
      page-break-before: auto;
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
    
    /* Ensure QR Bill starts on new page if content is too long */
    @media print {
      .qr-bill-container {
        page-break-before: auto;
      }
      
      .invoice-content {
        page-break-after: avoid;
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
 * Generates HTML content for Swiss QR Bill
 */
function generateQRBillHTML(qrBillData: SwissQRBillData, options: Required<PDFGenerationOptions>): string {
  const { language } = options;

  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('fr-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Generate QR code data string according to Swiss QR Bill specification
  const qrCodeData = generateQRCodeData(qrBillData);

  // Get localized labels
  const labels = getLocalizedLabels(language);

  return `
    <div class="qr-bill">
      <style>
        .qr-bill {
          width: 210mm;
          height: 105mm;
          font-family: Arial, sans-serif;
          font-size: 8pt;
          line-height: 1.2;
          display: flex;
          background: white;
          border-top: 1px solid #000;
        }
        
        .receipt {
          width: 62mm;
          height: 105mm;
          padding: 5mm;
          border-right: 1px solid #000;
          box-sizing: border-box;
        }
        
        .payment-part {
          width: 148mm;
          height: 105mm;
          padding: 5mm;
          box-sizing: border-box;
          display: flex;
        }
        
        .payment-info {
          width: 95mm;
          margin-right: 5mm;
        }
        
        .qr-section {
          width: 46mm;
          text-align: center;
        }
        
        .qr-code {
          width: 46mm;
          height: 46mm;
          border: 1px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6pt;
          margin-bottom: 5mm;
          background: white;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 11pt;
          margin-bottom: 3mm;
        }
        
        .field-label {
          font-weight: bold;
          margin-top: 2mm;
          margin-bottom: 1mm;
        }
        
        .field-value {
          margin-bottom: 2mm;
          word-wrap: break-word;
        }
        
        .amount-box {
          border: 1px solid #000;
          padding: 2mm;
          margin-top: 2mm;
          text-align: right;
          font-weight: bold;
          min-height: 8mm;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        
        .acceptance-point {
          margin-top: 5mm;
          text-align: right;
          font-size: 6pt;
        }
      </style>
      
      <!-- Receipt Section -->
      <div class="receipt">
        <div class="section-title">${labels.receipt}</div>
        
        <div class="field-label">${labels.account}</div>
        <div class="field-value">${qrBillData.creditorAccount}</div>
        
        <div class="field-label">${labels.payableTo}</div>
        <div class="field-value">
          ${qrBillData.creditor.name}<br>
          ${qrBillData.creditor.addressLine1}<br>
          ${qrBillData.creditor.postalCode} ${qrBillData.creditor.city}
        </div>
        
        ${qrBillData.reference ? `
          <div class="field-label">${labels.reference}</div>
          <div class="field-value">${formatReference(qrBillData.reference)}</div>
        ` : ''}
        
        ${qrBillData.debtor ? `
          <div class="field-label">${labels.payableBy}</div>
          <div class="field-value">
            ${qrBillData.debtor.name}<br>
            ${qrBillData.debtor.addressLine1}<br>
            ${qrBillData.debtor.postalCode} ${qrBillData.debtor.city}
          </div>
        ` : ''}
        
        <div class="field-label">${labels.currency}</div>
        <div class="field-value">${qrBillData.currency}</div>
        
        <div class="field-label">${labels.amount}</div>
        <div class="amount-box">${formatCurrency(qrBillData.amount, qrBillData.currency)}</div>
        
        <div class="acceptance-point">${labels.acceptancePoint}</div>
      </div>
      
      <!-- Payment Part Section -->
      <div class="payment-part">
        <div class="payment-info">
          <div class="section-title">${labels.paymentPart}</div>
          
          <div class="field-label">${labels.currency}</div>
          <div class="field-value">${qrBillData.currency}</div>
          
          <div class="field-label">${labels.amount}</div>
          <div class="amount-box">${formatCurrency(qrBillData.amount, qrBillData.currency)}</div>
          
          <div class="field-label">${labels.account}</div>
          <div class="field-value">${qrBillData.creditorAccount}</div>
          
          <div class="field-label">${labels.payableTo}</div>
          <div class="field-value">
            ${qrBillData.creditor.name}<br>
            ${qrBillData.creditor.addressLine1}<br>
            ${qrBillData.creditor.postalCode} ${qrBillData.creditor.city}
          </div>
          
          ${qrBillData.reference ? `
            <div class="field-label">${labels.reference}</div>
            <div class="field-value">${formatReference(qrBillData.reference)}</div>
          ` : ''}
          
          ${qrBillData.unstructuredMessage ? `
            <div class="field-label">${labels.additionalInfo}</div>
            <div class="field-value">${qrBillData.unstructuredMessage}</div>
          ` : ''}
          
          ${qrBillData.debtor ? `
            <div class="field-label">${labels.payableBy}</div>
            <div class="field-value">
              ${qrBillData.debtor.name}<br>
              ${qrBillData.debtor.addressLine1}<br>
              ${qrBillData.debtor.postalCode} ${qrBillData.debtor.city}
            </div>
          ` : ''}
        </div>
        
        <div class="qr-section">
          <div class="qr-code">
            <div style="text-align: center;">
              <div style="font-size: 8pt; font-weight: bold;">Swiss QR Code</div>
              <div style="font-size: 6pt; margin-top: 2mm;">${qrBillData.amount} ${qrBillData.currency}</div>
              <div style="font-size: 5pt; margin-top: 2mm; color: #666;">QR Code généré</div>
            </div>
          </div>
          <div style="font-size: 6pt; text-align: center;">
            ${labels.qrBillNote}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates QR code data string according to Swiss QR Bill specification
 */
function generateQRCodeData(qrBillData: SwissQRBillData): string {
  const lines = [
    'SPC', // QR Type
    '0200', // Version
    '1', // Coding Type
    qrBillData.creditorAccount, // Account
    'S', // Creditor Address Type (Structured)
    qrBillData.creditor.name,
    qrBillData.creditor.addressLine1,
    '', // Address Line 2 (empty for structured)
    qrBillData.creditor.postalCode,
    qrBillData.creditor.city,
    qrBillData.creditor.country,
    '', // Ultimate Creditor (empty)
    '', // Ultimate Creditor Address Type
    '', // Ultimate Creditor Name
    '', // Ultimate Creditor Address Line 1
    '', // Ultimate Creditor Address Line 2
    '', // Ultimate Creditor Postal Code
    '', // Ultimate Creditor City
    '', // Ultimate Creditor Country
    qrBillData.amount.toFixed(2), // Amount
    qrBillData.currency, // Currency
    qrBillData.debtor ? 'S' : '', // Debtor Address Type
    qrBillData.debtor?.name || '',
    qrBillData.debtor?.addressLine1 || '',
    '', // Debtor Address Line 2
    qrBillData.debtor?.postalCode || '',
    qrBillData.debtor?.city || '',
    qrBillData.debtor?.country || '',
    qrBillData.referenceType, // Reference Type
    qrBillData.reference || '', // Reference
    qrBillData.unstructuredMessage || '', // Unstructured Message
    'EPD', // Trailer
    qrBillData.billInformation || '', // Bill Information
  ];
  
  return lines.join('\n');
}

/**
 * Gets localized labels for QR Bill
 */
function getLocalizedLabels(language: string) {
  const labels = {
    fr: {
      receipt: 'Récépissé',
      paymentPart: 'Section paiement',
      account: 'Compte / Payable à',
      payableTo: 'Payable à',
      payableBy: 'Payable par',
      reference: 'Référence',
      additionalInfo: 'Informations supplémentaires',
      currency: 'Monnaie',
      amount: 'Montant',
      acceptancePoint: 'Point de dépôt',
      qrBillNote: 'Ne pas utiliser pour le paiement',
    },
    de: {
      receipt: 'Empfangsschein',
      paymentPart: 'Zahlteil',
      account: 'Konto / Zahlbar an',
      payableTo: 'Zahlbar an',
      payableBy: 'Zahlbar durch',
      reference: 'Referenz',
      additionalInfo: 'Zusätzliche Informationen',
      currency: 'Währung',
      amount: 'Betrag',
      acceptancePoint: 'Annahmestelle',
      qrBillNote: 'Nicht zur Zahlung verwenden',
    },
    it: {
      receipt: 'Ricevuta',
      paymentPart: 'Sezione pagamento',
      account: 'Conto / Pagabile a',
      payableTo: 'Pagabile a',
      payableBy: 'Pagabile da',
      reference: 'Riferimento',
      additionalInfo: 'Informazioni aggiuntive',
      currency: 'Valuta',
      amount: 'Importo',
      acceptancePoint: 'Punto di accettazione',
      qrBillNote: 'Non utilizzare per il pagamento',
    },
    en: {
      receipt: 'Receipt',
      paymentPart: 'Payment part',
      account: 'Account / Payable to',
      payableTo: 'Payable to',
      payableBy: 'Payable by',
      reference: 'Reference',
      additionalInfo: 'Additional information',
      currency: 'Currency',
      amount: 'Amount',
      acceptancePoint: 'Acceptance point',
      qrBillNote: 'Do not use for payment',
    },
  };
  
  return labels[language as keyof typeof labels] || labels.fr;
}

/**
 * Formats reference number for display
 */
function formatReference(reference: string): string {
  if (reference.length === 27) {
    // QR Reference format: XX XXXXX XXXXX XXXXX XXXXX XXXXX X
    return reference.replace(/(\d{2})(\d{5})(\d{5})(\d{5})(\d{5})(\d{5})(\d{1})/, '$1 $2 $3 $4 $5 $6 $7');
  }
  return reference;
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