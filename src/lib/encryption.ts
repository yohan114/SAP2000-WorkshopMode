import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    return Buffer.from(key, 'hex');
  }
  // For development, use a derived key from a secret
  const secret = process.env.NEXTAUTH_SECRET || 'default-secret-key-for-development';
  return crypto.scryptSync(secret, 'salt', 32);
}

/**
 * Encrypt a sensitive value
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Derive key with salt
  const derivedKey = crypto.scryptSync(key, salt, 32);
  
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: salt:iv:authTag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a sensitive value
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted value format');
    }
    
    const [saltHex, ivHex, authTagHex, encrypted] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Derive key with salt
    const derivedKey = crypto.scryptSync(key, salt, 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt value');
  }
}

/**
 * Hash a value (one-way, for passwords, etc.)
 */
export function hash(value: string, salt?: string): string {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(value, useSalt, 100000, 64, 'sha512');
  return `${useSalt}:${hash.toString('hex')}`;
}

/**
 * Verify a hashed value
 */
export function verifyHash(value: string, hashedValue: string): boolean {
  try {
    const [salt] = hashedValue.split(':');
    const newHash = hash(value, salt);
    return newHash === hashedValue;
  } catch {
    return false;
  }
}

/**
 * Mask a sensitive value for display
 */
export function mask(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars) {
    return '****';
  }
  return value.slice(0, visibleChars) + '*'.repeat(Math.min(value.length - visibleChars, 12));
}

/**
 * Encrypt object fields
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as T[keyof T];
    }
  }
  return result;
}

/**
 * Decrypt object fields
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field] as string) as T[keyof T];
      } catch {
        // If decryption fails, the value might not be encrypted
        // Leave it as is
      }
    }
  }
  return result;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure API key
 */
export function generateApiKey(prefix: string = 'wcp'): string {
  const key = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Constant-time string comparison (for security)
 */
export function secureCompare(a: string, b: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Encrypted field wrapper for Prisma
 */
export const EncryptedField = {
  /**
   * Before saving: encrypt the value
   */
  beforeSave: (value: string | null | undefined): string | null => {
    if (!value) return null;
    return encrypt(value);
  },
  
  /**
   * After reading: decrypt the value
   */
  afterRead: (value: string | null | undefined): string | null => {
    if (!value) return null;
    try {
      return decrypt(value);
    } catch {
      return value; // Return as-is if not encrypted
    }
  },
};

/**
 * Field encryption configuration for the application
 */
export const SENSITIVE_FIELDS = {
  Supplier: ['bankAccount', 'taxId'],
  User: ['phone', 'nationalId'],
  PurchaseOrder: ['approvalNotes'],
  Invoice: ['paymentRef'],
} as const;

export type SensitiveEntityType = keyof typeof SENSITIVE_FIELDS;
