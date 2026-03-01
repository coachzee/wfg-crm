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
import { existsSync, readdirSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

/**
 * Resolve the project root directory.
 * - In development (tsx server/_core/index.ts): import.meta.dirname = /app/server/_core → '../..' = /app ✓
 * - In production (node dist/index.js): import.meta.dirname = /app/dist → '..' = /app ✓
 * We detect the environment by checking if package.json exists one level up (production)
 * vs two levels up (development).
 */
function findProjectRoot(): string {
  // Production: dist/index.js → import.meta.dirname is /app/dist → one level up is /app
  const oneUp = resolve(import.meta.dirname, '..');
  const twoUp = resolve(import.meta.dirname, '../..');
  // If package.json exists one level up, we're in production (dist/)
  if (existsSync(resolve(oneUp, 'package.json'))) return oneUp;
  // Otherwise we're in development (server/_core/) → two levels up is project root
  if (existsSync(resolve(twoUp, 'package.json'))) return twoUp;
  // Fallback: use process.cwd() which is typically the project root
  return process.cwd();
}
const PROJECT_ROOT = findProjectRoot();

/** Common Chrome / Chromium paths across Linux environments */
const CANDIDATE_PATHS = [
  // Project-local Puppeteer cache (persists across Manus checkpoint restores)
  resolve(PROJECT_ROOT, '.chrome-cache', 'chrome'),
  // Project-local direct download
  resolve(PROJECT_ROOT, '.chrome-cache', 'chrome-direct', 'chrome-linux64', 'chrome'),
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
    if (candidate.endsWith('/chrome') && !candidate.includes('chrome-linux64') && existsSync(candidate)) {
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
 * 1. node_modules/.bin/puppeteer browsers install chrome (project-local cache)
 * 2. node_modules/.bin/puppeteer browsers install chrome (user/root cache)
 * 3. apt-get install chromium-browser (system package)
 * 4. Direct download of Chrome for Testing via curl
 * 5. Direct download via wget (fallback if curl fails)
 */
async function ensureChrome(): Promise<void> {
  if (resolveChromePath()) return; // already installed
  const { execSync } = await import('child_process');
  
  console.log(`[browser] PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`[browser] CWD: ${process.cwd()}`);
  console.log(`[browser] Running as UID: ${process.getuid?.() ?? 'unknown'}`);
  
  // Use node_modules/.bin/puppeteer if available (avoids npx PATH issues on production servers)
  const puppeteerBin = resolve(PROJECT_ROOT, 'node_modules/.bin/puppeteer');
  const puppeteerCmd = existsSync(puppeteerBin)
    ? `"${puppeteerBin}" browsers install chrome`
    : 'npx puppeteer browsers install chrome';

  // Strategy 1: Install to project-local cache
  const cacheDir = resolve(PROJECT_ROOT, '.chrome-cache');
  console.log(`[browser] Chrome not found — auto-installing to ${cacheDir}...`);
  try {
    mkdirSync(cacheDir, { recursive: true });
    execSync(puppeteerCmd, {
      stdio: 'pipe',
      timeout: 300_000,
      env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
    });
    console.log('[browser] Chrome auto-installation complete (project cache)');
    if (resolveChromePath()) return;
  } catch (err: any) {
    const stderr = err?.stderr?.toString?.() ?? '';
    console.warn('[browser] Strategy 1 (project cache) failed:', err?.message ?? err);
    if (stderr) console.warn('[browser] Strategy 1 stderr:', stderr.substring(0, 500));
  }

  // Strategy 2: Install to user/root cache
  try {
    const isRoot = process.getuid && process.getuid() === 0;
    const fallbackCacheDir = isRoot ? '/root/.cache/puppeteer' : resolve(homedir(), '.cache/puppeteer');
    console.log(`[browser] Trying fallback install to ${fallbackCacheDir}...`);
    mkdirSync(fallbackCacheDir, { recursive: true });
    execSync(puppeteerCmd, {
      stdio: 'pipe',
      timeout: 300_000,
      env: { ...process.env, PUPPETEER_CACHE_DIR: fallbackCacheDir },
    });
    console.log('[browser] Chrome auto-installation complete (fallback cache)');
    if (resolveChromePath()) return;
  } catch (err2: any) {
    const stderr = err2?.stderr?.toString?.() ?? '';
    console.warn('[browser] Strategy 2 (fallback cache) failed:', err2?.message ?? err2);
    if (stderr) console.warn('[browser] Strategy 2 stderr:', stderr.substring(0, 500));
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

  // Strategy 4: Direct download of Chrome for Testing via curl
  const downloadDir = resolve(cacheDir, 'chrome-direct');
  try {
    console.log('[browser] Trying direct Chrome for Testing download...');
    mkdirSync(downloadDir, { recursive: true });
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
        `cd ${downloadDir} && curl -sSL "${linuxDownload.url}" -o chrome.zip && unzip -q -o chrome.zip && rm -f chrome.zip`,
        { stdio: 'pipe', timeout: 300_000 }
      );
      // Find the chrome binary in the extracted directory
      const extractedBin = resolve(downloadDir, 'chrome-linux64', 'chrome');
      if (existsSync(extractedBin)) {
        execSync(`chmod +x "${extractedBin}"`, { stdio: 'pipe' });
        console.log(`[browser] Chrome for Testing installed at ${extractedBin}`);
        // Add to candidate paths dynamically
        CANDIDATE_PATHS.unshift(extractedBin);
        return;
      }
    }
  } catch (err4: any) {
    const stderr = err4?.stderr?.toString?.() ?? '';
    console.warn('[browser] Strategy 4 (direct download) failed:', err4?.message ?? err4);
    if (stderr) console.warn('[browser] Strategy 4 stderr:', stderr.substring(0, 500));
  }

  // Strategy 5: Direct download via wget (fallback)
  try {
    console.log('[browser] Trying wget-based Chrome download...');
    mkdirSync(downloadDir, { recursive: true });
    // Download a known stable Chrome for Testing version
    const versionUrl = 'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json';
    const versionResult = execSync(
      `wget -q -O - "${versionUrl}"`,
      { stdio: 'pipe', timeout: 30_000 }
    ).toString();
    const versionData = JSON.parse(versionResult);
    const chromeUrl = versionData?.channels?.Stable?.downloads?.chrome?.find((d: any) => d.platform === 'linux64')?.url;
    if (chromeUrl) {
      console.log(`[browser] Downloading Chrome via wget from ${chromeUrl}...`);
      execSync(
        `cd "${downloadDir}" && wget -q "${chromeUrl}" -O chrome.zip && unzip -q -o chrome.zip && rm -f chrome.zip`,
        { stdio: 'pipe', timeout: 300_000 }
      );
      const extractedBin = resolve(downloadDir, 'chrome-linux64', 'chrome');
      if (existsSync(extractedBin)) {
        execSync(`chmod +x "${extractedBin}"`, { stdio: 'pipe' });
        console.log(`[browser] Chrome for Testing installed via wget at ${extractedBin}`);
        CANDIDATE_PATHS.unshift(extractedBin);
        return;
      }
    }
  } catch (err5: any) {
    console.warn('[browser] Strategy 5 (wget) failed:', err5?.message ?? err5);
  }

  // Strategy 6: Try to install system Chrome via Google's repo
  try {
    console.log('[browser] Trying Google Chrome stable install via dpkg...');
    execSync(
      'wget -q -O /tmp/google-chrome.deb "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" && ' +
      'dpkg -i /tmp/google-chrome.deb 2>/dev/null || apt-get install -f -y -qq 2>/dev/null && ' +
      'rm -f /tmp/google-chrome.deb',
      { stdio: 'pipe', timeout: 300_000 }
    );
    console.log('[browser] Google Chrome stable installed via dpkg');
    if (resolveChromePath()) return;
  } catch (err6: any) {
    console.warn('[browser] Strategy 6 (dpkg) failed:', err6?.message ?? err6);
  }

  console.error('[browser] All Chrome installation strategies failed. Sync will likely fail.');
  console.error('[browser] Candidate paths checked:', CANDIDATE_PATHS.join(', '));
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
