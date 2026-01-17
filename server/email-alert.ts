import nodemailer from 'nodemailer';
import { createEmailTracking, markEmailSent, markEmailFailed, getTrackingPixelUrl, getTrackedLinkUrl } from './email-tracking';

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


// Send anniversary greeting email directly to client with tracking
export async function sendClientAnniversaryGreeting(client: {
  email: string;
  firstName: string;
  lastName: string;
  policyNumber: string;
  policyAge: number;
  faceAmount: number | string;
  productType?: string | null;
  agentName: string;
  agentPhone?: string;
  agentEmail?: string;
}, options?: {
  baseUrl?: string;
  enableTracking?: boolean;
}): Promise<{ success: boolean; trackingId?: string }> {
  const credentials = getGmailCredentials();
  const enableTracking = options?.enableTracking !== false; // Default to true
  const baseUrl = options?.baseUrl || process.env.VITE_APP_URL || 'https://wfg-crm.manus.space';
  
  let trackingId: string | undefined;
  
  if (!credentials.email || !credentials.appPassword) {
    console.error('[Client Email] Gmail credentials not configured');
    return { success: false };
  }
  
  if (!client.email) {
    console.error('[Client Email] Client email not provided');
    return { success: false };
  }
  
  // Create tracking record if tracking is enabled
  if (enableTracking) {
    try {
      trackingId = await createEmailTracking({
        emailType: 'ANNIVERSARY_GREETING',
        recipientEmail: client.email,
        recipientName: `${client.firstName} ${client.lastName}`,
        subject: `Happy Policy Anniversary, ${client.firstName}!`,
        relatedEntityType: 'POLICY',
        relatedEntityId: client.policyNumber,
        metadata: {
          policyAge: client.policyAge,
          faceAmount: client.faceAmount,
          productType: client.productType,
          agentName: client.agentName,
        },
      });
    } catch (error) {
      console.error('[Client Email] Failed to create tracking record:', error);
      // Continue without tracking
    }
  }
  
  const faceAmount = typeof client.faceAmount === 'number' 
    ? client.faceAmount 
    : parseFloat(String(client.faceAmount)) || 0;
  
  const ordinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  // Generate tracking URLs if tracking is enabled
  const trackingPixelHtml = trackingId 
    ? `<img src="${getTrackingPixelUrl(trackingId, baseUrl)}" width="1" height="1" style="display:none;" alt="" />` 
    : '';
  
  // Helper to wrap links with tracking
  const trackLink = (url: string) => trackingId 
    ? getTrackedLinkUrl(trackingId, url, baseUrl) 
    : url;
  
  const scheduleReviewUrl = `mailto:${client.agentEmail || credentials.email}?subject=Policy Review Request - ${client.policyNumber}`;
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `Wealth Builders Haven <${credentials.email}>`,
      to: client.email,
      subject: `🎉 Happy ${ordinalSuffix(client.policyAge)} Policy Anniversary, ${client.firstName}!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header with celebration theme -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              🎉 Happy Policy Anniversary!
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Celebrating ${client.policyAge} year${client.policyAge !== 1 ? 's' : ''} of protection
            </p>
          </div>
          
          <!-- Main content -->
          <div style="padding: 30px; background: #f8f9fa; border: 1px solid #e9ecef; border-top: none;">
            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
              Dear <strong>${client.firstName}</strong>,
            </p>
            
            <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 0 0 20px 0;">
              Congratulations on your <strong>${ordinalSuffix(client.policyAge)} policy anniversary</strong>! 
              We want to take a moment to thank you for trusting us with your family's financial protection.
            </p>
            
            <!-- Policy summary card -->
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
              <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                Your Policy Summary
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Policy Number:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace;">${client.policyNumber}</td>
                </tr>
                ${client.productType ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Product Type:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">${client.productType}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Coverage Amount:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">$${faceAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Years Protected:</td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: 600; text-align: right;">${client.policyAge} year${client.policyAge !== 1 ? 's' : ''}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 20px 0;">
              Your policy anniversary is a great time to review your coverage and ensure it still meets your family's needs. 
              Life changes—marriages, new children, home purchases, career advancements—may mean your protection needs have changed too.
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackLink(scheduleReviewUrl)}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 14px 32px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;
                        font-weight: 600;
                        font-size: 15px;">
                📅 Schedule Your Free Policy Review
              </a>
            </div>
            
            <p style="color: #555; line-height: 1.8; font-size: 15px; margin: 20px 0 0 0;">
              Thank you for being part of our family. We're honored to help protect what matters most to you.
            </p>
          </div>
          
          <!-- Agent signature -->
          <div style="padding: 25px 30px; background: white; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #333; margin: 0 0 5px 0; font-weight: 600; font-size: 15px;">
              ${client.agentName}
            </p>
            <p style="color: #666; margin: 0 0 3px 0; font-size: 13px;">
              Your Financial Professional
            </p>
            <p style="color: #666; margin: 0 0 3px 0; font-size: 13px;">
              Wealth Builders Haven | World Financial Group
            </p>
            ${client.agentPhone ? `
            <p style="color: #667eea; margin: 10px 0 0 0; font-size: 13px;">
              📞 ${client.agentPhone}
            </p>
            ` : ''}
            ${client.agentEmail ? `
            <p style="color: #667eea; margin: 3px 0 0 0; font-size: 13px;">
              ✉️ ${client.agentEmail}
            </p>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px 30px; text-align: center;">
            <p style="color: #999; font-size: 11px; margin: 0; line-height: 1.6;">
              This email was sent by Wealth Builders Haven as a courtesy reminder of your policy anniversary.
              <br>If you have questions about your policy, please contact your agent directly.
            </p>
          </div>
          
          <!-- Tracking pixel (invisible) -->
          ${trackingPixelHtml}
        </div>
      `,
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`[Client Email] Sent anniversary greeting to ${client.email} - Message ID: ${result.messageId}`);
    
    // Mark email as sent in tracking
    if (trackingId) {
      try {
        await markEmailSent(trackingId);
      } catch (error) {
        console.error('[Client Email] Failed to mark email as sent:', error);
      }
    }
    
    return { success: true, trackingId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Client Email] Failed to send anniversary greeting:', errorMessage);
    
    // Mark email as failed in tracking
    if (trackingId) {
      try {
        await markEmailFailed(trackingId, errorMessage);
      } catch (trackError) {
        console.error('[Client Email] Failed to mark email as failed:', trackError);
      }
    }
    
    return { success: false, trackingId };
  }
}

// Send anniversary greetings to multiple clients
export async function sendBulkClientAnniversaryGreetings(clients: {
  email: string;
  firstName: string;
  lastName: string;
  policyNumber: string;
  policyAge: number;
  faceAmount: number | string;
  productType?: string | null;
  agentName: string;
  agentPhone?: string;
  agentEmail?: string;
}[]): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const client of clients) {
    if (!client.email) {
      skipped++;
      console.log(`[Client Email] Skipped ${client.firstName} ${client.lastName} - no email address`);
      continue;
    }
    
    const result = await sendClientAnniversaryGreeting(client);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    
    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return { sent, failed, skipped };
}
