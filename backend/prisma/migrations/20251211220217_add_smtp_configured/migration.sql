-- Add smtpConfigured column to user_onboarding table
ALTER TABLE "user_onboarding" ADD COLUMN IF NOT EXISTS "smtpConfigured" BOOLEAN NOT NULL DEFAULT false;

-- Add welcomeMessageShown column if it doesn't exist
ALTER TABLE "user_onboarding" ADD COLUMN IF NOT EXISTS "welcomeMessageShown" BOOLEAN NOT NULL DEFAULT false;

-- Add welcomeMessageShownAt column if it doesn't exist
ALTER TABLE "user_onboarding" ADD COLUMN IF NOT EXISTS "welcomeMessageShownAt" TIMESTAMP(3);
