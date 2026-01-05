import { describe, it, expect } from 'vitest';
import { sendEmailAlert } from './email-alert';

describe('Email Alert Service', () => {
  it('should send a test email alert', async () => {
    const result = await sendEmailAlert({
      subject: 'Test Alert from WFG CRM',
      message: `
        <p>This is a test email alert from your WFG CRM system.</p>
        <p>If you received this email, the email alert system is working correctly!</p>
        <p><strong>Features enabled:</strong></p>
        <ul>
          <li>OTP fetch alerts</li>
          <li>Credential usage alerts</li>
          <li>Sync trigger alerts</li>
          <li>Sync completion alerts</li>
        </ul>
      `,
    });
    
    expect(result).toBe(true);
  }, 30000); // 30 second timeout for email sending
});
