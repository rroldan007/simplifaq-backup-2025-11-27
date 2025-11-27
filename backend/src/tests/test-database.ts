/**
 * Test database configuration
 */

import { PrismaClient } from '@prisma/client';

// Create a separate Prisma client for tests with explicit configuration
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://roberto@localhost:5432/simplifaq_test"
    }
  },
  log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error']
});

// Helper function to setup test database
export async function setupTestDatabase() {
  try {
    await testPrisma.$connect();
    
    // Clean up existing test data
    await testPrisma.session.deleteMany({});
    await testPrisma.invoiceItem.deleteMany({});
    await testPrisma.invoice.deleteMany({});
    await testPrisma.product.deleteMany({});
    await testPrisma.client.deleteMany({});
    await testPrisma.user.deleteMany({});
    
    return true;
  } catch (error) {
    console.warn('Test database not available:', error);
    return false;
  }
}

// Helper function to cleanup test database
export async function cleanupTestDatabase() {
  try {
    await testPrisma.session.deleteMany({});
    await testPrisma.invoiceItem.deleteMany({});
    await testPrisma.invoice.deleteMany({});
    await testPrisma.product.deleteMany({});
    await testPrisma.client.deleteMany({});
    await testPrisma.user.deleteMany({});
    await testPrisma.$disconnect();
  } catch (error) {
    console.warn('Error cleaning up test database:', error);
  }
}