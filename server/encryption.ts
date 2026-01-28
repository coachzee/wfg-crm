import crypto from "crypto";

// SECURITY: Encryption key is required - no default fallback
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// New algorithm: AES-256-GCM (authenticated encryption)
const ALGORITHM_GCM = "aes-256-gcm";
// Legacy algorithm for backward compatibility
const ALGORITHM_CBC = "aes-256-cbc";

// GCM constants
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derive a 32-byte key from the encryption key using SHA-256.
 * Throws if ENCRYPTION_KEY is not set.
 */
function getKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.trim() === "") {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. " +
      "Set a secure key (minimum 16 characters) in your environment."
    );
  }
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt a credential using AES-256-GCM (authenticated encryption).
 * Returns format: "gcm:iv:ciphertext:authTag" (all hex encoded)
 */
export function encryptCredential(plaintext: string): string {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    
    // Format: gcm:iv:ciphertext:authTag
    return `gcm:${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt credential");
  }
}

/**
 * Decrypt a credential. Supports both new GCM format and legacy CBC format.
 * GCM format: "gcm:iv:ciphertext:authTag"
 * Legacy CBC format: "iv:ciphertext"
 */
export function decryptCredential(encryptedData: string): string {
  try {
    const key = getKey();
    
    // Check if this is the new GCM format
    if (encryptedData.startsWith("gcm:")) {
      return decryptGCM(encryptedData, key);
    }
    
    // Legacy CBC format for backward compatibility
    return decryptCBC(encryptedData, key);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt credential");
  }
}

/**
 * Decrypt using AES-256-GCM (authenticated encryption).
 */
function decryptGCM(encryptedData: string, key: Buffer): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 4 || parts[0] !== "gcm") {
    throw new Error("Invalid GCM encrypted data format");
  }
  
  const [, ivHex, encrypted, authTagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Decrypt using legacy AES-256-CBC (for backward compatibility).
 * @deprecated Use GCM format for new encryptions
 */
function decryptCBC(encryptedData: string, key: Buffer): string {
  const [ivHex, encrypted] = encryptedData.split(":");
  if (!ivHex || !encrypted) {
    throw new Error("Invalid CBC encrypted data format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Check if encrypted data is using the legacy CBC format.
 * Useful for migration scripts.
 */
export function isLegacyFormat(encryptedData: string): boolean {
  return !encryptedData.startsWith("gcm:");
}

/**
 * Re-encrypt data from legacy CBC format to new GCM format.
 * Returns null if already in GCM format.
 */
export function migrateToGCM(encryptedData: string): string | null {
  if (!isLegacyFormat(encryptedData)) {
    return null; // Already in GCM format
  }
  
  const plaintext = decryptCredential(encryptedData);
  return encryptCredential(plaintext);
}
