-- Add stripePriceId column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Create unique index on stripe_price_id
CREATE UNIQUE INDEX IF NOT EXISTS plans_stripe_price_id_key ON plans(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- Update existing plans with placeholder values (to be replaced with real Stripe Price IDs)
-- Free plan doesn't need a Stripe Price ID
UPDATE plans SET stripe_price_id = NULL WHERE name = 'free';

-- Basic and Premium plans will need real Stripe Price IDs from Stripe Dashboard
-- These are placeholders that should be updated after creating products in Stripe
UPDATE plans SET stripe_price_id = 'price_basic_monthly_chf' WHERE name = 'basic' AND stripe_price_id IS NULL;
UPDATE plans SET stripe_price_id = 'price_premium_monthly_chf' WHERE name = 'premium' AND stripe_price_id IS NULL;

-- Add comment to column
COMMENT ON COLUMN plans.stripe_price_id IS 'Stripe Price ID for subscription billing. NULL for free plan.';
