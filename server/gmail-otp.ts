import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';

interface GmailCredentials {
  email: string;
  appPassword: string;
}

interface OTPResult {
  success: boolean;
  otp?: string;
  error?: string;
  subject?: string;
  from?: string;
  receivedAt?: Date;
}

// Create IMAP connection configuration
function createImapConfig(credentials: GmailCredentials): Imap.Config {
  return {
    user: credentials.email,
    password: credentials.appPassword,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };
}

// Connect to Gmail IMAP and verify credentials
export async function verifyGmailCredentials(credentials: GmailCredentials): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const imap = new Imap(createImapConfig(credentials));
    
    imap.once('ready', () => {
      console.log(`[Gmail] Successfully connected to ${credentials.email}`);
      imap.end();
      resolve({ success: true });
    });
    
    imap.once('error', (err: Error) => {
      console.error(`[Gmail] Connection error for ${credentials.email}:`, err.message);
      resolve({ success: false, error: err.message });
    });
    
    imap.connect();
  });
}

// Search for recent OTP emails from a specific sender
export async function fetchRecentOTP(
  credentials: GmailCredentials,
  senderPattern: string,
  subjectPattern?: string,
  maxAgeMinutes: number = 5
): Promise<OTPResult> {
  return new Promise((resolve) => {
    const imap = new Imap(createImapConfig(credentials));
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          resolve({ success: false, error: `Failed to open inbox: ${err.message}` });
          return;
        }
        
        // Calculate date for search (emails from last N minutes)
        const sinceDate = new Date();
        sinceDate.setMinutes(sinceDate.getMinutes() - maxAgeMinutes);
        const sinceDateStr = sinceDate.toISOString().split('T')[0];
        
        // Build search criteria
        // For MyWFG OTP, search for WebHelp@Transamerica.com with "Security Validation Code" subject
        const searchCriteria: any[] = [
          ['SINCE', sinceDateStr],
          'UNSEEN'
        ];
        
        // Add FROM criteria - for 'transamerica', specifically look for WebHelp
        if (senderPattern.toLowerCase() === 'transamerica') {
          searchCriteria.push(['FROM', 'WebHelp']);
          searchCriteria.push(['SUBJECT', 'Validation Code']);
        } else {
          searchCriteria.push(['FROM', senderPattern]);
        }
        
        imap.search(searchCriteria, (searchErr: Error | null, results: number[]) => {
          if (searchErr) {
            imap.end();
            resolve({ success: false, error: `Search failed: ${searchErr.message}` });
            return;
          }
          
          if (!results || results.length === 0) {
            imap.end();
            resolve({ success: false, error: 'No recent OTP emails found' });
            return;
          }
          
          // Get the most recent email (last in the list)
          const latestUid = results[results.length - 1];
          const fetch = imap.fetch([latestUid], { bodies: '', markSeen: true });
          
          fetch.on('message', (msg: Imap.ImapMessage) => {
            msg.on('body', (stream: NodeJS.ReadableStream) => {
              simpleParser(stream as any, (parseErr: Error | null, parsed: ParsedMail) => {
                if (parseErr) {
                  resolve({ success: false, error: `Parse failed: ${parseErr.message}` });
                  return;
                }
                
                // Extract OTP from email body
                const body = parsed.text || parsed.html || '';
                const otp = extractOTPFromText(body);
                
                if (otp) {
                  resolve({
                    success: true,
                    otp,
                    subject: parsed.subject,
                    from: parsed.from?.text,
                    receivedAt: parsed.date,
                  });
                } else {
                  resolve({
                    success: false,
                    error: 'Could not extract OTP from email',
                    subject: parsed.subject,
                  });
                }
              });
            });
          });
          
          fetch.once('error', (fetchErr: Error) => {
            resolve({ success: false, error: `Fetch failed: ${fetchErr.message}` });
          });
          
          fetch.once('end', () => {
            imap.end();
          });
        });
      });
    });
    
    imap.once('error', (err: Error) => {
      resolve({ success: false, error: `Connection failed: ${err.message}` });
    });
    
    imap.connect();
  });
}

// Extract OTP code from email text
function extractOTPFromText(text: string): string | null {
  // MyWFG/Transamerica OTP format: XXXX-XXXXXX (4 digits, hyphen, 6 digits)
  // Example: "3334-136345" -> OTP is "136345" (last 6 digits after hyphen)
  const patterns = [
    /\d{4}-(\d{6})/,         // XXXX-XXXXXX format - extract last 6 digits
    /\d{3}-(\d{6})/,         // XXX-XXXXXX format - extract last 6 digits (fallback)
    /\b(\d{6})\b/,           // 6-digit code (fallback)
    /code[:\s]+(\d{4,8})/i,  // "code: 123456"
    /OTP[:\s]+(\d{4,8})/i,   // "OTP: 123456"
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Wait for OTP email to arrive (with polling)
export async function waitForOTP(
  credentials: GmailCredentials,
  senderPattern: string,
  maxWaitSeconds: number = 60,
  pollIntervalSeconds: number = 5
): Promise<OTPResult> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  
  console.log(`[Gmail] Waiting for OTP from ${senderPattern}...`);
  
  while (Date.now() - startTime < maxWaitMs) {
    const result = await fetchRecentOTP(credentials, senderPattern, undefined, 2);
    
    if (result.success && result.otp) {
      console.log(`[Gmail] OTP received: ${result.otp}`);
      
      // Send email alert about OTP fetch
      try {
        const { alertOTPFetched } = await import('./email-alert');
        const platform = senderPattern.toLowerCase().includes('wfg') ? 'MyWFG' : 'Transamerica';
        await alertOTPFetched(platform, result.otp);
      } catch (e) {
        console.error('[Gmail] Failed to send OTP alert email:', e);
      }
      
      return result;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
  }
  
  return { success: false, error: `Timeout waiting for OTP after ${maxWaitSeconds} seconds` };
}

// Get credentials from environment variables
export function getMyWFGCredentials(): GmailCredentials {
  return {
    email: process.env.MYWFG_EMAIL || '',
    appPassword: process.env.MYWFG_APP_PASSWORD || '',
  };
}

export function getTransamericaCredentials(): GmailCredentials {
  return {
    email: process.env.TRANSAMERICA_EMAIL || '',
    appPassword: process.env.TRANSAMERICA_APP_PASSWORD || '',
  };
}

// Platform-specific OTP fetchers
export async function fetchMyWFGOTP(): Promise<OTPResult> {
  const credentials = getMyWFGCredentials();
  // MyWFG OTP emails come from WebHelp@Transamerica.com
  return waitForOTP(credentials, 'transamerica', 120, 5);
}

export async function fetchTransamericaOTP(): Promise<OTPResult> {
  const credentials = getTransamericaCredentials();
  // Transamerica OTP emails
  return waitForOTP(credentials, 'transamerica', 60, 5);
}
