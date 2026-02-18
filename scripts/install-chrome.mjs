#!/usr/bin/env node
/**
 * Post-install script to ensure Puppeteer Chrome is installed.
 * 
 * This runs after `pnpm install` to ensure Chrome is available for Puppeteer.
 * On production servers where the system Chromium is available at /usr/bin/chromium-browser,
 * Chrome installation is skipped. Otherwise, Puppeteer's bundled Chrome is installed.
 * 
 * This script is idempotent - it checks if Chrome is already installed before installing.
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const SYSTEM_CHROME_PATHS = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
];

function log(msg) {
  console.log(`[install-chrome] ${msg}`);
}

// Check if system Chrome is available
const systemChrome = SYSTEM_CHROME_PATHS.find(p => existsSync(p));
if (systemChrome) {
  log(`System Chrome found at ${systemChrome}. Skipping Puppeteer Chrome installation.`);
  process.exit(0);
}

// Check if Puppeteer Chrome is already installed
try {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(process.env.HOME || '/root', '.cache', 'puppeteer');
  const chromeDir = join(cacheDir, 'chrome');
  if (existsSync(chromeDir)) {
    const entries = execSync(`ls "${chromeDir}" 2>/dev/null || echo ""`).toString().trim();
    if (entries) {
      log(`Puppeteer Chrome already installed at ${chromeDir}. Skipping installation.`);
      process.exit(0);
    }
  }
} catch (e) {
  // Continue to installation
}

// Install Puppeteer Chrome
log('Installing Puppeteer Chrome browser...');
try {
  const result = spawnSync('npx', ['puppeteer', 'browsers', 'install', 'chrome'], {
    stdio: 'inherit',
    timeout: 120000,
  });
  if (result.status === 0) {
    log('Chrome installed successfully.');
  } else {
    log(`Chrome installation exited with code ${result.status}. This may be OK if system Chrome is available.`);
  }
} catch (e) {
  log(`Chrome installation failed: ${e.message}. This may be OK if system Chrome is available.`);
}
