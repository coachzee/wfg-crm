/**
 * Centralized Browser Launcher
 *
 * Provides a single entry point for launching Puppeteer browsers across all
 * sync modules. Automatically detects available Chrome/Chromium installations
 * and falls back gracefully, solving the recurring "Could not find Chrome"
 * error on production servers where Puppeteer's bundled Chrome may not be
 * installed.
 *
 * Detection order:
 *   1. PUPPETEER_EXECUTABLE_PATH environment variable (explicit override)
 *   2. Puppeteer's bundled Chrome (default cache path)
 *   3. System chromium-browser (/usr/bin/chromium-browser)
 *   4. System chromium (/usr/bin/chromium)
 *   5. System google-chrome-stable (/usr/bin/google-chrome-stable)
 *   6. System google-chrome (/usr/bin/google-chrome)
 */
import puppeteer, { type Browser, type LaunchOptions } from "puppeteer";
import { existsSync } from "fs";
import { execSync } from "child_process";

const SYSTEM_CHROME_PATHS = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/local/bin/chromium-browser",
  "/usr/local/bin/chromium",
  "/usr/local/bin/google-chrome-stable",
  "/usr/local/bin/google-chrome",
];

let cachedExecutablePath: string | undefined;

/**
 * Detect the best available Chrome/Chromium executable.
 * Results are cached after the first successful detection.
 */
function detectChromePath(): string | undefined {
  if (cachedExecutablePath !== undefined) {
    return cachedExecutablePath || undefined;
  }

  // 1. Explicit environment variable override
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) {
    console.log(`[Browser] Using PUPPETEER_EXECUTABLE_PATH: ${envPath}`);
    cachedExecutablePath = envPath;
    return envPath;
  }

  // 2. Try Puppeteer's default bundled Chrome
  try {
    const bundledPath = puppeteer.executablePath();
    if (bundledPath && existsSync(bundledPath)) {
      console.log(`[Browser] Using Puppeteer bundled Chrome: ${bundledPath}`);
      cachedExecutablePath = bundledPath;
      return bundledPath;
    }
  } catch {
    // Bundled Chrome not available — continue to fallbacks
  }

  // 3. Search system paths
  for (const candidate of SYSTEM_CHROME_PATHS) {
    if (existsSync(candidate)) {
      try {
        const version = execSync(`${candidate} --version 2>/dev/null`, {
          timeout: 5000,
        })
          .toString()
          .trim();
        console.log(`[Browser] Using system Chrome: ${candidate} (${version})`);
      } catch {
        console.log(`[Browser] Using system Chrome: ${candidate}`);
      }
      cachedExecutablePath = candidate;
      return candidate;
    }
  }

  // 4. Try `which` as a last resort
  try {
    const whichResult = execSync("which chromium-browser || which chromium || which google-chrome 2>/dev/null", {
      timeout: 5000,
    })
      .toString()
      .trim();
    if (whichResult && existsSync(whichResult)) {
      console.log(`[Browser] Using Chrome found via which: ${whichResult}`);
      cachedExecutablePath = whichResult;
      return whichResult;
    }
  } catch {
    // No Chrome found via which
  }

  console.warn(
    "[Browser] No Chrome/Chromium installation found. " +
      "Puppeteer will attempt to use its default, which may fail. " +
      "Install Chrome with: npx puppeteer browsers install chrome"
  );
  cachedExecutablePath = "";
  return undefined;
}

/** Default launch arguments for headless Chrome in server environments. */
const DEFAULT_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--disable-extensions",
];

/**
 * Launch a Puppeteer browser with automatic Chrome detection.
 *
 * @param overrides - Optional Puppeteer LaunchOptions to merge with defaults.
 *                    Any provided `args` are appended to the default set.
 * @returns A running Browser instance.
 */
export async function launchBrowser(
  overrides: LaunchOptions = {}
): Promise<Browser> {
  const executablePath = detectChromePath();

  const mergedArgs = [
    ...DEFAULT_ARGS,
    ...(overrides.args ?? []),
  ];

  // Remove duplicates while preserving order
  const uniqueArgs = Array.from(new Set(mergedArgs));

  const options: LaunchOptions = {
    headless: true,
    ...overrides,
    args: uniqueArgs,
    ...(executablePath ? { executablePath } : {}),
  };

  console.log(
    `[Browser] Launching Chrome${executablePath ? ` from ${executablePath}` : " (default)"}...`
  );

  return puppeteer.launch(options);
}

/**
 * Get the detected Chrome executable path without launching a browser.
 * Useful for diagnostics and health checks.
 */
export function getChromePath(): string | undefined {
  return detectChromePath();
}
