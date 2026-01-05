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
  confidence?: number;
  extractionMethod?: string;
}

/**
 * Advanced OTP extraction with high reasoning optimization
 * Uses multiple strategies to identify and extract OTP codes
 */
function extractOTPWithReasoning(text: string): { otp: string | null; confidence: number; method: string } {
  if (!text) return { otp: null, confidence: 0, method: 'empty_text' };

  // Normalize text
  const normalized = text.toLowerCase().trim();

  // Strategy 1: Look for explicit OTP/code labels (highest confidence)
  const explicitPatterns = [
    { regex: /(?:your\s+)?(?:one[- ]?time\s+)?(?:security\s+)?(?:validation\s+)?code[:\s]+([0-9]{4,8})/i, confidence: 0.95, method: 'explicit_label' },
    { regex: /(?:otp|verification\s+code|security\s+code)[:\s]+([0-9]{4,8})/i, confidence: 0.95, method: 'explicit_otp_label' },
    { regex: /code\s+is[:\s]+([0-9]{4,8})/i, confidence: 0.90, method: 'code_is_label' },
    { regex: /enter\s+(?:the\s+)?code[:\s]+([0-9]{4,8})/i, confidence: 0.90, method: 'enter_code_label' },
    { regex: /validation\s+code[:\s]+([0-9]{4,8})/i, confidence: 0.85, method: 'validation_context' },
  ];

  for (const { regex, confidence, method } of explicitPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return { otp: match[1], confidence, method };
    }
  }

  // Strategy 2: Look for codes in specific contexts (medium-high confidence)
  const contextPatterns = [
    { regex: /\|\s*([0-9]{4,8})\s*\|/i, confidence: 0.80, method: 'pipe_delimited' },
    { regex: /\*\*([0-9]{4,8})\*\*/i, confidence: 0.80, method: 'bold_delimited' },
    { regex: /`([0-9]{4,8})`/i, confidence: 0.75, method: 'backtick_delimited' },
    { regex: /\[([0-9]{4,8})\]/i, confidence: 0.70, method: 'bracket_delimited' },
  ];

  for (const { regex, confidence, method } of contextPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return { otp: match[1], confidence, method };
    }
  }

  // Strategy 3: Look for isolated 6-digit codes (medium confidence)
  const sixDigitMatch = text.match(/\b([0-9]{6})\b/);
  if (sixDigitMatch && sixDigitMatch[1]) {
    const code = sixDigitMatch[1];
    if (!isLikelyDateOrPhone(code)) {
      return { otp: code, confidence: 0.65, method: 'isolated_six_digit' };
    }
  }

  // Strategy 4: Look for any 4-8 digit code (lower confidence)
  const anyCodeMatch = text.match(/\b([0-9]{4,8})\b/);
  if (anyCodeMatch && anyCodeMatch[1]) {
    return { otp: anyCodeMatch[1], confidence: 0.50, method: 'isolated_code' };
  }

  return { otp: null, confidence: 0, method: 'no_match' };
}

/**
 * Check if a numeric string is likely a date or phone number
 */
function isLikelyDateOrPhone(code: string): boolean {
  const datePatterns = [
    /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{2}$/, // MMDDYY
    /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}$/, // DDMMYY
  ];

  for (const pattern of datePatterns) {
    if (pattern.test(code)) return true;
  }

  return false;
}

/**
 * Create IMAP connection configuration
 */
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

/**
 * Fetch recent OTP with advanced extraction - searches all recent emails
 */
export async function fetchRecentOTPAdvanced(
  credentials: GmailCredentials,
  maxAgeMinutes: number = 10
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

        // Calculate date for search
        const sinceDate = new Date();
        sinceDate.setMinutes(sinceDate.getMinutes() - maxAgeMinutes);
        const sinceDateStr = sinceDate.toISOString().split('T')[0];

        // Search for ALL recent unseen emails (not just from specific sender)
        const searchCriteria: any[] = [['SINCE', sinceDateStr], 'UNSEEN'];

        console.log(`[Gmail OTP Advanced] Searching for unseen emails since ${sinceDateStr}...`);

        imap.search(searchCriteria, (searchErr: Error | null, results: number[]) => {
          if (searchErr) {
            imap.end();
            resolve({ success: false, error: `Search failed: ${searchErr.message}` });
            return;
          }

          if (!results || results.length === 0) {
            console.log('[Gmail OTP Advanced] No unseen emails found');
            imap.end();
            resolve({ success: false, error: 'No recent emails found' });
            return;
          }

          console.log(`[Gmail OTP Advanced] Found ${results.length} unseen emails, checking for OTP...`);

          // Process emails in reverse order (newest first) with reasoning
          let bestResult: OTPResult | null = null;
          let processedCount = 0;
          const totalToProcess = Math.min(results.length, 10); // Check up to 10 most recent emails

          const fetch = imap.fetch(results.slice(-totalToProcess), { bodies: '', markSeen: true });

          fetch.on('message', (msg: Imap.ImapMessage) => {
            msg.on('body', (stream: NodeJS.ReadableStream) => {
              simpleParser(stream as any, (parseErr: Error | null, parsed: ParsedMail) => {
                if (parseErr) {
                  console.error('[Gmail OTP Advanced] Parse error:', parseErr.message);
                  processedCount++;
                  if (processedCount === totalToProcess && bestResult) {
                    imap.end();
                    resolve(bestResult);
                  }
                  return;
                }

                // Extract OTP with reasoning
                const body = parsed.text || parsed.html || '';
                const { otp, confidence, method } = extractOTPWithReasoning(body);

                console.log(
                  `[Gmail OTP Advanced] Email from ${parsed.from?.text} (Subject: ${parsed.subject}): confidence=${confidence}, method=${method}`
                );

                if (otp && (!bestResult || confidence > (bestResult.confidence || 0))) {
                  bestResult = {
                    success: true,
                    otp,
                    subject: parsed.subject,
                    from: parsed.from?.text,
                    receivedAt: parsed.date,
                    confidence,
                    extractionMethod: method,
                  };
                  console.log(`[Gmail OTP Advanced] ✓ Found OTP: ${otp} (confidence: ${confidence})`);
                }

                processedCount++;
                if (processedCount === totalToProcess) {
                  imap.end();
                  if (bestResult) {
                    resolve(bestResult);
                  } else {
                    resolve({ success: false, error: 'Could not extract OTP from any email', confidence: 0 });
                  }
                }
              });
            });
          });

          fetch.once('error', (err: Error) => {
            imap.end();
            resolve({ success: false, error: `Fetch error: ${err.message}` });
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

/**
 * Wait for OTP with advanced extraction - polls all recent emails
 */
export async function waitForOTPAdvanced(
  credentials: GmailCredentials,
  maxWaitSeconds: number = 120,
  pollIntervalSeconds: number = 3
): Promise<OTPResult> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;

  console.log(`[Gmail OTP Advanced] Waiting for OTP (timeout: ${maxWaitSeconds}s, poll interval: ${pollIntervalSeconds}s)...`);

  let pollCount = 0;
  while (Date.now() - startTime < maxWaitMs) {
    pollCount++;
    console.log(`[Gmail OTP Advanced] Poll #${pollCount}...`);

    const result = await fetchRecentOTPAdvanced(credentials, 5); // Check last 5 minutes

    if (result.success && result.otp) {
      console.log(`[Gmail OTP Advanced] ✓ OTP received: ${result.otp} (confidence: ${result.confidence}, method: ${result.extractionMethod})`);
      return result;
    }

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    const remainingSeconds = maxWaitSeconds - elapsedSeconds;

    if (remainingSeconds > 0) {
      console.log(`[Gmail OTP Advanced] No OTP yet, waiting ${pollIntervalSeconds}s before retry (${remainingSeconds}s remaining)...`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalSeconds * 1000));
    }
  }

  return { success: false, error: `Timeout waiting for OTP after ${maxWaitSeconds} seconds`, confidence: 0 };
}

export { GmailCredentials, OTPResult };
