export enum DiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
}

export enum LineDiscountSource {
  FROM_PRODUCT = 'FROM_PRODUCT',
  MANUAL = 'MANUAL',
  NONE = 'NONE',
}

export interface ProductDiscount {
  discountValue?: number | null;
  discountType?: DiscountType | null;
  discountActive?: boolean;
}

export interface LineDiscount {
  lineDiscountValue?: number | null;
  lineDiscountType?: DiscountType | null;
  lineDiscountSource?: LineDiscountSource;
}

export interface GlobalDiscount {
  globalDiscountValue?: number | null;
  globalDiscountType?: DiscountType | null;
  globalDiscountNote?: string | null;
}
