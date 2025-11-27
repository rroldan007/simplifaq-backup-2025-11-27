import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  try {
    // Ensure database connection
    await prisma.$connect();
    
    // Run database migrations for test database
    if (process.env.NODE_ENV === 'test') {
      // For SQLite test database, we need to push the schema
      await prisma.$executeRaw`PRAGMA foreign_keys = ON;`;
    }
  } catch (error) {
    console.error('Failed to setup test database:', error);
    // Don't fail tests if database is not available
    // This allows tests to run in CI environments without database
  }
});

afterAll(async () => {
  try {
    // Clean up and disconnect
    await prisma.$disconnect();
  } catch (error) {
    console.error('Failed to disconnect from test database:', error);
  }
});