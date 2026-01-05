import { describe, it, expect } from 'vitest';
import { verifyGmailCredentials, getMyWFGCredentials, getTransamericaCredentials } from './gmail-otp';

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
    const result = await verifyGmailCredentials(credentials);
    
    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('MyWFG Gmail connection failed:', result.error);
    }
  }, 30000); // 30 second timeout for IMAP connection

  it('should connect to Transamerica Gmail account via IMAP', async () => {
    const credentials = getTransamericaCredentials();
    const result = await verifyGmailCredentials(credentials);
    
    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Transamerica Gmail connection failed:', result.error);
    }
  }, 30000); // 30 second timeout for IMAP connection
});
