import Imap from 'imap';
import { simpleParser } from 'mailparser';

const email = process.env.MYWFG_EMAIL;
const password = process.env.MYWFG_APP_PASSWORD;

console.log('Email:', email);
console.log('Password:', password ? 'Set' : 'Not set');

if (!email || !password) {
  console.log('Missing credentials');
  process.exit(1);
}

const imap = new Imap({
  user: email,
  password: password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) {
      console.error('Error opening inbox:', err);
      imap.end();
      return;
    }
    
    // Search for recent emails from WFG
    const searchDate = new Date();
    searchDate.setMinutes(searchDate.getMinutes() - 15);
    
    imap.search([['SINCE', searchDate], ['FROM', 'wfg']], function(err, results) {
      if (err) {
        console.error('Search error:', err);
        imap.end();
        return;
      }
      
      console.log('Found', results.length, 'emails from WFG');
      
      if (results.length === 0) {
        console.log('No recent WFG emails found');
        imap.end();
        return;
      }
      
      const f = imap.fetch(results, { bodies: '' });
      f.on('message', function(msg, seqno) {
        msg.on('body', function(stream, info) {
          simpleParser(stream, (err, parsed) => {
            if (err) {
              console.error('Parse error:', err);
              return;
            }
            console.log('Subject:', parsed.subject);
            console.log('From:', parsed.from?.text);
            console.log('Date:', parsed.date);
            
            // Extract OTP from body
            const text = parsed.text || '';
            const otpMatch = text.match(/\b(\d{4,6})\b/);
            if (otpMatch) {
              console.log('OTP Found:', otpMatch[1]);
            }
            console.log('Body preview:', text.substring(0, 500));
          });
        });
      });
      f.once('end', function() {
        imap.end();
      });
    });
  });
});

imap.once('error', function(err) {
  console.error('IMAP error:', err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();
