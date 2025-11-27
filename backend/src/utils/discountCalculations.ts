import { Decimal } from '@prisma/client/runtime/library';

/**
 * Discount types
 */
export enum DiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
}

export enum LineDiscountSource {
  FROM_PRODUCT = 'FROM_PRODUCT',
  MANUAL = 'MANUAL',
  NONE = 'NONE',
}

/**
 * Line discount calculation result
 */
export interface LineDiscountResult {
  subtotalBeforeDiscount: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
}

/**
 * Invoice totals calculation result
 */
export interface InvoiceTotalsResult {
  linesSubtotal: number;
  globalDiscountAmount: number;
  subtotalAfterGlobalDiscount: number;
  tvaAmount: number;
  total: number;
}

/**
 * Validation result for discount
 */
export interface DiscountValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Round to CHF 0.05 precision
 */
export function roundToCHF(amount: number): number {
  return Math.round(amount * 20) / 20;
}

/**
 * Calculate discount amount based on type
 */
export function calculateDiscountAmount(
  baseAmount: number,
  discountValue: number,
  discountType: DiscountType
): number {
  if (discountType === DiscountType.PERCENT) {
    return baseAmount * (discountValue / 100);
  } else {
    return discountValue;
  }
}

/**
 * Validate discount parameters
 */
export function validateDiscount(
  discountValue: number,
  discountType: DiscountType,
  baseAmount: number
): DiscountValidation {
  // Check if discount value is negative
  if (discountValue < 0) {
    return {
      isValid: false,
      error: 'Le montant du rabais ne peut pas être négatif',
    };
  }

  // Validate percentage range
  if (discountType === DiscountType.PERCENT) {
    if (discountValue > 100) {
      return {
        isValid: false,
        error: 'Le pourcentage de rabais ne peut pas dépasser 100%',
      };
    }
  }

  // Validate amount doesn't exceed base
  if (discountType === DiscountType.AMOUNT) {
    if (discountValue > baseAmount) {
      return {
        isValid: false,
        error: 'Le montant du rabais ne peut pas dépasser le montant de base',
      };
    }
  }

  return { isValid: true };
}

/**
 * Calculate line discount
 */
export function calculateLineDiscount(
  unitPrice: number,
  quantity: number,
  lineDiscountValue?: number,
  lineDiscountType?: DiscountType
): LineDiscountResult {
  const subtotalBeforeDiscount = unitPrice * quantity;

  if (!lineDiscountValue || !lineDiscountType) {
    return {
      subtotalBeforeDiscount: roundToCHF(subtotalBeforeDiscount),
      discountAmount: 0,
      subtotalAfterDiscount: roundToCHF(subtotalBeforeDiscount),
    };
  }

  const discountAmount = calculateDiscountAmount(
    subtotalBeforeDiscount,
    lineDiscountValue,
    lineDiscountType
  );

  const subtotalAfterDiscount = Math.max(0, subtotalBeforeDiscount - discountAmount);

  return {
    subtotalBeforeDiscount: roundToCHF(subtotalBeforeDiscount),
    discountAmount: roundToCHF(discountAmount),
    subtotalAfterDiscount: roundToCHF(subtotalAfterDiscount),
  };
}

/**
 * Calculate invoice totals with global discount
 */
export function calculateInvoiceTotals(
  lineItems: Array<{
    subtotalAfterDiscount: number;
    tvaRate: number;
  }>,
  globalDiscountValue?: number,
  globalDiscountType?: DiscountType
): InvoiceTotalsResult {
  // Sum all line subtotals (already with line discounts applied)
  const linesSubtotal = lineItems.reduce(
    (sum, item) => sum + item.subtotalAfterDiscount,
    0
  );

  // Apply global discount
  let globalDiscountAmount = 0;
  if (globalDiscountValue && globalDiscountType) {
    globalDiscountAmount = calculateDiscountAmount(
      linesSubtotal,
      globalDiscountValue,
      globalDiscountType
    );
  }

  const subtotalAfterGlobalDiscount = Math.max(0, linesSubtotal - globalDiscountAmount);

  // Calculate TVA on the final subtotal (after all discounts)
  let tvaAmount = 0;
  lineItems.forEach((item) => {
    // Calculate proportion of this line in the final subtotal
    const lineProportionBeforeGlobal = 
      linesSubtotal > 0 ? item.subtotalAfterDiscount / linesSubtotal : 0;
    
    // Distribute global discount proportionally
    const lineAmountAfterGlobal = 
      subtotalAfterGlobalDiscount * lineProportionBeforeGlobal;
    
    // Calculate TVA for this line
    tvaAmount += lineAmountAfterGlobal * (item.tvaRate / 100);
  });

  const total = subtotalAfterGlobalDiscount + tvaAmount;

  return {
    linesSubtotal: roundToCHF(linesSubtotal),
    globalDiscountAmount: roundToCHF(globalDiscountAmount),
    subtotalAfterGlobalDiscount: roundToCHF(subtotalAfterGlobalDiscount),
    tvaAmount: roundToCHF(tvaAmount),
    total: roundToCHF(total),
  };
}

/**
 * Determine if product discount should be applied to new line
 */
export function shouldApplyProductDiscount(
  product: {
    discountActive?: boolean;
    discountValue?: number | null;
    discountType?: string | null;
  }
): boolean {
  return !!(
    product.discountActive &&
    product.discountValue &&
    product.discountType
  );
}

/**
 * Get line discount from product
 */
export function getLineDiscountFromProduct(product: {
  discountValue?: number | null;
  discountType?: string | null;
}): {
  lineDiscountValue?: number;
  lineDiscountType?: DiscountType;
  lineDiscountSource: LineDiscountSource;
} {
  if (!product.discountValue || !product.discountType) {
    return {
      lineDiscountSource: LineDiscountSource.NONE,
    };
  }

  return {
    lineDiscountValue: Number(product.discountValue),
    lineDiscountType: product.discountType as DiscountType,
    lineDiscountSource: LineDiscountSource.FROM_PRODUCT,
  };
}

/**
 * Convert Prisma Decimal to number
 */
export function decimalToNumber(decimal: Decimal | number | null | undefined): number {
  if (decimal === null || decimal === undefined) {
    return 0;
  }
  if (typeof decimal === 'number') {
    return decimal;
  }
  return decimal.toNumber();
}
