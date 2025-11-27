import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a test JWT token for authentication
 */
export function generateTestToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({ userId }, secret, { expiresIn: '1h' });
}

/**
 * Create a test user for testing purposes
 */
export async function createTestUser(overrides: Partial<any> = {}) {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Company SA',
    street: '123 Test Street',
    city: 'Lausanne',
    postalCode: '1000',
    country: 'Switzerland',
    canton: 'VD',
    iban: 'CH9300762011623852957',
    ...overrides,
  };

  return await prisma.user.create({
    data: defaultUser,
  });
}

/**
 * Create a test client for testing purposes
 */
export async function createTestClient(userId: string, overrides: Partial<any> = {}) {
  const defaultClient = {
    companyName: 'Test Client SA',
    email: `client-${Date.now()}@example.com`,
    phone: '+41 21 123 45 67',
    street: '123 Test Street',
    city: 'Lausanne',
    postalCode: '1000',
    country: 'Switzerland',
    canton: 'VD',
    vatNumber: 'CHE-123.456.789 TVA',
    userId,
    ...overrides,
  };

  return await prisma.client.create({
    data: defaultClient,
  });
}

/**
 * Create a test product for testing purposes
 */
export async function createTestProduct(userId: string, overrides: Partial<any> = {}) {
  const defaultProduct = {
    name: 'Test Product',
    description: 'Test product description',
    unitPrice: 100.00,
    tvaRate: 8.10,
    userId,
    ...overrides,
  };

  return await prisma.product.create({
    data: defaultProduct,
  });
}

/**
 * Create a test invoice for testing purposes
 */
export async function createTestInvoice(userId: string, clientId: string, overrides: Partial<any> = {}) {
  const defaultInvoice = {
    invoiceNumber: `INV-${Date.now()}`,
    clientId,
    userId,
    subtotal: 1000.00,
    tvaAmount: 81.00,
    total: 1081.00,
    currency: 'CHF',
    status: 'draft',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    items: {
      create: [
        {
          description: 'Test Service',
          quantity: 1,
          unitPrice: 1000.00,
          tvaRate: 8.10,
          total: 1000.00,
          order: 0,
        },
      ],
    },
    ...overrides,
  };

  return await prisma.invoice.create({
    data: defaultInvoice,
    include: {
      items: true,
      client: true,
    },
  });
}

/**
 * Clean up test data for a specific user
 */
export async function cleanupTestUser(userId: string) {
  // Delete in correct order to respect foreign key constraints
  await prisma.invoice.deleteMany({ where: { userId } });
  await prisma.client.deleteMany({ where: { userId } });
  await prisma.product.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Generate Swiss test data
 */
export const swissTestData = {
  validIBANs: [
    'CH93 0076 2011 6238 5295 7',
    'CH9300762011623852957',
    'CH56 0483 5012 3456 7800 9',
    'CH5604835012345678009',
  ],
  invalidIBANs: [
    'CH93 0076 2011 6238 5295 8', // Wrong check digits
    'DE89 3704 0044 0532 0130 00', // German IBAN
    'CH93 0076 2011 6238 529', // Too short
    'CH93 0076 2011 6238 5295 78', // Too long
  ],
  validPostalCodes: ['1000', '8001', '3000', '1234', '9999'],
  invalidPostalCodes: ['100', '12345', 'ABCD', '12A4'],
  validCantons: ['VD', 'GE', 'ZH', 'BE', 'TI', 'AG', 'BL', 'BS', 'FR', 'GL', 'GR', 'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'UR', 'VS', 'ZG'],
  invalidCantons: ['XX', 'ABC', '12'],
  validTVANumbers: [
    'CHE-123.456.789 TVA',
    'CHE-123.456.789 MWST',
    'CHE-123.456.789 IVA',
    'CHE-123456789 TVA',
    'CHE123456789TVA',
  ],
  invalidTVANumbers: [
    'CHE-123.456.78 TVA', // Too short
    'CHE-123.456.7890 TVA', // Too long
    'DE-123.456.789 TVA', // Wrong country code
    'CHE-123.456.789', // Missing TVA suffix
    'CHE-123.456.789 VAT', // Wrong suffix
  ],
  validPhoneNumbers: [
    '+41 21 123 45 67',
    '+41 22 987 65 43',
    '+41 44 123 45 67',
    '+41 31 123 45 67',
  ],
  invalidPhoneNumbers: [
    '123-456-7890',
    '+1 555 123 4567',
    '021 123 45 67', // Missing country code
    '+41 21 123 456', // Too short
  ],
};

/**
 * Mock Swiss QR Bill data for testing
 */
export const mockQRBillData = {
  creditor: {
    name: 'Test Company SA',
    addressLine1: '123 Test Street',
    postalCode: '1000',
    city: 'Lausanne',
    country: 'CH',
  },
  creditorAccount: 'CH9300762011623852957',
  amount: 1000.50,
  currency: 'CHF' as const,
  referenceType: 'NON' as const,
  unstructuredMessage: 'Invoice payment',
  debtor: {
    name: 'Test Client SA',
    addressLine1: '456 Client Street',
    postalCode: '1001',
    city: 'Lausanne',
    country: 'CH',
  },
};

/**
 * Mock invoice data for testing
 */
export const mockInvoiceData = {
  number: 'INV-2024-001',
  clientName: 'Test Client SA',
  clientAddress: {
    street: '456 Client Street',
    city: 'Lausanne',
    postalCode: '1001',
    country: 'CH',
    canton: 'VD',
  },
  creditorName: 'Test Company SA',
  creditorAddress: {
    street: '123 Test Street',
    city: 'Lausanne',
    postalCode: '1000',
    country: 'CH',
    canton: 'VD',
  },
  creditorIBAN: 'CH9300762011623852957',
  amount: 1000.50,
  currency: 'CHF' as const,
  dueDate: new Date('2024-12-31'),
  items: [
    {
      description: 'Consultation service',
      quantity: 10,
      unitPrice: 100.05,
      amount: 1000.50,
      tvaCategory: 'STANDARD' as const,
    },
  ],
  tvaBreakdown: {
    standard: 77.04,
    reduced: 0,
    special: 0,
    exempt: 0,
  },
  totalNet: 1000.50,
  totalTVA: 77.04,
  totalGross: 1077.54,
};

/**
 * Wait for a specified amount of time (useful for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random string for testing
 */
export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random email for testing
 */
export function randomEmail(): string {
  return `test-${randomString(8)}@example.com`;
}

/**
 * Generate a random Swiss postal code for testing
 */
export function randomSwissPostalCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a random Swiss canton for testing
 */
export function randomSwissCanton(): string {
  const cantons = swissTestData.validCantons;
  return cantons[Math.floor(Math.random() * cantons.length)];
}

/**
 * Setup test database (placeholder for now)
 */
export async function setupTestDatabase() {
  // In a real implementation, you might set up a test database
  // For now, we'll use the existing database with cleanup
  console.log('Setting up test database...');
}

/**
 * Cleanup test database (placeholder for now)
 */
export async function cleanupTestDatabase() {
  // Clean up test data
  console.log('Cleaning up test database...');
}

/**
 * Create a test admin user
 */
export async function createTestAdmin(overrides: Partial<any> = {}) {
  const defaultAdmin = {
    email: `admin-${Date.now()}@example.com`,
    password: 'hashedpassword',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'super_admin',
    permissions: {
      users: { read: true, write: true },
      communication: { read: true, write: true },
      support: { read: true, write: true },
    },
    isActive: true,
    ...overrides,
  };

  return await prisma.adminUser.create({
    data: defaultAdmin,
  });
}

export default {
  generateTestToken,
  createTestUser,
  createTestClient,
  createTestProduct,
  createTestInvoice,
  cleanupTestUser,
  setupTestDatabase,
  cleanupTestDatabase,
  createTestAdmin,
  swissTestData,
  mockQRBillData,
  mockInvoiceData,
  wait,
  randomString,
  randomEmail,
  randomSwissPostalCode,
  randomSwissCanton,
};