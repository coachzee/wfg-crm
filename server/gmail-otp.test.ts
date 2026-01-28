import { describe, it, expect } from 'vitest';
import { verifyGmailCredentials, getMyWFGCredentials, getTransamericaCredentials } from './gmail-otp';

// Helper function to retry async operations with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

describe('Gmail OTP Service', () => {
  it('should have MyWFG email credentials configured', () => {
    const credentials = getMyWFGCredentials();
    expect(credentials.email).toBeTruthy();
    expect(credentials.email).toContain('@gmail.com');
    expect(credentials.appPassword).toBeTruthy();
    expect(credentials.appPassword.length).toBeGreaterThanOrEqual(16);
  });

  it('should have Transamerica email credentials configured', () => {
    const credentials = getTransamericaCredentials();
    expect(credentials.email).toBeTruthy();
    expect(credentials.email).toContain('@gmail.com');
    expect(credentials.appPassword).toBeTruthy();
    expect(credentials.appPassword.length).toBeGreaterThanOrEqual(16);
  });

  it('should connect to MyWFG Gmail account via IMAP', async () => {
    const credentials = getMyWFGCredentials();
    
    // Use retry logic for network resilience
    const result = await withRetry(async () => {
      const res = await verifyGmailCredentials(credentials);
      if (!res.success) {
        throw new Error(res.error || 'Connection failed');
      }
      return res;
    });
    
    expect(result.success).toBe(true);
  }, 60000); // 60 second timeout to allow for retries

  it('should connect to Transamerica Gmail account via IMAP', async () => {
    const credentials = getTransamericaCredentials();
    
    // Use retry logic for network resilience
    const result = await withRetry(async () => {
      const res = await verifyGmailCredentials(credentials);
      if (!res.success) {
        throw new Error(res.error || 'Connection failed');
      }
      return res;
    });
    
    expect(result.success).toBe(true);
  }, 60000); // 60 second timeout to allow for retries
});
