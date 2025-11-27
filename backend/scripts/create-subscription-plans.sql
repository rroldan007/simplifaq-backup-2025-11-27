-- Create subscription plans for SimpliFaq
-- This script creates Free, Basic, and Premium plans

-- First, check if plans already exist and delete if needed
-- DELETE FROM plans WHERE name IN ('free', 'basic', 'premium');

-- Insert Free Plan
INSERT INTO plans (
  id, name, "displayName", description, price, currency, stripe_price_id,
  "isActive", "maxInvoicesPerMonth", "maxClientsTotal", "maxProductsTotal",
  "hasEmailSupport", "hasPrioritySupport", "hasAdvancedReports", 
  "hasApiAccess", "hasCustomBranding", "storageLimit",
  "hasSwissQRBill", "hasMultiCurrency", "hasMultiLanguage",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'free',
  'Plan Gratuit',
  'Plan gratuit pour démarrer avec SimpliFaq. Idéal pour tester la plateforme.',
  0.00,
  'CHF',
  NULL, -- No Stripe Price ID for free plan
  true,
  10,   -- 10 invoices per month
  5,    -- 5 clients max
  10,   -- 10 products max
  false, -- No email support
  false, -- No priority support
  false, -- No advanced reports
  false, -- No API access
  false, -- No custom branding
  100,   -- 100 MB storage
  true,  -- Has Swiss QR Bill
  false, -- No multi-currency
  false, -- No multi-language
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  "maxInvoicesPerMonth" = EXCLUDED."maxInvoicesPerMonth",
  "maxClientsTotal" = EXCLUDED."maxClientsTotal",
  "maxProductsTotal" = EXCLUDED."maxProductsTotal",
  "updatedAt" = NOW();

-- Insert Basic Plan
INSERT INTO plans (
  id, name, "displayName", description, price, currency, stripe_price_id,
  "isActive", "maxInvoicesPerMonth", "maxClientsTotal", "maxProductsTotal",
  "hasEmailSupport", "hasPrioritySupport", "hasAdvancedReports", 
  "hasApiAccess", "hasCustomBranding", "storageLimit",
  "hasSwissQRBill", "hasMultiCurrency", "hasMultiLanguage",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'basic',
  'Plan Basique',
  'Plan idéal pour les petites entreprises. Toutes les fonctionnalités essentielles.',
  29.00,
  'CHF',
  'price_basic_monthly_chf', -- Placeholder - replace with real Stripe Price ID
  true,
  100,  -- 100 invoices per month
  50,   -- 50 clients max
  100,  -- 100 products max
  true,  -- Email support
  false, -- No priority support
  true,  -- Advanced reports
  false, -- No API access
  false, -- No custom branding
  500,   -- 500 MB storage
  true,  -- Has Swiss QR Bill
  true,  -- Multi-currency
  true,  -- Multi-language
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stripe_price_id = EXCLUDED.stripe_price_id,
  "maxInvoicesPerMonth" = EXCLUDED."maxInvoicesPerMonth",
  "maxClientsTotal" = EXCLUDED."maxClientsTotal",
  "maxProductsTotal" = EXCLUDED."maxProductsTotal",
  "hasEmailSupport" = EXCLUDED."hasEmailSupport",
  "hasAdvancedReports" = EXCLUDED."hasAdvancedReports",
  "hasMultiCurrency" = EXCLUDED."hasMultiCurrency",
  "hasMultiLanguage" = EXCLUDED."hasMultiLanguage",
  "storageLimit" = EXCLUDED."storageLimit",
  "updatedAt" = NOW();

-- Insert Premium Plan
INSERT INTO plans (
  id, name, "displayName", description, price, currency, stripe_price_id,
  "isActive", "maxInvoicesPerMonth", "maxClientsTotal", "maxProductsTotal",
  "hasEmailSupport", "hasPrioritySupport", "hasAdvancedReports", 
  "hasApiAccess", "hasCustomBranding", "storageLimit",
  "hasSwissQRBill", "hasMultiCurrency", "hasMultiLanguage",
  "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'premium',
  'Plan Premium',
  'Plan complet pour les entreprises en croissance. Toutes les fonctionnalités avancées.',
  79.00,
  'CHF',
  'price_premium_monthly_chf', -- Placeholder - replace with real Stripe Price ID
  true,
  -1,   -- Unlimited invoices
  -1,   -- Unlimited clients
  -1,   -- Unlimited products
  true,  -- Email support
  true,  -- Priority support
  true,  -- Advanced reports
  true,  -- API access
  true,  -- Custom branding
  5000,  -- 5 GB storage
  true,  -- Has Swiss QR Bill
  true,  -- Multi-currency
  true,  -- Multi-language
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stripe_price_id = EXCLUDED.stripe_price_id,
  "maxInvoicesPerMonth" = EXCLUDED."maxInvoicesPerMonth",
  "maxClientsTotal" = EXCLUDED."maxClientsTotal",
  "maxProductsTotal" = EXCLUDED."maxProductsTotal",
  "hasEmailSupport" = EXCLUDED."hasEmailSupport",
  "hasPrioritySupport" = EXCLUDED."hasPrioritySupport",
  "hasAdvancedReports" = EXCLUDED."hasAdvancedReports",
  "hasApiAccess" = EXCLUDED."hasApiAccess",
  "hasCustomBranding" = EXCLUDED."hasCustomBranding",
  "hasMultiCurrency" = EXCLUDED."hasMultiCurrency",
  "hasMultiLanguage" = EXCLUDED."hasMultiLanguage",
  "storageLimit" = EXCLUDED."storageLimit",
  "updatedAt" = NOW();

-- Display created plans
SELECT id, name, "displayName", price, stripe_price_id, "isActive" 
FROM plans 
ORDER BY price;
