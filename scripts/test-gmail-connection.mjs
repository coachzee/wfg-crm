import Imap from 'imap';
import { simpleParser } from 'mailparser';

const credentials = {
  email: process.env.MYWFG_EMAIL,
  appPassword: process.env.MYWFG_APP_PASSWORD,
};

console.log('[Gmail Test] Checking credentials...');
console.log(`[Gmail Test] Email: ${credentials.email}`);
console.log(`[Gmail Test] App Password: ${credentials.appPassword ? '***' + credentials.appPassword.slice(-4) : 'NOT SET'}`);

if (!credentials.email || !credentials.appPassword) {
  console.error('[Gmail Test] Missing MYWFG_EMAIL or MYWFG_APP_PASSWORD');
  process.exit(1);
}

function testGmailConnection() {
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
      console.log('[Gmail Test] ✓ Connected to Gmail IMAP');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('[Gmail Test] Failed to open inbox:', err.message);
          imap.end();
          reject(err);
          return;
        }

        console.log(`[Gmail Test] ✓ Inbox opened - ${box.messages.total} total messages`);

        // Search for recent emails (last 24 hours)
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 1);
        const sinceDateStr = sinceDate.toISOString().split('T')[0];

        console.log(`[Gmail Test] Searching for emails since ${sinceDateStr}...`);

        imap.search([['SINCE', sinceDateStr]], (searchErr, results) => {
          if (searchErr) {
            console.error('[Gmail Test] Search failed:', searchErr.message);
            imap.end();
            reject(searchErr);
            return;
          }

          console.log(`[Gmail Test] Found ${results.length} emails in the last 24 hours`);

          if (results.length === 0) {
            console.log('[Gmail Test] No recent emails found');
            imap.end();
            resolve([]);
            return;
          }

          // Fetch last 10 emails
          const toFetch = results.slice(-10);
          console.log(`[Gmail Test] Fetching last ${toFetch.length} emails...`);

          const emails = [];
          const fetch = imap.fetch(toFetch, { bodies: '', markSeen: false });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (parseErr, parsed) => {
                if (parseErr) {
                  console.error('[Gmail Test] Parse error:', parseErr.message);
                  return;
                }

                emails.push({
                  from: parsed.from?.text,
                  subject: parsed.subject,
                  date: parsed.date,
                  textPreview: (parsed.text || '').substring(0, 200),
                });
              });
            });
          });

          fetch.once('end', () => {
            imap.end();
            resolve(emails);
          });

          fetch.once('error', (fetchErr) => {
            console.error('[Gmail Test] Fetch error:', fetchErr.message);
            imap.end();
            reject(fetchErr);
          });
        });
      });
    });

    imap.once('error', (err) => {
      console.error('[Gmail Test] Connection error:', err.message);
      reject(err);
    });

    imap.connect();
  });
}

async function main() {
  try {
    const emails = await testGmailConnection();
    
    console.log('\n[Gmail Test] Recent emails:');
    console.log('='.repeat(60));
    
    for (const email of emails) {
      console.log(`\nFrom: ${email.from}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Date: ${email.date}`);
      console.log(`Preview: ${email.textPreview}...`);
      console.log('-'.repeat(60));
    }

    // Check for WFG/OTP emails
    const wfgEmails = emails.filter(e => 
      (e.from && e.from.toLowerCase().includes('wfg')) ||
      (e.subject && e.subject.toLowerCase().includes('wfg')) ||
      (e.subject && e.subject.toLowerCase().includes('otp')) ||
      (e.subject && e.subject.toLowerCase().includes('code')) ||
      (e.subject && e.subject.toLowerCase().includes('verification'))
    );

    if (wfgEmails.length > 0) {
      console.log('\n[Gmail Test] ✓ Found WFG/OTP related emails:');
      for (const email of wfgEmails) {
        console.log(`  - ${email.subject} (from: ${email.from})`);
      }
    } else {
      console.log('\n[Gmail Test] ⚠ No WFG/OTP related emails found in the last 24 hours');
    }

  } catch (error) {
    console.error('[Gmail Test] Fatal error:', error.message);
    process.exit(1);
  }
}

main();
