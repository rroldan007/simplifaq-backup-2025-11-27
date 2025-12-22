-- Migration: Add isCompany to Client and currency to Product
-- Safe migration: Only adds new columns with defaults, no data loss

-- Add isCompany column to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "isCompany" BOOLEAN NOT NULL DEFAULT false;

-- Add currency column to products table  
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'CHF';
