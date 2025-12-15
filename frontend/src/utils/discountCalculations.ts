/**
 * Utility functions for discount calculations
 * Centralizes discount logic to avoid duplication across components
 */

export interface DiscountConfig {
  value: number;
  type: 'PERCENT' | 'AMOUNT';
}

/**
 * Calculate discount amount based on subtotal
 * @param subtotal - The subtotal amount before discount
 * @param discount - The discount configuration (value and type)
 * @returns The calculated discount amount
 */
export function calculateDiscountAmount(
  subtotal: number,
  discount: DiscountConfig | undefined
): number {
  if (!discount || discount.value <= 0) {
    return 0;
  }

  if (discount.type === 'PERCENT') {
    return subtotal * (discount.value / 100);
  }

  // AMOUNT type - discount cannot exceed subtotal
  return Math.min(discount.value, subtotal);
}

/**
 * Calculate line item discount
 * @param quantity - Item quantity
 * @param unitPrice - Item unit price
 * @param lineDiscount - Line discount configuration
 * @returns Object with subtotalBeforeDiscount, discountAmount, and subtotalAfterDiscount
 */
export function calculateLineItemDiscount(
  quantity: number,
  unitPrice: number,
  lineDiscount?: DiscountConfig
): {
  subtotalBeforeDiscount: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
} {
  const subtotalBeforeDiscount = quantity * unitPrice;
  const discountAmount = calculateDiscountAmount(subtotalBeforeDiscount, lineDiscount);
  const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;

  return {
    subtotalBeforeDiscount,
    discountAmount,
    subtotalAfterDiscount,
  };
}

/**
 * Apply proportional global discount to an item
 * Used when calculating tax on items after global discount
 * @param itemSubtotal - Item subtotal after line discount
 * @param totalSubtotal - Sum of all items after line discounts
 * @param globalDiscountAmount - Total global discount amount
 * @returns Proportional discount amount for this item
 */
export function calculateProportionalGlobalDiscount(
  itemSubtotal: number,
  totalSubtotal: number,
  globalDiscountAmount: number
): number {
  if (totalSubtotal <= 0) {
    return 0;
  }

  const proportion = itemSubtotal / totalSubtotal;
  return globalDiscountAmount * proportion;
}
