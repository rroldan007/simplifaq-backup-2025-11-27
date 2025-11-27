/**
 * Modelos mejorados para el sistema de facturación con soporte para Swiss QR Bill
 */

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID'
}

export enum QrReferenceType {
  QRR = 'QRR',    // QR-Referenz (formato de referencia suizo)
  SCOR = 'SCOR',  // Referencia SCOR (formato de referencia internacional)
  NON = 'NON'     // Sin referencia
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT'
}

export enum RecurrenceFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUALLY = 'BIANNUALLY',
  ANNUALLY = 'ANNUALLY'
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  canton?: string;
  additionalInfo?: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  vatNumber?: string;
  iban?: string;
}

export interface CompanyInfo extends ContactInfo {
  companyName: string;
  address: Address;
  logoUrl?: string;
  website?: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number; // 0.00, 3.50, 8.10
  total: number;
  order: number;
  
  // Descuentos por línea
  discount?: {
    value: number;
    type: DiscountType;
    source: 'FROM_PRODUCT' | 'MANUAL' | 'NONE';
    amount: number; // Monto del descuento
    subtotalBeforeDiscount: number; // Subtotal antes del descuento
    subtotalAfterDiscount: number; // Subtotal después del descuento
  };
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  reference: string;
  notes?: string;
}

export interface SwissQrBillData {
  // Información del acreedor (quien recibe el pago)
  creditor: {
    name: string;
    address: Address;
    account: string; // IBAN
    country: string; // Código de país (ej: 'CH')
  };
  
  // Información del deudor (quien realiza el pago)
  debtor: {
    name: string;
    address: Address;
  };
  
  // Información del pago
  payment: {
    amount: number;
    currency: string; // 'CHF' o 'EUR'
    reference: string; // Referencia QR (QRR) o SCORE
    referenceType: QrReferenceType;
    additionalInformation?: string; // Información adicional (máx. 140 caracteres)
    alternativeSchemes?: string; // Esquemas de pago alternativos (ej: para Twint)
  };
  
  // Información de la factura
  invoice: {
    number: string;
    date: Date;
    dueDate: Date;
    vatNumber?: string;
  };
  
  // Líneas de la factura (para generación del QR)
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
}

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  isQuote: boolean;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  
  // Fechas importantes
  issueDate: Date;
  dueDate: Date;
  validUntil?: Date; // Para presupuestos
  paidDate?: Date;
  
  // Información de la empresa
  company: CompanyInfo;
  
  // Información del cliente
  client: ContactInfo & {
    companyName?: string;
    address: Address;
  };
  
  // Configuración
  language: string; // 'fr', 'de', 'it', 'en'
  currency: string; // 'CHF', 'EUR'
  
  // Líneas de la factura
  items: InvoiceItem[];
  
  // Pagos
  payments: Payment[];
  
  // Totales
  subtotal: number;
  tvaAmount: number;
  total: number;
  
  // Descuento global
  globalDiscount?: {
    value: number;
    type: DiscountType;
    note?: string;
    amount: number;
    subtotalBeforeDiscount: number;
  };
  
  // Facturación recurrente
  recurrence?: {
    isRecurring: boolean;
    frequency: RecurrenceFrequency;
    nextDate?: Date;
    endDate?: Date;
    status: 'active' | 'ended' | 'inactive';
  };
  
  // Datos para el Swiss QR Bill
  qrBill?: SwissQrBillData;
  
  // Metadatos
  notes?: string;
  terms?: string;
  
  // Seguimiento de envío
  sentAt?: Date;
  sentTo?: string;
  emailSentAt?: Date;
  emailSentTo?: string;
  
  // Timbres de tiempo
  createdAt: Date;
  updatedAt: Date;
}

// Clase de ayuda para construir facturas
export class InvoiceBuilder {
  private invoice: Partial<Invoice>;
  
  constructor() {
    this.invoice = {
      isQuote: false,
      status: InvoiceStatus.DRAFT,
      paymentStatus: PaymentStatus.UNPAID,
      issueDate: new Date(),
      dueDate: this.calculateDueDate(30), // 30 días por defecto
      language: 'fr',
      currency: 'CHF',
      items: [],
      payments: [],
      subtotal: 0,
      tvaAmount: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  withId(id: string): InvoiceBuilder {
    this.invoice.id = id;
    return this;
  }
  
  withInvoiceNumber(number: string): InvoiceBuilder {
    this.invoice.invoiceNumber = number;
    return this;
  }
  
  withStatus(status: InvoiceStatus): InvoiceBuilder {
    this.invoice.status = status;
    return this;
  }
  
  withPaymentStatus(paymentStatus: PaymentStatus): InvoiceBuilder {
    this.invoice.paymentStatus = paymentStatus;
    return this;
  }
  
  withDates(issueDate: Date, dueDate: Date): InvoiceBuilder {
    this.invoice.issueDate = issueDate;
    this.invoice.dueDate = dueDate;
    return this;
  }
  
  withCompany(company: CompanyInfo): InvoiceBuilder {
    this.invoice.company = company;
    return this;
  }
  
  withClient(client: ContactInfo & { companyName?: string; address: Address }): InvoiceBuilder {
    this.invoice.client = client;
    return this;
  }
  
  withItems(items: InvoiceItem[]): InvoiceBuilder {
    this.invoice.items = items;
    this.calculateTotals();
    return this;
  }
  
  addItem(item: InvoiceItem): InvoiceBuilder {
    if (!this.invoice.items) {
      this.invoice.items = [];
    }
    this.invoice.items.push(item);
    this.calculateTotals();
    return this;
  }
  
  withQrBill(qrBill: SwissQrBillData): InvoiceBuilder {
    this.invoice.qrBill = qrBill;
    return this;
  }
  
  build(): Invoice {
    if (!this.invoice.id) {
      throw new Error('Invoice ID is required');
    }
    if (!this.invoice.invoiceNumber) {
      throw new Error('Invoice number is required');
    }
    if (!this.invoice.company) {
      throw new Error('Company information is required');
    }
    if (!this.invoice.client) {
      throw new Error('Client information is required');
    }
    
    return this.invoice as Invoice;
  }
  
  private calculateTotals(): void {
    if (!this.invoice.items || this.invoice.items.length === 0) {
      this.invoice.subtotal = 0;
      this.invoice.tvaAmount = 0;
      this.invoice.total = 0;
      return;
    }
    
    // Calcular subtotal
    this.invoice.subtotal = this.invoice.items.reduce(
      (sum, item) => sum + (item.discount?.subtotalAfterDiscount || item.total), 
      0
    );
    
    // Calcular IVA
    this.invoice.tvaAmount = this.invoice.items.reduce((sum, item) => {
      const itemTotal = item.discount?.subtotalAfterDiscount || item.total;
      return sum + (itemTotal * item.tvaRate / 100);
    }, 0);
    
    // Aplicar descuento global si existe
    if (this.invoice.globalDiscount) {
      const discount = this.invoice.globalDiscount;
      discount.subtotalBeforeDiscount = this.invoice.subtotal;
      
      if (discount.type === DiscountType.PERCENT) {
        discount.amount = this.invoice.subtotal * (discount.value / 100);
      } else {
        discount.amount = Math.min(discount.value, this.invoice.subtotal);
      }
      
      this.invoice.subtotal -= discount.amount;
    }
    
    // Calcular total
    this.invoice.total = this.invoice.subtotal + this.invoice.tvaAmount;
  }
  
  private calculateDueDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}

// Ejemplo de uso:
/*
const invoice = new InvoiceBuilder()
  .withId('inv_123')
  .withInvoiceNumber('2023-001')
  .withStatus(InvoiceStatus.DRAFT)
  .withPaymentStatus(PaymentStatus.UNPAID)
  .withDates(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
  .withCompany({
    companyName: 'Mi Empresa SA',
    name: 'Juan Pérez',
    email: 'contabilidad@miempresa.ch',
    phone: '+41 79 123 45 67',
    vatNumber: 'CHE-123.456.789',
    iban: 'CH9300762011623852957',
    address: {
      street: 'Rue du Commerce 1',
      city: 'Lausanne',
      postalCode: '1003',
      country: 'Switzerland',
      canton: 'VD'
    },
    logoUrl: '/uploads/logos/logo.png'
  })
  .withClient({
    companyName: 'Cliente SA',
    name: 'Ana García',
    email: 'ana.garcia@cliente.ch',
    phone: '+41 79 987 65 43',
    vatNumber: 'CHE-987.654.321',
    address: {
      street: 'Avenue de la Gare 10',
      city: 'Genève',
      postalCode: '1201',
      country: 'Switzerland',
      canton: 'GE'
    }
  })
  .withItems([
    {
      id: 'item_1',
      description: 'Desarrollo de sitio web',
      quantity: 10,
      unitPrice: 120,
      tvaRate: 8.1,
      total: 1200,
      order: 1
    },
    {
      id: 'item_2',
      description: 'Diseño de logo',
      quantity: 1,
      unitPrice: 500,
      tvaRate: 8.1,
      total: 500,
      order: 2
    }
  ])
  .build();
*/
