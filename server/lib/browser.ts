/**
 * Centralized Puppeteer browser launcher.
 *
 * Solves the "Could not find Chrome" production error by searching multiple
 * locations for a usable Chrome / Chromium binary before falling back to
 * the system-installed Chromium.
 *
 * Every file that needs a headless browser MUST use `launchBrowser()` instead
 * of calling `puppeteer.launch()` directly.
 */

import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

/** Common Chrome / Chromium paths across Linux environments */
const CANDIDATE_PATHS = [
  // Puppeteer cache under current user
  resolve(homedir(), '.cache/puppeteer/chrome'),
  // Puppeteer cache under root (production)
  '/root/.cache/puppeteer/chrome',
  // System Chromium (Ubuntu/Debian)
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  // Google Chrome stable
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  // Snap-installed Chromium
  '/snap/bin/chromium',
];

/**
 * Walk the Puppeteer cache directory and return the first `chrome` binary found.
 */
function findChromeInCache(cacheDir: string): string | null {
  if (!existsSync(cacheDir)) return null;
  try {
    const { readdirSync } = require('fs');
    const versions = readdirSync(cacheDir) as string[];
    for (const ver of versions.sort().reverse()) {
      const bin = resolve(cacheDir, ver, 'chrome-linux64', 'chrome');
      if (existsSync(bin)) return bin;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolve a usable Chrome / Chromium executable path.
 * Returns `undefined` when Puppeteer should use its own default resolution.
 */
function resolveChromePath(): string | undefined {
  for (const candidate of CANDIDATE_PATHS) {
    // If the candidate is a directory (Puppeteer cache), search inside it
    if (candidate.endsWith('/chrome') && existsSync(candidate)) {
      const found = findChromeInCache(candidate);
      if (found) return found;
      continue;
    }
    // Direct binary path
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** Default Chromium flags for headless server environments */
const DEFAULT_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-extensions',
];

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface LaunchBrowserOptions {
  /** Extra Chromium flags appended after the defaults */
  extraArgs?: string[];
  /** Override the default viewport (1280×800) */
  viewport?: { width: number; height: number };
  /** Override the default user-agent */
  userAgent?: string;
  /** Pass-through any additional Puppeteer options */
  puppeteerOptions?: Partial<LaunchOptions>;
}

/**
 * Launch a headless Chromium browser with automatic Chrome discovery.
 *
 * Returns `{ browser, page }` with a ready-to-use first page that already
 * has the viewport and user-agent configured.
 */
export async function launchBrowser(opts: LaunchBrowserOptions = {}) {
  const executablePath = resolveChromePath();

  const launchOpts: LaunchOptions = {
    headless: true,
    args: [...DEFAULT_ARGS, ...(opts.extraArgs ?? [])],
    ...(executablePath ? { executablePath } : {}),
    ...(opts.puppeteerOptions ?? {}),
  };

  console.log(`[browser] Launching Chrome from: ${executablePath ?? '(puppeteer default)'}`);

  const browser: Browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();

  const vp = opts.viewport ?? { width: 1280, height: 800 };
  await page.setViewport(vp);
  await page.setUserAgent(opts.userAgent ?? DEFAULT_USER_AGENT);

  return { browser, page };
}

export { resolveChromePath };
