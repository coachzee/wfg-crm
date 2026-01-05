import Imap from 'imap';

const imap = new Imap({
  user: 'zaidshopejuwbh@gmail.com',
  password: process.env.MYWFG_APP_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  imap.openBox('INBOX', false, (err, box) => {
    if (err) { console.error(err); imap.end(); return; }
    
    // Search for recent emails (last 5 minutes)
    const since = new Date();
    since.setMinutes(since.getMinutes() - 5);
    
    // Search for all recent unseen emails
    imap.search([['SINCE', since]], (err, results) => {
      if (err) {
        console.error('Search error:', err);
        imap.end();
        return;
      }
      
      console.log('Found', results.length, 'recent emails');
      
      if (results.length === 0) {
        console.log('No recent emails found');
        imap.end();
        return;
      }
      
      // Get the last 5 emails
      const toFetch = results.slice(-5);
      const fetch = imap.fetch(toFetch, { bodies: ['TEXT', 'HEADER.FIELDS (FROM SUBJECT DATE)'] });
      
      fetch.on('message', (msg, seqno) => {
        console.log('\\n--- Email #' + seqno + ' ---');
        msg.on('body', (stream, info) => {
          let buffer = '';
          stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
          stream.on('end', () => {
            // Check if this is from MyWFG or contains OTP
            if (buffer.toLowerCase().includes('mywfg') || 
                buffer.toLowerCase().includes('validation') ||
                buffer.toLowerCase().includes('security code') ||
                buffer.toLowerCase().includes('one time')) {
              console.log('POTENTIAL OTP EMAIL:');
              console.log(buffer.substring(0, 1500));
              
              // Look for OTP pattern
              const otpMatch = buffer.match(/\b(\d{6,8})\b/g);
              if (otpMatch) {
                console.log('\\nPOSSIBLE OTP CODES:', otpMatch);
              }
            } else {
              // Just show header info
              if (info.which.includes('HEADER')) {
                console.log(buffer);
              }
            }
          });
        });
      });
      fetch.once('end', () => imap.end());
    });
  });
});

imap.once('error', (err) => console.error('IMAP error:', err));
imap.connect();
