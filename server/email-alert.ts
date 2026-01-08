import nodemailer from 'nodemailer';

interface EmailAlertOptions {
  subject: string;
  message: string;
  timestamp?: Date;
}

// Get Gmail SMTP credentials from environment
function getGmailCredentials() {
  return {
    email: process.env.MYWFG_EMAIL || '',
    appPassword: process.env.MYWFG_APP_PASSWORD || '',
  };
}

// Create Gmail SMTP transporter
function createTransporter() {
  const credentials = getGmailCredentials();
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: credentials.email,
      pass: credentials.appPassword,
    },
  });
}

// Send email alert
export async function sendEmailAlert(options: EmailAlertOptions): Promise<boolean> {
  const credentials = getGmailCredentials();
  
  if (!credentials.email || !credentials.appPassword) {
    console.error('[Email Alert] Gmail credentials not configured');
    return false;
  }
  
  const timestamp = options.timestamp || new Date();
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `Wealth Builders Haven CRM <${credentials.email}>`,
      to: 'zaidshopejuwbh@gmail.com',
      subject: `[WBH CRM] ${options.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Wealth Builders Haven CRM</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">${options.subject}</h2>
            <p style="color: #555; line-height: 1.6;">${options.message}</p>
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              <strong>Timestamp:</strong> ${timestamp.toLocaleString('en-US', { 
                timeZone: 'America/New_York',
                dateStyle: 'full',
                timeStyle: 'long'
              })}
            </p>
            <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">
              This is an automated alert from your Wealth Builders Haven CRM system.
            </p>
          </div>
        </div>
      `,
      text: `${options.subject}\n\n${options.message}\n\nTimestamp: ${timestamp.toISOString()}`,
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`[Email Alert] Sent: ${options.subject} - Message ID: ${result.messageId}`);
    return true;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email Alert] Failed to send:', errorMessage);
    return false;
  }
}

// Alert types for specific events
export async function alertOTPFetched(platform: 'MyWBH' | 'Transamerica', otp: string): Promise<boolean> {
  return sendEmailAlert({
    subject: `OTP Fetched for ${platform}`,
    message: `
      <p>An OTP code was automatically fetched from your email for <strong>${platform}</strong> login.</p>
      <p><strong>OTP Code:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 18px;">${otp}</code></p>
      <p><strong>Platform:</strong> ${platform}</p>
      <p>This OTP was used to complete automated login to sync your data.</p>
    `,
  });
}

export async function alertCredentialsUsed(platform: 'MyWFG' | 'MyWBH' | 'Transamerica'): Promise<boolean> {
  return sendEmailAlert({
    subject: `Login Credentials Used for ${platform}`,
    message: `
      <p>Your login credentials were used to access <strong>${platform}</strong>.</p>
      <p><strong>Platform:</strong> ${platform}</p>
      <p><strong>Action:</strong> Automated login initiated</p>
      <p>If you did not trigger this login, please check your CRM settings immediately.</p>
    `,
  });
}

export async function alertSyncTriggered(platforms: string[]): Promise<boolean> {
  return sendEmailAlert({
    subject: 'Automated Sync Triggered',
    message: `
      <p>An automated data sync has been triggered for the following platforms:</p>
      <ul>
        ${platforms.map(p => `<li><strong>${p}</strong></li>`).join('')}
      </ul>
      <p>Your CRM data will be updated shortly.</p>
    `,
  });
}

export async function alertSyncCompleted(results: { platform: string; success: boolean; error?: string }[]): Promise<boolean> {
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  const statusColor = failCount === 0 ? '#28a745' : (successCount === 0 ? '#dc3545' : '#ffc107');
  const statusText = failCount === 0 ? 'All Successful' : (successCount === 0 ? 'All Failed' : 'Partial Success');
  
  return sendEmailAlert({
    subject: `Sync Completed - ${statusText}`,
    message: `
      <p style="background: ${statusColor}; color: white; padding: 10px; border-radius: 4px; display: inline-block;">
        <strong>Status:</strong> ${statusText}
      </p>
      <h3>Sync Results:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f8f9fa;">
          <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Platform</th>
          <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Status</th>
          <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Details</th>
        </tr>
        ${results.map(r => `
          <tr>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${r.platform}</td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">
              <span style="color: ${r.success ? '#28a745' : '#dc3545'};">
                ${r.success ? '✅ Success' : '❌ Failed'}
              </span>
            </td>
            <td style="padding: 10px; border: 1px solid #dee2e6;">${r.error || 'Completed successfully'}</td>
          </tr>
        `).join('')}
      </table>
    `,
  });
}
