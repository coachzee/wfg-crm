/**
 * MyWFG Login - Simple, Reliable Login
 * 
 * Strategy: Get the MOST RECENT OTP email, period.
 * No timing games, no session tracking - just get the newest OTP and use it.
 */

import puppeteer, { Browser, Page, Cookie } from 'puppeteer';
import { launchBrowser } from './lib/browser';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

// Track used OTPs to prevent reuse
const usedOTPs = new Set<string>();

// Helper to require environment variables
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getCredentials() {
  return {
    mywfg: {
      username: mustGetEnv('MYWFG_USERNAME'),
      password: mustGetEnv('MYWFG_PASSWORD'),
    },
    gmail: {
      email: mustGetEnv('MYWFG_EMAIL'),
      appPassword: mustGetEnv('MYWFG_APP_PASSWORD'),
    }
  };
}

/**
 * Get the most recent unused OTP from Gmail
 * Simple approach: just get the newest OTP email and extract the code
 */
async function getMostRecentOTP(email: string, appPassword: string): Promise<string | null> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: email,
      password: appPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 30000,
    });

    const timeout = setTimeout(() => {
      console.log('[OTP] Timeout');
      try { imap.end(); } catch (e) {}
      resolve(null);
    }, 30000);

    imap.once('error', (err: Error) => {
      clearTimeout(timeout);
      console.error('[OTP] IMAP error:', err.message);
      resolve(null);
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          clearTimeout(timeout);
          imap.end();
          resolve(null);
          return;
        }

        // Search for OTP emails from today
        const today = new Date().toISOString().split('T')[0];
        imap.search([['SINCE', today], ['FROM', 'transamerica']], (searchErr, results) => {
          if (searchErr || !results || results.length === 0) {
            clearTimeout(timeout);
            console.log('[OTP] No OTP emails found');
            imap.end();
            resolve(null);
            return;
          }

          // Get the NEWEST email (highest UID)
          const newestUID = Math.max(...results);
          console.log(`[OTP] Found ${results.length} OTP emails, checking newest (UID: ${newestUID})`);

          const fetch = imap.fetch([newestUID], { bodies: '', struct: true });
          let foundOTP: string | null = null;

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => buffer += chunk.toString('utf8'));
              stream.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  const body = parsed.text || '';
                  
                  // Extract OTP - pattern: "XXXX - YYYYYY"
                  const match = body.match(/(\d{4})\s*[-–]\s*(\d{6})/);
                  if (match) {
                    const otp = match[2];
                    if (!usedOTPs.has(otp)) {
                      foundOTP = otp;
                      console.log(`[OTP] Found: ${otp}`);
                    } else {
                      console.log(`[OTP] Already used: ${otp}`);
                    }
                  }
                } catch (e) {}
              });
            });
          });

          fetch.once('end', () => {
            clearTimeout(timeout);
            imap.end();
            if (foundOTP) {
              usedOTPs.add(foundOTP);
            }
            resolve(foundOTP);
          });

          fetch.once('error', () => {
            clearTimeout(timeout);
            imap.end();
            resolve(null);
          });
        });
      });
    });

    imap.connect();
  });
}

/**
 * Wait for a NEW OTP to arrive (polls until we get one we haven't used)
 */
async function waitForNewOTP(email: string, appPassword: string, maxAttempts: number = 30): Promise<string | null> {
  console.log(`[OTP] Waiting for new OTP (max ${maxAttempts} attempts, 5s interval)...`);
  
  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`[OTP] Attempt ${i}/${maxAttempts}...`);
    
    const otp = await getMostRecentOTP(email, appPassword);
    if (otp) {
      return otp;
    }
    
    // Wait 5 seconds before next attempt
    await new Promise(r => setTimeout(r, 5000));
  }
  
  console.log('[OTP] Timeout - no new OTP received');
  return null;
}

/**
 * Login to MyWFG and return cookies
 */
export async function loginToMyWFG(): Promise<Cookie[] | null> {
  const creds = getCredentials();
  
  if (!creds.mywfg.username || !creds.mywfg.password) {
    console.error('[MyWFG] Missing credentials');
    return null;
  }

  console.log('[MyWFG] Starting login...');
  
  let browser: Browser | null = null;
  
  try {
    browser = await launchBrowser({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to MyWFG
    console.log('[MyWFG] Navigating to login page...');
    await page.goto('https://www.mywfg.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    // Enter credentials using keyboard navigation (more reliable)
    console.log('[MyWFG] Entering credentials...');
    await page.waitForSelector('input[name="username"], input[id="mywfgUsername"]', { timeout: 10000 });
    
    // Focus username field and type
    await page.focus('input[name="username"], input[id="mywfgUsername"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.type(creds.mywfg.username, { delay: 30 });
    
    // Tab to password field and type
    await page.keyboard.press('Tab');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.type(creds.mywfg.password, { delay: 30 });

    // Submit login using Enter key (more reliable than clicking)
    console.log('[MyWFG] Submitting login...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
      page.keyboard.press('Enter'),
    ]);

    await new Promise(r => setTimeout(r, 3000));

    // Check if OTP is required
    const pageContent = await page.content();
    const needsOTP = pageContent.includes('Validation Code') || 
                     pageContent.includes('verification code') ||
                     pageContent.includes('OTP') ||
                     pageContent.includes('Security Code');

    if (needsOTP) {
      console.log('[MyWFG] OTP required, waiting for email...');
      
      // Wait 15 seconds for email to arrive
      await new Promise(r => setTimeout(r, 15000));
      
      // Get OTP
      const otp = await waitForNewOTP(creds.gmail.email, creds.gmail.appPassword, 24);
      
      if (!otp) {
        console.error('[MyWFG] Failed to get OTP');
        await page.screenshot({ path: '/tmp/mywfg-otp-failed.png' });
        return null;
      }

      console.log(`[MyWFG] Entering OTP: ${otp}`);
      
      // Find and fill OTP input
      const otpInput = await page.$('input[id="mywfgOtppswd"]') ||
                       await page.$('input[name="otp"]') ||
                       await page.$('input[name="otpCode"]') ||
                       await page.$('input[type="text"]') ||
                       await page.$('input[type="tel"]');
      
      if (otpInput) {
        await otpInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await otpInput.type(otp, { delay: 50 });
        
        // Submit OTP
        const submitBtn = await page.$('button[type="submit"]') ||
                          await page.$('input[type="submit"]') ||
                          await page.$('button');
        
        if (submitBtn) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
            submitBtn.click(),
          ]);
        }
        
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Check if login succeeded
    const finalUrl = page.url();
    const finalContent = await page.content();
    
    const loginSuccess = finalUrl.includes('dashboard') || 
                         finalUrl.includes('home') ||
                         finalContent.includes('Welcome') ||
                         finalContent.includes('Dashboard') ||
                         !finalContent.includes('Login') ||
                         !finalContent.includes('Sign In');

    if (!loginSuccess) {
      console.error('[MyWFG] Login failed - still on login page');
      await page.screenshot({ path: '/tmp/mywfg-login-failed.png' });
      return null;
    }

    console.log('[MyWFG] Login successful!');
    
    // Get cookies
    const cookies = await page.cookies();
    return cookies;

  } catch (error) {
    console.error('[MyWFG] Login error:', error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Get MyWFG session - main entry point
 */
export async function getMyWFGSession(): Promise<{ cookies: Cookie[] } | null> {
  const cookies = await loginToMyWFG();
  if (cookies) {
    return { cookies };
  }
  return null;
}

export { usedOTPs };
