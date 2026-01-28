#!/usr/bin/env node
/**
 * Fetch GitHub verification code from Gmail
 */

import 'dotenv/config';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

function mustGetEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const GMAIL_USER = mustGetEnv('MYWFG_EMAIL');
const GMAIL_APP_PASSWORD = mustGetEnv('MYWFG_APP_PASSWORD');

async function fetchGitHubOTP() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        // Search for recent GitHub emails
        const searchCriteria = [
          ['FROM', 'noreply@github.com'],
          ['SINCE', new Date(Date.now() - 10 * 60 * 1000)] // Last 10 minutes
        ];

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!results || results.length === 0) {
            imap.end();
            return resolve({ success: false, error: 'No GitHub email found' });
          }

          // Get the most recent email
          const latestUid = results[results.length - 1];
          const fetch = imap.fetch([latestUid], { bodies: '' });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  return reject(err);
                }

                const text = parsed.text || '';
                const html = parsed.html || '';
                const content = text + html;

                // Look for 6-digit verification code
                const codeMatch = content.match(/\b(\d{6})\b/);
                
                if (codeMatch) {
                  resolve({
                    success: true,
                    otp: codeMatch[1],
                    subject: parsed.subject,
                    from: parsed.from?.text
                  });
                } else {
                  resolve({ success: false, error: 'No verification code found in email' });
                }
              });
            });
          });

          fetch.once('end', () => {
            imap.end();
          });
        });
      });
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.connect();
  });
}

// Main execution
console.log('Fetching GitHub verification code from Gmail...');
console.log(`Email: ${GMAIL_USER}`);

fetchGitHubOTP()
  .then(result => {
    if (result.success) {
      console.log(`\nGitHub Verification Code: ${result.otp}`);
      console.log(`Subject: ${result.subject}`);
      console.log(`From: ${result.from}`);
    } else {
      console.log(`\nFailed: ${result.error}`);
    }
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
