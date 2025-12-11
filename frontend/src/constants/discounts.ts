/**
 * Default discount values to avoid hardcoding across the application
 */

/** Default discount value when adding a new manual discount (5%) */
export const DEFAULT_DISCOUNT_VALUE = 5;

/** Default discount type for new discounts */
export const DEFAULT_DISCOUNT_TYPE = 'PERCENT' as const;

/** Minimum discount value */
export const MIN_DISCOUNT_VALUE = 0;

/** Maximum discount percentage */
export const MAX_DISCOUNT_PERCENT = 100;
