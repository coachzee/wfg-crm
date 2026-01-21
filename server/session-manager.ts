/**
 * Session Manager - Production-grade session persistence and validation
 * 
 * This module provides:
 * 1. Persistent cookie storage to disk (survives server restarts)
 * 2. Session validation before use (checks if cookies are still valid)
 * 3. Automatic session refresh when expired
 * 4. Single source of truth for all login sessions
 * 
 * Design principles:
 * - Sessions are cached for 24 hours by default
 * - Always validate session before use (quick HTTP check)
 * - Only trigger OTP login when session is truly expired
 * - Never create multiple concurrent login attempts
 */

import fs from 'fs';
import path from 'path';
import puppeteer, { Browser, Page, Cookie } from 'puppeteer';

// Session storage directory
const SESSION_DIR = path.join(process.cwd(), '.sessions');

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

interface StoredSession {
  cookies: Cookie[];
  createdAt: string;
  expiresAt: string;
  platform: string;
  lastValidated?: string;
}

interface SessionValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Get the path to a session file
 */
function getSessionPath(platform: string): string {
  return path.join(SESSION_DIR, `${platform}-session.json`);
}

/**
 * Load a stored session from disk
 */
export function loadSession(platform: string): StoredSession | null {
  const sessionPath = getSessionPath(platform);
  
  if (!fs.existsSync(sessionPath)) {
    console.log(`[SessionManager] No stored session for ${platform}`);
    return null;
  }
  
  try {
    const data = fs.readFileSync(sessionPath, 'utf-8');
    const session = JSON.parse(data) as StoredSession;
    
    // Check if session has expired
    const expiresAt = new Date(session.expiresAt);
    if (new Date() > expiresAt) {
      console.log(`[SessionManager] Stored session for ${platform} has expired`);
      fs.unlinkSync(sessionPath);
      return null;
    }
    
    console.log(`[SessionManager] Loaded stored session for ${platform} (expires: ${session.expiresAt})`);
    return session;
  } catch (error) {
    console.error(`[SessionManager] Error loading session for ${platform}:`, error);
    return null;
  }
}

/**
 * Save a session to disk
 */
export function saveSession(platform: string, cookies: Cookie[], expiryHours: number = 24): void {
  const sessionPath = getSessionPath(platform);
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
  
  const session: StoredSession = {
    cookies,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    platform,
    lastValidated: now.toISOString(),
  };
  
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
  console.log(`[SessionManager] Saved session for ${platform} (expires: ${expiresAt.toISOString()})`);
}

/**
 * Clear a stored session
 */
export function clearSession(platform: string): void {
  const sessionPath = getSessionPath(platform);
  
  if (fs.existsSync(sessionPath)) {
    fs.unlinkSync(sessionPath);
    console.log(`[SessionManager] Cleared session for ${platform}`);
  }
}

/**
 * Validate MyWFG session by checking if we can access a protected page
 */
export async function validateMyWFGSession(cookies: Cookie[]): Promise<SessionValidationResult> {
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setCookie(...cookies);
    
    // Try to access the dashboard - if redirected to login, session is invalid
    await page.goto('https://www.mywfg.com/home', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check if we're on a login page
    if (currentUrl.includes('login') || 
        currentUrl.includes('signin') ||
        pageText.includes('Sign In') ||
        pageText.includes('Enter your username')) {
      return { valid: false, reason: 'Redirected to login page' };
    }
    
    // Check if we see authenticated content
    if (pageText.includes('Welcome') || 
        pageText.includes('MY WFG') ||
        pageText.includes('Dashboard') ||
        pageText.includes('ZAID')) {
      return { valid: true };
    }
    
    return { valid: false, reason: 'Could not verify authenticated state' };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, reason: `Validation error: ${errorMsg}` };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Validate Transamerica session
 */
export async function validateTransamericaSession(cookies: Cookie[]): Promise<SessionValidationResult> {
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setCookie(...cookies);
    
    // Try to access Life Access
    await page.goto('https://www.transamerica.com/portal/life-access', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    const currentUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Check if we're on a login page
    if (currentUrl.includes('login') || 
        currentUrl.includes('signin') ||
        pageText.includes('Sign In') ||
        pageText.includes('Enter your username')) {
      return { valid: false, reason: 'Redirected to login page' };
    }
    
    // Check if we see authenticated content
    if (pageText.includes('Life Access') || 
        pageText.includes('Policy') ||
        pageText.includes('Welcome')) {
      return { valid: true };
    }
    
    return { valid: false, reason: 'Could not verify authenticated state' };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, reason: `Validation error: ${errorMsg}` };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Get a valid session for a platform, validating if necessary
 * Returns cookies if valid, null if session needs refresh
 */
export async function getValidSession(platform: 'mywfg' | 'transamerica'): Promise<Cookie[] | null> {
  const session = loadSession(platform);
  
  if (!session) {
    return null;
  }
  
  // Check when session was last validated
  const lastValidated = session.lastValidated ? new Date(session.lastValidated) : new Date(0);
  const hoursSinceValidation = (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60);
  
  // If validated within the last hour, trust the session
  if (hoursSinceValidation < 1) {
    console.log(`[SessionManager] Session for ${platform} validated recently, using cached`);
    return session.cookies;
  }
  
  // Validate the session
  console.log(`[SessionManager] Validating session for ${platform}...`);
  
  const validationResult = platform === 'mywfg' 
    ? await validateMyWFGSession(session.cookies)
    : await validateTransamericaSession(session.cookies);
  
  if (validationResult.valid) {
    // Update last validated time
    session.lastValidated = new Date().toISOString();
    const sessionPath = getSessionPath(platform);
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    
    console.log(`[SessionManager] Session for ${platform} is valid`);
    return session.cookies;
  }
  
  console.log(`[SessionManager] Session for ${platform} is invalid: ${validationResult.reason}`);
  clearSession(platform);
  return null;
}

/**
 * Apply cookies to a Puppeteer page
 */
export async function applySessionToPage(page: Page, cookies: Cookie[]): Promise<void> {
  await page.setCookie(...cookies);
  console.log(`[SessionManager] Applied ${cookies.length} cookies to page`);
}

/**
 * Extract and save cookies from a Puppeteer page after successful login
 */
export async function saveSessionFromPage(page: Page, platform: string, expiryHours: number = 24): Promise<void> {
  const cookies = await page.cookies();
  saveSession(platform, cookies, expiryHours);
}

// Lock to prevent concurrent login attempts
const loginLocks: Map<string, Promise<Cookie[] | null>> = new Map();

/**
 * Get or create a session with locking to prevent concurrent logins
 * This ensures only one login attempt happens at a time per platform
 */
export async function getOrCreateSession(
  platform: 'mywfg' | 'transamerica',
  loginFn: () => Promise<Cookie[] | null>
): Promise<Cookie[] | null> {
  // Check for existing valid session first
  const existingSession = await getValidSession(platform);
  if (existingSession) {
    return existingSession;
  }
  
  // Check if there's already a login in progress
  const existingLock = loginLocks.get(platform);
  if (existingLock) {
    console.log(`[SessionManager] Login already in progress for ${platform}, waiting...`);
    return existingLock;
  }
  
  // Create new login attempt with lock
  console.log(`[SessionManager] Starting new login for ${platform}...`);
  
  const loginPromise = (async () => {
    try {
      const cookies = await loginFn();
      if (cookies) {
        saveSession(platform, cookies);
      }
      return cookies;
    } finally {
      loginLocks.delete(platform);
    }
  })();
  
  loginLocks.set(platform, loginPromise);
  return loginPromise;
}
