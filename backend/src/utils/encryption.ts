import crypto from 'crypto';

/**
 * Encryption utility for sensitive SMTP credentials
 * Uses AES-256-CBC encryption with a secret key from environment
 */

// Encryption algorithm
const ALGORITHM = 'aes-256-cbc';

// Get encryption key from environment or generate one
// IMPORTANT: In production, this MUST be set in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Ensure key is 32 bytes (256 bits) for AES-256
const KEY = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');

/**
 * Encrypt a string value (e.g., SMTP password, API key)
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  try {
    if (!text) {
      throw new Error('Text to encrypt cannot be empty');
    }

    // Generate random initialization vector (IV)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV and encrypted data separated by ':'
    // We need the IV to decrypt later
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 * @param encryptedText - Encrypted string in format: iv:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      throw new Error('Invalid encrypted text format');
    }

    // Split IV and encrypted data
    const [ivHex, encryptedData] = encryptedText.split(':');

    if (!ivHex || !encryptedData) {
      throw new Error('Invalid encrypted text format');
    }

    // Convert IV from hex to buffer
    const iv = Buffer.from(ivHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random encryption key
 * Use this to generate ENCRYPTION_KEY for your .env file
 * @returns 32-byte hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a value using SHA-256 (one-way hashing, cannot be decrypted)
 * Useful for storing non-reversible sensitive data
 * @param text - Text to hash
 * @returns Hashed string
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Verify if a text matches a hash
 * @param text - Plain text to verify
 * @param hashedText - Hash to compare against
 * @returns True if text matches hash
 */
export function verifyHash(text: string, hashedText: string): boolean {
  const textHash = hash(text);
  return textHash === hashedText;
}

// Export for testing/setup purposes
export const encryptionUtils = {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hash,
  verifyHash,
};
