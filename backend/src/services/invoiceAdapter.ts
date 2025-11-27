import { Invoice as PrismaInvoice, InvoiceItem as PrismaInvoiceItem, Client as PrismaClient, User as PrismaUser } from '@prisma/client';
import { Invoice, InvoiceItem, InvoiceStatus, PaymentStatus, QrReferenceType, DiscountType, RecurrenceFrequency } from '../models/invoiceModels';

/**
 * Adaptador para convertir datos de Prisma a nuestros modelos mejorados
 */
export class InvoiceAdapter {
  /**
   * Convierte una factura de Prisma al modelo mejorado
   */
  public static fromPrisma(
    prismaInvoice: PrismaInvoice & { 
      items: PrismaInvoiceItem[];
      client: PrismaClient;
      user: PrismaUser;
    }
  ): Invoice {
    return {
      id: prismaInvoice.id,
      userId: prismaInvoice.userId,
      clientId: prismaInvoice.clientId,
      invoiceNumber: prismaInvoice.invoiceNumber,
      isQuote: prismaInvoice.isQuote,
      status: this.mapStatus(prismaInvoice.status),
      paymentStatus: this.mapPaymentStatus(prismaInvoice.paymentStatus),
      
      // Fechas
      issueDate: new Date(prismaInvoice.issueDate),
      dueDate: new Date(prismaInvoice.dueDate),
      validUntil: prismaInvoice.validUntil ? new Date(prismaInvoice.validUntil) : undefined,
      paidDate: prismaInvoice.paidDate ? new Date(prismaInvoice.paidDate) : undefined,
      
      // Información de la empresa
      company: {
        companyName: prismaInvoice.user.companyName || '',
        name: `${prismaInvoice.user.firstName || ''} ${prismaInvoice.user.lastName || ''}`.trim(),
        email: prismaInvoice.user.email,
        phone: prismaInvoice.user.phone ?? undefined,
        vatNumber: prismaInvoice.user.vatNumber ?? undefined,
        iban: prismaInvoice.user.iban ?? undefined,
        website: prismaInvoice.user.website ?? undefined,
        logoUrl: prismaInvoice.user.logoUrl ?? undefined,
        address: {
          street: prismaInvoice.user.street || '',
          city: prismaInvoice.user.city || '',
          postalCode: prismaInvoice.user.postalCode || '',
          country: prismaInvoice.user.country || 'CH',
          canton: prismaInvoice.user.canton ?? undefined,
        }
      },
      
      // Información del cliente
      client: {
        companyName: prismaInvoice.client.companyName ?? undefined,
        name: `${prismaInvoice.client.firstName || ''} ${prismaInvoice.client.lastName || ''}`.trim() || prismaInvoice.client.companyName || '',
        email: prismaInvoice.client.email,
        phone: prismaInvoice.client.phone ?? undefined,
        vatNumber: prismaInvoice.client.vatNumber ?? undefined,
        address: {
          street: prismaInvoice.client.street,
          city: prismaInvoice.client.city,
          postalCode: prismaInvoice.client.postalCode,
          country: prismaInvoice.client.country || 'CH',
          canton: prismaInvoice.client.canton ?? undefined,
        }
      },
      
      // Configuración
      language: prismaInvoice.language,
      currency: prismaInvoice.currency,
      
      // Líneas de la factura
      items: this.mapItems(prismaInvoice.items),
      
      // Pagos (se obtendrían de la relación payments si está disponible)
      payments: [],
      
      // Totales
      subtotal: Number(prismaInvoice.subtotal),
      tvaAmount: Number(prismaInvoice.tvaAmount),
      total: Number(prismaInvoice.total),
      
      // Descuento global
      globalDiscount: this.mapGlobalDiscount(prismaInvoice),
      
      // Facturación recurrente
      recurrence: this.mapRecurrence(prismaInvoice),
      
      // Datos para QR Bill (generados según sea necesario)
      qrBill: undefined, // Se genera dinámicamente con QrBillService
      
      // Metadatos
      notes: prismaInvoice.notes ?? undefined,
      terms: prismaInvoice.terms ?? undefined,
      
      // Seguimiento de envío
      sentAt: prismaInvoice.sentAt ? new Date(prismaInvoice.sentAt) : undefined,
      sentTo: prismaInvoice.sentTo ?? undefined,
      emailSentAt: prismaInvoice.emailSentAt ? new Date(prismaInvoice.emailSentAt) : undefined,
      emailSentTo: prismaInvoice.emailSentTo ?? undefined,
      
      // Timestamps
      createdAt: new Date(prismaInvoice.createdAt),
      updatedAt: new Date(prismaInvoice.updatedAt),
    };
  }
  
  /**
   * Mapea el estado de la factura
   */
  private static mapStatus(status: string): InvoiceStatus {
    switch (status.toLowerCase()) {
      case 'draft': return InvoiceStatus.DRAFT;
      case 'sent': return InvoiceStatus.SENT;
      case 'paid': return InvoiceStatus.PAID;
      case 'overdue': return InvoiceStatus.OVERDUE;
      case 'cancelled': return InvoiceStatus.CANCELLED;
      case 'accepted': return InvoiceStatus.ACCEPTED;
      case 'rejected': return InvoiceStatus.REJECTED;
      case 'expired': return InvoiceStatus.EXPIRED;
      default: return InvoiceStatus.DRAFT;
    }
  }
  
  /**
   * Mapea el estado de pago
   */
  private static mapPaymentStatus(status: string): PaymentStatus {
    switch (status.toUpperCase()) {
      case 'PAID': return PaymentStatus.PAID;
      case 'PARTIALLY_PAID': return PaymentStatus.PARTIALLY_PAID;
      case 'UNPAID':
      default: return PaymentStatus.UNPAID;
    }
  }
  
  /**
   * Mapea las líneas de factura
   */
  private static mapItems(prismaItems: PrismaInvoiceItem[]): InvoiceItem[] {
    return prismaItems.map(item => ({
      id: item.id,
      productId: item.productId ?? undefined,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      tvaRate: Number(item.tvaRate),
      total: Number(item.total),
      order: item.order,
      discount: this.mapLineDiscount(item),
    })).sort((a, b) => a.order - b.order);
  }
  
  /**
   * Mapea el descuento por línea
   */
  private static mapLineDiscount(item: PrismaInvoiceItem) {
    if (!item.lineDiscountValue || item.lineDiscountValue === 0) {
      return undefined;
    }
    
    const discountType = item.lineDiscountType === 'PERCENT' 
      ? DiscountType.PERCENT 
      : DiscountType.AMOUNT;
    
    const subtotalBeforeDiscount = Number(item.subtotalBeforeDiscount || item.total);
    const discountAmount = Number(item.discountAmount || 0);
    const subtotalAfterDiscount = Number(item.subtotalAfterDiscount || item.total);
    
    return {
      value: Number(item.lineDiscountValue),
      type: discountType,
      source: item.lineDiscountSource as 'FROM_PRODUCT' | 'MANUAL' | 'NONE',
      amount: discountAmount,
      subtotalBeforeDiscount: subtotalBeforeDiscount,
      subtotalAfterDiscount: subtotalAfterDiscount,
    };
  }
  
  /**
   * Mapea el descuento global
   */
  private static mapGlobalDiscount(invoice: PrismaInvoice) {
    if (!invoice.globalDiscountValue || invoice.globalDiscountValue === 0) {
      return undefined;
    }
    
    const type = invoice.globalDiscountType === 'PERCENT' 
      ? DiscountType.PERCENT 
      : DiscountType.AMOUNT;
    
    const subtotalBeforeDiscount = Number(invoice.subtotal);
    let amount = 0;
    
    if (type === DiscountType.PERCENT) {
      amount = subtotalBeforeDiscount * (Number(invoice.globalDiscountValue) / 100);
    } else {
      amount = Math.min(Number(invoice.globalDiscountValue), subtotalBeforeDiscount);
    }
    
    return {
      value: Number(invoice.globalDiscountValue),
      type,
      note: invoice.globalDiscountNote ?? undefined,
      amount,
      subtotalBeforeDiscount,
    };
  }
  
  /**
   * Mapea la configuración de recurrencia
   */
  private static mapRecurrence(invoice: PrismaInvoice) {
    if (!invoice.estRecurrente) {
      return undefined;
    }
    
    let frequency: RecurrenceFrequency = RecurrenceFrequency.MONTHLY;
    
    if (invoice.frequence) {
      switch (invoice.frequence.toUpperCase()) {
        case 'MENSUEL':
        case 'MONTHLY':
          frequency = RecurrenceFrequency.MONTHLY;
          break;
        case 'TRIMESTRIEL':
        case 'QUARTERLY':
          frequency = RecurrenceFrequency.QUARTERLY;
          break;
        case 'SEMESTRIEL':
        case 'BIANNUALLY':
          frequency = RecurrenceFrequency.BIANNUALLY;
          break;
        case 'ANNUEL':
        case 'ANNUALLY':
          frequency = RecurrenceFrequency.ANNUALLY;
          break;
      }
    }
    
    return {
      isRecurring: true,
      frequency,
      nextDate: invoice.prochaineDateRecurrence ? new Date(invoice.prochaineDateRecurrence) : undefined,
      endDate: invoice.dateFinRecurrence ? new Date(invoice.dateFinRecurrence) : undefined,
      status: (invoice.statutRecurrence || 'inactive') as 'active' | 'ended' | 'inactive',
    };
  }
  
  /**
   * Convierte del modelo mejorado a Prisma (para actualizaciones)
   */
  public static toPrisma(invoice: Invoice): any {
    return {
      userId: invoice.userId,
      clientId: invoice.clientId,
      invoiceNumber: invoice.invoiceNumber,
      isQuote: invoice.isQuote,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      validUntil: invoice.validUntil,
      language: invoice.language,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tvaAmount: invoice.tvaAmount,
      total: invoice.total,
      globalDiscountValue: invoice.globalDiscount?.value,
      globalDiscountType: invoice.globalDiscount?.type,
      globalDiscountNote: invoice.globalDiscount?.note,
      notes: invoice.notes,
      terms: invoice.terms,
      paidDate: invoice.paidDate,
      sentAt: invoice.sentAt,
      sentTo: invoice.sentTo,
      emailSentAt: invoice.emailSentAt,
      emailSentTo: invoice.emailSentTo,
      estRecurrente: invoice.recurrence?.isRecurring || false,
      frequence: invoice.recurrence?.frequency,
      prochaineDateRecurrence: invoice.recurrence?.nextDate,
      dateFinRecurrence: invoice.recurrence?.endDate,
      statutRecurrence: invoice.recurrence?.status,
      // Los items se manejarían por separado en la relación
    };
  }
}
