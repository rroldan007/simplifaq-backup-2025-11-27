import { User } from '@prisma/client';

// This file centralizes all modifications to the Express Request interface.
// By declaring it once in a global scope, we avoid conflicts and ensure consistency.

type AdminUser = {
  id: string;
  role: string;
  email: string;
  permissions: any;
  isAdmin: boolean;
  canton?: string;
};

declare global {
  namespace Express {
    interface Request {
      // Attach the user object (normal or admin) to the request after authentication.
      user?: (Omit<User, 'password'> & { isAdmin: boolean }) | AdminUser | null;

      // Tenant context information added by the tenantContext middleware.
      tenantId?: string;
      tenantContext?: {
        userId: string;
        companyName: string;
        subscriptionPlan: string;
        isActive: boolean;
      };

      // Tenant-specific configuration.
      tenantConfig?: Record<string, any>;

      // The JWT token from the request.
      token?: string;

      // Information about usage limits, added by the usageLimit middleware.
      usageInfo?: {
        subscriptionId: string;
        resourceType: 'invoices' | 'clients' | 'products' | 'storage' | 'quotes';
        currentUsage: number;
        limit: number;
      };

      // Detailed subscription info, added by the usageLimit middleware.
      subscription?: {
        id: string;
        planName: string;
        status: string;
        features: Record<string, boolean>;
        limits: Record<string, number>;
      };

      // File uploads via multer.
      file?: Express.Multer.File;
      
      // Feature flags added by the featureFlags middleware.
      featureFlags?: {
        isNewInvoiceSystemEnabled: boolean;
        getInvoiceTemplate: (preferredTemplate?: string) => string;
        shouldUsePuppeteer: boolean;
        features: {
          recurringInvoices: boolean;
          invoiceDiscounts: boolean;
          multiCurrency: boolean;
          onlinePayments: boolean;
          dynamicTvaRates: boolean;
        };
        tvaRates: {
          isEnabled: boolean;
          defaultCanton: string;
          currentCanton: string;
          getCantons: () => any[];
          getRates: (cantonCode?: string) => any[];
          getDefaultRate: (rateType?: 'normal' | 'reduced' | 'special', cantonCode?: string) => number;
        };
        isEnabled: (path: string) => boolean;
        getValue: <T>(path: string, defaultValue: T) => T;
      };
    }
  }
}
