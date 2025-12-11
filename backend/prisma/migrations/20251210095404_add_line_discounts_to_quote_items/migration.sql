-- AlterTable
-- Add line-level discount fields to quote_items (same as invoice_items)
ALTER TABLE "quote_items" ADD COLUMN     "discountAmount" DOUBLE PRECISION,
ADD COLUMN     "lineDiscountSource" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "lineDiscountType" TEXT,
ADD COLUMN     "lineDiscountValue" DOUBLE PRECISION,
ADD COLUMN     "subtotalAfterDiscount" DOUBLE PRECISION,
ADD COLUMN     "subtotalBeforeDiscount" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT;
