/*
  Warnings:

  - A unique constraint covering the columns `[invoiceNumber,userId]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "invoices_invoiceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_userId_key" ON "invoices"("invoiceNumber", "userId");
