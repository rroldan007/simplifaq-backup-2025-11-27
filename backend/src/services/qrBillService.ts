import { Invoice, SwissQrBillData, QrReferenceType } from '../models/invoiceModels';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio para generar y validar datos para el Swiss QR Bill
 */
export class QrBillService {
  /**
   * Genera los datos necesarios para el Swiss QR Bill a partir de una factura
   */
  public static generateQrBillData(invoice: Invoice): SwissQrBillData {
    if (!invoice.company || !invoice.client) {
      throw new Error('Company and client information are required to generate QR Bill');
    }

    // Validar que la empresa tenga IBAN
    if (!invoice.company.iban) {
      throw new Error('Company IBAN is required to generate QR Bill');
    }

    // Determinar el tipo de referencia
    const referenceType = this.determineReferenceType(invoice.qrBill?.payment?.referenceType);
    
    // Generar referencia QR si no existe
    const reference = invoice.qrBill?.payment?.reference || this.generateQrReference(referenceType);
    
    // Validar la referencia según el tipo
    this.validateReference(reference, referenceType);

    return {
      creditor: {
        name: invoice.company.companyName || invoice.company.name,
        address: invoice.company.address,
        account: invoice.company.iban,
        country: invoice.company.address.country || 'CH'
      },
      debtor: {
        name: invoice.client.companyName || invoice.client.name,
        address: invoice.client.address
      },
      payment: {
        amount: invoice.total,
        currency: invoice.currency || 'CHF',
        reference: reference,
        referenceType: referenceType,
        additionalInformation: this.formatAdditionalInformation(invoice),
        alternativeSchemes: this.generateAlternativeSchemes(invoice)
      },
      invoice: {
        number: invoice.invoiceNumber,
        date: invoice.issueDate,
        dueDate: invoice.dueDate,
        vatNumber: invoice.company.vatNumber
      },
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.tvaRate,
        total: item.total
      }))
    };
  }

  /**
   * Valida si una factura puede generar un QR Bill
   */
  public static validateInvoiceForQrBill(invoice: Invoice): { valid: boolean; message?: string } {
    if (!invoice.company) {
      return { valid: false, message: 'Company information is missing' };
    }
    
    if (!invoice.client) {
      return { valid: false, message: 'Client information is missing' };
    }
    
    if (!invoice.company.iban) {
      return { valid: false, message: 'Company IBAN is required' };
    }
    
    if (invoice.currency !== 'CHF' && invoice.currency !== 'EUR') {
      return { valid: false, message: 'Only CHF and EUR are supported for QR Bill' };
    }
    
    if (invoice.total <= 0) {
      return { valid: false, message: 'Invoice total must be greater than 0' };
    }
    
    return { valid: true };
  }

  /**
   * Formatea la información adicional para el QR Bill (máx. 140 caracteres)
   */
  private static formatAdditionalInformation(invoice: Invoice): string | undefined {
    const parts: string[] = [];
    
    // Agregar número de factura
    parts.push(`Factura: ${invoice.invoiceNumber}`);
    
    // Agregar notas si existen y hay espacio
    if (invoice.notes && invoice.notes.length > 0) {
      const notes = invoice.notes.substring(0, 100); // Limitar la longitud
      parts.push(`Nota: ${notes}`);
    }
    
    // Unir y limitar a 140 caracteres
    const info = parts.join(' - ');
    return info.length > 140 ? info.substring(0, 137) + '...' : info;
  }

  /**
   * Genera esquemas de pago alternativos (ej: para Twint)
   */
  private static generateAlternativeSchemes(invoice: Invoice): string | undefined {
    // En una implementación real, esto podría generar códigos de pago alternativos
    // como códigos Twint o enlaces de pago
    return undefined;
  }

  /**
   * Determina el tipo de referencia a utilizar
   */
  private static determineReferenceType(preferredType?: QrReferenceType): QrReferenceType {
    // Si se especifica un tipo preferido y es válido, usarlo
    if (preferredType && Object.values(QrReferenceType).includes(preferredType)) {
      return preferredType;
    }
    
    // Por defecto, usar QRR para facturas en CHF/EUR
    return QrReferenceType.QRR;
  }

  /**
   * Genera una referencia QR válida
   */
  private static generateQrReference(type: QrReferenceType): string {
    switch (type) {
      case QrReferenceType.QRR:
        return this.generateQrrReference();
      case QrReferenceType.SCOR:
        return this.generateScorReference();
      case QrReferenceType.NON:
      default:
        return '';
    }
  }

  /**
   * Genera una referencia QR suiza (formato QRR)
   */
  private static generateQrrReference(): string {
    // Formato: 16 dígitos numéricos
    // Los primeros 2 dígitos son 00-99 (normalmente 00)
    // Los siguientes 14 dígitos son el número de referencia
    
    // Generar 14 dígitos aleatorios
    const randomDigits = Array(14).fill(0)
      .map(() => Math.floor(Math.random() * 10))
      .join('');
    
    // Agregar prefijo 00
    return `00${randomDigits}`;
  }

  /**
   * Genera una referencia SCOR (formato internacional)
   */
  private static generateScorReference(): string {
    // Formato: RF + dígito de control + hasta 19 caracteres alfanuméricos
    const randomPart = uuidv4().replace(/-/g, '').substring(0, 19).toUpperCase();
    return `RF${randomPart}`;
  }

  /**
   * Valida una referencia según su tipo
   */
  private static validateReference(reference: string, type: QrReferenceType): void {
    if (type === QrReferenceType.NON) {
      return; // No hay validación para referencias vacías
    }
    
    if (!reference) {
      throw new Error(`Reference is required for type ${type}`);
    }
    
    switch (type) {
      case QrReferenceType.QRR:
        this.validateQrrReference(reference);
        break;
      case QrReferenceType.SCOR:
        this.validateScorReference(reference);
        break;
    }
  }

  /**
   * Valida una referencia QR suiza (formato QRR)
   */
  private static validateQrrReference(reference: string): void {
    // Debe ser numérico y tener entre 16 y 27 dígitos
    if (!/^\d{16,27}$/.test(reference)) {
      throw new Error('Invalid QRR reference: must be 16-27 digits');
    }
    
    // Validar dígito de control (módulo 10 recursivo)
    if (!this.validateMod10(reference)) {
      throw new Error('Invalid QRR reference: checksum failed');
    }
  }

  /**
   * Valida una referencia SCOR (formato internacional)
   */
  private static validateScorReference(reference: string): void {
    // Debe comenzar con RF seguido de 2 dígitos de control y hasta 19 caracteres
    if (!/^RF\d{2}[A-Z0-9]{1,19}$/.test(reference)) {
      throw new Error('Invalid SCOR reference: must match RF\d{2}[A-Z0-9]{1,19}');
    }
    
    // Validar dígitos de control (ISO 11649)
    const checkDigits = reference.substring(2, 4);
    const payload = reference.substring(4);
    const calculatedCheck = this.calculateIso11649CheckDigits(`RF00${payload}`);
    
    if (checkDigits !== calculatedCheck) {
      throw new Error('Invalid SCOR reference: checksum failed');
    }
  }

  /**
   * Valida un número con el algoritmo módulo 10 recursivo
   */
  private static validateMod10(number: string): boolean {
    const digits = number.split('').map(d => parseInt(d, 10)).reverse();
    let sum = 0;
    
    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      
      // Multiplicar por 2 los dígitos en posiciones pares (0-based)
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + Math.floor(digit / 10);
        }
      }
      
      sum += digit;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Calcula los dígitos de control ISO 11649
   */
  private static calculateIso11649CheckDigits(reference: string): string {
    // Reemplazar letras por números (A=10, B=11, ..., Z=35)
    const numeric = reference.split('').map(c => {
      const code = c.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : c;
    }).join('');
    
    // Calcular módulo 97-10
    let remainder = 0;
    for (let i = 0; i < numeric.length; i++) {
      const digit = parseInt(numeric[i], 10);
      remainder = (remainder * 10 + digit) % 97;
    }
    
    // Calcular dígitos de control
    const checkDigits = (98 - ((remainder * 100) % 97)).toString().padStart(2, '0');
    return checkDigits;
  }
}
