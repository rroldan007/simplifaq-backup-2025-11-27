-- AlterTable: Add single JSON field for advanced PDF customization
-- Migration: Add pdfAdvancedConfig field to store visual PDF editor configuration

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pdfAdvancedConfig" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "users"."pdfAdvancedConfig" IS 'JSON configuration from advanced PDF visual editor (elements, images, colors, etc.)';
