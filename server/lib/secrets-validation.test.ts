import { describe, it, expect } from 'vitest';

/**
 * Validates that ENCRYPTION_KEY and SYNC_SECRET are properly configured
 * for production use.
 */
describe('Production Secrets Validation', () => {
  it('should have ENCRYPTION_KEY configured with minimum length', () => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    expect(encryptionKey).toBeDefined();
    expect(encryptionKey).not.toBe('');
    expect(encryptionKey!.length).toBeGreaterThanOrEqual(32);
    
    console.log(`[Secrets] ENCRYPTION_KEY is configured (${encryptionKey!.length} chars)`);
  });

  it('should have SYNC_SECRET configured with minimum length', () => {
    const syncSecret = process.env.SYNC_SECRET;
    
    expect(syncSecret).toBeDefined();
    expect(syncSecret).not.toBe('');
    expect(syncSecret!.length).toBeGreaterThanOrEqual(16);
    
    console.log(`[Secrets] SYNC_SECRET is configured (${syncSecret!.length} chars)`);
  });

  it('should be able to use ENCRYPTION_KEY for encryption', async () => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    expect(encryptionKey).toBeDefined();
    
    // Test that the key can be used with crypto
    const crypto = await import('crypto');
    const testData = 'test-credential-data';
    
    // Derive a proper 32-byte key from the secret
    const key = crypto.scryptSync(encryptionKey!, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    // Encrypt
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    expect(decrypted).toBe(testData);
    console.log('[Secrets] ENCRYPTION_KEY works for AES-256-GCM encryption');
  });
});
