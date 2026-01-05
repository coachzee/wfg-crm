import Imap from 'imap';
import { simpleParser } from 'mailparser';

const credentials = {
  email: process.env.MYWFG_EMAIL,
  appPassword: process.env.MYWFG_APP_PASSWORD,
};

console.log('[Debug OTP] Checking credentials...');
console.log(`[Debug OTP] Email: ${credentials.email}`);

// OTP extraction function (same as in gmail-otp.ts)
function extractOTPFromText(text) {
  // MyWFG/Transamerica OTP format: XXXX-XXXXXX (4 digits, hyphen, 6 digits)
  // Example: "3334-136345" -> OTP is "136345" (last 6 digits after hyphen)
  const patterns = [
    /\d{4}-(\d{6})/,         // XXXX-XXXXXX format - extract last 6 digits
    /\d{3}-(\d{6})/,         // XXX-XXXXXX format - extract last 6 digits (fallback)
    /\b(\d{6})\b/,           // 6-digit code (fallback)
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

function fetchRecentEmails() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: credentials.email,
      password: credentials.appPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once('ready', () => {
      console.log('[Debug OTP] ✓ Connected to Gmail');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for emails from transamerica in the last hour
        const sinceDate = new Date();
        sinceDate.setHours(sinceDate.getHours() - 1);
        
        imap.search([
          ['SINCE', sinceDate],
          ['FROM', 'transamerica']
        ], (searchErr, results) => {
          if (searchErr) {
            reject(searchErr);
            return;
          }

          console.log(`[Debug OTP] Found ${results.length} emails from transamerica in the last hour`);

          if (results.length === 0) {
            // Try broader search
            imap.search([['SINCE', sinceDate]], (searchErr2, results2) => {
              if (searchErr2) {
                reject(searchErr2);
                return;
              }
              console.log(`[Debug OTP] Found ${results2.length} total emails in the last hour`);
              imap.end();
              resolve([]);
            });
            return;
          }

          const emails = [];
          const fetch = imap.fetch(results.slice(-5), { bodies: '', markSeen: false });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (parseErr, parsed) => {
                if (parseErr) return;

                const emailData = {
                  from: parsed.from?.text,
                  subject: parsed.subject,
                  date: parsed.date,
                  text: parsed.text || '',
                };

                // Try to extract OTP
                const otp = extractOTPFromText(emailData.text);
                emailData.extractedOTP = otp;

                emails.push(emailData);
              });
            });
          });

          fetch.once('end', () => {
            imap.end();
            resolve(emails);
          });
        });
      });
    });

    imap.once('error', reject);
    imap.connect();
  });
}

async function main() {
  try {
    const emails = await fetchRecentEmails();
    
    console.log('\n[Debug OTP] Recent Transamerica emails:');
    console.log('='.repeat(60));
    
    for (const email of emails) {
      console.log(`\nFrom: ${email.from}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Date: ${email.date}`);
      console.log(`Text preview: ${email.text.substring(0, 300)}...`);
      console.log(`Extracted OTP: ${email.extractedOTP || 'NONE'}`);
      console.log('-'.repeat(60));
    }

    // Test OTP extraction on sample text
    console.log('\n[Debug OTP] Testing OTP extraction patterns:');
    const testTexts = [
      'Your code is 3334-136345',
      'Here is your validation code: 1234-567890',
      'Code: 5942-653712',
      '3334-1363',  // Old format from earlier emails
    ];
    
    for (const text of testTexts) {
      const otp = extractOTPFromText(text);
      console.log(`  "${text}" -> OTP: ${otp || 'NONE'}`);
    }

  } catch (error) {
    console.error('[Debug OTP] Error:', error.message);
  }
}

main();
