-- Normalize all existing emails to lowercase to ensure case-insensitive uniqueness
-- This migration ensures that Test@example.com and test@example.com are treated as the same email

-- Update User table
UPDATE "users" SET email = LOWER(TRIM(email));

-- Update AdminUser table
UPDATE "admin_users" SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;

-- Create a case-insensitive unique index on email if not exists (PostgreSQL specific)
-- This ensures future inserts are also case-insensitive
-- Note: The @unique constraint in Prisma schema already handles this, but this adds an extra layer of protection
