-- AlterTable: Add new module and feature columns to Plan table
-- This migration adds support for module-based plan features

-- Add Core Module columns
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "hasInvoices" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "hasQuotes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "hasExpenses" BOOLEAN NOT NULL DEFAULT false;

-- Add Advanced Feature columns
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "hasAIAssistant" BOOLEAN NOT NULL DEFAULT false;

-- Note: hasAdvancedReports, hasApiAccess, hasCustomBranding already exist

-- Add Future Feature columns
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "hasMultiUser" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "hasMultiCompany" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "maxCompanies" INTEGER NOT NULL DEFAULT 1;

-- Update existing plans to have core features enabled
UPDATE "plans" SET "hasInvoices" = true WHERE "hasInvoices" IS NULL;
UPDATE "plans" SET "hasQuotes" = false WHERE "hasQuotes" IS NULL;
UPDATE "plans" SET "hasExpenses" = false WHERE "hasExpenses" IS NULL;
UPDATE "plans" SET "hasAIAssistant" = false WHERE "hasAIAssistant" IS NULL;
UPDATE "plans" SET "hasMultiUser" = false WHERE "hasMultiUser" IS NULL;
UPDATE "plans" SET "maxUsers" = 1 WHERE "maxUsers" IS NULL;
UPDATE "plans" SET "hasMultiCompany" = false WHERE "hasMultiCompany" IS NULL;
UPDATE "plans" SET "maxCompanies" = 1 WHERE "maxCompanies" IS NULL;
