import puppeteer from 'puppeteer';
import { getAccessibleAccentColor } from './pdfColorUtils';

export interface QuoteData {
  quoteNumber: string;
  issueDate: Date;
  validUntil?: Date;
  subtotal: number;
  tvaAmount: number;
  total: number;
  currency: 'CHF' | 'EUR';
  language?: 'fr' | 'de' | 'it' | 'en';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    total: number;
    unit?: string;
    lineDiscountValue?: number;
    lineDiscountType?: 'PERCENT' | 'AMOUNT';
    discountAmount?: number;
    subtotalBeforeDiscount?: number;
    subtotalAfterDiscount?: number;
  }>;
  company: {
    name: string;
    address: string;
    street?: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
    email: string;
    website?: string;
    vatNumber?: string;
    logoUrl?: string;
  };
  client: {
    name: string;
    address: string;
    street?: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
  };
  notes?: string;
  terms?: string;
  globalDiscount?: {
    value: number;
    type: 'PERCENT' | 'AMOUNT';
    note?: string;
  };
}

export interface QuotePDFOptions {
  accentColor?: string;
  language?: 'fr' | 'de' | 'it' | 'en';
  advancedConfig?: any;
}

/**
 * Generate Quote PDF using Puppeteer
 */
export async function generateQuotePDFWithPuppeteer(
  quoteData: QuoteData,
  options: QuotePDFOptions = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const html = generateQuoteHTML(quoteData, options);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// Import helper functions from invoicePDF
import {
  pxToMM,
  renderPositionedElement,
  getColors,
  isElementVisible
} from './invoicePDF';

/**
 * Generate HTML for quote
 */
function generateQuoteHTML(quoteData: QuoteData, options: QuotePDFOptions): string {
  const { language, advancedConfig } = options;
  const colors = getColors(advancedConfig, options.accentColor);
  const discountPreferredColor = '#059669';
  const discountLineColor = getAccessibleAccentColor('#ffffff', discountPreferredColor);
  // For totals section, background is white, so use green directly
  const discountTotalsColor = '#059669'; // Green on white background

  // Format dates
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

  // Debug: Log discount data
  console.log('[Quote PDF] quoteData.globalDiscount:', quoteData.globalDiscount);
  console.log('[Quote PDF] Items with discounts:', quoteData.items.map(item => ({
    desc: item.description,
    lineDiscountValue: item.lineDiscountValue,
    lineDiscountType: item.lineDiscountType
  })));

  // Generate items HTML with discounts
  const itemsHTML = quoteData.items.map((item, index) => {
    let itemHTML = `
    <tr class="invoice-item ${index > 0 && index % 15 === 0 ? 'page-break-before' : ''}">
      <td class="item-description">${item.description}</td>
      <td class="item-quantity">${item.quantity}</td>
      <td class="item-price">${formatCurrency(item.unitPrice, quoteData.currency)}</td>
      <td class="item-tva">${item.tvaRate.toFixed(2)}%</td>
      <td class="item-total">${formatCurrency(item.total, quoteData.currency)}</td>
    </tr>`;
    
    // Add discount row if item has discount
    const hasLineDiscount = (item.lineDiscountValue ?? 0) > 0 || (item.discountAmount ?? 0) > 0;
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
          : formatCurrency(item.lineDiscountValue, quoteData.currency);
        if (positiveDiscountAmount > 0) {
          discountAmountSuffix = ` (-${formatCurrency(positiveDiscountAmount, quoteData.currency)})`;
        }
      } else if (positiveDiscountAmount > 0) {
        discountLabel = `-${formatCurrency(positiveDiscountAmount, quoteData.currency)}`;
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
  const tvaBreakdown = quoteData.items.reduce((acc, item) => {
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
      <td style="text-align: right;">${formatCurrency(amounts.tva, quoteData.currency)}</td>
    </tr>
  `).join('');

  const hasGlobalDiscount = !!(quoteData.globalDiscount && quoteData.globalDiscount.value > 0);
  const globalDiscountValue = hasGlobalDiscount ? Number(quoteData.globalDiscount!.value) : 0;
  const globalDiscountDisplayValue = hasGlobalDiscount
    ? (quoteData.globalDiscount!.type === 'PERCENT'
        ? `${globalDiscountValue}%`
        : formatCurrency(globalDiscountValue, quoteData.currency))
    : '';
  const globalDiscountAmount = hasGlobalDiscount
    ? (quoteData.globalDiscount!.type === 'PERCENT'
        ? quoteData.subtotal * globalDiscountValue / 100
        : globalDiscountValue)
    : 0;

  // Generate global discount HTML
  const globalDiscountHTML = hasGlobalDiscount 
    ? `
    <tr class="discount-row" style="color: ${discountTotalsColor};">
      <td style="color: ${discountTotalsColor};">
        Remise globale${quoteData.globalDiscount?.note ? `: ${quoteData.globalDiscount.note}` : ''} 
        (${globalDiscountDisplayValue})
      </td>
      <td style="text-align: right; color: ${discountTotalsColor};">
        -${formatCurrency(globalDiscountAmount, quoteData.currency)}
      </td>
    </tr>`
    : '';

  const globalDiscountCustomHTML = hasGlobalDiscount
    ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: ${discountTotalsColor};">
                <span>Remise globale${quoteData.globalDiscount?.note ? `: ${quoteData.globalDiscount.note}` : ''} (${globalDiscountDisplayValue})</span>
                <span>- ${formatCurrency(globalDiscountAmount, quoteData.currency)}</span>
              </div>
            `
    : '';

  // Generate background images HTML
  const EDITOR_WIDTH = 595;
  const EDITOR_HEIGHT = 842;
  const PDF_WIDTH_MM = 210;
  const PDF_HEIGHT_MM = 297;
  
  const backgroundImagesHTML = advancedConfig?.backgroundImages
    ? advancedConfig.backgroundImages
        .filter((img: any) => img.visible !== false)
        .map((img: any) => {
          const leftMM = (img.position.x / EDITOR_WIDTH) * PDF_WIDTH_MM;
          const topMM = (img.position.y / EDITOR_HEIGHT) * PDF_HEIGHT_MM;
          const widthMM = (img.size.width / EDITOR_WIDTH) * PDF_WIDTH_MM;
          const heightMM = (img.size.height / EDITOR_HEIGHT) * PDF_HEIGHT_MM;
          
          return `
          <div class="background-image" style="position: absolute; left: ${leftMM}mm; top: ${topMM}mm; width: ${widthMM}mm; height: ${heightMM}mm; opacity: ${img.opacity || 1}; z-index: 1; pointer-events: none;">
            <img src="${img.src.startsWith('http') ? img.src : 'http://localhost:3001/' + img.src}" style="width: 100%; height: 100%; object-fit: contain;" alt="Background" />
          </div>
          `;
        })
        .join('')
    : '';

  // Check if we have custom positioning
  const useCustomPositioning = advancedConfig?.elements && advancedConfig.elements.length > 0;

  // Debug log
  if (useCustomPositioning && advancedConfig?.elements) {
    console.log('[Quote PDF Generation] Using custom positioning with', advancedConfig.elements.length, 'elements');
  } else {
    console.log('[Quote PDF Generation] Using default template');
  }

  let contentHTML = '';
  
  if (useCustomPositioning && advancedConfig.elements) {
    // Custom positioned elements
    const positionedElements = advancedConfig.elements
      .filter((el: any) => el.visible !== false)
      .map((el: any) => {
        if (el.id === 'table') {
          const leftMM = pxToMM(el.position.x, true);
          const topMM = pxToMM(el.position.y, false);
          const widthMM = pxToMM(el.size.width, true);
          
          // Get table style from advanced config (default: classic)
          const tableStyle = (advancedConfig as any)?.tableStyle || 'classic';
          
          // Define styles based on tableStyle
          let tableContainerStyle = '';
          let headerRowStyle = '';
          let headerCellStyle = '';
          let bodyRowStyle = (index: number) => '';
          
          if (tableStyle === 'classic') {
            tableContainerStyle = 'border: 1px solid #ddd; border-radius: 4px;';
            headerRowStyle = `background-color: ${colors.tableHeader}; color: ${colors.textHeader};`;
            headerCellStyle = 'padding: 6px; border: 1px solid #ddd;';
            bodyRowStyle = (index: number) => index % 2 === 0 ? 'background-color: white;' : `background-color: ${colors.altRow || '#f9fafb'};`;
          } else if (tableStyle === 'modern') {
            tableContainerStyle = '';
            headerRowStyle = `border-bottom: 2px solid ${colors.primary}; color: ${colors.textHeader};`;
            headerCellStyle = 'padding: 6px; border: none;';
            bodyRowStyle = () => 'border-bottom: 1px solid #e5e7eb;';
          } else if (tableStyle === 'bordered') {
            tableContainerStyle = `border: 2px solid ${colors.primary};`;
            headerRowStyle = `background-color: ${colors.tableHeader}; color: ${colors.textHeader}; border-bottom: 2px solid ${colors.primary};`;
            headerCellStyle = `padding: 6px; border-right: 1px solid ${colors.primary};`;
            bodyRowStyle = () => `border-bottom: 1px solid ${colors.primary};`;
          } else if (tableStyle === 'minimal') {
            tableContainerStyle = '';
            headerRowStyle = `color: ${colors.primary};`;
            headerCellStyle = 'padding: 6px; border: none;';
            bodyRowStyle = () => 'border-bottom: 1px solid #f3f4f6;';
          } else {
            // Bold
            tableContainerStyle = 'border: 2px solid #d1d5db; border-radius: 4px;';
            headerRowStyle = `background-color: ${colors.primary}; color: white; border-bottom: 4px solid ${colors.primary};`;
            headerCellStyle = 'padding: 8px; border: none; font-weight: bold;';
            bodyRowStyle = () => 'border-bottom: 2px solid #d1d5db;';
          }
          
          // Generate styled item rows with discount support
          const styledItemsHTML = quoteData.items.map((item, index) => {
            const rowStyle = bodyRowStyle(index);
            const cellBorder = tableStyle === 'bordered' ? `border-right: 1px solid ${colors.primary};` : '';
            const cellPadding = tableStyle === 'bold' ? 'padding: 8px;' : 'padding: 6px;';
            
            let itemHTML = `
              <tr style="${rowStyle}">
                <td style="${cellPadding} text-align: left; ${cellBorder}">${item.description}</td>
                <td style="${cellPadding} text-align: center; ${cellBorder} width: 60px;">${item.quantity}</td>
                <td style="${cellPadding} text-align: right; ${cellBorder} width: 70px;">${formatCurrency(item.unitPrice, quoteData.currency)}</td>
                <td style="${cellPadding} text-align: right; ${cellBorder} width: 50px;">${item.tvaRate.toFixed(2)}%</td>
                <td style="${cellPadding} text-align: right; width: 70px; ${tableStyle === 'bold' ? 'font-weight: bold;' : ''}">${formatCurrency(item.total, quoteData.currency)}</td>
              </tr>
            `;
            
            // Add discount row if item has discount
            const hasLineDiscount = (item.lineDiscountValue ?? 0) > 0 || (item.discountAmount ?? 0) > 0;
            if (hasLineDiscount) {
              const baseSubtotal = item.subtotalBeforeDiscount ?? (item.quantity * item.unitPrice);
              let discountAmountValue = item.discountAmount ?? null;
              if (discountAmountValue === null) {
                if (item.lineDiscountType === 'PERCENT') {
                  discountAmountValue = Math.max(baseSubtotal - item.total, 0);
                } else if (item.lineDiscountType === 'AMOUNT') {
                  discountAmountValue = item.lineDiscountValue ?? 0;
                } else {
                  discountAmountValue = Math.max(baseSubtotal - item.total, 0);
                }
              }
              const positiveDiscountAmount = discountAmountValue && discountAmountValue > 0 ? Math.abs(discountAmountValue) : 0;
              let discountLabel: string;
              let discountAmountSuffix = '';
              if (item.lineDiscountValue && item.lineDiscountValue > 0) {
                discountLabel = item.lineDiscountType === 'PERCENT'
                  ? `${item.lineDiscountValue}%`
                  : formatCurrency(item.lineDiscountValue, quoteData.currency);
                if (positiveDiscountAmount > 0) {
                  discountAmountSuffix = ` (-${formatCurrency(positiveDiscountAmount, quoteData.currency)})`;
                }
              } else if (positiveDiscountAmount > 0) {
                discountLabel = `-${formatCurrency(positiveDiscountAmount, quoteData.currency)}`;
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

          return `
            <div class="positioned-table" data-element-id="table" data-left-mm="${leftMM}" data-top-mm="${topMM}" data-width-mm="${widthMM}" style="position: absolute; left: ${leftMM}mm; top: ${topMM}mm; width: ${widthMM}mm; z-index: 10;">
              <table style="width: 100%; border-collapse: collapse; font-size: 9px; ${tableContainerStyle}">
                <thead>
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
          const leftMM = pxToMM(el.position.x, true);
          const topMM = pxToMM(el.position.y, false);
          const widthMM = pxToMM(el.size.width, true);
          
          // Get totals style from advanced config (default: filled)
          const totalsStyle = (advancedConfig as any)?.totalsStyle || 'filled';
          
          // Define styles based on totalsStyle
          let containerStyle = '';
          let totalBorderStyle = '';
          
          if (totalsStyle === 'filled') {
            containerStyle = `background: ${colors.primary}; color: white;`;
            totalBorderStyle = 'border-top: 1px solid rgba(255,255,255,0.3);';
          } else if (totalsStyle === 'outlined') {
            containerStyle = `background: transparent; color: ${colors.textBody}; border: 2px solid ${colors.primary};`;
            totalBorderStyle = `border-top: 1px solid ${colors.primary}; color: ${colors.primary};`;
          } else {
            // Minimal
            containerStyle = `background: transparent; color: ${colors.textBody};`;
            totalBorderStyle = `border-top: 1px solid ${colors.primary}; color: ${colors.primary};`;
          }

          return `
            <div class="positioned-totals" data-element-id="totals" data-left-mm="${leftMM}" data-top-mm="${topMM}" data-width-mm="${widthMM}" style="position: absolute; left: ${leftMM}mm; top: ${topMM}mm; width: ${widthMM}mm; ${containerStyle} padding: 10px; border-radius: 8px; z-index: 10;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
                <span>Sous-total:</span>
                <span>${formatCurrency(quoteData.subtotal, quoteData.currency)}</span>
              </div>
              ${Object.entries(tvaBreakdown).map(([rate, amounts]) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
                  <span>TVA ${parseFloat(rate).toFixed(2)}%:</span>
                  <span>${formatCurrency(amounts.tva, quoteData.currency)}</span>
                </div>
              `).join('')}
              ${globalDiscountCustomHTML}
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; ${totalBorderStyle} padding-top: 8px;">
                <span>TOTAL:</span>
                <span>${formatCurrency(quoteData.total, quoteData.currency)}</span>
              </div>
            </div>
          `;
        } else if (el.id === 'qr_bill_zone') {
          return '';
        } else {
          return renderPositionedElement(el, {
            invoiceNumber: quoteData.quoteNumber,
            issueDate: quoteData.issueDate,
            dueDate: quoteData.validUntil || quoteData.issueDate,
            company: quoteData.company,
            client: quoteData.client,
            items: quoteData.items,
            subtotal: quoteData.subtotal,
            tvaAmount: quoteData.tvaAmount,
            total: quoteData.total,
            currency: quoteData.currency,
            logoUrl: quoteData.company.logoUrl
          } as any, colors, 'DEVIS');
        }
      })
      .join('');
    
    contentHTML = `<div class="positioned-content">${positionedElements}</div>`;
  } else {
    // Default template
    contentHTML = `
      <div class="invoice-content">
          ${isElementVisible('logo', advancedConfig) || isElementVisible('company_name', advancedConfig) || isElementVisible('company_info', advancedConfig) ? `
          <div class="header">
            <div style="display: flex; align-items: flex-start; gap: 20px;">
              ${isElementVisible('logo', advancedConfig) && quoteData.company.logoUrl ? `
              <div class="company-logo" style="flex-shrink: 0;">
                <img src="${quoteData.company.logoUrl?.startsWith('http') ? quoteData.company.logoUrl : 'http://localhost:3001/' + quoteData.company.logoUrl}" alt="Logo" style="max-height: 80px; max-width: 180px; object-fit: contain;" />
              </div>
              ` : ''}
              ${isElementVisible('company_info', advancedConfig) ? `
              <div class="company-info">
                ${isElementVisible('company_name', advancedConfig) ? `<h1 style="color: ${colors.primary}">${quoteData.company.name}</h1>` : ''}
                <p>${quoteData.company.address}</p>
                <p>${quoteData.company.postalCode} ${quoteData.company.city}</p>
                <p>${quoteData.company.country}</p>
                ${quoteData.company.vatNumber ? `<p>TVA: ${quoteData.company.vatNumber}</p>` : ''}
                ${quoteData.company.phone ? `<p>Tél: ${quoteData.company.phone}</p>` : ''}
                ${quoteData.company.email ? `<p>Email: ${quoteData.company.email}</p>` : ''}
              </div>
              ` : ''}
            </div>
            <div class="invoice-info">
              <h2 style="color: ${colors.primary}">DEVIS</h2>
              <div class="invoice-number">N° ${quoteData.quoteNumber}</div>
            </div>
          </div>
          ` : ''}
          
          ${isElementVisible('client_info', advancedConfig) ? `
          <div class="invoice-details">
            <div class="client-info">
              <h3 style="color: ${colors.primary}">Client:</h3>
              <p><strong>${quoteData.client.name}</strong></p>
              <p>${quoteData.client.address}</p>
              <p>${quoteData.client.postalCode} ${quoteData.client.city}</p>
              <p>${quoteData.client.country}</p>
              ${quoteData.client.vatNumber ? `<p>TVA: ${quoteData.client.vatNumber}</p>` : ''}
            </div>
            <div class="invoice-meta">
              <h3 style="color: ${colors.primary}">Détails du devis:</h3>
              <p><strong>Date:</strong> ${formatDate(quoteData.issueDate)}</p>
              ${quoteData.validUntil ? `<p><strong>Valable jusqu'au:</strong> ${formatDate(quoteData.validUntil)}</p>` : ''}
              <p><strong>Devise:</strong> ${quoteData.currency}</p>
            </div>
          </div>
          ` : ''}
          
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
          
          ${isElementVisible('totals', advancedConfig) ? `
          <div class="totals-section">
            <table class="totals-table">
              <tr class="subtotal-row">
                <td>Sous-total:</td>
                <td style="text-align: right;">${formatCurrency(quoteData.subtotal, quoteData.currency)}</td>
              </tr>
              ${tvaBreakdownHTML}
              ${globalDiscountHTML}
              <tr class="total-row" style="color: ${colors.primary}">
                <td>TOTAL:</td>
                <td style="text-align: right;">${formatCurrency(quoteData.total, quoteData.currency)}</td>
              </tr>
            </table>
          </div>
          ` : ''}
          
          ${quoteData.terms ? `
            <div class="terms">
              <p><strong>Conditions:</strong> ${quoteData.terms}</p>
            </div>
          ` : ''}
      </div>
    `;
  }

  // Import CSS from invoicePDF
  const css = getInvoiceCSS(colors);

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Devis ${quoteData.quoteNumber}</title>
      <style>
        ${css}
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="background-layer">
          ${backgroundImagesHTML}
        </div>
        
        ${contentHTML}
      </div>
    </body>
    </html>
  `;
}

// Import getInvoiceCSS from invoicePDF
import { getInvoiceCSS } from './invoicePDF';
