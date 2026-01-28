/**
 * Unified MyWFG Sync - Simple, robust approach
 * 
 * This module provides a single-browser-session sync that:
 * 1. Logs in to MyWFG with simple OTP handling
 * 2. Gets cookies from the session
 * 3. Uses existing fetchDownlineStatus with those cookies
 * 4. Uses existing syncAgentsFromDownlineStatus to update the database
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { getDb } from './db';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { fetchDownlineStatus, syncAgentsFromDownlineStatus } from './mywfg-downline-scraper';

// Track used OTPs to avoid reuse
const usedOTPs = new Set<string>();

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
    appPassword: mustGetEnv('MYWFG_APP_PASSWORD'),
    email: mustGetEnv('MYWFG_EMAIL'),
  };
}

function getGmailCredentials() {
  return {
    email: mustGetEnv('MYWFG_EMAIL'),
    appPassword: mustGetEnv('MYWFG_APP_PASSWORD'),
  };
}

/**
 * OTP fetcher - gets the most recent OTP matching the expected prefix
 */
async function fetchLatestOTP(gmailCreds: { email: string; appPassword: string }, expectedPrefix?: string): Promise<string | null> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: gmailCreds.email,
      password: gmailCreds.appPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    let resolved = false;

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err) => {
        if (err) {
          if (!resolved) { resolved = true; resolve(null); }
          imap.end();
          return;
        }

        // Search for recent emails from Transamerica (MyWFG uses Transamerica for OTP)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '-');
        
        imap.search([['SINCE', dateStr], ['FROM', 'transamerica']], (searchErr, results) => {
          if (searchErr || !results || results.length === 0) {
            if (!resolved) { resolved = true; resolve(null); }
            imap.end();
            return;
          }

          // Get the most recent emails (last 20 to account for indexing delays)
          const recentUids = results.slice(-20);
          
          const fetch = imap.fetch(recentUids, { bodies: '' });
          const emails: { uid: number; date: Date; otp: string | null; prefix: string | null }[] = [];

          fetch.on('message', (msg, seqno) => {
            let uid = 0;
            msg.on('attributes', (attrs) => { uid = attrs.uid; });
            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
              stream.on('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  const text = (parsed.text || '') + (parsed.html || '');
                  
                  // Extract OTP - format is "XXXX - YYYYYY" where XXXX is prefix and YYYYYY is the 6-digit code
                  const otpMatch = text.match(/(\d{4})\s*-\s*(\d{6})/);
                  if (otpMatch) {
                    const prefix = otpMatch[1];
                    const otp = otpMatch[2]; // Just the 6-digit code
                    emails.push({
                      uid,
                      date: parsed.date || new Date(0),
                      prefix,
                      otp,
                    });
                  }
                } catch (e) {}
              });
            });
          });

          fetch.once('end', () => {
            imap.end();
            
            // Sort by date descending and find first unused OTP that matches prefix
            emails.sort((a, b) => b.date.getTime() - a.date.getTime());
            
            for (const email of emails) {
              if (email.otp && !usedOTPs.has(email.otp)) {
                // If we have an expected prefix, only accept matching OTPs
                if (expectedPrefix && email.prefix !== expectedPrefix) {
                  console.log(`[OTP] Skipping OTP with prefix ${email.prefix} (expected ${expectedPrefix})`);
                  continue;
                }
                usedOTPs.add(email.otp);
                console.log(`[OTP] Found matching OTP: ${email.prefix}-${email.otp}`);
                if (!resolved) { resolved = true; resolve(email.otp); }
                return;
              }
            }
            
            if (!resolved) { resolved = true; resolve(null); }
          });

          fetch.once('error', () => {
            if (!resolved) { resolved = true; resolve(null); }
            imap.end();
          });
        });
      });
    });

    imap.once('error', () => {
      if (!resolved) { resolved = true; resolve(null); }
    });

    imap.connect();
  });
}

/**
 * Wait for OTP with polling - optionally matching expected prefix
 */
async function waitForOTP(gmailCreds: { email: string; appPassword: string }, maxWaitSeconds: number = 120, expectedPrefix?: string): Promise<string | null> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  
  // Wait 20 seconds before first check to give email time to arrive and be indexed
  console.log(`[OTP] Waiting 20s for email to arrive and be indexed (expecting prefix: ${expectedPrefix || 'any'})...`);
  await new Promise(r => setTimeout(r, 20000));
  
  while (Date.now() - startTime < maxWaitMs) {
    const otp = await fetchLatestOTP(gmailCreds, expectedPrefix);
    if (otp) {
      return otp;
    }
    
    console.log('[OTP] No matching OTP found, waiting 5s...');
    await new Promise(r => setTimeout(r, 5000));
  }
  
  return null;
}

/**
 * Simple login to MyWFG
 */
async function loginToMyWFG(page: Page): Promise<boolean> {
  const creds = getMyWFGLoginCredentials();
  const gmailCreds = getGmailCredentials();
  
  console.log('[Login] Navigating to MyWFG...');
  await page.goto('https://www.mywfg.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // Wait for JS to load
  
  // Wait for login form
  await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
  
  // Fill username
  const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || await page.$('input[name="username"]');
  if (!usernameInput) throw new Error('Username input not found');
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.type(creds.username, { delay: 30 });
  
  // Fill password
  const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || await page.$('input[name="password"]');
  if (!passwordInput) throw new Error('Password input not found');
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.type(creds.password, { delay: 30 });
  
  // Click login and wait for navigation
  console.log('[Login] Submitting credentials...');
  await Promise.all([
    page.keyboard.press('Enter'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
  ]);
  
  // Wait a bit more for page to stabilize
  await new Promise(r => setTimeout(r, 3000));
  
  // Check for OTP requirement
  const pageContent = await page.content();
  const needsOTP = pageContent.includes('mywfgOtppswd') || 
                   pageContent.includes('One-Time Password') ||
                   pageContent.includes('Security Code');
  
  if (needsOTP) {
    // Extract the expected prefix from the page
    let expectedPrefix: string | undefined;
    try {
      const pageText = await page.evaluate(() => document.body.innerText);
      const prefixMatch = pageText.match(/(\d{4})\s*-/);
      if (prefixMatch) {
        expectedPrefix = prefixMatch[1];
        console.log(`[Login] Page shows expected OTP prefix: ${expectedPrefix}`);
      }
    } catch (e) {
      console.log('[Login] Could not extract prefix from page');
    }
    
    console.log('[Login] OTP required, waiting for email...');
    
    const otp = await waitForOTP(gmailCreds, 120, expectedPrefix);
    if (!otp) {
      throw new Error('Failed to get OTP from email');
    }
    
    console.log(`[Login] Got OTP: ${otp}`);
    
    // Find and fill OTP input
    const otpInput = await page.$('input[id="mywfgOtppswd"]') || 
                     await page.$('input[name="otp"]') ||
                     await page.$('input[name="otpCode"]');
    
    if (!otpInput) {
      throw new Error('OTP input not found');
    }
    
    await otpInput.click({ clickCount: 3 });
    await otpInput.type(otp, { delay: 50 });
    
    // Submit OTP and wait for navigation
    console.log('[Login] Submitting OTP...');
    await Promise.all([
      page.keyboard.press('Enter'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
    ]);
    await new Promise(r => setTimeout(r, 5000));
  }
  
  // Verify login success
  const currentUrl = page.url();
  console.log(`[Login] Current URL after login: ${currentUrl}`);
  
  // Take screenshot for debugging
  await page.screenshot({ path: '/tmp/login-result.png' });
  
  const isLoggedIn = currentUrl.includes('mywfg.com') && 
                     !currentUrl.includes('login') && 
                     !currentUrl.includes('signin') &&
                     !currentUrl.includes('otp');
  
  console.log(`[Login] Is logged in: ${isLoggedIn}`);
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
  
  try {
    // Step 1: Launch browser and login
    console.log('[Unified Sync] Step 1: Login to MyWFG');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
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
