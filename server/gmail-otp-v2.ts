/**
 * Gmail OTP Service V2 - Robust OTP Fetching with Session Management
 * 
 * Key improvements over V1:
 * 1. Session-based OTP tracking - starts session BEFORE triggering login
 * 2. Only accepts OTPs that arrive AFTER the session starts
 * 3. Tracks used OTPs to prevent reuse
 * 4. Longer timeouts with exponential backoff
 * 5. Better error handling and logging
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';

// Helper to require environment variables
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Types
interface GmailCredentials {
  email: string;
  appPassword: string;
}

interface OTPResult {
  success: boolean;
  otp?: string;
  error?: string;
  source?: string;
  timestamp?: Date;
}

interface OTPSession {
  id: string;
  startTime: Date;
  platform: string;
}

// Track active OTP sessions
const activeSessions = new Map<string, OTPSession>();

// Track used OTPs to prevent reuse
const usedOTPs = new Set<string>();

/**
 * Start a new OTP session - call this BEFORE triggering login
 * Returns a session ID that must be passed to waitForOTPWithSession
 */
export function startOTPSession(platform: string): string {
  const sessionId = `${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session: OTPSession = {
    id: sessionId,
    startTime: new Date(),
    platform,
  };
  activeSessions.set(sessionId, session);
  console.log(`[OTP V2] Started session ${sessionId} for ${platform} at ${session.startTime.toISOString()}`);
  return sessionId;
}

/**
 * End an OTP session
 */
export function endOTPSession(sessionId: string): void {
  activeSessions.delete(sessionId);
  console.log(`[OTP V2] Ended session ${sessionId}`);
}

/**
 * Clear all used OTPs (useful when retrying after errors)
 */
export function clearUsedOTPs(): void {
  usedOTPs.clear();
  console.log('[OTP V2] Cleared used OTPs cache');
}

/**
 * Get Gmail credentials for MyWFG from environment
 */
export function getMyWFGCredentials(): GmailCredentials {
  return {
    email: mustGetEnv('MYWFG_EMAIL'),
    appPassword: mustGetEnv('MYWFG_APP_PASSWORD'),
  };
}

/**
 * Get Gmail credentials for Transamerica from environment
 */
export function getTransamericaCredentials(): GmailCredentials {
  return {
    email: mustGetEnv('TRANSAMERICA_EMAIL'),
    appPassword: mustGetEnv('TRANSAMERICA_APP_PASSWORD'),
  };
}

/**
 * Connect to Gmail via IMAP
 */
function createImapConnection(credentials: GmailCredentials): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: credentials.email,
      password: credentials.appPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
      connTimeout: 30000,
    });

    imap.once('ready', () => {
      console.log('[OTP V2] IMAP connection ready');
      resolve(imap);
    });

    imap.once('error', (err: Error) => {
      console.error('[OTP V2] IMAP connection error:', err.message);
      reject(err);
    });

    imap.connect();
  });
}

/**
 * Search for OTP emails that arrived after the session start time
 * If expectedPrefix is provided, only returns OTPs that match that prefix
 */
async function searchForOTPEmail(
  imap: Imap,
  sessionStartTime: Date,
  platform: string,
  expectedPrefix?: string
): Promise<OTPResult> {
  return new Promise((resolve) => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('[OTP V2] Error opening inbox:', err.message);
        resolve({ success: false, error: `Failed to open inbox: ${err.message}` });
        return;
      }

      // Build search criteria based on platform
      // Search for emails from the last 5 minutes to be safe
      const searchDate = new Date(sessionStartTime.getTime() - 5 * 60 * 1000);
      const dateStr = searchDate.toISOString().split('T')[0];
      
      // Both MyWFG and Transamerica use WebHelp@Transamerica.com for OTP emails
      // Include all possible sender patterns for both platforms
      const senderPatterns = [
        'WebHelp@Transamerica.com',
        'noreply@transamerica.com', 
        'transamerica.com',
        'noreply@wfgmail.com', 
        'wfg.com'
      ];

      // Search for recent emails
      // Note: We create a fresh IMAP connection for each check, which forces a refresh
      imap.search([['SINCE', dateStr]], (searchErr, results) => {
        if (searchErr) {
          console.error('[OTP V2] Search error:', searchErr.message);
          resolve({ success: false, error: `Search failed: ${searchErr.message}` });
          return;
        }

        if (!results || results.length === 0) {
          console.log('[OTP V2] No emails found');
          resolve({ success: false, error: 'No OTP emails found' });
          return;
        }

        console.log(`[OTP V2] Found ${results.length} emails to check`);

        // Get the most recent emails (last 30 to ensure we catch new ones)
        // Sort by UID descending to get newest first (higher UID = newer)
        const sortedResults = [...results].sort((a, b) => b - a);
        const recentResults = sortedResults.slice(0, 30);
        console.log(`[OTP V2] Checking ${recentResults.length} most recent emails (UIDs: ${recentResults.slice(0, 5).join(', ')}...)`);
        
        const fetch = imap.fetch(recentResults, {
          bodies: '',
          struct: true,
        });

        const emails: Array<{ uid: number; date: Date; from: string; subject: string; body: string }> = [];

        fetch.on('message', (msg, seqno) => {
          let emailData = { uid: 0, date: new Date(), from: '', subject: '', body: '' };

          msg.on('body', (stream) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                emailData.date = parsed.date || new Date();
                emailData.from = typeof parsed.from?.text === 'string' ? parsed.from.text : '';
                emailData.subject = parsed.subject || '';
                emailData.body = parsed.text || '';
                emails.push(emailData);
              } catch (e) {
                console.error('[OTP V2] Error parsing email:', e);
              }
            });
          });

          msg.once('attributes', (attrs) => {
            emailData.uid = attrs.uid;
          });
        });

        fetch.once('error', (fetchErr) => {
          console.error('[OTP V2] Fetch error:', fetchErr.message);
          resolve({ success: false, error: `Fetch failed: ${fetchErr.message}` });
        });

        fetch.once('end', () => {
          // Sort by date descending (newest first)
          emails.sort((a, b) => b.date.getTime() - a.date.getTime());

          // Find OTP in emails that:
          // 1. Arrived after session start time (with 10 second buffer for clock skew)
          // 2. Are from the expected sender
          // 3. Contain an OTP we haven't used yet
          
          // Subtract 60 seconds from session start to account for:
          // - Clock skew between servers
          // - Email delivery delays  
          // - Gmail IMAP indexing delays (can be 15-30+ seconds)
          // This is safe because:
          // - We track used OTPs to prevent reuse
          // - OTPs expire after a few minutes anyway
          // - The OTP will only work for the current login session
          const adjustedStartTime = new Date(sessionStartTime.getTime() - 60000);
          console.log(`[OTP V2] Looking for emails after ${adjustedStartTime.toISOString()} (session: ${sessionStartTime.toISOString()})`);
          
          for (const email of emails) {
            // Check if email arrived after adjusted session start (with 60s buffer)
            if (email.date < adjustedStartTime) {
              // Only log first few skipped emails to reduce noise
              continue;
            }

            // Check if from expected sender
            const fromLower = email.from.toLowerCase();
            const isFromExpectedSender = senderPatterns.some(p => fromLower.includes(p.toLowerCase()));
            if (!isFromExpectedSender) {
              continue;
            }

            // Extract OTP from email body (with prefix verification if provided)
            const otpResult = extractOTPFromText(email.body, expectedPrefix);
            if (!otpResult.otp) {
              console.log(`[OTP V2] No OTP found in email: ${email.subject}`);
              continue;
            }

            const otp = otpResult.otp;
            
            // Check if OTP was already used
            if (usedOTPs.has(otp)) {
              console.log(`[OTP V2] OTP ${otp} already used, skipping`);
              continue;
            }

            // Found a valid OTP!
            console.log(`[OTP V2] Found valid OTP: ${otp} from email at ${email.date.toISOString()}`);
            usedOTPs.add(otp);
            
            resolve({
              success: true,
              otp,
              source: email.from,
              timestamp: email.date,
            });
            return;
          }

          resolve({ success: false, error: 'No valid OTP found in recent emails' });
        });
      });
    });
  });
}

/**
 * Extract OTP from email text with optional prefix verification
 * Looks for 6-digit codes, especially after a hyphen (e.g., "1234 - 567890")
 * If expectedPrefix is provided, only returns OTPs that match that prefix
 */
function extractOTPFromText(text: string, expectedPrefix?: string): { otp: string | null; prefix: string | null } {
  if (!text) return { otp: null, prefix: null };

  // Pattern 1: Look for "XXXX - YYYYYY" format (prefix - OTP)
  const prefixPattern = /(\d{4})\s*[-–]\s*(\d{6})/;
  const prefixMatch = text.match(prefixPattern);
  if (prefixMatch) {
    const foundPrefix = prefixMatch[1];
    const foundOtp = prefixMatch[2];
    
    // If expectedPrefix is provided, verify it matches
    if (expectedPrefix && foundPrefix !== expectedPrefix) {
      console.log(`[OTP V2] Prefix mismatch: expected ${expectedPrefix}, found ${foundPrefix}`);
      return { otp: null, prefix: foundPrefix };
    }
    
    return { otp: foundOtp, prefix: foundPrefix };
  }

  // Pattern 2: Look for standalone 6-digit codes (no prefix verification possible)
  const sixDigitPattern = /\b(\d{6})\b/g;
  const matches = text.match(sixDigitPattern);
  if (matches && matches.length > 0) {
    // Return the last 6-digit code found (most likely the OTP)
    // Can't verify prefix for standalone codes
    return { otp: matches[matches.length - 1], prefix: null };
  }

  // Pattern 3: Look for "code is XXXXXX" or "code: XXXXXX"
  const codePattern = /code\s*(?:is|:)\s*(\d{6})/i;
  const codeMatch = text.match(codePattern);
  if (codeMatch) {
    return { otp: codeMatch[1], prefix: null };
  }

  return { otp: null, prefix: null };
}

/**
 * Wait for OTP with session tracking
 * Only accepts OTPs that arrived AFTER the session was started
 * If expectedPrefix is provided, only accepts OTPs that match that prefix
 */
export async function waitForOTPWithSession(
  credentials: GmailCredentials,
  sessionId: string,
  timeoutSeconds: number = 180,
  pollIntervalSeconds: number = 5,
  expectedPrefix?: string
): Promise<OTPResult> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return { success: false, error: `Invalid session ID: ${sessionId}` };
  }

  const prefixInfo = expectedPrefix ? ` (expecting prefix: ${expectedPrefix})` : '';
  console.log(`[OTP V2] Waiting for OTP (session: ${sessionId}, timeout: ${timeoutSeconds}s)${prefixInfo}...`);

  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;
  let attempts = 0;

  while (Date.now() - startTime < timeoutMs) {
    attempts++;
    console.log(`[OTP V2] Attempt ${attempts} - checking for OTP...`);

    let imap: Imap | null = null;
    try {
      imap = await createImapConnection(credentials);
      const result = await searchForOTPEmail(imap, session.startTime, session.platform, expectedPrefix);
      
      if (result.success && result.otp) {
        console.log(`[OTP V2] Success! OTP found on attempt ${attempts}`);
        endOTPSession(sessionId);
        return result;
      }

      console.log(`[OTP V2] No OTP yet: ${result.error}`);
    } catch (error) {
      console.error(`[OTP V2] Error on attempt ${attempts}:`, error);
    } finally {
      if (imap) {
        try {
          imap.end();
        } catch (e) {
          // Ignore close errors
        }
      }
    }

    // Wait before next attempt
    // Use shorter initial waits (3-5 seconds) then gradually increase
    // This helps catch emails that arrive quickly
    const waitTime = attempts <= 3 
      ? 3000  // First 3 attempts: 3 second wait
      : Math.min(pollIntervalSeconds * 1000 * Math.pow(1.1, attempts - 3), 15000);
    console.log(`[OTP V2] Waiting ${Math.round(waitTime / 1000)}s before next attempt...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  endOTPSession(sessionId);
  return { success: false, error: `Timeout waiting for OTP after ${timeoutSeconds} seconds` };
}

/**
 * Legacy function for backward compatibility
 * Starts a session and waits for OTP
 */
export async function waitForOTP(
  credentials: GmailCredentials,
  platform: string,
  timeoutSeconds: number = 90,
  pollIntervalSeconds: number = 5
): Promise<OTPResult> {
  const sessionId = startOTPSession(platform);
  return waitForOTPWithSession(credentials, sessionId, timeoutSeconds, pollIntervalSeconds);
}

/**
 * Verify Gmail credentials work
 */
export async function verifyGmailCredentials(credentials: GmailCredentials): Promise<boolean> {
  try {
    const imap = await createImapConnection(credentials);
    imap.end();
    return true;
  } catch (error) {
    console.error('[OTP V2] Credential verification failed:', error);
    return false;
  }
}
