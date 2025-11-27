-- Script para actualizar usuarios existentes con mejores defaults de numeración
-- Ejecutar DESPUÉS de la migración de Prisma

-- Actualizar usuarios que tienen invoicePrefix NULL o vacío
UPDATE users 
SET invoicePrefix = 'FAC'
WHERE invoicePrefix IS NULL OR invoicePrefix = '';

-- Actualizar usuarios que tienen invoicePadding en 0
UPDATE users
SET invoicePadding = 3
WHERE invoicePadding = 0;

-- Actualizar usuarios que tienen quotePrefix NULL o vacío
UPDATE users
SET quotePrefix = 'DEV'
WHERE quotePrefix IS NULL OR quotePrefix = '';

-- Actualizar usuarios que tienen quotePadding en 0
UPDATE users
SET quotePadding = 3
WHERE quotePadding = 0;

-- Verificar los cambios
SELECT 
  id,
  email,
  invoicePrefix,
  invoicePadding,
  nextInvoiceNumber,
  quotePrefix,
  quotePadding,
  nextQuoteNumber
FROM users;
