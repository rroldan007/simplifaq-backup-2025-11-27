import { Prisma } from '@prisma/client';

// User types
export type User = Prisma.UserGetPayload<{}>;
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    clients: true;
    invoices: true;
    products: true;
  };
}>;

export type CreateUserInput = Prisma.UserCreateInput;
export type UpdateUserInput = Prisma.UserUpdateInput;

// Client types
export type Client = Prisma.ClientGetPayload<{}>;
export type ClientWithInvoices = Prisma.ClientGetPayload<{
  include: {
    invoices: true;
  };
}>;

export type CreateClientInput = Prisma.ClientCreateInput;
export type UpdateClientInput = Prisma.ClientUpdateInput;

// Product types
export type Product = Prisma.ProductGetPayload<{}>;
export type CreateProductInput = Prisma.ProductCreateInput;
export type UpdateProductInput = Prisma.ProductUpdateInput;

// Invoice types
export type Invoice = Prisma.InvoiceGetPayload<{}>;
export type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    items: {
      include: {
        product: true;
      };
    };
    payments: true;
  };
}>;

export type CreateInvoiceInput = Prisma.InvoiceCreateInput;
export type UpdateInvoiceInput = Prisma.InvoiceUpdateInput;

// Invoice Item types
export type InvoiceItem = Prisma.InvoiceItemGetPayload<{}>;
export type InvoiceItemWithProduct = Prisma.InvoiceItemGetPayload<{
  include: {
    product: true;
  };
}>;

export type CreateInvoiceItemInput = Prisma.InvoiceItemCreateInput;
export type UpdateInvoiceItemInput = Prisma.InvoiceItemUpdateInput;

// Payment types
export type Payment = Prisma.PaymentGetPayload<{}>;
export type CreatePaymentInput = Prisma.PaymentCreateInput;

// Session types
export type Session = Prisma.SessionGetPayload<{}>;
export type CreateSessionInput = Prisma.SessionCreateInput;

// Swiss specific types
export interface SwissAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  canton?: string;
}

export interface SwissQRBillData {
  // Creditor (Company issuing invoice)
  creditorName: string;
  creditorAddress: SwissAddress;
  creditorAccount: string; // IBAN
  
  // Payment amount
  amount: number;
  currency: 'CHF' | 'EUR';
  
  // Debtor (Client)
  debtorName?: string;
  debtorAddress?: SwissAddress;
  
  // Reference
  referenceType: 'QRR' | 'SCOR' | 'NON';
  reference?: string;
  
  // Additional information
  unstructuredMessage?: string;
  billInformation?: string;
  
  // Alternative procedures
  alternativeProcedure1?: string;
  alternativeProcedure2?: string;
}

// Swiss TVA rates
export const SWISS_TVA_RATES = {
  EXEMPT: 0.00,    // 0% - Exempt
  REDUCED: 2.60,   // 2.6% - Reduced rate (food, books, etc.)
  SPECIAL: 3.80,   // 3.8% - Special rate (accommodation)
  STANDARD: 8.10,  // 8.1% - Standard rate
} as const;

export type SwissTVARate = typeof SWISS_TVA_RATES[keyof typeof SWISS_TVA_RATES];

// Invoice status types
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];

// Payment method types
export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  CARD: 'card',
  OTHER: 'other',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Language types for Swiss market
export const SUPPORTED_LANGUAGES = {
  GERMAN: 'de',
  FRENCH: 'fr',
  ITALIAN: 'it',
  ENGLISH: 'en',
} as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[keyof typeof SUPPORTED_LANGUAGES];

// Currency types
export const SUPPORTED_CURRENCIES = {
  CHF: 'CHF',
  EUR: 'EUR',
} as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[keyof typeof SUPPORTED_CURRENCIES];

// Subscription plan types
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
} as const;

export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS];

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}