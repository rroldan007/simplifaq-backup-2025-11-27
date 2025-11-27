-- Script to create a test user for Simplifaq
-- Password will be hashed using bcrypt with cost 12

-- Create test user
INSERT INTO users (
    id, 
    email, 
    password, 
    "companyName", 
    "firstName", 
    "lastName", 
    "vatNumber", 
    phone, 
    website, 
    language, 
    currency, 
    street, 
    city, 
    "postalCode", 
    country, 
    canton, 
    iban, 
    "subscriptionPlan",
    "isActive",
    "createdAt", 
    "updatedAt"
) VALUES (
    'test-user-1',
    'test@simplifaq.ch',
    -- Password: Test1234! (hashed with bcrypt, cost 12)
    '$2a$12$LQv3c1yqBw2Lfgd8.OQAuOuFQjNb6FZ5.pyloN.U3B/8.W/qJ4U4.',
    'Test Company SA',
    'Test',
    'User',
    'CHE-111.222.333',
    '+41 21 555 66 77',
    'https://test.simplifaq.ch',
    'fr',
    'CHF',
    'Teststrasse 123',
    'Lausanne',
    '1000',
    'Switzerland',
    'VD',
    'CH93 0076 2011 6238 5295 7',
    'basic',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "isActive" = true,
    "updatedAt" = NOW();

-- Grant necessary permissions if needed
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;
