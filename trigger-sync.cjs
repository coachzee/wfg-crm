require('dotenv').config();
const http = require('http');
const { execSync } = require('child_process');
const path = require('path');

const secret = process.env.SYNC_SECRET;
console.log('[trigger-sync] Starting at', new Date().toISOString());
console.log('[trigger-sync] Secret configured:', !!secret, 'length:', (secret || '').length);

if (!secret) {
  console.error('[trigger-sync] No SYNC_SECRET found');
  process.exit(1);
}

const appDir = process.cwd();
console.log('[trigger-sync] App directory:', appDir);

// Step 1: Auto-update from GitHub
console.log('[trigger-sync] Step 1: Pulling latest code from GitHub...');
try {
  const gitOut = execSync('git pull origin main 2>&1', { cwd: appDir, timeout: 60000 }).toString();
  console.log('[trigger-sync] Git pull result:', gitOut.substring(0, 200));
} catch(e) {
  console.log('[trigger-sync] Git pull failed (non-fatal):', e.message.substring(0, 100));
}

// Step 2: Install Playwright Chromium if not present
console.log('[trigger-sync] Step 2: Checking Playwright Chromium...');
const playwrightBin = path.join(appDir, 'node_modules', '.bin', 'playwright');
const fs = require('fs');
if (fs.existsSync(playwrightBin)) {
  try {
    const pwOut = execSync(playwrightBin + ' install chromium 2>&1', { timeout: 300000, cwd: appDir }).toString();
    console.log('[trigger-sync] Playwright install result:', pwOut.substring(0, 300));
  } catch(e) {
    console.log('[trigger-sync] Playwright install failed (non-fatal):', e.message.substring(0, 200));
  }
} else {
  console.log('[trigger-sync] Playwright binary not found at', playwrightBin);
}

// Step 3: Install Puppeteer Chrome if not present
console.log('[trigger-sync] Step 3: Checking Puppeteer Chrome...');
const puppeteerBin = path.join(appDir, 'node_modules', '.bin', 'puppeteer');
if (fs.existsSync(puppeteerBin)) {
  try {
    const ppOut = execSync(puppeteerBin + ' browsers install chrome 2>&1', { timeout: 300000, cwd: appDir }).toString();
    console.log('[trigger-sync] Puppeteer install result:', ppOut.substring(0, 300));
  } catch(e) {
    console.log('[trigger-sync] Puppeteer install failed (non-fatal):', e.message.substring(0, 200));
  }
} else {
  console.log('[trigger-sync] Puppeteer binary not found at', puppeteerBin);
}

// Step 4: Restart PM2 to pick up new code
console.log('[trigger-sync] Step 4: Restarting PM2 to pick up latest code...');
try {
  const pm2Out = execSync('pm2 restart wfgcrm 2>&1', { timeout: 30000 }).toString();
  console.log('[trigger-sync] PM2 restart result:', pm2Out.substring(0, 200));
  // Wait for server to come back up
  console.log('[trigger-sync] Waiting 15 seconds for server to restart...');
  execSync('sleep 15');
} catch(e) {
  console.log('[trigger-sync] PM2 restart failed (non-fatal):', e.message.substring(0, 100));
}

// Step 5: Trigger the sync
console.log('[trigger-sync] Step 5: Triggering sync...');
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
const req = http.request(options, function(res) {
  var data = '';
  res.on('data', function(chunk) { data += chunk; });
  res.on('end', function() {
    console.log('[trigger-sync] Status:', res.statusCode);
    console.log('[trigger-sync] Response:', data.substring(0, 500));
  });
});
req.on('error', function(e) { console.error('[trigger-sync] Error:', e.message); });
req.end();
