require('dotenv').config();
const http = require('http');

const secret = process.env.SYNC_SECRET;
console.log('Secret configured:', !!secret, 'length:', (secret || '').length);

if (!secret) {
  console.error('No SYNC_SECRET found');
  process.exit(1);
}

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/cron/sync',
  method: 'POST',
  headers: {
    'x-sync-secret': secret,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
});

req.on('error', e => console.error('Error:', e.message));
req.end();
