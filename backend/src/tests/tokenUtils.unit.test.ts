import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { 
  generateRefreshToken, 
  generateAccessToken, 
  generateTokenPair, 
  verifyAccessToken, 
  isTokenExpiringSoon 
} from '../utils/tokenUtils';
import jwt from 'jsonwebtoken';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '15m';

describe('Token Utils Unit Tests', () => {
  const testUserId = 'test-user-id';
  const testEmail = 'test@example.com';

  describe('generateRefreshToken', () => {
    it('should generate a random hex string', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      expect(token1).toHaveLength(128); // 64 bytes * 2 (hex)
      expect(token2).toHaveLength(128);
      expect(token1).not.toBe(token2); // Should be different each time
      expect(/^[a-f0-9]+$/i.test(token1)).toBe(true); // Should be hex
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const result = generateAccessToken(testUserId, testEmail);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify token can be decoded
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
    });

    it('should set correct expiration time', () => {
      const beforeGeneration = new Date();
      const result = generateAccessToken(testUserId, testEmail);
      const afterGeneration = new Date();

      // Should expire in approximately 15 minutes
      const expectedExpiration = new Date(beforeGeneration.getTime() + 15 * 60 * 1000);
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiration.getTime());
      
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds tolerance
      expect(result.expiresAt.getTime()).toBeGreaterThan(afterGeneration.getTime());
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const result = generateTokenPair(testUserId, testEmail);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('accessExpiresAt');
      expect(result).toHaveProperty('refreshExpiresAt');

      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.accessExpiresAt).toBeInstanceOf(Date);
      expect(result.refreshExpiresAt).toBeInstanceOf(Date);

      // Refresh token should expire after access token
      expect(result.refreshExpiresAt.getTime()).toBeGreaterThan(result.accessExpiresAt.getTime());
    });

    it('should generate unique refresh tokens each time', () => {
      const result1 = generateTokenPair(testUserId, testEmail);
      const result2 = generateTokenPair(testUserId, testEmail);

      // Refresh tokens should always be unique (they're random)
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
      
      // Access tokens might be the same if generated at the same second,
      // but that's okay since they have different refresh tokens
      expect(result1.refreshToken).toHaveLength(128);
      expect(result2.refreshToken).toHaveLength(128);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid tokens', () => {
      const { accessToken } = generateTokenPair(testUserId, testEmail);
      const decoded = verifyAccessToken(accessToken);

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');
    });

    it('should throw error for invalid tokens', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
      expect(() => verifyAccessToken('')).toThrow();
    });

    it('should throw error for expired tokens', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUserId, email: testEmail },
        process.env.JWT_SECRET!,
        { expiresIn: '-1m' } // Expired 1 minute ago
      );

      expect(() => verifyAccessToken(expiredToken)).toThrow('jwt expired');
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('should return true for tokens expiring within threshold', () => {
      const now = new Date();
      const expiresIn3Minutes = new Date(now.getTime() + 3 * 60 * 1000);
      const expiresIn10Minutes = new Date(now.getTime() + 10 * 60 * 1000);

      expect(isTokenExpiringSoon(expiresIn3Minutes, 5)).toBe(true);
      expect(isTokenExpiringSoon(expiresIn10Minutes, 5)).toBe(false);
    });

    it('should return false for tokens with plenty of time left', () => {
      const now = new Date();
      const expiresIn30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

      expect(isTokenExpiringSoon(expiresIn30Minutes, 5)).toBe(false);
      expect(isTokenExpiringSoon(expiresIn30Minutes, 15)).toBe(false);
    });

    it('should return true for already expired tokens', () => {
      const now = new Date();
      const expiredToken = new Date(now.getTime() - 5 * 60 * 1000);

      expect(isTokenExpiringSoon(expiredToken, 5)).toBe(true);
    });

    it('should use default threshold of 5 minutes', () => {
      const now = new Date();
      const expiresIn3Minutes = new Date(now.getTime() + 3 * 60 * 1000);
      const expiresIn7Minutes = new Date(now.getTime() + 7 * 60 * 1000);

      expect(isTokenExpiringSoon(expiresIn3Minutes)).toBe(true);
      expect(isTokenExpiringSoon(expiresIn7Minutes)).toBe(false);
    });
  });

  describe('Token Integration', () => {
    it('should create tokens that work together', () => {
      const tokenPair = generateTokenPair(testUserId, testEmail);
      const decoded = verifyAccessToken(tokenPair.accessToken);

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);

      // Check expiration logic
      const isExpiring = isTokenExpiringSoon(tokenPair.accessExpiresAt, 20); // 20 minute threshold
      expect(isExpiring).toBe(true); // 15-minute token should be expiring within 20 minutes
    });
  });
});