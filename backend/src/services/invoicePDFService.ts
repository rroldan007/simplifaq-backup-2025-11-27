import { Invoice, Client, User, InvoiceItem } from '@prisma/client';
import { getPuppeteerPDFService } from '../templates/engine/PuppeteerPDFService';
import { TemplateData } from '../templates/engine/TemplateRenderer';
import { featureFlags } from '../features/featureFlags';

export interface InvoiceWithRelations extends Invoice {
  client: Client;
  items: InvoiceItem[];
  user: User;
}

export interface PDFGenerationOptions {
  template?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  showLogo?: boolean;
  showQRBill?: boolean;
  language?: 'fr' | 'de' | 'it' | 'en';
}

export class InvoicePDFService {
  private pdfService = getPuppeteerPDFService();

  async generateInvoicePDF(
    invoice: InvoiceWithRelations,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    // Determinar el template a usar: primero options, luego user, luego invoice, luego default
    const template = options.template || 
      invoice.user.pdfTemplate ||
      (invoice as any).template || 
      'medical-clean';

    console.log('[InvoicePDFService] Using template:', template, {
      fromOptions: options.template,
      fromUser: invoice.user.pdfTemplate,
      fromInvoice: (invoice as any).template
    });

    // Preparar datos para el template
    const templateData: TemplateData = {
      invoice,
      config: {
        template,
        colors: options.colors || {
          primary: '#5a9fa8',
          secondary: '#7ab8c1',
          accent: '#4a90e2'
        },
        showLogo: options.showLogo !== false,
        showQRBill: options.showQRBill !== false,
        language: options.language || 'fr'
      }
    };

    // Generar PDF
    const pdfBuffer = await this.pdfService.generatePDF(templateData);

    return pdfBuffer;
  }

  async generatePreview(
    invoice: InvoiceWithRelations,
    options: PDFGenerationOptions = {}
  ): Promise<Buffer> {
    const template = options.template || 
      featureFlags.getValue<string>('newInvoiceTemplates.defaultTemplate', 'creative-signature');

    const templateData: TemplateData = {
      invoice,
      config: {
        template,
        colors: options.colors || {
          primary: '#5a9fa8',
          secondary: '#7ab8c1',
          accent: '#4a90e2'
        },
        showLogo: options.showLogo !== false,
        showQRBill: options.showQRBill !== false,
        language: options.language || 'fr'
      }
    };

    return await this.pdfService.generatePreviewImage(templateData);
  }

  getAvailableTemplates(): string[] {
    return featureFlags.getValue<string[]>(
      'newInvoiceTemplates.availableTemplates',
      ['creative-signature', 'medical-clean']
    );
  }

  async close() {
    await this.pdfService.close();
  }
}

// Singleton instance
let invoicePDFService: InvoicePDFService | null = null;

export function getInvoicePDFService(): InvoicePDFService {
  if (!invoicePDFService) {
    invoicePDFService = new InvoicePDFService();
  }
  return invoicePDFService;
}
