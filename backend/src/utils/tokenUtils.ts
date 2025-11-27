import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Generate a secure random refresh token
 */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId: string, email: string): { token: string; expiresAt: Date } => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access token
  const token = jwt.sign(
    { userId, email },
    jwtSecret,
    { expiresIn } as SignOptions
  );

  // Calculate expiration date
  const expiresAt = new Date();
  if (expiresIn.endsWith('m')) {
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(expiresIn));
  } else if (expiresIn.endsWith('h')) {
    expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
  } else if (expiresIn.endsWith('d')) {
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
  } else {
    // Default to 15 minutes if format is unclear
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  }

  return { token, expiresAt };
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId: string, email: string): TokenPair => {
  const { token: accessToken, expiresAt: accessExpiresAt } = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken();
  
  // Refresh token expires in 7 days
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
};

/**
 * Verify and decode JWT token
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.verify(token, jwtSecret) as JwtPayload;
};

/**
 * Check if a token is expiring soon (within threshold minutes)
 */
export const isTokenExpiringSoon = (expiresAt: Date, thresholdMinutes: number = 5): boolean => {
  const now = new Date();
  const threshold = new Date(now.getTime() + thresholdMinutes * 60 * 1000);
  return expiresAt <= threshold;
};