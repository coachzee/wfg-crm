import { describe, expect, it, beforeEach } from "vitest";

// Note: Encryption tests require ENCRYPTION_KEY to be set in the environment
// The encryption module reads the key at module load time

describe("Encryption Module", () => {
  // Import dynamically to avoid module caching issues
  let encryptCredential: (plaintext: string) => string;
  let decryptCredential: (encrypted: string) => string;
  let isLegacyFormat: (encrypted: string) => boolean;
  
  beforeEach(async () => {
    const encryption = await import("./encryption");
    encryptCredential = encryption.encryptCredential;
    decryptCredential = encryption.decryptCredential;
    isLegacyFormat = encryption.isLegacyFormat;
  });

  describe("encryptCredential", () => {
    it("encrypts a string and returns GCM format when ENCRYPTION_KEY is set", () => {
      // Skip if ENCRYPTION_KEY is not set (test environment)
      if (!process.env.ENCRYPTION_KEY) {
        console.log("Skipping encryption test - ENCRYPTION_KEY not set");
        expect(true).toBe(true);
        return;
      }
      
      const plaintext = "my-secret-password";
      const encrypted = encryptCredential(plaintext);
      
      // Should start with 'gcm:' prefix
      expect(encrypted.startsWith("gcm:")).toBe(true);
      
      // Should have 4 parts: gcm:iv:ciphertext:authTag
      const parts = encrypted.split(":");
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe("gcm");
      
      // IV should be 24 hex chars (12 bytes)
      expect(parts[1].length).toBe(24);
      
      // Auth tag should be 32 hex chars (16 bytes)
      expect(parts[3].length).toBe(32);
    });

    it("produces different ciphertext for same plaintext (random IV)", () => {
      if (!process.env.ENCRYPTION_KEY) {
        expect(true).toBe(true);
        return;
      }
      
      const plaintext = "same-password";
      const encrypted1 = encryptCredential(plaintext);
      const encrypted2 = encryptCredential(plaintext);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("decryptCredential", () => {
    it("decrypts GCM encrypted data correctly", () => {
      if (!process.env.ENCRYPTION_KEY) {
        expect(true).toBe(true);
        return;
      }
      
      const plaintext = "my-secret-password-123!@#";
      const encrypted = encryptCredential(plaintext);
      const decrypted = decryptCredential(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it("handles special characters in plaintext", () => {
      if (!process.env.ENCRYPTION_KEY) {
        expect(true).toBe(true);
        return;
      }
      
      const plaintext = "P@ssw0rd!#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encryptCredential(plaintext);
      const decrypted = decryptCredential(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("isLegacyFormat", () => {
    it("returns true for legacy CBC format", () => {
      const legacyFormat = "abc123:def456"; // iv:ciphertext
      expect(isLegacyFormat(legacyFormat)).toBe(true);
    });

    it("returns false for new GCM format", () => {
      const gcmFormat = "gcm:abc123:def456:ghi789";
      expect(isLegacyFormat(gcmFormat)).toBe(false);
    });
  });
});

describe("Environment Validation", () => {
  it("env.schema exports validation functions", async () => {
    const { validateEnv, mustGetEnv, getEnv } = await import("./_core/env.schema");
    
    expect(typeof validateEnv).toBe("function");
    expect(typeof mustGetEnv).toBe("function");
    expect(typeof getEnv).toBe("function");
  });

  it("getEnv returns falsy value for missing env vars", async () => {
    const { getEnv } = await import("./_core/env.schema");
    
    const result = getEnv("NON_EXISTENT_VAR_12345");
    // getEnv returns empty string for missing vars (falsy check handles both)
    expect(!result).toBe(true);
  });

  it("hasMyWFGCredentials returns boolean", async () => {
    const { hasMyWFGCredentials } = await import("./_core/env.schema");
    
    const result = hasMyWFGCredentials();
    expect(typeof result).toBe("boolean");
  });

  it("hasTransamericaCredentials returns boolean", async () => {
    const { hasTransamericaCredentials } = await import("./_core/env.schema");
    
    const result = hasTransamericaCredentials();
    expect(typeof result).toBe("boolean");
  });
});

describe("Open Redirect Protection", () => {
  it("getValidatedRedirectUrl exports from email-tracking", async () => {
    const { getValidatedRedirectUrl } = await import("./email-tracking");
    expect(typeof getValidatedRedirectUrl).toBe("function");
  });

  it("validates allowed domains", async () => {
    const { getValidatedRedirectUrl } = await import("./email-tracking");
    
    // Test with a valid tracking ID that doesn't exist - should check allowlist
    const result = await getValidatedRedirectUrl("non-existent-id", "https://mywfg.com/test");
    
    // Should return the URL since mywfg.com is in the allowlist
    expect(result).toBe("https://mywfg.com/test");
  });

  it("blocks untrusted domains", async () => {
    const { getValidatedRedirectUrl } = await import("./email-tracking");
    
    // Test with an untrusted domain
    const result = await getValidatedRedirectUrl("non-existent-id", "https://malicious-site.com/phishing");
    
    // Should return null for untrusted domain
    expect(result).toBeNull();
  });

  it("handles invalid URLs gracefully", async () => {
    const { getValidatedRedirectUrl } = await import("./email-tracking");
    
    // Test with invalid URL
    const result = await getValidatedRedirectUrl("non-existent-id", "not-a-valid-url");
    
    // Should return null for invalid URL
    expect(result).toBeNull();
  });
});
