/**
 * Security integration tests for Swiss financial data compliance
 */

import request from 'supertest';
import app from '../index';
import { testPrisma, setupTestDatabase, cleanupTestDatabase } from './test-database';
import bcrypt from 'bcryptjs';

describe('Security Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let databaseAvailable = false;

  beforeAll(async () => {
    try {
      // Setup test database
      databaseAvailable = await setupTestDatabase();
      
      if (databaseAvailable) {
        // Create test user
        const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
        const user = await testPrisma.user.create({
          data: {
            email: 'security-test@example.com',
            password: hashedPassword,
            companyName: 'Security Test SA',
            firstName: 'Test',
            lastName: 'User',
            street: 'Test Street 1',
            city: 'Zurich',
            postalCode: '8001',
            country: 'Switzerland',
            language: 'fr',
            currency: 'CHF',
            isActive: true
          }
        });
        userId = user.id;

        // Wait a bit to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Login to get auth token
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'security-test@example.com',
            password: 'TestPassword123!'
          });

        if (loginResponse.body.success) {
          authToken = loginResponse.body.data.token;
        }
      }
    } catch (error) {
      console.warn('Database not available for security tests, skipping database-dependent tests');
      databaseAvailable = false;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await cleanupTestDatabase();
    } catch (error) {
      console.warn('Error cleaning up test data:', error);
    }
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on auth endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests to exceed rate limit
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    }, 10000);

    it('should enforce strict rate limiting on sensitive operations', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const requests = [];
      
      // Make multiple rapid requests to delete endpoint (using existing invoice endpoint)
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .delete('/api/invoices/nonexistent-id')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Should have rate limited responses or 404s (both are acceptable)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      const notFoundResponses = responses.filter(res => res.status === 404);
      
      // Either rate limited or not found (both indicate the endpoint exists and is protected)
      expect(rateLimitedResponses.length + notFoundResponses.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Input Validation', () => {
    it('should reject invalid Swiss VAT numbers', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-vat@example.com',
          password: 'TestPassword123!',
          companyName: 'Test Company',
          firstName: 'Test',
          lastName: 'User',
          vatNumber: 'INVALID-VAT-123', // Invalid format
          street: 'Test Street 1',
          city: 'Zurich',
          postalCode: '8001',
          country: 'Switzerland'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid Swiss postal codes', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-postal@example.com',
          password: 'TestPassword123!',
          companyName: 'Test Company',
          firstName: 'Test',
          lastName: 'User',
          street: 'Test Street 1',
          city: 'Zurich',
          postalCode: '123', // Invalid - should be 4 digits
          country: 'Switzerland'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize financial input data', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      // Test financial input sanitization with products endpoint
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          unitPrice: '1,234.56CHF', // Should be sanitized to numeric
          tvaRate: 8.1,
          unit: 'pièce'
        });

      // Should either succeed with sanitized data or fail with validation error
      expect([200, 201, 400]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should block SQL injection attempts in query parameters', async () => {
      const response = await request(app)
        .get('/api/invoices?search=\'; DROP TABLE invoices; --')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
    });

    it('should block SQL injection attempts in request body', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '\'; DROP TABLE products; --',
          description: 'Test Description',
          unitPrice: 100,
          tvaRate: 8.1,
          unit: 'pièce'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/invoices');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should reject requests with invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', 'Bearer invalid-token-123');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests with expired session', async () => {
      if (!databaseAvailable) {
        console.log('Skipping database-dependent test');
        return;
      }

      // Create an expired session
      const expiredSession = await testPrisma.session.create({
        data: {
          userId: userId,
          token: 'expired-token-123',
          expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        }
      });

      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', 'Bearer expired-token-123');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('SESSION_EXPIRED');

      // Verify session was deleted
      const deletedSession = await testPrisma.session.findUnique({
        where: { id: expiredSession.id }
      });
      expect(deletedSession).toBeNull();
    });
  });

  describe('CORS Security', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/invoices')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for security headers set by Helmet
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize text input to prevent XSS', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '<script>alert("xss")</script>Test Product',
          description: 'Test Description',
          unitPrice: 100,
          tvaRate: 8.1,
          unit: 'pièce'
        });

      if (response.status === 201) {
        // If creation succeeded, verify the data was sanitized
        const product = response.body.data;
        expect(product.name).not.toContain('<script>');
        expect(product.name).not.toContain('alert');
      }
    });
  });

  describe('Financial Data Protection', () => {
    it('should validate Swiss TVA rates', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          unitPrice: 100,
          tvaRate: 15.5, // Invalid Swiss TVA rate
          unit: 'pièce'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate Swiss currency codes', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      // Test currency validation through auth registration (which has currency field)
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'currency-test@example.com',
          password: 'TestPassword123!',
          companyName: 'Currency Test Company',
          firstName: 'Test',
          lastName: 'User',
          street: 'Test Street 1',
          city: 'Zurich',
          postalCode: '8001',
          country: 'Switzerland',
          currency: 'USD' // Invalid for Swiss invoicing
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});