-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "tvaRate" REAL NOT NULL,
    "total" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "lineDiscountValue" REAL,
    "lineDiscountType" TEXT,
    "lineDiscountSource" TEXT NOT NULL DEFAULT 'NONE',
    "subtotalBeforeDiscount" REAL,
    "discountAmount" REAL,
    "subtotalAfterDiscount" REAL,
    CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_invoice_items" ("description", "id", "invoiceId", "order", "productId", "quantity", "total", "tvaRate", "unitPrice") SELECT "description", "id", "invoiceId", "order", "productId", "quantity", "total", "tvaRate", "unitPrice" FROM "invoice_items";
DROP TABLE "invoice_items";
ALTER TABLE "new_invoice_items" RENAME TO "invoice_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
