#!/usr/bin/env node
/**
 * Chrome Installation Script for Production Server
 * 
 * Installs Chrome/Chromium for Puppeteer on the production server.
 * Run this script after deployment to ensure Chrome is available.
 * 
 * Usage:
 *   node scripts/install-chrome.mjs
 */
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const CHROME_CACHE_DIRS = [
  resolve(homedir(), '.cache/puppeteer/chrome'),
  '/root/.cache/puppeteer/chrome',
];

function findExistingChrome() {
  // Check Puppeteer cache
  for (const dir of CHROME_CACHE_DIRS) {
    if (existsSync(dir)) {
      try {
        const versions = readdirSync(dir).sort().reverse();
        for (const ver of versions) {
          const bin = resolve(dir, ver, 'chrome-linux64', 'chrome');
          if (existsSync(bin)) return bin;
        }
      } catch {}
    }
  }
  // Check system paths
  for (const p of ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome-stable']) {
    if (existsSync(p)) return p;
  }
  return null;
}

const existing = findExistingChrome();
if (existing) {
  console.log(`✓ Chrome already installed at: ${existing}`);
  process.exit(0);
}

console.log('Installing Chrome for Puppeteer...');
try {
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit', timeout: 300000 });
  console.log('✓ Chrome installed successfully');
} catch (err) {
  console.warn('⚠ Chrome installation failed (non-fatal):', err.message);
  console.warn('  Chrome will be auto-installed on first sync attempt via launchBrowser()');
  // Exit with 0 to not block pnpm install
  process.exit(0);
}
