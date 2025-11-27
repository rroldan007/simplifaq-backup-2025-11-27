import PDFDocument from 'pdfkit';
import { Invoice, SwissQrBillData } from '../models/invoiceModels';
import { QrBillService } from './qrBillService';
import { SwissQRBill } from 'swissqrbill/pdf';
import path from 'path';
import fs from 'fs';

/**
 * Configuración de página para el PDF
 */
export interface PDFPageConfig {
  size: 'A4' | 'Letter';
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  // Espacio reservado para el QR Bill en la última página
  qrBillHeight: number; // 105mm en puntos (297.64 puntos)
}

/**
 * Configuración de diseño para el PDF
 */
export interface PDFDesignConfig {
  template: string;
  primaryColor: string;
  showCompanyNameWithLogo: boolean;
  showVAT: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showIBAN: boolean;
}

/**
 * Generador de PDF mejorado con soporte completo para Swiss QR Bill
 */
export class PDFGenerator {
  private doc: PDFKit.PDFDocument;
  private invoice: Invoice;
  private pageConfig: PDFPageConfig;
  private designConfig: PDFDesignConfig;
  private currentPage: number = 1;
  private totalPages: number = 0;
  private yPosition: number = 0;
  
  // Constantes de diseño
  private readonly A4_HEIGHT = 841.89; // Altura de A4 en puntos
  private readonly A4_WIDTH = 595.28;  // Ancho de A4 en puntos
  private readonly QR_BILL_HEIGHT = 297.64; // 105mm en puntos
  
  constructor(
    invoice: Invoice,
    pageConfig?: Partial<PDFPageConfig>,
    designConfig?: Partial<PDFDesignConfig>
  ) {
    this.invoice = invoice;
    
    // Configuración por defecto
    this.pageConfig = {
      size: 'A4',
      margin: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      qrBillHeight: this.QR_BILL_HEIGHT,
      ...pageConfig
    };
    
    this.designConfig = {
      template: 'modern',
      primaryColor: '#2563eb',
      showCompanyNameWithLogo: true,
      showVAT: true,
      showPhone: true,
      showEmail: true,
      showWebsite: true,
      showIBAN: false,
      ...designConfig
    };
    
    this.doc = new PDFDocument({
      size: this.pageConfig.size,
      margin: 0, // Manejamos los márgenes manualmente
      bufferPages: true, // Necesario para agregar el QR Bill al final
    });
    
    this.yPosition = this.pageConfig.margin.top;
  }
  
  /**
   * Genera el PDF completo y retorna un buffer
   */
  public async generate(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        
        this.doc.on('data', (chunk) => chunks.push(chunk));
        this.doc.on('end', () => resolve(Buffer.concat(chunks)));
        this.doc.on('error', reject);
        
        // Generar contenido principal
        this.renderHeader();
        this.renderInvoiceInfo();
        this.renderCompanyAndClientInfo();
        this.renderItemsTable();
        this.renderTotals();
        this.renderNotes();
        
        // Generar QR Bill en la última página
        this.renderQrBillOnLastPage();
        
        // Finalizar el documento
        this.doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Renderiza el encabezado del documento
   */
  private renderHeader(): void {
    const { margin } = this.pageConfig;
    const logoPath = this.invoice.company.logoUrl;
    
    // Logo (si existe)
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        this.doc.image(logoPath, margin.left, margin.top, {
          width: 150,
          height: 60,
          fit: [150, 60]
        });
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }
    
    // Nombre de la empresa
    if (this.designConfig.showCompanyNameWithLogo || !logoPath) {
      this.doc
        .fontSize(20)
        .fillColor(this.designConfig.primaryColor)
        .font('Helvetica-Bold')
        .text(this.invoice.company.companyName, margin.left, margin.top, {
          width: 200
        });
    }
    
    // Tipo de documento (Factura o Presupuesto)
    const docType = this.invoice.isQuote ? 'DEVIS' : 'FACTURE';
    this.doc
      .fontSize(24)
      .fillColor(this.designConfig.primaryColor)
      .font('Helvetica-Bold')
      .text(docType, this.A4_WIDTH - margin.right - 150, margin.top, {
        width: 150,
        align: 'right'
      });
    
    this.yPosition = margin.top + 80;
  }
  
  /**
   * Renderiza la información de la factura (número, fecha, etc.)
   */
  private renderInvoiceInfo(): void {
    const { margin } = this.pageConfig;
    const x = this.A4_WIDTH - margin.right - 200;
    
    this.doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica');
    
    // Número de factura
    this.doc
      .font('Helvetica-Bold')
      .text('Numéro:', x, this.yPosition)
      .font('Helvetica')
      .text(this.invoice.invoiceNumber, x + 80, this.yPosition);
    
    // Fecha de emisión
    this.yPosition += 20;
    this.doc
      .font('Helvetica-Bold')
      .text('Date:', x, this.yPosition)
      .font('Helvetica')
      .text(this.formatDate(this.invoice.issueDate), x + 80, this.yPosition);
    
    // Fecha de vencimiento
    this.yPosition += 20;
    this.doc
      .font('Helvetica-Bold')
      .text('Échéance:', x, this.yPosition)
      .font('Helvetica')
      .text(this.formatDate(this.invoice.dueDate), x + 80, this.yPosition);
    
    this.yPosition += 40;
  }
  
  /**
   * Renderiza la información de la empresa y el cliente
   */
  private renderCompanyAndClientInfo(): void {
    const { margin } = this.pageConfig;
    const columnWidth = (this.A4_WIDTH - margin.left - margin.right) / 2 - 20;
    
    // Información de la empresa
    this.doc
      .fontSize(12)
      .fillColor(this.designConfig.primaryColor)
      .font('Helvetica-Bold')
      .text('De:', margin.left, this.yPosition);
    
    this.yPosition += 20;
    this.doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text(this.invoice.company.companyName, margin.left, this.yPosition);
    
    this.yPosition += 15;
    this.doc
      .font('Helvetica')
      .text(this.invoice.company.address.street, margin.left, this.yPosition);
    
    this.yPosition += 12;
    this.doc.text(
      `${this.invoice.company.address.postalCode} ${this.invoice.company.address.city}`,
      margin.left,
      this.yPosition
    );
    
    if (this.designConfig.showVAT && this.invoice.company.vatNumber) {
      this.yPosition += 12;
      this.doc.text(`TVA: ${this.invoice.company.vatNumber}`, margin.left, this.yPosition);
    }
    
    if (this.designConfig.showPhone && this.invoice.company.phone) {
      this.yPosition += 12;
      this.doc.text(`Tél: ${this.invoice.company.phone}`, margin.left, this.yPosition);
    }
    
    if (this.designConfig.showEmail) {
      this.yPosition += 12;
      this.doc.text(`Email: ${this.invoice.company.email}`, margin.left, this.yPosition);
    }
    
    // Información del cliente (en la columna derecha)
    const clientX = margin.left + columnWidth + 40;
    const clientY = this.yPosition - (this.designConfig.showEmail ? 60 : 48);
    
    this.doc
      .fontSize(12)
      .fillColor(this.designConfig.primaryColor)
      .font('Helvetica-Bold')
      .text('À:', clientX, clientY);
    
    let y = clientY + 20;
    this.doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text(this.invoice.client.companyName || this.invoice.client.name, clientX, y);
    
    y += 15;
    this.doc
      .font('Helvetica')
      .text(this.invoice.client.address.street, clientX, y);
    
    y += 12;
    this.doc.text(
      `${this.invoice.client.address.postalCode} ${this.invoice.client.address.city}`,
      clientX,
      y
    );
    
    this.yPosition += 60;
  }
  
  /**
   * Renderiza la tabla de artículos
   */
  private renderItemsTable(): void {
    const { margin } = this.pageConfig;
    const tableTop = this.yPosition;
    const tableWidth = this.A4_WIDTH - margin.left - margin.right;
    
    // Encabezados de la tabla
    this.doc
      .fontSize(10)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold');
    
    // Fondo del encabezado
    this.doc
      .rect(margin.left, tableTop, tableWidth, 25)
      .fill(this.designConfig.primaryColor);
    
    // Texto del encabezado
    this.doc.fillColor('#FFFFFF');
    this.doc.text('Description', margin.left + 5, tableTop + 8, { width: tableWidth * 0.4 });
    this.doc.text('Qté', margin.left + tableWidth * 0.4, tableTop + 8, { width: tableWidth * 0.1, align: 'right' });
    this.doc.text('Prix unit.', margin.left + tableWidth * 0.5, tableTop + 8, { width: tableWidth * 0.15, align: 'right' });
    this.doc.text('TVA', margin.left + tableWidth * 0.65, tableTop + 8, { width: tableWidth * 0.1, align: 'right' });
    this.doc.text('Total', margin.left + tableWidth * 0.75, tableTop + 8, { width: tableWidth * 0.25, align: 'right' });
    
    this.yPosition = tableTop + 30;
    
    // Artículos
    this.doc
      .fontSize(9)
      .fillColor('#000000')
      .font('Helvetica');
    
    for (const item of this.invoice.items) {
      // Verificar si necesitamos una nueva página (dejando espacio para el QR Bill)
      if (this.needsNewPage(40)) {
        this.addPage();
      }
      
      const rowY = this.yPosition;
      
      // Descripción
      this.doc.text(item.description, margin.left + 5, rowY, { 
        width: tableWidth * 0.4 - 10,
        continued: false
      });
      
      // Cantidad
      this.doc.text(
        this.formatNumber(item.quantity, 2),
        margin.left + tableWidth * 0.4,
        rowY,
        { width: tableWidth * 0.1, align: 'right' }
      );
      
      // Precio unitario
      this.doc.text(
        this.formatCurrency(item.unitPrice),
        margin.left + tableWidth * 0.5,
        rowY,
        { width: tableWidth * 0.15, align: 'right' }
      );
      
      // TVA
      this.doc.text(
        `${this.formatNumber(item.tvaRate, 1)}%`,
        margin.left + tableWidth * 0.65,
        rowY,
        { width: tableWidth * 0.1, align: 'right' }
      );
      
      // Total
      const total = item.discount?.subtotalAfterDiscount || item.total;
      this.doc.text(
        this.formatCurrency(total),
        margin.left + tableWidth * 0.75,
        rowY,
        { width: tableWidth * 0.25 - 5, align: 'right' }
      );
      
      this.yPosition += 25;
      
      // Línea separadora
      this.doc
        .strokeColor('#E5E7EB')
        .lineWidth(0.5)
        .moveTo(margin.left, this.yPosition)
        .lineTo(this.A4_WIDTH - margin.right, this.yPosition)
        .stroke();
      
      this.yPosition += 5;
    }
    
    this.yPosition += 10;
  }
  
  /**
   * Renderiza los totales
   */
  private renderTotals(): void {
    const { margin } = this.pageConfig;
    const tableWidth = this.A4_WIDTH - margin.left - margin.right;
    const totalsX = margin.left + tableWidth * 0.65;
    
    this.doc.fontSize(10).fillColor('#000000');
    
    // Subtotal
    this.doc
      .font('Helvetica')
      .text('Subtotal:', totalsX, this.yPosition)
      .text(this.formatCurrency(this.invoice.subtotal), totalsX + 100, this.yPosition, { align: 'right', width: 100 });
    
    this.yPosition += 20;
    
    // TVA
    this.doc
      .text('TVA:', totalsX, this.yPosition)
      .text(this.formatCurrency(this.invoice.tvaAmount), totalsX + 100, this.yPosition, { align: 'right', width: 100 });
    
    this.yPosition += 25;
    
    // Total
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(this.designConfig.primaryColor)
      .text('Total:', totalsX, this.yPosition)
      .text(
        `${this.formatCurrency(this.invoice.total)} ${this.invoice.currency}`,
        totalsX + 100,
        this.yPosition,
        { align: 'right', width: 100 }
      );
    
    this.yPosition += 40;
  }
  
  /**
   * Renderiza las notas y términos
   */
  private renderNotes(): void {
    const { margin } = this.pageConfig;
    
    if (this.invoice.notes) {
      if (this.needsNewPage(60)) {
        this.addPage();
      }
      
      this.doc
        .fontSize(10)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Notes:', margin.left, this.yPosition);
      
      this.yPosition += 15;
      
      this.doc
        .font('Helvetica')
        .text(this.invoice.notes, margin.left, this.yPosition, {
          width: this.A4_WIDTH - margin.left - margin.right
        });
      
      this.yPosition += 40;
    }
    
    if (this.invoice.terms) {
      if (this.needsNewPage(60)) {
        this.addPage();
      }
      
      this.doc
        .fontSize(10)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Conditions:', margin.left, this.yPosition);
      
      this.yPosition += 15;
      
      this.doc
        .font('Helvetica')
        .text(this.invoice.terms, margin.left, this.yPosition, {
          width: this.A4_WIDTH - margin.left - margin.right
        });
    }
  }
  
  /**
   * Renderiza el Swiss QR Bill en la última página
   */
  private renderQrBillOnLastPage(): void {
    // Validar que la factura pueda generar un QR Bill
    const validation = QrBillService.validateInvoiceForQrBill(this.invoice);
    if (!validation.valid) {
      console.warn(`Cannot generate QR Bill: ${validation.message}`);
      return;
    }
    
    // Generar datos del QR Bill
    const qrBillData = QrBillService.generateQrBillData(this.invoice);
    
    // Agregar una nueva página para el QR Bill si es necesario
    // El QR Bill debe estar en la parte inferior de la última página
    const qrBillStartY = this.A4_HEIGHT - this.QR_BILL_HEIGHT;
    
    // Si el contenido actual está muy cerca del área del QR Bill, agregar página
    if (this.yPosition > qrBillStartY - 50) {
      this.doc.addPage();
    }
    
    // Generar el QR Bill usando la biblioteca swissqrbill
    try {
      // Preparar los datos en el formato requerido por la librería
      const qrBillFormatted: any = {
        currency: qrBillData.payment.currency as 'CHF' | 'EUR',
        amount: qrBillData.payment.amount,
        reference: qrBillData.payment.reference || '',
        referenceType: qrBillData.payment.referenceType,
        creditor: {
          name: qrBillData.creditor.name,
          address: qrBillData.creditor.address.street,
          zip: qrBillData.creditor.address.postalCode,
          city: qrBillData.creditor.address.city,
          country: qrBillData.creditor.country,
          account: qrBillData.creditor.account,
        },
        debtor: {
          name: qrBillData.debtor.name,
          address: qrBillData.debtor.address.street,
          zip: qrBillData.debtor.address.postalCode,
          city: qrBillData.debtor.address.city,
          country: qrBillData.debtor.address.country || 'CH',
        },
        unstructuredMessage: qrBillData.payment.additionalInformation || '',
      };
      
      // Agregar línea de separación para tijeras antes del QR Bill
      this.doc
        .strokeColor('#000000')
        .lineWidth(0.5)
        .dash(5, { space: 3 })
        .moveTo(0, qrBillStartY)
        .lineTo(this.A4_WIDTH, qrBillStartY)
        .stroke()
        .undash();
      
      // Agregar símbolo de tijeras
      this.doc
        .fontSize(12)
        .fillColor('#000000')
        .text('✂', 10, qrBillStartY - 10);
      
      // Renderizar el QR Bill
      const qr = new SwissQRBill(qrBillFormatted);
      qr.attachTo(this.doc);
      
    } catch (error) {
      console.error('Error generating QR Bill:', error);
      
      // Fallback: mostrar mensaje de error
      this.doc
        .fontSize(10)
        .fillColor('#FF0000')
        .text(
          'Erreur lors de la génération du QR Bill',
          50,
          qrBillStartY + 50,
          { width: 400 }
        );
    }
  }
  
  /**
   * Verifica si se necesita una nueva página
   */
  private needsNewPage(requiredSpace: number): boolean {
    const availableSpace = this.A4_HEIGHT - this.yPosition - this.pageConfig.margin.bottom - this.QR_BILL_HEIGHT;
    return availableSpace < requiredSpace;
  }
  
  /**
   * Agrega una nueva página
   */
  private addPage(): void {
    this.doc.addPage();
    this.currentPage++;
    this.yPosition = this.pageConfig.margin.top;
  }
  
  /**
   * Formatea una fecha
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.invoice.language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }
  
  /**
   * Formatea un número
   */
  private formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }
  
  /**
   * Formatea una cantidad monetaria
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.invoice.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
