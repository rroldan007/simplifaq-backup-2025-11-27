-- Add fiscal year numbering fields to users table
-- Migration: add_fiscal_year_numbering
-- Date: 2025-12-25

-- Invoice fiscal year fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invoiceYearInPrefix" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invoiceYearFormat" TEXT NOT NULL DEFAULT 'YYYY';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invoiceAutoReset" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastInvoiceYear" INTEGER;

-- Quote fiscal year fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quoteYearInPrefix" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quoteYearFormat" TEXT NOT NULL DEFAULT 'YYYY';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quoteAutoReset" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastQuoteYear" INTEGER;
