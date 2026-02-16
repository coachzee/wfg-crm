import puppeteer, { Browser, Page } from 'puppeteer';
import { 
  startOTPSession, 
  waitForOTPWithSession, 
  getMyWFGCredentials,
  clearUsedOTPs 
} from './gmail-otp-v2';

interface LoginResult {
  success: boolean;
  error?: string;
  sessionCookies?: any[];
}

interface MyWFGCredentials {
  username: string;
  password: string;
}

import { getEnv } from './_core/env';

// Get MyWFG login credentials from environment (required)
function getMyWFGLoginCredentials(): MyWFGCredentials {
  const username = getEnv('MYWFG_USERNAME');
  const password = getEnv('MYWFG_PASSWORD');
  
  if (!username || !password) {
    throw new Error('MyWFG credentials not configured. Set MYWFG_USERNAME and MYWFG_PASSWORD.');
  }
  
  return { username, password };
}

/**
 * Robust automated login to MyWFG with proper OTP handling
 * 
 * Key improvements:
 * 1. Starts OTP session BEFORE triggering login (so we know exactly when to expect OTP)
 * 2. Uses longer wait times (180 seconds) with proper polling
 * 3. Better error handling and retry logic
 * 4. Proper OTP input field detection
 */
export async function loginToMyWFG(): Promise<LoginResult> {
  let browser: Browser | null = null;
  
  try {
    console.log('[MyWFG] Starting automated login...');
    
    // Send email alert that credentials are being used
    try {
      const { alertCredentialsUsed } = await import('./email-alert');
      await alertCredentialsUsed('MyWFG');
    } catch (e) {
      console.error('[MyWFG] Failed to send credentials alert:', e);
    }
    
    // Get credentials first
    const credentials = getMyWFGLoginCredentials();
    if (!credentials.username || !credentials.password) {
      return { success: false, error: 'MyWFG credentials not configured' };
    }
    
    const gmailCreds = getMyWFGCredentials();
    if (!gmailCreds.email || !gmailCreds.appPassword) {
      return { success: false, error: 'Gmail credentials not configured for OTP' };
    }
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to MyWFG login page
    console.log('[MyWFG] Navigating to login page...');
    await page.goto('https://www.mywfg.com', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for login form
    await page.waitForSelector('input[id="myWfgUsernameDisplay"], input[name="username"]', { timeout: 30000 });
    
    // START OTP SESSION BEFORE TRIGGERING LOGIN
    // This ensures we only accept OTPs that arrive AFTER this point
    console.log('[MyWFG] Starting OTP session before login...');
    const otpSessionId = await startOTPSession('mywfg', gmailCreds);
    
    // Fill in username
    console.log('[MyWFG] Entering username...');
    const usernameInput = await page.$('input[id="myWfgUsernameDisplay"]') || 
                          await page.$('input[name="username"]');
    if (usernameInput) {
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type(credentials.username, { delay: 30 });
    } else {
      return { success: false, error: 'Username input not found' };
    }
    
    // Fill in password
    console.log('[MyWFG] Entering password...');
    const passwordInput = await page.$('input[id="myWfgPasswordDisplay"]') || 
                          await page.$('input[name="password"]') ||
                          await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(credentials.password, { delay: 30 });
    } else {
      return { success: false, error: 'Password input not found' };
    }
    
    // Click login button - this triggers the OTP email
    console.log('[MyWFG] Clicking login button (this triggers OTP)...');
    const loginButton = await page.$('button[id="mywfgTheyLive"]') || 
                        await page.$('button[type="submit"]');
    if (loginButton) {
      await Promise.all([
        loginButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
      ]);
    }
    
    // Wait a moment for page to settle
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if OTP is required
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
    
    // Check for error page
    if (pageText.includes('ERROR OCCURRED') || pageText.includes('Bad Request')) {
      console.log('[MyWFG] Error page detected, retrying...');
      await browser.close();
      browser = null;
      // Clear used OTPs and retry
      clearUsedOTPs();
      return loginToMyWFG();
    }
    
    const otpRequired = pageContent.includes('mywfgOtppswd') || 
                        pageText.includes('One-Time Password') ||
                        pageText.includes('Security Code') ||
                        pageText.includes('Validation Code');
    
    if (otpRequired) {
      console.log('[MyWFG] OTP verification required, waiting for email...');
      
      // Get the prefix shown on the page (for reference)
      const pagePrefix = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const prefixMatch = bodyText.match(/(\d{4})\s*-/);
        return prefixMatch ? prefixMatch[1] : null;
      });
      if (pagePrefix) {
        console.log(`[MyWFG] Page shows OTP prefix: ${pagePrefix}`);
      }
      
      // Wait 5 seconds before starting to poll for OTP
      // This gives the email system time to deliver the OTP
      console.log('[MyWFG] Waiting 5 seconds for OTP email to arrive...');
      await new Promise(r => setTimeout(r, 5000));
      
      // Wait for OTP using the session we started BEFORE login
      // This ensures we only get OTPs that arrived AFTER we clicked login
      console.log('[MyWFG] Waiting for OTP (session-based, 180s timeout)...');
      const otpResult = await waitForOTPWithSession(gmailCreds, otpSessionId, 180, 3);
      
      if (!otpResult.success || !otpResult.otp) {
        return { success: false, error: `Failed to get OTP: ${otpResult.error}` };
      }
      
      console.log(`[MyWFG] OTP received: ${otpResult.otp}`);
      
      // The OTP from email is the 6 digits we need to enter
      const otpToEnter = otpResult.otp.length > 6 ? otpResult.otp.slice(-6) : otpResult.otp;
      console.log(`[MyWFG] Entering OTP: ${otpToEnter}`);
      
      // Find OTP input - try multiple selectors
      let otpInput = await page.$('input[id="mywfgOtppswd"]');
      if (!otpInput) otpInput = await page.$('input[name="otp"]');
      if (!otpInput) otpInput = await page.$('input[name="otpCode"]');
      if (!otpInput) otpInput = await page.$('input[placeholder*="code" i]');
      
      // Try to find any visible text input that's not username/password
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
            console.log(`[MyWFG] Found OTP input: type=${type}, id=${id}`);
            break;
          }
        }
      }
      
      if (otpInput) {
        // Clear and enter OTP
        await otpInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await otpInput.type(otpToEnter, { delay: 50 });
        console.log('[MyWFG] OTP entered');
        
        await new Promise(r => setTimeout(r, 500));
        
        // Submit OTP
        let submitBtn: any = await page.$('button[id="mywfgTheylive"]');
        if (!submitBtn) submitBtn = await page.$('button[id="mywfgTheyLive"]');
        if (!submitBtn) {
          const buttons = await page.$$('button');
          for (const btn of buttons) {
            const text = await btn.evaluate(el => el.textContent?.trim().toLowerCase());
            if (text === 'submit') {
              submitBtn = btn;
              break;
            }
          }
        }
        if (!submitBtn) submitBtn = await page.$('button[type="submit"]');
        if (!submitBtn) submitBtn = await page.$('input[type="submit"]');
        
        if (submitBtn) {
          console.log('[MyWFG] Clicking submit button...');
          await submitBtn.click();
          
          // Wait for navigation
          try {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
          } catch (e) {
            console.log('[MyWFG] Navigation wait completed or timed out');
          }
        } else {
          console.log('[MyWFG] Warning: Submit button not found');
        }
        
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('[MyWFG] Warning: OTP input not found');
        return { success: false, error: 'OTP input field not found on page' };
      }
    }
    
    // Verify login success
    const currentUrl = page.url();
    const finalPageText = await page.evaluate(() => document.body ? document.body.innerText : '');
    
    const isLoggedIn = (currentUrl.includes('mywfg.com') && 
                        !currentUrl.includes('login') && 
                        !currentUrl.includes('signin')) ||
                       finalPageText.includes('Welcome') ||
                       finalPageText.includes('Dashboard');
    
    if (!isLoggedIn) {
      // Check for specific error messages
      if (finalPageText.includes('Invalid') || finalPageText.includes('incorrect')) {
        return { success: false, error: 'Invalid credentials or OTP' };
      }
      if (finalPageText.includes('expired')) {
        return { success: false, error: 'OTP expired - please try again' };
      }
      return { success: false, error: 'Login verification failed - unable to confirm successful login' };
    }
    
    // Get session cookies
    const cookies = await page.cookies();
    console.log('[MyWFG] Login successful, cookies captured');
    
    return { success: true, sessionCookies: cookies };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MyWFG] Login failed:', errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Store session cookies for reuse
let cachedCookies: any[] | null = null;
let cookieExpiry: Date | null = null;

export function setCachedCookies(cookies: any[], expiryHours: number = 24) {
  cachedCookies = cookies;
  cookieExpiry = new Date();
  cookieExpiry.setHours(cookieExpiry.getHours() + expiryHours);
  console.log(`[MyWFG] Session cached until ${cookieExpiry.toISOString()}`);
}

export function getCachedCookies(): any[] | null {
  if (!cachedCookies || !cookieExpiry) return null;
  if (new Date() > cookieExpiry) {
    console.log('[MyWFG] Cached session expired');
    cachedCookies = null;
    cookieExpiry = null;
    return null;
  }
  return cachedCookies;
}

export function clearCachedCookies(): void {
  cachedCookies = null;
  cookieExpiry = null;
  console.log('[MyWFG] Cached session cleared');
}

// Login with session reuse
export async function loginToMyWFGWithCache(): Promise<LoginResult> {
  const cached = getCachedCookies();
  if (cached) {
    console.log('[MyWFG] Using cached session');
    return { success: true, sessionCookies: cached };
  }
  
  const result = await loginToMyWFG();
  if (result.success && result.sessionCookies) {
    setCachedCookies(result.sessionCookies);
  }
  return result;
}
