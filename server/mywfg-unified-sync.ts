/**
 * Unified MyWFG Sync - Uses OTP V2 session-based approach
 * 
 * This module provides a single-browser-session sync that:
 * 1. Logs in to MyWFG with OTP V2 (session-based, prefix-matching)
 * 2. Gets cookies from the session
 * 3. Uses existing fetchDownlineStatus with those cookies
 * 4. Uses existing syncAgentsFromDownlineStatus to update the database
 * 
 * OTP Flow (same as downline scraper):
 * 1. Start OTP session BEFORE triggering login
 * 2. Submit credentials (triggers OTP email)
 * 3. Extract prefix from OTP page
 * 4. Wait for OTP with session + prefix matching
 * 5. Submit OTP
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { launchBrowser } from './lib/browser';
import { startOTPSession, waitForOTPWithSession, clearUsedOTPs } from './gmail-otp-v2';
import { getDb } from './db';
import * as schema from '../drizzle/schema';
import { fetchDownlineStatus, syncAgentsFromDownlineStatus } from './mywfg-downline-scraper';

// Helper to require environment variables
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getMyWFGLoginCredentials() {
  return {
    username: mustGetEnv('MYWFG_USERNAME'),
    password: mustGetEnv('MYWFG_PASSWORD'),
  };
}

function getGmailCredentials() {
  return {
    email: mustGetEnv('MYWFG_EMAIL'),
    appPassword: mustGetEnv('MYWFG_APP_PASSWORD'),
  };
}

/**
 * Login to MyWFG using OTP V2 session-based approach
 * (Same proven approach as the downline scraper)
 */
async function loginToMyWFG(page: Page): Promise<boolean> {
  const creds = getMyWFGLoginCredentials();
  const gmailCreds = getGmailCredentials();
  
  console.log('[Unified Sync] Navigating to MyWFG...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for login form
  await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
  
  // START OTP SESSION BEFORE TRIGGERING LOGIN
  // This ensures we only accept OTPs that arrive AFTER this point
  console.log('[Unified Sync] Starting OTP session before login...');
  const otpSessionId = startOTPSession('mywfg-unified');
  
  // Find and fill username
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  if (!usernameInput) throw new Error('Username input not found');
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username, { delay: 30 });
  
  // Find and fill password
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  if (!passwordInput) throw new Error('Password input not found');
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password, { delay: 30 });
  
  // Click login button - this triggers the OTP email
  console.log('[Unified Sync] Clicking login button (this triggers OTP)...');
  const loginButton = await page.$('button[id="mywfgTheyLive"]') || await page.$('button[type="submit"]');
  if (loginButton) {
    await Promise.all([
      loginButton.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
    ]);
  } else {
    // Fallback: press Enter
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  }
  
  // Wait for page to stabilize
  await new Promise(r => setTimeout(r, 5000));
  
  // Take debug screenshot
  try {
    await page.screenshot({ path: '/tmp/unified-sync-after-login.png', fullPage: true });
    console.log('[Unified Sync] Screenshot saved to /tmp/unified-sync-after-login.png');
  } catch (e) {
    console.log('[Unified Sync] Could not take screenshot:', e);
  }
  
  // Check for error page - with null safety
  const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
  
  if (pageText.includes('ERROR OCCURRED') || pageText.includes('Bad Request')) {
    console.log('[Unified Sync] Error page detected, retrying...');
    clearUsedOTPs();
    await page.goto('https://www.mywfg.com', { waitUntil: 'networkidle2', timeout: 60000 });
    return loginToMyWFG(page);
  }
  
  // Check for OTP requirement
  const pageContent = await page.content();
  const otpRequired = pageContent.includes('mywfgOtppswd') || 
                      pageText.includes('One-Time Password') ||
                      pageText.includes('Security Code') ||
                      pageText.includes('Validation Code');
  
  if (otpRequired) {
    console.log('[Unified Sync] OTP required, waiting for email (session-based, 180s timeout)...');
    
    // Get the prefix shown on the page - REQUIRED for verification
    const pagePrefix = await page.evaluate(() => {
      const bodyText = document.body ? document.body.innerText : '';
      const prefixMatch = bodyText.match(/(\d{4})\s*-/);
      return prefixMatch ? prefixMatch[1] : null;
    });
    
    if (pagePrefix) {
      console.log(`[Unified Sync] Page shows OTP prefix: ${pagePrefix}`);
    } else {
      console.log('[Unified Sync] Warning: Could not extract OTP prefix from page');
    }
    
    // Wait for OTP using the session we started BEFORE login
    // Pass the expected prefix to ensure we get the correct OTP
    const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3, pagePrefix || undefined);
    
    if (!otpResult?.success || !otpResult?.otp) {
      throw new Error(`Failed to get OTP: ${otpResult?.error}`);
    }
    
    console.log(`[Unified Sync] ✓ OTP received: ${otpResult.otp}`);
    
    // The OTP from email is already just the 6 digits we need to enter
    const otpToEnter = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
    console.log(`[Unified Sync] Entering OTP digits: ${otpToEnter}`);
    
    // Find OTP input - try multiple selectors
    let otpInput = await page.$('input[id="mywfgOtppswd"]');
    if (!otpInput) otpInput = await page.$('input[name="otp"]');
    if (!otpInput) otpInput = await page.$('input[name="otpCode"]');
    if (!otpInput) otpInput = await page.$('input[placeholder*="code" i]');
    
    // Try to find any text input that's not the username/password fields
    if (!otpInput) {
      const inputs = await page.$$('input');
      for (const input of inputs) {
        const type = await input.evaluate(el => el.getAttribute('type'));
        const id = await input.evaluate(el => el.id);
        const isVisible = await input.isVisible();
        
        if (!isVisible) continue;
        if (id?.toLowerCase().includes('username')) continue;
        if (id?.toLowerCase().includes('password')) continue;
        if (type === 'hidden' || type === 'password') continue;
        
        if (type === 'text' || type === 'tel' || type === null) {
          otpInput = input;
          console.log(`[Unified Sync] Found OTP input: type=${type}, id=${id}`);
          break;
        }
      }
    }
    
    if (otpInput) {
      await otpInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await otpInput.type(otpToEnter, { delay: 50 });
      console.log('[Unified Sync] OTP entered');
      
      await new Promise(r => setTimeout(r, 500));
      
      // Take screenshot before submit
      try {
        await page.screenshot({ path: '/tmp/unified-sync-otp-entered.png', fullPage: true });
      } catch (e) {}
      
      // Submit OTP - find the Submit button
      let submitBtn: any = await page.$('button[id="mywfgTheylive"]');
      if (!submitBtn) submitBtn = await page.$('button[id="mywfgTheyLive"]');
      if (!submitBtn) {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await btn.evaluate((el: HTMLElement) => el.textContent?.trim().toLowerCase());
          if (text === 'submit') {
            submitBtn = btn;
            break;
          }
        }
      }
      if (!submitBtn) submitBtn = await page.$('button[type="submit"]');
      if (!submitBtn) submitBtn = await page.$('input[type="submit"]');
      
      if (submitBtn) {
        console.log('[Unified Sync] Clicking submit button...');
        await submitBtn.click();
        
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        } catch (e) {
          console.log('[Unified Sync] Navigation wait completed or timed out');
        }
      } else {
        console.log('[Unified Sync] Warning: Submit button not found, trying Enter key');
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      }
      
      await new Promise(r => setTimeout(r, 3000));
      try {
        await page.screenshot({ path: '/tmp/unified-sync-after-otp-submit.png', fullPage: true });
      } catch (e) {}
    } else {
      console.log('[Unified Sync] Warning: OTP input not found');
      try {
        await page.screenshot({ path: '/tmp/unified-sync-otp-input-not-found.png', fullPage: true });
      } catch (e) {}
    }
  }
  
  // Verify login success
  const currentUrl = page.url();
  const isLoggedIn = currentUrl.includes('mywfg.com') && 
                     !currentUrl.includes('login') && 
                     !currentUrl.includes('signin');
  
  // Take final screenshot
  try {
    await page.screenshot({ path: '/tmp/unified-sync-login-result.png' });
  } catch (e) {}
  
  console.log(`[Unified Sync] Login ${isLoggedIn ? 'successful' : 'failed'} (URL: ${currentUrl})`);
  return isLoggedIn;
}

/**
 * Main unified sync function
 */
export async function runUnifiedMyWFGSync(): Promise<{
  success: boolean;
  error?: string;
  agentsFound?: number;
  agentsUpdated?: number;
}> {
  const startTime = new Date().toISOString();
  console.log(`[Unified Sync] Starting at ${startTime}`);
  
  let browser: Browser | null = null;
  let page: Page;
  
  try {
    // Step 1: Launch browser and login
    console.log('[Unified Sync] Step 1: Login to MyWFG');
    ({ browser, page } = await launchBrowser());
    
    const loginSuccess = await loginToMyWFG(page);
    if (!loginSuccess) {
      throw new Error('Login failed');
    }
    console.log('[Unified Sync] Login successful');
    
    // Step 2: Get cookies
    console.log('[Unified Sync] Step 2: Get session cookies');
    const cookies = await page.cookies();
    console.log(`[Unified Sync] Got ${cookies.length} cookies`);
    
    // Close login browser
    await browser.close();
    browser = null;
    
    // Step 3: Fetch downline status using existing function with cookies
    console.log('[Unified Sync] Step 3: Fetch downline status');
    const downlineResult = await fetchDownlineStatus('73DXR', 'BASE_SHOP', cookies);
    
    if (!downlineResult.success) {
      throw new Error(`Downline fetch failed: ${downlineResult.error}`);
    }
    
    console.log(`[Unified Sync] Found ${downlineResult.agents.length} agents`);
    
    // Step 4: Sync to database using existing function
    console.log('[Unified Sync] Step 4: Sync to database');
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const syncResult = await syncAgentsFromDownlineStatus(db, schema, downlineResult, 'BASE_SHOP');
    
    // Step 5: Log success
    await db.insert(schema.mywfgSyncLogs).values({
      syncType: 'DOWNLINE_STATUS',
      status: 'SUCCESS',
      recordsProcessed: downlineResult.agents.length,
      errorMessage: `Synced ${downlineResult.agents.length} agents`,
    });
    
    console.log(`[Unified Sync] Complete! Found ${downlineResult.agents.length} agents, updated ${syncResult.updated}`);
    
    return {
      success: true,
      agentsFound: downlineResult.agents.length,
      agentsUpdated: syncResult.updated,
    };
    
  } catch (error) {
    console.error('[Unified Sync] Error:', error);
    
    // Log failure
    try {
      const db = await getDb();
      if (db) {
        await db.insert(schema.mywfgSyncLogs).values({
          syncType: 'DOWNLINE_STATUS',
          status: 'FAILED',
          recordsProcessed: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (e) {}
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
