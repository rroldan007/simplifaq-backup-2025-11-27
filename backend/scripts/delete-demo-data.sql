-- 🇨🇭 SimpliFaq - Delete Demo Data SQL Script
-- This script removes only the data created by demo-data.sql

BEGIN;

-- Deleting records from child tables first to avoid foreign key violations

-- Invoice Items
DELETE FROM invoice_items WHERE id IN ('item_demo_001', 'item_demo_002', 'item_demo_003');

-- Invoices
DELETE FROM invoices WHERE id IN ('invoice_demo_001', 'invoice_demo_002', 'invoice_demo_003');

-- Billing Logs
DELETE FROM billing_logs WHERE id IN ('billing_log_001', 'billing_log_002', 'billing_log_003');

-- Usage Records
DELETE FROM usage_records WHERE id IN ('usage_001', 'usage_002', 'usage_003', 'usage_004', 'usage_005', 'usage_006', 'usage_007', 'usage_008');

-- Products
DELETE FROM products WHERE id IN ('product_demo_001', 'product_demo_002', 'product_demo_003', 'product_demo_004', 'product_demo_005', 'product_demo_006', 'product_demo_007');

-- Clients
DELETE FROM clients WHERE id IN ('client_demo_001', 'client_demo_002', 'client_demo_003', 'client_demo_004');

-- Subscriptions
DELETE FROM subscriptions WHERE id IN ('sub_demo_001', 'sub_demo_002', 'sub_demo_003');

-- Regular Users
DELETE FROM users WHERE id IN ('user_demo_001', 'user_demo_002', 'user_demo_003');

-- Admin Users
DELETE FROM admin_users WHERE id IN ('admin_super_001', 'admin_support_001', 'admin_billing_001');

COMMIT;
