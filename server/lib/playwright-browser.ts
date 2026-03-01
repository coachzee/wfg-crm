/**
 * Centralized Playwright browser launcher with auto-install.
 *
 * Ensures Playwright Chromium is installed before launching.
 * All files using Playwright should use this instead of importing chromium directly.
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Detect project root correctly in both dev (server/_core/) and production (dist/)
const PROJECT_ROOT = (() => {
  const oneUp = resolve(import.meta.dirname, '..');
  const twoUp = resolve(import.meta.dirname, '../..');
  if (existsSync(resolve(oneUp, 'package.json'))) return oneUp;
  if (existsSync(resolve(twoUp, 'package.json'))) return twoUp;
  return process.cwd();
})();

let playwrightInstallAttempted = false;

/**
 * Ensure Playwright Chromium browser is installed.
 * Tries multiple strategies to install if missing.
 */
async function ensurePlaywrightChromium(): Promise<void> {
  if (playwrightInstallAttempted) return;
  playwrightInstallAttempted = true;

  // Check common Playwright cache locations
  const cacheLocations = [
    '/root/.cache/ms-playwright',
    resolve(process.env.HOME || '/root', '.cache/ms-playwright'),
  ];

  for (const loc of cacheLocations) {
    if (existsSync(loc)) {
      try {
        // Check if chromium binary exists somewhere in the cache
        const result = execSync(`find "${loc}" -name "chrome" -o -name "chrome-headless-shell" -o -name "chromium" 2>/dev/null | head -1`, {
          stdio: 'pipe',
          timeout: 5000,
        }).toString().trim();
        if (result) {
          console.log(`[playwright-browser] Chromium found at: ${result}`);
          return;
        }
      } catch {
        // ignore
      }
    }
  }

  console.log('[playwright-browser] Chromium not found, attempting auto-install...');

  // Strategy 1: Use node_modules/.bin/playwright
  const playwrightBin = resolve(PROJECT_ROOT, 'node_modules/.bin/playwright');
  if (existsSync(playwrightBin)) {
    try {
      console.log('[playwright-browser] Strategy 1: Installing via node_modules/.bin/playwright...');
      execSync(`"${playwrightBin}" install chromium`, {
        stdio: 'pipe',
        timeout: 300_000,
        cwd: PROJECT_ROOT,
      });
      console.log('[playwright-browser] Chromium installed successfully via playwright CLI');
      
      // Also try to install system deps
      try {
        execSync(`"${playwrightBin}" install-deps chromium`, {
          stdio: 'pipe',
          timeout: 300_000,
          cwd: PROJECT_ROOT,
        });
        console.log('[playwright-browser] System dependencies installed');
      } catch (depsErr: any) {
        console.warn('[playwright-browser] System deps install failed (non-fatal):', depsErr?.message?.substring(0, 200));
      }
      return;
    } catch (err: any) {
      const stderr = err?.stderr?.toString?.() ?? '';
      console.warn('[playwright-browser] Strategy 1 failed:', err?.message?.substring(0, 200));
      if (stderr) console.warn('[playwright-browser] stderr:', stderr.substring(0, 300));
    }
  }

  // Strategy 2: Use npx playwright
  try {
    console.log('[playwright-browser] Strategy 2: Installing via npx playwright...');
    execSync('npx playwright install chromium', {
      stdio: 'pipe',
      timeout: 300_000,
      cwd: PROJECT_ROOT,
    });
    console.log('[playwright-browser] Chromium installed via npx');
    return;
  } catch (err2: any) {
    console.warn('[playwright-browser] Strategy 2 failed:', err2?.message?.substring(0, 200));
  }

  // Strategy 3: Direct download
  try {
    console.log('[playwright-browser] Strategy 3: Installing system Chromium...');
    execSync(
      'apt-get update -qq && apt-get install -y -qq chromium-browser 2>/dev/null || apt-get install -y -qq chromium 2>/dev/null',
      { stdio: 'pipe', timeout: 300_000 }
    );
    console.log('[playwright-browser] System Chromium installed');
    return;
  } catch (err3: any) {
    console.warn('[playwright-browser] Strategy 3 failed:', err3?.message?.substring(0, 200));
  }

  console.error('[playwright-browser] All Chromium installation strategies failed. Sync will likely fail.');
}

/**
 * Launch a Playwright Chromium browser with auto-install.
 * Returns a Browser instance ready for use.
 */
export async function launchPlaywrightBrowser(opts?: {
  headless?: boolean;
}): Promise<Browser> {
  await ensurePlaywrightChromium();
  
  // Try to find system chromium as fallback executable
  const systemChromePaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ];
  
  let executablePath: string | undefined;
  for (const p of systemChromePaths) {
    if (existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  try {
    const browser = await chromium.launch({
      headless: opts?.headless ?? true,
      ...(executablePath ? { executablePath } : {}),
    });
    return browser;
  } catch (launchErr: any) {
    // If launch fails, try with system chromium explicitly
    if (!executablePath) {
      console.error('[playwright-browser] Launch failed and no system chromium found:', launchErr?.message?.substring(0, 200));
      throw launchErr;
    }
    console.warn('[playwright-browser] Retrying launch with system chromium at:', executablePath);
    return chromium.launch({
      headless: opts?.headless ?? true,
      executablePath,
    });
  }
}

export { chromium };
