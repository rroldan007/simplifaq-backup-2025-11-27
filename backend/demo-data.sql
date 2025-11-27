-- 🇨🇭 SimpliFaq - Demo Data SQL Script
-- This script creates demo users for both admin panel and regular application

-- First, create the plans if they don't exist
INSERT INTO plans (id, name, "displayName", description, price, currency, "maxInvoicesPerMonth", "maxClientsTotal", "maxProductsTotal", "hasEmailSupport", "hasPrioritySupport", "hasAdvancedReports", "hasApiAccess", "hasCustomBranding", "storageLimit", "hasSwissQRBill", "hasMultiCurrency", "hasMultiLanguage", "createdAt", "updatedAt")
VALUES 
  ('plan_free_001', 'free', 'Plan Gratuit', 'Parfait pour commencer avec la facturation suisse', 0.00, 'CHF', 5, 10, 5, false, false, false, false, false, 50, true, false, false, NOW(), NOW()),
  ('plan_basic_001', 'basic', 'Plan Basique', 'Idéal pour les petites entreprises et freelancers', 19.90, 'CHF', 50, 100, 50, true, false, true, false, false, 500, true, true, true, NOW(), NOW()),
  ('plan_premium_001', 'premium', 'Plan Premium', 'Solution complète pour les entreprises en croissance', 49.90, 'CHF', 500, 1000, 200, true, true, true, true, true, 2000, true, true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create admin users
-- Password hashes for: AdminSimpliFaq2024!, SupportSimpliFaq2024!, BillingSimpliFaq2024!
INSERT INTO admin_users (id, email, password, "firstName", "lastName", role, permissions, "isActive", "twoFactorEnabled", "createdAt", "updatedAt")
VALUES 
  ('admin_super_001', 'admin@simplifaq.ch', '$2b$12$rQJ8YnM9Wq7KzGx5Hn2.2eF4vL8pR3mN6sT9uA1cD7fG2hJ5kL8oP', 'Super', 'Administrateur', 'super_admin', '{"users": ["read", "write", "delete"], "subscriptions": ["read", "write", "delete"], "plans": ["read", "write", "delete"], "system": ["read", "write", "delete"], "support": ["read", "write", "delete"], "analytics": ["read"], "billing": ["read", "write", "delete"]}', true, false, NOW(), NOW()),
  ('admin_support_001', 'support@simplifaq.ch', '$2b$12$sP9mL6nK3wQ8xR5yT2eF1dG7hJ4kL8oP9rQ2sT5uA8cD1fG6hJ9mL', 'Agent', 'Support', 'support_admin', '{"users": ["read", "write"], "subscriptions": ["read"], "support": ["read", "write", "delete"], "analytics": ["read"]}', true, false, NOW(), NOW()),
  ('admin_billing_001', 'billing@simplifaq.ch', '$2b$12$tQ0nM7oL4xR9yS6zU3fG2eH8iK5lM9pQ0rS6tU9vB0cE3fH8iK2nM', 'Gestionnaire', 'Facturation', 'billing_admin', '{"users": ["read"], "subscriptions": ["read", "write"], "billing": ["read", "write", "delete"], "analytics": ["read"]}', true, false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create regular users
-- Password hashes for: DemoUser2024!, ConsultDemo2024!, TechDemo2024!
INSERT INTO users (id, email, password, "companyName", "firstName", "lastName", "vatNumber", phone, website, language, currency, "subscriptionPlan", street, city, "postalCode", country, canton, iban, "isActive", "createdAt", "updatedAt")
VALUES 
  ('user_demo_001', 'demo@chocolaterie-suisse.ch', '$2b$12$uR1oN8pM5yS0zV4wX7gH3fI9jL6mO2qR5sV8wA1dF4gI7jM0pS3uR', 'Chocolaterie Suisse SA', 'Marie', 'Dubois', 'CHE-123.456.789 TVA', '+41 22 123 45 67', 'https://www.chocolaterie-suisse-sa.ch', 'fr', 'CHF', 'free', 'Rue de la Paix 12', 'Genève', '1202', 'Switzerland', 'GE', 'CH93 0076 2011 6238 5295 7', true, NOW(), NOW()),
  ('user_demo_002', 'contact@consulting-geneve.ch', '$2b$12$vS2pO9qN6zT1aW5xY8hI4gJ0kM7nP3rS6tW9xB2eG5hJ8kN1qT4vS', 'Consulting Genève Sàrl', 'Pierre', 'Martin', 'CHE-987.654.321 TVA', '+41 22 987 65 43', 'https://www.consulting-geneve-sarl.ch', 'fr', 'CHF', 'free', 'Avenue du Léman 25', 'Genève', '1206', 'Switzerland', 'GE', 'CH93 0076 2011 7349 6406 8', true, NOW(), NOW()),
  ('user_demo_003', 'info@tech-lausanne.ch', '$2b$12$wT3qP0rO7aU2bX6yZ9iJ5hK1lN8oQ4sT7uX0cC3fH6iK9lO2rU5wT', 'Tech Solutions Lausanne SA', 'Sophie', 'Müller', 'CHE-456.123.789 TVA', '+41 21 456 78 90', 'https://www.tech-solutions-lausanne-sa.ch', 'fr', 'CHF', 'free', 'Rue du Rhône 33', 'Lausanne', '1003', 'Switzerland', 'VD', 'CH93 0076 2011 8450 7517 9', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create subscriptions for regular users
INSERT INTO subscriptions (id, "userId", "planId", status, "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "billingEmail", "invoicesThisMonth", "storageUsed", "createdAt", "updatedAt")
VALUES 
  ('sub_demo_001', 'user_demo_001', 'plan_free_001', 'active', NOW(), NOW() + INTERVAL '1 month', false, 'demo@chocolaterie-suisse.ch', 0, 0, NOW(), NOW()),
  ('sub_demo_002', 'user_demo_002', 'plan_free_001', 'active', NOW(), NOW() + INTERVAL '1 month', false, 'contact@consulting-geneve.ch', 0, 0, NOW(), NOW()),
  ('sub_demo_003', 'user_demo_003', 'plan_free_001', 'active', NOW(), NOW() + INTERVAL '1 month', false, 'info@tech-lausanne.ch', 0, 0, NOW(), NOW())
ON CONFLICT ("userId") DO NOTHING;

-- Create demo clients for the first user
INSERT INTO clients (id, "userId", "companyName", "firstName", "lastName", email, phone, street, city, "postalCode", country, canton, "vatNumber", language, "paymentTerms", "isActive", "createdAt", "updatedAt")
VALUES 
  ('client_demo_001', 'user_demo_001', 'Restaurant Le Petit Suisse', 'Jean', 'Dupont', 'contact@petitsuisse.ch', '+41 22 123 45 67', 'Rue du Marché 15', 'Genève', '1204', 'Switzerland', 'GE', 'CHE-456.789.123 TVA', 'fr', 30, true, NOW(), NOW()),
  ('client_demo_002', 'user_demo_001', 'Boutique Mode Lausanne', 'Claire', 'Moreau', 'info@modelausanne.ch', '+41 21 987 65 43', 'Avenue de la Gare 42', 'Lausanne', '1003', 'Switzerland', 'VD', NULL, 'fr', 15, true, NOW(), NOW()),
  ('client_demo_003', 'user_demo_002', 'Café Central Genève', 'Marc', 'Leroy', 'info@cafecentral.ch', '+41 22 555 12 34', 'Place du Molard 8', 'Genève', '1204', 'Switzerland', 'GE', NULL, 'fr', 30, true, NOW(), NOW()),
  ('client_demo_004', 'user_demo_003', 'Startup Innovation SA', 'Anna', 'Weber', 'contact@startup-innovation.ch', '+41 21 333 44 55', 'Rue de la Innovation 10', 'Lausanne', '1015', 'Switzerland', 'VD', 'CHE-789.123.456 TVA', 'fr', 15, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create demo products for users
INSERT INTO products (id, "userId", name, description, "unitPrice", "tvaRate", unit, "isActive", "createdAt", "updatedAt")
VALUES 
  ('product_demo_001', 'user_demo_001', 'Consultation IT Senior', 'Consultation informatique niveau senior', 180.00, 7.70, 'heure', true, NOW(), NOW()),
  ('product_demo_002', 'user_demo_001', 'Développement Web', 'Développement d''applications web sur mesure', 150.00, 7.70, 'heure', true, NOW(), NOW()),
  ('product_demo_003', 'user_demo_001', 'Formation équipe', 'Formation technique pour équipes', 120.00, 2.50, 'heure', true, NOW(), NOW()),
  ('product_demo_004', 'user_demo_002', 'Conseil stratégique', 'Conseil en stratégie d''entreprise', 200.00, 7.70, 'heure', true, NOW(), NOW()),
  ('product_demo_005', 'user_demo_002', 'Audit financier', 'Audit et analyse financière', 160.00, 7.70, 'heure', true, NOW(), NOW()),
  ('product_demo_006', 'user_demo_003', 'Développement mobile', 'Applications mobiles iOS/Android', 170.00, 7.70, 'heure', true, NOW(), NOW()),
  ('product_demo_007', 'user_demo_003', 'Support technique', 'Support et maintenance technique', 90.00, 7.70, 'heure', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create some demo invoices
INSERT INTO invoices (id, "userId", "clientId", "invoiceNumber", status, "issueDate", "dueDate", language, currency, subtotal, "tvaAmount", total, "qrReferenceType", notes, "createdAt", "updatedAt")
VALUES 
  ('invoice_demo_001', 'user_demo_001', 'client_demo_001', 'INV-2024-001', 'sent', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 'fr', 'CHF', 1440.00, 110.88, 1550.88, 'NON', 'Consultation pour mise en place système de facturation', NOW(), NOW()),
  ('invoice_demo_002', 'user_demo_001', 'client_demo_002', 'INV-2024-002', 'paid', NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days', 'fr', 'CHF', 900.00, 69.30, 969.30, 'NON', 'Formation équipe développement', NOW(), NOW()),
  ('invoice_demo_003', 'user_demo_002', 'client_demo_003', 'INV-2024-003', 'draft', NOW(), NOW() + INTERVAL '30 days', 'fr', 'CHF', 800.00, 61.60, 861.60, 'NON', 'Audit financier Q1 2024', NOW(), NOW())
ON CONFLICT ("invoiceNumber") DO NOTHING;

-- Create invoice items
INSERT INTO invoice_items (id, "invoiceId", "productId", description, quantity, "unitPrice", "tvaRate", total, "order")
VALUES 
  ('item_demo_001', 'invoice_demo_001', 'product_demo_001', 'Consultation IT Senior - Analyse système', 8.00, 180.00, 7.70, 1440.00, 1),
  ('item_demo_002', 'invoice_demo_002', 'product_demo_003', 'Formation équipe développement', 7.50, 120.00, 2.50, 900.00, 1),
  ('item_demo_003', 'invoice_demo_003', 'product_demo_005', 'Audit financier Q1 2024', 4.00, 200.00, 7.70, 800.00, 1)
ON CONFLICT (id) DO NOTHING;

-- Create some billing logs
INSERT INTO billing_logs (id, "subscriptionId", "userId", "eventType", amount, currency, status, metadata, "createdAt")
VALUES 
  ('billing_log_001', 'sub_demo_001', 'user_demo_001', 'subscription_created', 0.00, 'CHF', 'success', '{"planName": "free", "paymentMethod": "free"}', NOW()),
  ('billing_log_002', 'sub_demo_002', 'user_demo_002', 'subscription_created', 0.00, 'CHF', 'success', '{"planName": "free", "paymentMethod": "free"}', NOW()),
  ('billing_log_003', 'sub_demo_003', 'user_demo_003', 'subscription_created', 0.00, 'CHF', 'success', '{"planName": "free", "paymentMethod": "free"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create usage records for current month
INSERT INTO usage_records (id, "subscriptionId", "userId", "resourceType", quantity, period, "recordedAt")
VALUES 
  ('usage_001', 'sub_demo_001', 'user_demo_001', 'invoices', 2, TO_CHAR(NOW(), 'YYYY-MM'), NOW()),
  ('usage_002', 'sub_demo_001', 'user_demo_001', 'clients', 2, TO_CHAR(NOW(), 'YYYY-MM'), NOW()),
  ('usage_003', 'sub_demo_001', 'user_demo_001', 'products', 3, TO_CHAR(NOW(), 'YYYY-MM'), NOW()),
  ('usage_004', 'sub_demo_002', 'user_demo_002', 'invoices', 1, TO_CHAR(NOW(), 'YYYY-MM'), NOW()),
  ('usage_005', 'sub_demo_002', 'user_demo_002', 'clients', 1, TO_CHAR(NOW(), 'YYYY-MM'), NOW()),
  ('usage_006', 'sub_demo_002', 'user_demo_002', 'products', 2, TO_CHAR(NOW(), 'YYYY-MM'), NOW()),
  ('usage_007', 'sub_demo_003', 'user_demo_003', 'clients', 1, TO_CHAR(NOW(), 'YYYY-MM'), NOW()),
  ('usage_008', 'sub_demo_003', 'user_demo_003', 'products', 2, TO_CHAR(NOW(), 'YYYY-MM'), NOW())
ON CONFLICT ("subscriptionId", "resourceType", period) DO NOTHING;

-- Update subscription usage counters
UPDATE subscriptions SET "invoicesThisMonth" = 2, "storageUsed" = 15 WHERE id = 'sub_demo_001';
UPDATE subscriptions SET "invoicesThisMonth" = 1, "storageUsed" = 8 WHERE id = 'sub_demo_002';
UPDATE subscriptions SET "invoicesThisMonth" = 0, "storageUsed" = 5 WHERE id = 'sub_demo_003';

COMMIT;