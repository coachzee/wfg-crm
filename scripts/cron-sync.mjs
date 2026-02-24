#!/usr/bin/env node
/**
 * Standalone Cron Sync Script for Hostinger/Self-Hosted Deployments
 * 
 * This script can be called directly by cron jobs to trigger the MyWFG and Transamerica sync.
 * It first does a git pull + pm2 restart to ensure the latest code is running,
 * then makes an HTTP POST request to the /api/cron/sync endpoint.
 * 
 * Usage:
 *   node scripts/cron-sync.mjs
 * 
 * Environment Variables Required:
 *   - APP_URL: The base URL of your CRM (e.g., https://crm.wealthbuildershaven.com)
 *   - SYNC_SECRET: The secret key for authenticating sync requests
 */
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Helper to require environment variables
function mustGetEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`[Cron Sync] ❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

// Auto-update: git pull + pm2 restart to ensure latest code is running
async function autoUpdate() {
  try {
    const appDir = process.cwd();
    console.log('[Cron Sync] Checking for updates...');
    
    // Fetch latest from GitHub
    const fetchResult = execSync('git fetch origin main 2>&1', { cwd: appDir, timeout: 30000 }).toString().trim();
    
    // Check if there are new commits
    const localHash = execSync('git rev-parse HEAD', { cwd: appDir }).toString().trim();
    const remoteHash = execSync('git rev-parse origin/main', { cwd: appDir }).toString().trim();
    
    if (localHash === remoteHash) {
      console.log('[Cron Sync] Already up to date, no restart needed');
      return false;
    }
    
    console.log(`[Cron Sync] New code available (${localHash.substring(0,7)} -> ${remoteHash.substring(0,7)}), updating...`);
    
    // Force-overwrite any locally-modified tracked files (e.g. dist/index.js)
    // This prevents git pull from failing due to local changes
    try {
      execSync('git checkout origin/main -- dist/index.js 2>&1', { cwd: appDir, timeout: 30000 });
      console.log('[Cron Sync] Force-updated dist/index.js from origin/main');
    } catch (e) {
      console.warn('[Cron Sync] git checkout dist/index.js failed (non-fatal):', e.message.substring(0, 100));
    }
    
    // Pull the latest code (use reset --hard to handle any other conflicts)
    try {
      execSync('git pull origin main --ff-only 2>&1', { cwd: appDir, timeout: 60000 });
      console.log('[Cron Sync] Git pull completed');
    } catch (e) {
      // If ff-only fails, try reset --hard
      console.warn('[Cron Sync] git pull --ff-only failed, trying reset --hard...');
      execSync('git fetch origin main 2>&1 && git reset --hard origin/main 2>&1', { cwd: appDir, timeout: 60000 });
      console.log('[Cron Sync] Git reset --hard completed');
    }
    
    // Install dependencies if package.json changed
    try {
      execSync('pnpm install --frozen-lockfile 2>&1', { cwd: appDir, timeout: 300000, stdio: 'pipe' });
      console.log('[Cron Sync] Dependencies updated');
    } catch (e) {
      console.warn('[Cron Sync] pnpm install failed (non-fatal):', e.message.substring(0, 100));
    }
    
    // Restart PM2 to pick up new dist/index.js
    try {
      execSync('pm2 restart wfgcrm 2>&1 || pm2 restart all 2>&1', { timeout: 30000, stdio: 'pipe' });
      console.log('[Cron Sync] PM2 restarted with new code');
      // Wait for server to come back up
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (e) {
      console.warn('[Cron Sync] PM2 restart failed:', e.message.substring(0, 100));
    }
    
    return true;
  } catch (err) {
    console.warn('[Cron Sync] Auto-update failed (non-fatal):', err.message.substring(0, 200));
    return false;
  }
}

// Main sync function
async function runSync() {
  // Try to auto-update first
  await autoUpdate();
  
  // Configuration
  const APP_URL = mustGetEnv('APP_URL');
  const SYNC_SECRET = mustGetEnv('SYNC_SECRET');
  const syncUrl = new URL('/api/cron/sync', APP_URL);
  
  console.log(`[Cron Sync] Starting sync at ${new Date().toISOString()}`);
  console.log(`[Cron Sync] Target URL: ${syncUrl.origin}${syncUrl.pathname}`);
  
  const protocol = syncUrl.protocol === 'https:' ? https : http;
  const requestBody = JSON.stringify({ source: 'cron-script' });
  const options = {
    method: 'POST',
    hostname: syncUrl.hostname,
    port: syncUrl.port || (syncUrl.protocol === 'https:' ? 443 : 80),
    path: syncUrl.pathname,
    headers: {
      'x-sync-secret': SYNC_SECRET,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    },
  };
  
  return new Promise((resolve, reject) => {
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success) {
            console.log('[Cron Sync] ✓ Sync completed successfully');
            console.log('[Cron Sync] timestamp:', result.timestamp);
            console.log('[Cron Sync] runId:', result.runId);
            const metrics = result.metrics ?? {};
            console.log('[Cron Sync] metrics:', JSON.stringify(metrics, null, 2));
            process.exit(0);
          } else {
            console.error('[Cron Sync] ✗ Sync failed:', result.error ?? 'Unknown error');
            console.error('[Cron Sync] runId:', result.runId ?? '(none)');
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
    
    req.setTimeout(300000, () => {
      console.error('[Cron Sync] ✗ Request timed out after 5 minutes');
      req.destroy();
      process.exit(1);
    });
    
    req.write(requestBody);
    req.end();
  });
}

runSync().catch(err => {
  console.error('[Cron Sync] Fatal error:', err.message);
  process.exit(1);
});
