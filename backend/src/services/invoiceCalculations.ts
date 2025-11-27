import {
  DiscountType,
  LineDiscountSource,
  calculateLineDiscount,
  calculateInvoiceTotals,
  shouldApplyProductDiscount,
  getLineDiscountFromProduct,
  decimalToNumber,
  validateDiscount,
} from '../utils/discountCalculations';
import { prisma } from './database';

export interface InvoiceItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  // Discount fields
  lineDiscountValue?: number;
  lineDiscountType?: DiscountType;
  lineDiscountSource?: LineDiscountSource;
}

export interface ProcessedInvoiceItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  total: number;
  // Discount fields
  lineDiscountValue?: number;
  lineDiscountType?: DiscountType;
  lineDiscountSource: LineDiscountSource;
  subtotalBeforeDiscount?: number;
  discountAmount?: number;
  subtotalAfterDiscount?: number;
  order: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tvaAmount: number;
  total: number;
  globalDiscountAmount?: number;
}

/**
 * Process invoice items with discount calculations
 */
export async function processInvoiceItems(
  items: InvoiceItemInput[],
  userId: string
): Promise<ProcessedInvoiceItem[]> {
  const processedItems: ProcessedInvoiceItem[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    // Sanitize numbers
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const tvaRate = Number(item.tvaRate);

    if (
      !isFinite(quantity) || quantity < 0 ||
      !isFinite(unitPrice) || unitPrice < 0 ||
      !isFinite(tvaRate) || tvaRate < 0
    ) {
      throw new Error(`Invalid invoice item at index ${index}`);
    }

    // Determine discount for this line
    let lineDiscountValue = item.lineDiscountValue;
    let lineDiscountType = item.lineDiscountType;
    let lineDiscountSource = item.lineDiscountSource || LineDiscountSource.NONE;

    // If no manual discount specified and product has discount, apply it
    if (
      !lineDiscountValue &&
      !lineDiscountType &&
      item.productId &&
      lineDiscountSource !== LineDiscountSource.MANUAL
    ) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          discountValue: true,
          discountType: true,
          discountActive: true,
        },
      });

      if (product && shouldApplyProductDiscount(product)) {
        const productDiscount = getLineDiscountFromProduct(product);
        lineDiscountValue = productDiscount.lineDiscountValue;
        lineDiscountType = productDiscount.lineDiscountType;
        lineDiscountSource = productDiscount.lineDiscountSource;
      }
    }

    // Validate discount if present
    if (lineDiscountValue && lineDiscountType) {
      const baseAmount = unitPrice * quantity;
      const validation = validateDiscount(lineDiscountValue, lineDiscountType, baseAmount);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid discount');
      }
    }

    // Calculate line discount
    const discountResult = calculateLineDiscount(
      unitPrice,
      quantity,
      lineDiscountValue,
      lineDiscountType
    );

    processedItems.push({
      productId: item.productId,
      description: item.description,
      quantity,
      unitPrice,
      tvaRate,
      total: discountResult.subtotalAfterDiscount,
      lineDiscountValue,
      lineDiscountType,
      lineDiscountSource,
      subtotalBeforeDiscount: discountResult.subtotalBeforeDiscount,
      discountAmount: discountResult.discountAmount,
      subtotalAfterDiscount: discountResult.subtotalAfterDiscount,
      order: index + 1,
    });
  }

  return processedItems;
}

/**
 * Calculate invoice totals with global discount
 */
export function calculateInvoiceTotalsWithDiscount(
  processedItems: ProcessedInvoiceItem[],
  globalDiscountValue?: number,
  globalDiscountType?: DiscountType
): InvoiceTotals {
  // Prepare items for calculation
  const lineItems = processedItems.map((item) => ({
    subtotalAfterDiscount: item.subtotalAfterDiscount || item.total,
    tvaRate: item.tvaRate,
  }));

  // Validate global discount if present
  if (globalDiscountValue && globalDiscountType) {
    const linesSubtotal = lineItems.reduce((sum, item) => sum + item.subtotalAfterDiscount, 0);
    const validation = validateDiscount(globalDiscountValue, globalDiscountType, linesSubtotal);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid global discount');
    }
  }

  // Calculate totals
  const result = calculateInvoiceTotals(lineItems, globalDiscountValue, globalDiscountType);

  return {
    subtotal: result.subtotalAfterGlobalDiscount,
    tvaAmount: result.tvaAmount,
    total: result.total,
    globalDiscountAmount: result.globalDiscountAmount,
  };
}

/**
 * Recalculate invoice when items or discounts change
 */
export async function recalculateInvoice(invoiceId: string): Promise<InvoiceTotals> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Convert items to input format
  const itemsInput: InvoiceItemInput[] = invoice.items.map((item) => ({
    productId: item.productId || undefined,
    description: item.description,
    quantity: decimalToNumber(item.quantity),
    unitPrice: decimalToNumber(item.unitPrice),
    tvaRate: decimalToNumber(item.tvaRate),
    lineDiscountValue: item.lineDiscountValue ? decimalToNumber(item.lineDiscountValue) : undefined,
    lineDiscountType: item.lineDiscountType as DiscountType | undefined,
    lineDiscountSource: item.lineDiscountSource as LineDiscountSource,
  }));

  // Process items
  const processedItems = await processInvoiceItems(itemsInput, invoice.userId);

  // Calculate totals
  const globalDiscountValue = invoice.globalDiscountValue
    ? decimalToNumber(invoice.globalDiscountValue)
    : undefined;
  const globalDiscountType = invoice.globalDiscountType as DiscountType | undefined;

  const totals = calculateInvoiceTotalsWithDiscount(
    processedItems,
    globalDiscountValue,
    globalDiscountType
  );

  // Update invoice with new totals
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotal: totals.subtotal,
      tvaAmount: totals.tvaAmount,
      total: totals.total,
    },
  });

  return totals;
}
