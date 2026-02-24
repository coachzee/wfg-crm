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
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

/** Resolve the project root directory (two levels up from server/lib/) */
const PROJECT_ROOT = resolve(import.meta.dirname, '../..');

/** Common Chrome / Chromium paths across Linux environments */
const CANDIDATE_PATHS = [
  // Project-local Puppeteer cache (persists across Manus checkpoint restores)
  resolve(PROJECT_ROOT, '.chrome-cache', 'chrome'),
  // Puppeteer cache under current user
  resolve(homedir(), '.cache/puppeteer/chrome'),
  // Puppeteer cache under root (production)
  '/root/.cache/puppeteer/chrome',
  // Puppeteer cache under ubuntu user
  '/home/ubuntu/.cache/puppeteer/chrome',
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
 * Install Chrome for Puppeteer if not already present.
 * Tries multiple strategies:
 * 1. npx puppeteer browsers install chrome (project-local cache)
 * 2. npx puppeteer browsers install chrome (user/root cache)
 * 3. apt-get install chromium-browser (system package)
 * 4. Direct download of Chrome for Testing
 */
async function ensureChrome(): Promise<void> {
  if (resolveChromePath()) return; // already installed
  const { execSync } = await import('child_process');
  
  // Strategy 1: Install to project-local cache
  const cacheDir = resolve(PROJECT_ROOT, '.chrome-cache');
  console.log(`[browser] Chrome not found — auto-installing to ${cacheDir}...`);
  try {
    execSync('npx puppeteer browsers install chrome', {
      stdio: 'pipe',
      timeout: 300_000,
      env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
    });
    console.log('[browser] Chrome auto-installation complete (project cache)');
    if (resolveChromePath()) return;
  } catch (err: any) {
    console.warn('[browser] Strategy 1 (project cache) failed:', err?.message ?? err);
  }

  // Strategy 2: Install to user/root cache
  try {
    const isRoot = process.getuid && process.getuid() === 0;
    const fallbackCacheDir = isRoot ? '/root/.cache/puppeteer' : resolve(homedir(), '.cache/puppeteer');
    console.log(`[browser] Trying fallback install to ${fallbackCacheDir}...`);
    execSync('npx puppeteer browsers install chrome', {
      stdio: 'pipe',
      timeout: 300_000,
      env: { ...process.env, PUPPETEER_CACHE_DIR: fallbackCacheDir },
    });
    console.log('[browser] Chrome auto-installation complete (fallback cache)');
    if (resolveChromePath()) return;
  } catch (err2: any) {
    console.warn('[browser] Strategy 2 (fallback cache) failed:', err2?.message ?? err2);
  }

  // Strategy 3: Try apt-get install chromium-browser (works on Debian/Ubuntu)
  try {
    console.log('[browser] Trying apt-get install chromium-browser...');
    execSync('apt-get update -qq && apt-get install -y -qq chromium-browser 2>/dev/null || apt-get install -y -qq chromium 2>/dev/null', {
      stdio: 'pipe',
      timeout: 300_000,
    });
    console.log('[browser] chromium-browser installed via apt-get');
    if (resolveChromePath()) return;
  } catch (err3: any) {
    console.warn('[browser] Strategy 3 (apt-get) failed:', err3?.message ?? err3);
  }

  // Strategy 4: Direct download of Chrome for Testing
  try {
    console.log('[browser] Trying direct Chrome for Testing download...');
    const downloadDir = resolve(cacheDir, 'chrome-direct');
    execSync(`mkdir -p ${downloadDir}`, { stdio: 'pipe' });
    // Use the Chrome for Testing API to get the latest stable URL
    const result = execSync(
      'curl -sS "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"',
      { stdio: 'pipe', timeout: 30_000 }
    ).toString();
    const data = JSON.parse(result);
    const stableDownloads = data?.channels?.Stable?.downloads?.chrome;
    const linuxDownload = stableDownloads?.find((d: any) => d.platform === 'linux64');
    if (linuxDownload?.url) {
      console.log(`[browser] Downloading Chrome from ${linuxDownload.url}...`);
      execSync(
        `cd ${downloadDir} && curl -sSL "${linuxDownload.url}" -o chrome.zip && unzip -q -o chrome.zip && rm chrome.zip`,
        { stdio: 'pipe', timeout: 300_000 }
      );
      // Find the chrome binary in the extracted directory
      const extractedBin = resolve(downloadDir, 'chrome-linux64', 'chrome');
      if (existsSync(extractedBin)) {
        execSync(`chmod +x ${extractedBin}`, { stdio: 'pipe' });
        console.log(`[browser] Chrome for Testing installed at ${extractedBin}`);
        // Add to candidate paths dynamically
        CANDIDATE_PATHS.unshift(extractedBin);
        return;
      }
    }
  } catch (err4: any) {
    console.warn('[browser] Strategy 4 (direct download) failed:', err4?.message ?? err4);
  }

  console.error('[browser] All Chrome installation strategies failed. Sync will likely fail.');
}

/**
 * Launch a headless Chromium browser with automatic Chrome discovery.
 * If Chrome is not found, it will be installed automatically before launch.
 *
 * Returns `{ browser, page }` with a ready-to-use first page that already
 * has the viewport and user-agent configured.
 */
export async function launchBrowser(opts: LaunchBrowserOptions = {}) {
  await ensureChrome();
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
