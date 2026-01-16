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
export async function alertOTPFetched(platform: 'MyWFG' | 'Transamerica', otp: string): Promise<boolean> {
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

export async function alertCredentialsUsed(platform: 'MyWFG' | 'Transamerica'): Promise<boolean> {
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


// Policy anniversary reminder email
export async function alertPolicyAnniversary(policies: {
  policyNumber: string;
  ownerName: string;
  anniversaryDate: string;
  policyAge: number;
  faceAmount: number | string;
  premium: number | string;
  productType?: string | null;
  writingAgentName?: string | null;
}[]): Promise<boolean> {
  if (policies.length === 0) return true;
  
  const totalFaceAmount = policies.reduce((sum, p) => sum + (typeof p.faceAmount === 'number' ? p.faceAmount : parseFloat(String(p.faceAmount)) || 0), 0);
  
  return sendEmailAlert({
    subject: `📅 ${policies.length} Policy Anniversary Reminder${policies.length > 1 ? 's' : ''} - 7 Days Away`,
    message: `
      <p>The following ${policies.length > 1 ? 'policies have anniversaries' : 'policy has an anniversary'} coming up in <strong>7 days</strong>. 
      Now is a great time to reach out and schedule a policy review!</p>
      
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <strong>📊 Summary:</strong> ${policies.length} ${policies.length > 1 ? 'policies' : 'policy'} | 
        <strong>Total Face Amount:</strong> $${totalFaceAmount.toLocaleString()}
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Client</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Policy #</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Anniversary</th>
          <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Face Amount</th>
          <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Premium</th>
        </tr>
        ${policies.map((p, i) => `
          <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : 'white'};">
            <td style="padding: 12px; border: 1px solid #dee2e6;">
              <strong>${p.ownerName}</strong>
              ${p.writingAgentName ? `<br><span style="font-size: 11px; color: #666;">Agent: ${p.writingAgentName}</span>` : ''}
            </td>
            <td style="padding: 12px; border: 1px solid #dee2e6; font-family: monospace;">${p.policyNumber}</td>
            <td style="padding: 12px; border: 1px solid #dee2e6;">
              ${p.anniversaryDate}
              <br><span style="font-size: 11px; color: #666;">${p.policyAge} year${p.policyAge !== 1 ? 's' : ''}</span>
            </td>
            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">$${(p.faceAmount || 0).toLocaleString()}</td>
            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right;">$${(p.premium || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </table>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
        <strong>💡 Review Tips:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Review coverage adequacy based on life changes</li>
          <li>Confirm beneficiary information is up to date</li>
          <li>Discuss additional coverage opportunities</li>
          <li>Ask for referrals to friends and family</li>
        </ul>
      </div>
      
      <p style="margin-top: 20px;">
        <a href="https://wfg-crm.manus.space/policy-anniversaries" 
           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  display: inline-block;">
          View All Anniversaries in CRM →
        </a>
      </p>
    `,
  });
}

// Single policy anniversary reminder
export async function alertSinglePolicyAnniversary(policy: {
  policyNumber: string;
  ownerName: string;
  anniversaryDate: string;
  policyAge: number;
  faceAmount: number;
  premium: number;
  productType?: string;
  writingAgentName?: string;
}): Promise<boolean> {
  return alertPolicyAnniversary([policy]);
}
