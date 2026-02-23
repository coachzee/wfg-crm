#!/usr/bin/env node
/**
 * Chrome Installation Script for Production Server
 * 
 * Installs Chrome/Chromium for Puppeteer on the production server.
 * Uses the project-local .chrome-cache directory so Chrome persists
 * across Manus checkpoint restores (the default ~/.cache/puppeteer
 * location gets cleared on checkpoint restore).
 * Run this script after deployment to ensure Chrome is available.
 * 
 * Usage:
 *   node scripts/install-chrome.mjs
 */
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const LOCAL_CACHE = resolve(PROJECT_ROOT, '.chrome-cache');

const CHROME_CACHE_DIRS = [
  resolve(LOCAL_CACHE, 'chrome'),
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

console.log(`Installing Chrome for Puppeteer into ${LOCAL_CACHE}...`);
try {
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    timeout: 300000,
    env: { ...process.env, PUPPETEER_CACHE_DIR: LOCAL_CACHE },
  });
  console.log('✓ Chrome installed successfully');
} catch (err) {
  console.warn('⚠ Chrome installation failed (non-fatal):', err.message);
  console.warn('  Chrome will be auto-installed on first sync attempt via launchBrowser()');
  // Exit with 0 to not block pnpm install
  process.exit(0);
}
