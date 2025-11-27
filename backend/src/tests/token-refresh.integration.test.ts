import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index';
import { generateTokenPair } from '../utils/tokenUtils';

const prisma = new PrismaClient();

describe('Token Refresh Integration Tests', () => {
  let testUser: any;
  let validRefreshToken: string;
  let validAccessToken: string;
  let expiredRefreshToken: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.session.deleteMany({
      where: {
        user: {
          email: 'refresh-test@example.com'
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: 'refresh-test@example.com'
      }
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'refresh-test@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', // hashed 'password123'
        companyName: 'Test Company',
        firstName: 'Test',
        lastName: 'User',
        street: 'Test Street 1',
        city: 'Lausanne',
        postalCode: '1000',
        country: 'Switzerland',
        canton: 'VD',
      },
    });

    // Generate valid token pair
    const tokenPair = generateTokenPair(testUser.id, testUser.email);
    validAccessToken = tokenPair.accessToken;
    validRefreshToken = tokenPair.refreshToken;

    // Create session with valid tokens
    await prisma.session.create({
      data: {
        userId: testUser.id,
        token: validAccessToken,
        refreshToken: validRefreshToken,
        expiresAt: tokenPair.accessExpiresAt,
        refreshExpiresAt: tokenPair.refreshExpiresAt,
      },
    });

    // Create expired refresh token session
    const expiredTokenPair = generateTokenPair(testUser.id, testUser.email);
    expiredRefreshToken = expiredTokenPair.refreshToken;
    
    await prisma.session.create({
      data: {
        userId: testUser.id,
        token: expiredTokenPair.accessToken,
        refreshToken: expiredRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expired access token
        refreshExpiresAt: new Date(Date.now() - 1000), // Expired refresh token
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.session.deleteMany({
      where: {
        userId: testUser.id
      }
    });
    await prisma.user.delete({
      where: {
        id: testUser.id
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/refresh', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresAt');
      
      // Verify new tokens are different from old ones
      expect(response.body.data.token).not.toBe(validAccessToken);
      expect(response.body.data.refreshToken).not.toBe(validRefreshToken);

      // Verify session was updated in database
      const updatedSession = await prisma.session.findUnique({
        where: { refreshToken: response.body.data.refreshToken }
      });
      expect(updatedSession).toBeTruthy();
      expect(updatedSession?.token).toBe(response.body.data.token);
    });

    it('should return 400 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
      expect(response.body.error.message).toBe('Token de rafraîchissement requis');
    });

    it('should return 401 when refresh token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
      expect(response.body.error.message).toBe('Token de rafraîchissement invalide');
    });

    it('should return 401 when refresh token is expired', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredRefreshToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_TOKEN_EXPIRED');
      expect(response.body.error.message).toBe('Token de rafraîchissement expiré');

      // Verify expired session was deleted
      const deletedSession = await prisma.session.findUnique({
        where: { refreshToken: expiredRefreshToken }
      });
      expect(deletedSession).toBeNull();
    });

    it('should return 401 when user account is disabled', async () => {
      // Disable user account
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_DISABLED');
      expect(response.body.error.message).toBe('Compte désactivé');

      // Re-enable user account for other tests
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: true }
      });
    });

    it('should handle concurrent refresh requests properly', async () => {
      // Create a fresh session for this test
      const freshTokenPair = generateTokenPair(testUser.id, testUser.email);
      await prisma.session.create({
        data: {
          userId: testUser.id,
          token: freshTokenPair.accessToken,
          refreshToken: freshTokenPair.refreshToken,
          expiresAt: freshTokenPair.accessExpiresAt,
          refreshExpiresAt: freshTokenPair.refreshExpiresAt,
        },
      });

      // Make two concurrent refresh requests
      const [response1, response2] = await Promise.all([
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: freshTokenPair.refreshToken }),
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: freshTokenPair.refreshToken })
      ]);

      // One should succeed, one should fail (due to token rotation)
      const responses = [response1, response2];
      const successfulResponses = responses.filter(r => r.status === 200);
      const failedResponses = responses.filter(r => r.status === 401);

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(1);
      expect(failedResponses[0].body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should validate new access token can be used for authenticated requests', async () => {
      // Get new tokens
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      const newAccessToken = refreshResponse.body.data.token;

      // Use new access token to make authenticated request
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.id).toBe(testUser.id);
      expect(profileResponse.body.data.user.email).toBe(testUser.email);
    });

    it('should invalidate old access token after refresh', async () => {
      // Create a fresh session for this test
      const freshTokenPair = generateTokenPair(testUser.id, testUser.email);
      await prisma.session.create({
        data: {
          userId: testUser.id,
          token: freshTokenPair.accessToken,
          refreshToken: freshTokenPair.refreshToken,
          expiresAt: freshTokenPair.accessExpiresAt,
          refreshExpiresAt: freshTokenPair.refreshExpiresAt,
        },
      });

      const oldAccessToken = freshTokenPair.accessToken;

      // Refresh tokens
      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: freshTokenPair.refreshToken
        })
        .expect(200);

      // Try to use old access token - should fail
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${oldAccessToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SESSION');
    });
  });

  describe('Security Logging', () => {
    it('should log successful token refresh attempts', async () => {
      // This test would verify that security events are logged
      // In a real implementation, you might check log files or a logging service
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // In a real test, you would verify the log entry was created
    });

    it('should log failed token refresh attempts', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      // In a real test, you would verify the security log entry was created
    });
  });

  describe('Session Extension', () => {
    it('should extend session expiration when refreshing', async () => {
      // Get current session
      const currentSession = await prisma.session.findUnique({
        where: { refreshToken: validRefreshToken }
      });
      
      const oldExpiresAt = currentSession?.expiresAt;
      const oldRefreshExpiresAt = currentSession?.refreshExpiresAt;

      // Wait a moment to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh tokens
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        })
        .expect(200);

      // Get updated session
      const updatedSession = await prisma.session.findUnique({
        where: { refreshToken: response.body.data.refreshToken }
      });

      // Verify expiration times were extended
      expect(updatedSession?.expiresAt.getTime()).toBeGreaterThan(oldExpiresAt?.getTime() || 0);
      expect(updatedSession?.refreshExpiresAt.getTime()).toBeGreaterThan(oldRefreshExpiresAt?.getTime() || 0);
    });
  });
});