#!/usr/bin/env node
/**
 * Standalone Cron Sync Script for Hostinger/Self-Hosted Deployments
 * 
 * This script can be called directly by cron jobs to trigger the MyWFG and Transamerica sync.
 * It makes an HTTP request to the /api/cron/sync endpoint with the SYNC_SECRET.
 * 
 * Usage:
 *   node scripts/cron-sync.mjs
 * 
 * Environment Variables Required:
 *   - APP_URL: The base URL of your CRM (e.g., https://your-domain.com)
 *   - SYNC_SECRET: The secret key for authenticating sync requests
 * 
 * Hostinger Cron Job Setup:
 *   1. Go to Hostinger hPanel > Advanced > Cron Jobs
 *   2. Add two cron jobs:
 *      - 3:30 PM EST: 30 20 * * * (20:30 UTC)
 *      - 6:30 PM EST: 30 23 * * * (23:30 UTC)
 *   3. Command: cd /path/to/your/app && node scripts/cron-sync.mjs
 * 
 * Alternative: Use the HTTP endpoint directly with curl:
 *   curl -X POST "https://your-domain.com/api/cron/sync" -H "x-sync-secret: YOUR_SYNC_SECRET"
 */

import https from 'https';
import http from 'http';

// Helper to require environment variables
function mustGetEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`[Cron Sync] ❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

// Configuration
const APP_URL = mustGetEnv('APP_URL');
const SYNC_SECRET = mustGetEnv('SYNC_SECRET');

const syncUrl = new URL('/api/cron/sync', APP_URL);

console.log(`[Cron Sync] Starting sync at ${new Date().toISOString()}`);
console.log(`[Cron Sync] Target URL: ${syncUrl.origin}${syncUrl.pathname}`);

const protocol = syncUrl.protocol === 'https:' ? https : http;

const options = {
  method: 'POST',
  hostname: syncUrl.hostname,
  port: syncUrl.port || (syncUrl.protocol === 'https:' ? 443 : 80),
  path: syncUrl.pathname,
  headers: {
    'x-sync-secret': SYNC_SECRET,
    'Content-Type': 'application/json',
  },
};

const req = protocol.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('[Cron Sync] ✓ Sync completed successfully');
        console.log('[Cron Sync] Results:');
        result.results.forEach((r) => {
          const status = r.success ? '✓' : '✗';
          console.log(`  ${status} ${r.platform}: ${r.success ? 'Success' : r.error}`);
        });
        process.exit(0);
      } else {
        console.error('[Cron Sync] ✗ Sync failed:', result.error);
        process.exit(1);
      }
    } catch (e) {
      console.error('[Cron Sync] ✗ Failed to parse response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('[Cron Sync] ✗ Request failed:', error.message);
  process.exit(1);
});

req.setTimeout(300000, () => { // 5 minute timeout
  console.error('[Cron Sync] ✗ Request timed out after 5 minutes');
  req.destroy();
  process.exit(1);
});

// Send the request (POST requires explicit end)
req.end();
