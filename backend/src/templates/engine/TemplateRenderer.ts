import { Invoice, Client, User, InvoiceItem } from '@prisma/client';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export {};

export interface TemplateData {
  invoice: Invoice & { 
    client: Client; 
    items: InvoiceItem[]; 
    user: User;
  };
  config: TemplateConfig;
}

export interface TemplateConfig {
  template: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  showLogo?: boolean;
  showQRBill?: boolean;
  language?: 'fr' | 'de' | 'it' | 'en';
}

export class TemplateRenderer {
  private templatesPath: string;
  private currentCurrency: string = 'CHF';

  constructor() {
    this.templatesPath = path.join(__dirname, '../themes');
    this.registerHelpers();
  }

  private registerHelpers() {
    // Helper para formatear moneda
    const self = this;
    Handlebars.registerHelper('currency', function(value: number) {
      // Usar el currency almacenado en la instancia
      const currencyCode = self.currentCurrency || 'CHF';
      
      return new Intl.NumberFormat('fr-CH', {
        style: 'currency',
        currency: currencyCode
      }).format(value);
    });

    // Helper para formatear fecha
    Handlebars.registerHelper('date', function(date: Date | string) {
      const d = new Date(date);
      return d.toLocaleDateString('fr-CH');
    });

    // Helper para uppercase
    Handlebars.registerHelper('uppercase', function(str: string) {
      return str?.toUpperCase() || '';
    });

    // Helper condicional
    Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });
  }

  async render(data: TemplateData): Promise<string> {
    const templatePath = path.join(
      this.templatesPath,
      data.config.template,
      'template.html'
    );

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${data.config.template}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSource);

    // Establecer el currency actual antes de renderizar
    this.currentCurrency = data.invoice.currency || 'CHF';

    // Preparar datos para el template (ahora async para generar QR)
    const renderData = await this.prepareData(data);

    return template(renderData);
  }

  private async prepareData(data: TemplateData) {
    const { invoice, config } = data;
    
    // Convertir logoUrl relativo a ruta absoluta
    const logoUrl = invoice.user.logoUrl 
      ? (invoice.user.logoUrl.startsWith('http') 
          ? invoice.user.logoUrl 
          : path.join(__dirname, '../../', invoice.user.logoUrl))
      : undefined;
    
    // Generar Swiss QR Code si está habilitado
    let qrCode: string | undefined;
    let qrReference: string | undefined;
    
    if (config.showQRBill !== false && invoice.user.iban) {
      try {
        // Generar Swiss QR Bill según especificación
        const creditorName = invoice.user.companyName || `${invoice.user.firstName} ${invoice.user.lastName}`;
        const creditorAddress = invoice.user.street || '';
        const creditorZip = invoice.user.postalCode || '';
        const creditorCity = invoice.user.city || '';
        const creditorCountry = invoice.user.country || 'CH';
        
        const debtorName = invoice.client ? (invoice.client.companyName || `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim()) : '';
        const debtorAddress = invoice.client?.street || '';
        const debtorZip = invoice.client?.postalCode || '';
        const debtorCity = invoice.client?.city || '';
        const debtorCountry = invoice.client?.country || 'CH';
        
        // Formato Swiss QR Bill (separado por saltos de línea)
        const qrLines = [
          'SPC', // QRType
          '0200', // Version
          '1', // Coding Type (1 = Latin)
          invoice.user.iban.replace(/\s/g, ''), // IBAN
          'K', // Creditor Address Type (K = combined)
          creditorName,
          creditorAddress,
          `${creditorZip} ${creditorCity}`,
          '', // Empty line
          '', // Empty line
          creditorCountry,
          '', // Ultimate Creditor (empty)
          '', '', '', '', '', '', // Ultimate Creditor fields
          Number(invoice.total).toFixed(2), // Amount
          invoice.currency || 'CHF', // Currency
          debtorName ? 'K' : '', // Debtor Address Type
          debtorName,
          debtorAddress,
          debtorName ? `${debtorZip} ${debtorCity}` : '',
          '', // Empty line
          '', // Empty line
          debtorName ? debtorCountry : '',
          invoice.qrReference ? 'QRR' : 'NON', // Reference Type
          invoice.qrReference || '', // Reference
          `Facture ${invoice.invoiceNumber}`, // Unstructured Message
          'EPD', // Trailer
          '' // Billing Information
        ];
        
        const qrString = qrLines.join('\n');
        
        // Generar el QR code como data URI
        qrCode = await QRCode.toDataURL(qrString, {
          errorCorrectionLevel: 'M',
          width: 300,
          margin: 1
        });
        qrReference = invoice.qrReference || '';
      } catch (error) {
        console.warn('[TemplateRenderer] Error generating QR code:', error);
      }
    }
    
    return {
      ...invoice,
      user: {
        ...invoice.user,
        logoUrl: logoUrl // Ruta absoluta para el logo
      },
      config,
      // Datos calculados
      invoiceNumberFormatted: invoice.invoiceNumber,
      issueDateFormatted: new Date(invoice.issueDate).toLocaleDateString('fr-CH'),
      dueDateFormatted: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-CH') : '',
      
      // Moneda
      currency: {
        code: invoice.currency || 'CHF'
      },
      
      // Swiss QR Code
      qrCode,
      qrReference,
      
      // Colores personalizados o por defecto
      colors: {
        primary: config.colors?.primary || '#5a9fa8',
        secondary: config.colors?.secondary || '#7ab8c1',
        accent: config.colors?.accent || '#4a90e2',
        ...config.colors
      },
      
      // Configuración
      showLogo: config.showLogo !== false && logoUrl,
      showQRBill: config.showQRBill !== false,
    };
  }

  getAvailableTemplates(): string[] {
    return fs.readdirSync(this.templatesPath)
      .filter(file => {
        const stat = fs.statSync(path.join(this.templatesPath, file));
        return stat.isDirectory();
      });
  }
}
