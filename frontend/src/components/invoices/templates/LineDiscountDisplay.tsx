import React from 'react';

interface LineDiscountDisplayProps {
  lineDiscountValue?: number;
  lineDiscountType?: 'PERCENT' | 'AMOUNT';
  discountAmount?: number;
  currency: string;
  className?: string;
}

/**
 * Reusable component to display line item discounts in invoice templates
 * Avoids code duplication across all 6 templates
 */
export const LineDiscountDisplay: React.FC<LineDiscountDisplayProps> = ({
  lineDiscountValue,
  lineDiscountType,
  discountAmount,
  currency,
  className = 'text-xs text-red-600 mt-1',
}) => {
  // Don't render if no discount
  if (!lineDiscountValue || lineDiscountValue <= 0) {
    return null;
  }

  const discountLabel = lineDiscountType === 'PERCENT' ? '%' : ` ${currency}`;
  const discountAmountFormatted = discountAmount 
    ? ` (-${discountAmount.toFixed(2)} ${currency})`
    : '';

  return (
    <div className={className}>
      💰 Rabais: -{lineDiscountValue}{discountLabel}{discountAmountFormatted}
    </div>
  );
};
