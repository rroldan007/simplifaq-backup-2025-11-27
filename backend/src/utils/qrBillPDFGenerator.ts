import * as puppeteer from 'puppeteer';
import { SwissQRBillData } from './swissQRBill';

// PDF generation options
export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  language?: 'de' | 'fr' | 'it' | 'en';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  separateQRBill?: boolean; // Generate QR Bill as separate page
}

// Default PDF options
const DEFAULT_PDF_OPTIONS: PDFGenerationOptions = {
  format: 'A4',
  language: 'fr',
  margins: {
    top: 20,
    right: 15,
    bottom: 20,
    left: 15,
  },
  separateQRBill: false,
};

/**
 * Generates a Swiss QR Bill PDF using Puppeteer with custom HTML/CSS
 */
export async function generateQRBillPDF(
  qrBillData: SwissQRBillData,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_PDF_OPTIONS, ...options };

  let browser: puppeteer.Browser | null = null;

  try {
    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set page format for QR Bill (210mm x 105mm)
    await page.setViewport({ width: 794, height: 397 }); // QR Bill dimensions in pixels

    // Generate QR Bill HTML
    const qrBillHTML = generateQRBillHTML(qrBillData, opts);

    // Set HTML content
    await page.setContent(qrBillHTML, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: '105mm',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating QR Bill PDF:', error);
    throw new Error(`Erreur lors de la génération du PDF QR Bill: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generates a complete invoice PDF with Swiss QR Bill integrated
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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set page format and margins
    await page.setViewport({ width: 794, height: 1123 }); // A4 dimensions in pixels at 96 DPI

    // Generate the complete HTML content
    const htmlContent = await generateInvoiceHTML(invoiceData, qrBillData, opts);

    // Set HTML content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: opts.format,
      margin: {
        top: `${opts.margins!.top}mm`,
        right: `${opts.margins!.right}mm`,
        bottom: `${opts.margins!.bottom}mm`,
        left: `${opts.margins!.left}mm`,
      },
      printBackground: true,
      preferCSSPageSize: true,
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
 * Invoice data interface for PDF generation
 */
export interface InvoiceData {
  invoiceNumber: string;
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

/**
 * Generates HTML content for the complete invoice with QR Bill
 */
async function generateInvoiceHTML(
  invoiceData: InvoiceData,
  qrBillData: SwissQRBillData,
  options: PDFGenerationOptions
): Promise<string> {
  const { language } = options;

  // Generate QR Bill HTML using custom implementation
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

  // Generate invoice items HTML
  const itemsHTML = invoiceData.items.map(item => `
    <tr>
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
    <tr>
      <td>TVA ${parseFloat(rate).toFixed(2)}%</td>
      <td>${formatCurrency(amounts.net, invoiceData.currency)}</td>
      <td>${formatCurrency(amounts.tva, invoiceData.currency)}</td>
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
          font-family: 'Arial', sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        .invoice-container {
          width: 210mm;
          min-height: 192mm; /* A4 height minus QR Bill space */
          padding: 20mm 15mm 0 15mm;
          position: relative;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        
        .company-info h1 {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-info p {
          margin: 2px 0;
          font-size: 10pt;
        }
        
        .invoice-info {
          text-align: right;
        }
        
        .invoice-info h2 {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        
        .client-info, .invoice-meta {
          width: 45%;
        }
        
        .client-info h3, .invoice-meta h3 {
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .items-table th {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-weight: bold;
          font-size: 10pt;
        }
        
        .items-table td {
          border: 1px solid #ddd;
          padding: 8px;
          font-size: 10pt;
        }
        
        .item-quantity, .item-price, .item-tva, .item-total {
          text-align: right;
        }
        
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        
        .totals-table {
          width: 300px;
          border-collapse: collapse;
        }
        
        .totals-table td {
          padding: 5px 10px;
          border-bottom: 1px solid #ddd;
        }
        
        .totals-table .total-row {
          font-weight: bold;
          border-top: 2px solid #333;
          font-size: 12pt;
        }
        
        .notes {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-left: 4px solid #333;
        }
        
        .notes h4 {
          margin-bottom: 10px;
          font-size: 11pt;
        }
        
        .terms {
          font-size: 9pt;
          color: #666;
          margin-bottom: 20px;
        }
        
        /* QR Bill container */
        .qr-bill-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 210mm;
          height: 105mm;
          /* Restore dashed border to ensure visible cut line even if overlay fails */
          border-top: 1px dashed #333;
          page-break-inside: avoid;
          z-index: 1;
        }
        
        /* Perforation line */
        .perforation-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: repeating-linear-gradient(
            to right,
            #333 0px,
            #333 6px,
            transparent 6px,
            transparent 12px
          );
          z-index: 2;
        }

        /* Fixed perforation line at A4 top + 192mm (297-105) to guarantee visibility */
        .qr-cut-line-fixed-svg {
          position: fixed;
          left: 0;
          top: 192mm;
          width: 210mm;
          height: 2mm;
          z-index: 9999;
        }
        
        /* Page break control */
        .page-break {
          page-break-before: always;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
        
        /* Responsive adjustments */
        @media print {
          .invoice-container {
            margin: 0;
            padding: 20mm 15mm 0 15mm;
          }
        }
      </style>
    </head>
    <body>
      <svg class="qr-cut-line-fixed-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 2" preserveAspectRatio="none">
        <line x1="0" y1="1" x2="210" y2="1" stroke="#333" stroke-width="0.5" stroke-dasharray="4 4" />
      </svg>
      <div class="invoice-container">
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
            <p><strong>N° ${invoiceData.invoiceNumber}</strong></p>
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
        
        <!-- Totals -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
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
      
      <!-- Swiss QR Bill -->
      <div class="qr-bill-container">
        <div class="perforation-line"></div>
        ${qrBillHTML}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates HTML content for Swiss QR Bill
 */
function generateQRBillHTML(qrBillData: SwissQRBillData, options: PDFGenerationOptions): string {
  const { language = 'fr' } = options;
  
  // Debug log the QR bill data structure
  console.log('QR Bill data in generateQRBillHTML:', JSON.stringify({
    hasDebtor: !!qrBillData.debtor,
    debtor: qrBillData.debtor ? {
      name: qrBillData.debtor.name,
      addressLine1: qrBillData.debtor.addressLine1,
      addressLine2: qrBillData.debtor.addressLine2,
      postalCode: qrBillData.debtor.postalCode,
      city: qrBillData.debtor.city,
      country: qrBillData.debtor.country
    } : null,
    hasCreditor: !!qrBillData.creditor,
    amount: qrBillData.amount,
    currency: qrBillData.currency,
    reference: qrBillData.reference,
    referenceType: qrBillData.referenceType
  }, null, 2));

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
        }
        
        .amount-box {
          border: 1px solid #000;
          padding: 2mm;
          margin-top: 2mm;
          text-align: right;
          font-weight: bold;
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
          ${qrBillData.creditor.addressLine2 ? `${qrBillData.creditor.addressLine2}<br>` : ''}
          ${qrBillData.creditor.postalCode} ${qrBillData.creditor.city}
        </div>
        
        ${qrBillData.reference ? `
          <div class="field-label">${labels.reference}</div>
          <div class="field-value">${formatReference(qrBillData.reference)}</div>
        ` : ''}
        
        ${qrBillData.debtor ? `
          <div class="field-label">${labels.payableBy}</div>
          <div class="field-value" style="border: 1px solid #f00; padding: 2px;">
            <div style="font-weight: bold;">${qrBillData.debtor.name || 'No name provided'}</div>
            <div>${qrBillData.debtor.addressLine1 || 'No address provided'}</div>
            ${qrBillData.debtor.addressLine2 ? `<div>${qrBillData.debtor.addressLine2}</div>` : ''}
            <div>
              ${qrBillData.debtor.postalCode || ''} ${qrBillData.debtor.city || ''}
              ${qrBillData.debtor.country ? `, ${qrBillData.debtor.country}` : ''}
            </div>
          </div>
          <!-- Debug Info -->
          <div style="font-size: 8px; color: #f00; margin-top: 5px; padding: 2px; border: 1px solid #f00;">
            <div>DEBUG - Debtor Data:</div>
            <div>Name: ${qrBillData.debtor.name || 'MISSING'}</div>
            <div>Address: ${qrBillData.debtor.addressLine1 || 'MISSING'}</div>
            <div>Address 2: ${qrBillData.debtor.addressLine2 || 'N/A'}</div>
            <div>Postal/City: ${qrBillData.debtor.postalCode || 'MISSING'} ${qrBillData.debtor.city || 'MISSING'}</div>
            <div>Country: ${qrBillData.debtor.country || 'MISSING'}</div>
          </div>
        ` : '<div class="field-value" style="color: red;">No debtor information available</div>'}
        
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
            ${qrBillData.creditor.addressLine2 ? `${qrBillData.creditor.addressLine2}<br>` : ''}
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
            QR Code<br>
            ${qrBillData.amount} ${qrBillData.currency}
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